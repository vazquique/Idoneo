/*
  Idóneo — datos de abogados/despachos: los 8 perfiles de ejemplo del
  lanzamiento, más los registros reales que se van aprobando desde
  admin.html. Se incluye en index.html, perfil.html y registro.html con
  <script src="listings.js"></script> (sin defer: index.html y perfil.html
  necesitan IdoneoListings disponible antes de su propio script inline).

  Todo vive en localStorage del navegador — no hay servidor. Un registro
  hecho en un dispositivo solo lo ve/aprueba quien use ESE MISMO navegador
  (por ejemplo, el dueño del sitio revisando desde su propia laptop). No es
  una base de datos compartida entre visitantes de verdad.
*/
(function(global){
  const DEMO_ABOGADOS = [
    {id:1, nombre:"Lic. Sofía Ramírez", especialidad:"Familiar", ciudad:"Zapopan, Jalisco", rating:4.8, reviews:32, precio:"$$", verificado:true, telefono:"523312345678", experiencia:"9 años", bio:"Especialista en divorcios, pensión alimenticia y custodia. Prioriza resolver por la vía conciliatoria antes de llegar a juicio.", reseñas:[
      {autor:"Marcela H.", texto:"Me ayudó con mi divorcio de manera rápida y clara, siempre explicando cada paso.", estrellas:5},
      {autor:"Iván T.", texto:"Buena comunicación, aunque el proceso tardó un poco más de lo esperado.", estrellas:4}
    ]},
    {id:2, nombre:"Torres & Asociados", especialidad:"Mercantil", ciudad:"Guadalajara, Jalisco", rating:4.6, reviews:18, precio:"$$$", verificado:true, telefono:"523322345678", experiencia:"14 años como despacho", bio:"Despacho enfocado en contratos mercantiles, cobranza judicial y constitución de sociedades para pymes.", reseñas:[
      {autor:"Roberto C.", texto:"Nos ayudaron a formalizar contratos con proveedores, muy profesionales.", estrellas:5},
      {autor:"Diana L.", texto:"Cumplieron los tiempos que prometieron.", estrellas:4}
    ]},
    {id:3, nombre:"Lic. Daniel Ochoa", especialidad:"Penal", ciudad:"Ciudad de México", rating:4.9, reviews:54, precio:"$$", verificado:true, telefono:"525512345678", experiencia:"12 años", bio:"Defensa penal en delitos patrimoniales y de tránsito. Atención disponible para casos urgentes.", reseñas:[
      {autor:"Fernando A.", texto:"Me atendió un fin de semana cuando más lo necesitaba.", estrellas:5},
      {autor:"Paola G.", texto:"Excelente conocimiento del tema, muy claro en la estrategia.", estrellas:5}
    ]},
    {id:4, nombre:"Lic. Renata Cabrera", especialidad:"Laboral", ciudad:"Monterrey, Nuevo León", rating:4.3, reviews:9, precio:"$", verificado:false, telefono:"528112345678", experiencia:"4 años", bio:"Asesoría a trabajadores en despidos injustificados y liquidaciones.", reseñas:[
      {autor:"Jesús M.", texto:"Me orientó bien sobre mi liquidación, precio accesible.", estrellas:4}
    ]},
    {id:5, nombre:"Lic. Marco Villaseñor", especialidad:"Migratorio", ciudad:"Zapopan, Jalisco", rating:5.0, reviews:12, precio:"$$", verificado:true, telefono:"523312349999", experiencia:"7 años", bio:"Trámites de residencia, naturalización y regularización migratoria.", reseñas:[
      {autor:"Laura P.", texto:"Todo el trámite de residencia salió sin contratiempos.", estrellas:5}
    ]},
    {id:6, nombre:"Bufete Herrera Legal", especialidad:"Corporativo", ciudad:"Ciudad de México", rating:4.7, reviews:41, precio:"$$$", verificado:true, telefono:"525587654321", experiencia:"20 años como despacho", bio:"Asesoría corporativa integral para empresas medianas y grandes: fusiones, cumplimiento y gobierno corporativo.", reseñas:[
      {autor:"Empresa Vertex", texto:"Manejaron nuestra fusión con mucha solidez legal.", estrellas:5}
    ]},
    {id:7, nombre:"Lic. Ana Belén Ruiz", especialidad:"Civil", ciudad:"Guadalajara, Jalisco", rating:4.4, reviews:15, precio:"$", verificado:true, telefono:"523398765432", experiencia:"6 años", bio:"Litigio civil: arrendamientos, incumplimiento de contratos y responsabilidad civil.", reseñas:[
      {autor:"Carlos V.", texto:"Resolvió un conflicto de arrendamiento sin llegar a juicio.", estrellas:4}
    ]},
    {id:8, nombre:"Lic. Pablo Serrano", especialidad:"Fiscal", ciudad:"Monterrey, Nuevo León", rating:4.5, reviews:22, precio:"$$", verificado:false, telefono:"528187654321", experiencia:"10 años", bio:"Defensa fiscal ante el SAT y planeación tributaria para personas físicas y morales.", reseñas:[
      {autor:"Gabriela S.", texto:"Me ayudó a resolver un requerimiento del SAT sin multas.", estrellas:5}
    ]},
  ];

  const PENDING_KEY = 'idoneo_pending_abogados';
  const APPROVED_KEY = 'idoneo_approved_abogados';
  const NEXT_ID_KEY = 'idoneo_next_abogado_id';
  const FIRST_CUSTOM_ID = 1000;

  function readList(key){
    try{ return JSON.parse(localStorage.getItem(key)) || []; }
    catch(e){ return []; }
  }
  function writeList(key, list){ localStorage.setItem(key, JSON.stringify(list)); }

  function getPending(){ return readList(PENDING_KEY); }
  function getApproved(){ return readList(APPROVED_KEY); }

  function nextId(){
    let n = parseInt(localStorage.getItem(NEXT_ID_KEY), 10);
    if(!n || Number.isNaN(n)) n = FIRST_CUSTOM_ID;
    localStorage.setItem(NEXT_ID_KEY, String(n + 1));
    return n;
  }

  function submitRegistration(data){
    const entry = {
      id: nextId(),
      nombre: (data.nombre || '').trim(),
      especialidad: data.especialidad || '',
      ciudad: (data.ciudad || '').trim(),
      telefono: (data.telefono || '').replace(/\D/g, ''),
      precio: '$$',
      rating: 0,
      reviews: 0,
      verificado: false,
      experiencia: '',
      bio: '',
      reseñas: [],
      submittedAt: new Date().toISOString()
    };
    const pending = getPending();
    pending.push(entry);
    writeList(PENDING_KEY, pending);
    return entry;
  }

  function approveRegistration(id, edits){
    const pending = getPending();
    const idx = pending.findIndex(p => p.id === id);
    if(idx === -1) return false;
    const entry = Object.assign({}, pending[idx], edits || {});
    pending.splice(idx, 1);
    writeList(PENDING_KEY, pending);
    const approved = getApproved();
    approved.push(entry);
    writeList(APPROVED_KEY, approved);
    return true;
  }

  function rejectRegistration(id){
    writeList(PENDING_KEY, getPending().filter(p => p.id !== id));
  }

  function updateApproved(id, edits){
    const approved = getApproved();
    const idx = approved.findIndex(a => a.id === id);
    if(idx === -1) return false;
    approved[idx] = Object.assign({}, approved[idx], edits || {});
    writeList(APPROVED_KEY, approved);
    return true;
  }

  function removeApproved(id){
    writeList(APPROVED_KEY, getApproved().filter(a => a.id !== id));
  }

  function isDemo(id){
    return DEMO_ABOGADOS.some(d => d.id === id);
  }

  function getAllListings(){
    return DEMO_ABOGADOS.concat(getApproved());
  }

  global.IdoneoListings = {
    DEMO_ABOGADOS,
    getPending, getApproved, getAllListings,
    submitRegistration, approveRegistration, rejectRegistration,
    updateApproved, removeApproved, isDemo
  };
})(window);
