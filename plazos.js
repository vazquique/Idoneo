/*
  Idóneo — motor del Radar de Plazos Legales.
  Calcula fechas límite orientativas usando días hábiles reales en México
  (excluye sábados, domingos y los días de descanso obligatorio que marca
  el Art. 74 de la Ley Federal del Trabajo). Los plazos guardados viven en
  localStorage -- igual que favorites.js -- para que funcionen sin cuenta.
  Se incluye con: <script src="plazos.js"></script>
*/
(function(global){
  const KEY = 'idoneo_plazos';

  // ---------- Días inhábiles oficiales (México) ----------
  function nthWeekdayOfMonth(year, monthIdx, weekday, n){
    const first = new Date(year, monthIdx, 1);
    const offset = (weekday - first.getDay() + 7) % 7;
    return new Date(year, monthIdx, 1 + offset + (n - 1) * 7);
  }

  function isoDate(d){
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function holidaysForYear(year){
    return [
      new Date(year, 0, 1),                     // 1 de enero
      nthWeekdayOfMonth(year, 1, 1, 1),          // primer lunes de febrero (5 feb)
      nthWeekdayOfMonth(year, 2, 1, 3),          // tercer lunes de marzo (21 mar)
      new Date(year, 4, 1),                      // 1 de mayo
      new Date(year, 8, 16),                     // 16 de septiembre
      nthWeekdayOfMonth(year, 10, 1, 3),         // tercer lunes de noviembre (20 nov)
      new Date(year, 11, 25),                    // 25 de diciembre
    ];
  }

  function holidaySet(fromYear, toYear){
    const set = new Set();
    for(let y = fromYear; y <= toYear; y++){
      holidaysForYear(y).forEach(d => set.add(isoDate(d)));
    }
    return set;
  }

  function isBusinessDay(d, holidays){
    const dow = d.getDay();
    return dow !== 0 && dow !== 6 && !holidays.has(isoDate(d));
  }

  function addBusinessDays(start, days){
    const holidays = holidaySet(start.getFullYear(), start.getFullYear() + 1);
    const d = new Date(start);
    let added = 0;
    while(added < days){
      d.setDate(d.getDate() + 1);
      if(isBusinessDay(d, holidays)) added++;
    }
    return d;
  }

  function addCalendarMonths(start, months){
    const d = new Date(start);
    d.setMonth(d.getMonth() + months);
    return d;
  }

  function countBusinessDaysBetween(from, to){
    if(to <= from) return 0;
    const holidays = holidaySet(from.getFullYear(), to.getFullYear());
    let count = 0;
    const d = new Date(from);
    while(d < to){
      d.setDate(d.getDate() + 1);
      if(isBusinessDay(d, holidays)) count++;
    }
    return count;
  }

  // ---------- Catálogo de trámites (plazos orientativos) ----------
  // OJO: son referencias generales tomadas de las reglas más comunes.
  // El plazo real de un caso concreto puede variar por estado, tipo de
  // juicio o circunstancias particulares -- por eso cada resultado se
  // muestra siempre junto con la recomendación de confirmarlo con un
  // abogado antes de actuar.
  const TRAMITES = [
    {
      id: 'despido',
      area: 'Laboral',
      label: 'Despido injustificado',
      base: 'Fecha del despido',
      kind: 'months',
      amount: 2,
      fuente: 'Art. 518, Ley Federal del Trabajo (prescripción de 2 meses).',
    },
    {
      id: 'amparo-indirecto',
      area: 'Amparo',
      label: 'Amparo indirecto',
      base: 'Fecha en que conociste el acto de autoridad',
      kind: 'businessDays',
      amount: 15,
      fuente: 'Art. 17, Ley de Amparo (regla general).',
    },
    {
      id: 'amparo-directo',
      area: 'Amparo',
      label: 'Amparo directo contra sentencia',
      base: 'Fecha de notificación de la sentencia',
      kind: 'businessDays',
      amount: 15,
      fuente: 'Art. 17, Ley de Amparo (regla general).',
    },
    {
      id: 'demanda-mercantil',
      area: 'Mercantil',
      label: 'Contestar una demanda mercantil',
      base: 'Fecha de notificación de la demanda',
      kind: 'businessDays',
      amount: 15,
      fuente: 'Código de Comercio, juicio ordinario mercantil (regla general).',
    },
    {
      id: 'demanda-civil',
      area: 'Civil',
      label: 'Contestar una demanda civil',
      base: 'Fecha de notificación de la demanda',
      kind: 'businessDays',
      amount: 9,
      fuente: 'Referencia común (CDMX/federal) -- varía según el código de procedimientos civiles de tu estado.',
    },
    {
      id: 'recurso-sat',
      area: 'Fiscal',
      label: 'Recurso de revocación ante el SAT',
      base: 'Fecha de notificación de la resolución',
      kind: 'businessDays',
      amount: 30,
      fuente: 'Art. 121, Código Fiscal de la Federación.',
    },
  ];

  function computeDeadline(tramiteId, startDateStr){
    const tramite = TRAMITES.find(t => t.id === tramiteId);
    if(!tramite || !startDateStr) return null;
    const [y, m, d] = startDateStr.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    if(isNaN(start.getTime())) return null;
    const deadline = tramite.kind === 'months'
      ? addCalendarMonths(start, tramite.amount)
      : addBusinessDays(start, tramite.amount);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diasHabilesRestantes = countBusinessDaysBetween(today > start ? today : start, deadline);
    return {tramite, start, deadline, diasHabilesRestantes};
  }

  function urgencyLevel(diasHabilesRestantes, deadline){
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if(deadline < today) return 'vencido';
    if(diasHabilesRestantes <= 3) return 'critico';
    if(diasHabilesRestantes <= 9) return 'urgente';
    if(diasHabilesRestantes <= 20) return 'atento';
    return 'tranquilo';
  }

  // ---------- .ics (recordatorio de calendario) ----------
  function escapeIcs(str){
    return String(str || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function icsDate(d){
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  }

  function buildIcs(tramite, deadline){
    const uid = `idoneo-plazo-${Date.now()}@idoneo`;
    const stamp = icsDate(new Date()) + 'T000000Z';
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Idoneo//Radar de Plazos//ES',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(deadline)}`,
      `SUMMARY:${escapeIcs('Vence: ' + tramite.label)}`,
      `DESCRIPTION:${escapeIcs('Plazo orientativo de Idóneo para "' + tramite.label + '". Confirma la fecha exacta con un abogado. ' + tramite.fuente)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:-P7D',
      `DESCRIPTION:${escapeIcs('En una semana vence: ' + tramite.label)}`,
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'TRIGGER:-P1D',
      `DESCRIPTION:${escapeIcs('Mañana vence: ' + tramite.label)}`,
      'END:VALARM',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
  }

  // ---------- Guardado local ----------
  function getAll(){
    try{
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch(err){
      return [];
    }
  }

  function persist(all){
    try{ localStorage.setItem(KEY, JSON.stringify(all)); } catch(err){ /* localStorage no disponible */ }
  }

  function save(tramiteId, startDateStr){
    const result = computeDeadline(tramiteId, startDateStr);
    if(!result) return null;
    const all = getAll();
    const entry = {
      id: `${tramiteId}-${startDateStr}-${Date.now()}`,
      tramiteId, startDateStr,
      deadlineIso: isoDate(result.deadline),
      savedAt: Date.now(),
    };
    all.push(entry);
    persist(all);
    return entry;
  }

  function remove(id){
    persist(getAll().filter(e => e.id !== id));
  }

  function list(){
    return getAll()
      .map(e => Object.assign({}, e, {computed: computeDeadline(e.tramiteId, e.startDateStr)}))
      .filter(e => e.computed)
      .sort((a, b) => a.computed.deadline - b.computed.deadline);
  }

  global.IdoneoPlazos = {
    TRAMITES, computeDeadline, urgencyLevel, buildIcs,
    save, remove, list,
  };
})(window);
