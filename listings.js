/*
  Idóneo — datos de abogados/despachos: los 8 perfiles de ejemplo del
  lanzamiento (fijos, en este archivo) + los registros reales, que ahora
  viven en Firestore (compartidos de verdad entre cualquier dispositivo).

  Se incluye en index.html, buscar.html, perfil.html, registro.html,
  mi-cuenta.html (carpeta Idoneo) y en index.html (carpeta admin)
  DESPUÉS de firebase-app-compat.js, firebase-firestore-compat.js,
  firebase-auth-compat.js y firebase-config.js (ese orden importa: este
  archivo usa `db` y `auth`, definidos en firebase-config.js).

  Todas las funciones de datos son async (devuelven Promesas) porque ahora
  hablan con Firestore por red — el código que las usa debe hacer
  `await` o `.then()`.
*/
(function(global){
  const DEMO_ABOGADOS = [
    {id:1, nombre:"Lic. Sofía Ramírez", tipo:"individual", especialidades:["Familiar"], ciudad:"Zapopan, Jalisco", rating:4.8, reviews:32, precio:"$$", verificado:true, telefono:"523312345678", experiencia:"9 años", bio:"Especialista en divorcios, pensión alimenticia y custodia. Prioriza resolver por la vía conciliatoria antes de llegar a juicio.", reseñas:[
      {autor:"Marcela H.", texto:"Me ayudó con mi divorcio de manera rápida y clara, siempre explicando cada paso.", estrellas:5},
      {autor:"Iván T.", texto:"Buena comunicación, aunque el proceso tardó un poco más de lo esperado.", estrellas:4}
    ]},
    {id:2, nombre:"Torres & Asociados", tipo:"despacho", numAbogados:"6", anioFundacion:"2011", responsableNombre:"Lic. Ricardo Torres", responsableCedula:"5678901", rfcPersonaMoral:"TAS110315AB1", verificadoEmpresa:true, especialidades:["Mercantil","Fiscal"], ciudad:"Guadalajara, Jalisco", rating:4.6, reviews:18, precio:"$$$", verificado:true, telefono:"523322345678", experiencia:"14 años como despacho", bio:"Despacho enfocado en contratos mercantiles, cobranza judicial y constitución de sociedades para pymes.", reseñas:[
      {autor:"Roberto C.", texto:"Nos ayudaron a formalizar contratos con proveedores, muy profesionales.", estrellas:5},
      {autor:"Diana L.", texto:"Cumplieron los tiempos que prometieron.", estrellas:4}
    ]},
    {id:3, nombre:"Lic. Daniel Ochoa", tipo:"individual", especialidades:["Penal"], ciudad:"Ciudad de México", rating:4.9, reviews:54, precio:"$$", verificado:true, telefono:"525512345678", experiencia:"12 años", bio:"Defensa penal en delitos patrimoniales y de tránsito. Atención disponible para casos urgentes.", reseñas:[
      {autor:"Fernando A.", texto:"Me atendió un fin de semana cuando más lo necesitaba.", estrellas:5},
      {autor:"Paola G.", texto:"Excelente conocimiento del tema, muy claro en la estrategia.", estrellas:5}
    ]},
    {id:4, nombre:"Lic. Renata Cabrera", tipo:"individual", especialidades:["Laboral"], ciudad:"Monterrey, Nuevo León", rating:4.3, reviews:9, precio:"$", verificado:false, telefono:"528112345678", experiencia:"4 años", bio:"Asesoría a trabajadores en despidos injustificados y liquidaciones.", reseñas:[
      {autor:"Jesús M.", texto:"Me orientó bien sobre mi liquidación, precio accesible.", estrellas:4}
    ]},
    {id:5, nombre:"Lic. Marco Villaseñor", tipo:"individual", destacado:true, contactClicks:38, especialidades:["Migratorio"], ciudad:"Zapopan, Jalisco", rating:5.0, reviews:12, precio:"$$", verificado:true, telefono:"523312349999", experiencia:"7 años", bio:"Trámites de residencia, naturalización y regularización migratoria.", reseñas:[
      {autor:"Laura P.", texto:"Todo el trámite de residencia salió sin contratiempos.", estrellas:5}
    ]},
    {id:6, nombre:"Bufete Herrera Legal", tipo:"despacho", destacado:true, contactClicks:97, numAbogados:"12", anioFundacion:"2005", responsableNombre:"Lic. Fernanda Herrera", responsableCedula:"3456789", rfcPersonaMoral:"BHL050822CD2", verificadoEmpresa:true, especialidades:["Corporativo","Mercantil","Fiscal","Civil"], ciudad:"Ciudad de México", rating:4.7, reviews:41, precio:"$$$", verificado:true, telefono:"525587654321", experiencia:"20 años como despacho", bio:"Asesoría corporativa integral para empresas medianas y grandes: fusiones, cumplimiento y gobierno corporativo.", reseñas:[
      {autor:"Empresa Vertex", texto:"Manejaron nuestra fusión con mucha solidez legal.", estrellas:5}
    ]},
    {id:7, nombre:"Lic. Ana Belén Ruiz", tipo:"individual", especialidades:["Civil","Familiar"], ciudad:"Guadalajara, Jalisco", rating:4.4, reviews:15, precio:"$", verificado:true, telefono:"523398765432", experiencia:"6 años", bio:"Litigio civil: arrendamientos, incumplimiento de contratos y responsabilidad civil.", reseñas:[
      {autor:"Carlos V.", texto:"Resolvió un conflicto de arrendamiento sin llegar a juicio.", estrellas:4}
    ]},
    {id:8, nombre:"Lic. Pablo Serrano", tipo:"individual", especialidades:["Fiscal"], ciudad:"Monterrey, Nuevo León", rating:4.5, reviews:22, precio:"$$", verificado:false, telefono:"528187654321", experiencia:"10 años", bio:"Defensa fiscal ante el SAT y planeación tributaria para personas físicas y morales.", reseñas:[
      {autor:"Gabriela S.", texto:"Me ayudó a resolver un requerimiento del SAT sin multas.", estrellas:5}
    ]},
  ];

  const COLLECTION = 'abogados_registrados';
  const HIDDEN_DEMOS_COLLECTION = 'demos_ocultos';
  const REVIEWS_COLLECTION = 'resenas';
  const AVISOS_COLLECTION = 'avisos';
  const CASOS_GANADOS_COLLECTION = 'casos_ganados';
  const PREGUNTAS_COLLECTION = 'preguntas';
  const RESPUESTAS_FORO_COLLECTION = 'respuestas_foro';
  const HILOS_COLLECTION = 'hilos';
  const MENSAJES_COLLECTION = 'mensajes';

  // Idiomas adicionales al español que un abogado puede ofrecer — se
  // muestran como insignia en su tarjeta/perfil y como filtro en el
  // buscador. El español no está en la lista porque se asume por default.
  const IDIOMAS_OPTS = ['Inglés', 'Francés', 'Portugués', 'Alemán', 'Italiano', 'Chino mandarín'];

  // Los 32 estados de México con sus ciudades más importantes (capital +
  // las de mayor población/actividad). Se usa para armar los selectores
  // de Estado/Ciudad en registro.html, mi-cuenta.html y el filtro de
  // buscar.html — el campo `ciudad` que se guarda sigue siendo un solo
  // texto "Ciudad, Estado", igual que antes, para no romper nada de lo
  // que ya lee ese campo (tarjetas, perfil, admin, etc.).
  const MEXICO_ESTADOS = {
    "Aguascalientes": ["Aguascalientes", "Jesús María", "Calvillo"],
    "Baja California": ["Tijuana", "Mexicali", "Ensenada", "Rosarito"],
    "Baja California Sur": ["La Paz", "Los Cabos", "San José del Cabo"],
    "Campeche": ["Campeche", "Ciudad del Carmen", "Champotón"],
    "Chiapas": ["Tuxtla Gutiérrez", "Tapachula", "San Cristóbal de las Casas", "Comitán"],
    "Chihuahua": ["Chihuahua", "Ciudad Juárez", "Cuauhtémoc", "Delicias"],
    "Ciudad de México": ["Ciudad de México"],
    "Coahuila": ["Saltillo", "Torreón", "Monclova", "Piedras Negras"],
    "Colima": ["Colima", "Manzanillo", "Tecomán"],
    "Durango": ["Durango", "Gómez Palacio", "Lerdo"],
    "Guanajuato": ["León", "Guanajuato", "Irapuato", "Celaya", "Salamanca"],
    "Guerrero": ["Acapulco", "Chilpancingo", "Iguala", "Taxco"],
    "Hidalgo": ["Pachuca", "Tulancingo", "Tula de Allende"],
    "Jalisco": ["Guadalajara", "Zapopan", "Tlaquepaque", "Puerto Vallarta", "Tonalá"],
    "México": ["Toluca", "Ecatepec", "Naucalpan", "Tlalnepantla", "Nezahualcóyotl"],
    "Michoacán": ["Morelia", "Uruapan", "Zamora", "Lázaro Cárdenas"],
    "Morelos": ["Cuernavaca", "Cuautla", "Jiutepec"],
    "Nayarit": ["Tepic", "Bahía de Banderas", "Santiago Ixcuintla"],
    "Nuevo León": ["Monterrey", "San Pedro Garza García", "Guadalupe", "San Nicolás de los Garza", "Apodaca"],
    "Oaxaca": ["Oaxaca de Juárez", "Salina Cruz", "Tuxtepec"],
    "Puebla": ["Puebla", "Tehuacán", "San Andrés Cholula", "Atlixco"],
    "Querétaro": ["Querétaro", "San Juan del Río", "Corregidora"],
    "Quintana Roo": ["Cancún", "Playa del Carmen", "Chetumal", "Tulum", "Cozumel"],
    "San Luis Potosí": ["San Luis Potosí", "Soledad de Graciano Sánchez", "Ciudad Valles"],
    "Sinaloa": ["Culiacán", "Mazatlán", "Los Mochis"],
    "Sonora": ["Hermosillo", "Ciudad Obregón", "Nogales", "Guaymas"],
    "Tabasco": ["Villahermosa", "Cárdenas", "Comalcalco"],
    "Tamaulipas": ["Reynosa", "Matamoros", "Nuevo Laredo", "Tampico", "Ciudad Victoria"],
    "Tlaxcala": ["Tlaxcala", "Apizaco", "Huamantla"],
    "Veracruz": ["Veracruz", "Xalapa", "Coatzacoalcos", "Córdoba", "Orizaba"],
    "Yucatán": ["Mérida", "Valladolid", "Progreso"],
    "Zacatecas": ["Zacatecas", "Fresnillo", "Guadalupe"]
  };

  function requireDb(){
    if(typeof db === 'undefined'){
      throw new Error('Firestore no está inicializado. Revisa que firebase-config.js esté cargado antes que listings.js, y que hayas pegado tu configuración real.');
    }
    return db;
  }

  function requireAuthUser(){
    if(typeof auth === 'undefined'){
      throw new Error('Firebase Auth no está inicializado. Revisa que firebase-config.js esté cargado antes que listings.js.');
    }
    const user = auth.currentUser;
    if(!user){
      const err = new Error('Necesitas iniciar sesión para hacer esto.');
      err.code = 'not-authenticated';
      throw err;
    }
    return user;
  }

  function docToEntry(doc){
    return Object.assign({id: doc.id}, doc.data());
  }

  async function getApproved(){
    const snap = await requireDb().collection(COLLECTION).where('status', '==', 'approved').get();
    return snap.docs.map(docToEntry);
  }

  async function getPending(){
    const snap = await requireDb().collection(COLLECTION).where('status', '==', 'pending').get();
    return snap.docs.map(docToEntry).sort((a, b) => {
      const ta = a.submittedAt && a.submittedAt.toMillis ? a.submittedAt.toMillis() : 0;
      const tb = b.submittedAt && b.submittedAt.toMillis ? b.submittedAt.toMillis() : 0;
      return ta - tb;
    });
  }

  async function getHiddenDemoIds(){
    const snap = await requireDb().collection(HIDDEN_DEMOS_COLLECTION).get();
    return snap.docs.map(d => d.id);
  }

  async function hideDemo(id){
    await requireDb().collection(HIDDEN_DEMOS_COLLECTION).doc(String(id)).set({
      hiddenAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function unhideDemo(id){
    await requireDb().collection(HIDDEN_DEMOS_COLLECTION).doc(String(id)).delete();
  }

  async function getVisibleDemos(){
    const hiddenIds = await getHiddenDemoIds();
    return DEMO_ABOGADOS.filter(d => !hiddenIds.includes(String(d.id)));
  }

  async function getAllListings(){
    const [demos, approved] = await Promise.all([getVisibleDemos(), getApproved()]);
    return demos.concat(approved);
  }

  async function submitRegistration(data){
    const user = requireAuthUser();
    const entry = {
      ownerUid: user.uid,
      nombre: (data.nombre || '').trim(),
      tipo: data.tipo === 'despacho' ? 'despacho' : 'individual',
      numAbogados: data.tipo === 'despacho' ? (data.numAbogados || '').toString().trim() : '',
      anioFundacion: data.tipo === 'despacho' ? (data.anioFundacion || '').toString().trim() : '',
      responsableNombre: data.tipo === 'despacho' ? (data.responsableNombre || '').trim() : '',
      responsableCedula: data.tipo === 'despacho' ? (data.responsableCedula || '').trim() : '',
      rfcPersonaMoral: data.tipo === 'despacho' ? (data.rfcPersonaMoral || '').trim() : '',
      especialidades: Array.isArray(data.especialidades) ? data.especialidades.slice(0, 3) : [],
      ciudad: (data.ciudad || '').trim(),
      telefono: (data.telefono || '').replace(/\D/g, ''),
      precio: '$$', // heredado — ya no se usa en pantalla si consultaDesde tiene valor
      consultaDesde: (data.consultaDesde === '' || data.consultaDesde === undefined || data.consultaDesde === null)
        ? null : Math.max(0, Number(data.consultaDesde) || 0),
      serviciosPrecio: [],
      rating: 0,
      reviews: 0,
      views: 0,
      contactClicks: 0,
      verificado: false,
      verificadoEmpresa: false,
      destacado: false,
      disponible: false,
      experiencia: '',
      bio: '',
      direccion: '',
      sitioWeb: '',
      facebook: '',
      instagram: '',
      linkedin: '',
      horario: '',
      fotoUrl: '',
      galeria: [],
      idiomas: [],
      promoTexto: '',
      promoHasta: '',
      faqPersonal: [],
      urgente24h: false,
      equipo: [],
      reseñas: [],
      status: 'pending',
      // Programa de referidos de dos lados -- ver "Programa de referidos"
      // en INSTRUCCIONES-FIREBASE.md. Se guarda una sola vez al crear el
      // registro (viene de ?ref= en registro.html) y las reglas de
      // Firestore bloquean cambiarlo después, para que nadie reclame un
      // referido después del hecho.
      referidoPor: (data.referidoPor || '').toString().trim().slice(0, 200) || null,
      submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await requireDb().collection(COLLECTION).add(entry);
    return ref.id;
  }

  // Cuenta cuántos referidos de un perfil ya fueron aprobados -- lo único
  // que de verdad cuenta para el premio (un registro que nunca se aprueba
  // no demuestra que el referido era real). No cuenta los que siguen
  // "pending": las reglas de Firestore solo dejan leer perfiles aprobados,
  // propios, o si eres admin -- un pendiente de alguien más no es
  // visible para el que refirió, a propósito, mismo principio que el
  // resto del sitio. El premio se aplica a mano por ahora, ver
  // INSTRUCCIONES-FIREBASE.md, sección "Programa de referidos".
  async function getMisReferidosAprobados(abogadoId){
    requireAuthUser();
    const snap = await requireDb().collection(COLLECTION).where('referidoPor', '==', String(abogadoId)).where('status', '==', 'approved').get();
    return snap.docs.map(doc => Object.assign({id: doc.id}, doc.data()));
  }

  // ---- Panel del abogado/despacho (dueño de un registro) ----
  // Campos que un dueño puede editar de su propio perfil. status, verificado,
  // rating, reviews, ownerUid y nombre quedan fuera — esos los controla el
  // admin (o, en el caso de nombre, requieren contactar al admin para evitar
  // que alguien cambie de identidad después de ser verificado).
  const OWNER_EDITABLE_FIELDS = ['nombre', 'tipo', 'numAbogados', 'anioFundacion', 'responsableNombre', 'responsableCedula', 'rfcPersonaMoral', 'especialidades', 'ciudad', 'telefono', 'precio', 'consultaDesde', 'serviciosPrecio', 'experiencia', 'bio', 'direccion', 'sitioWeb', 'facebook', 'instagram', 'linkedin', 'horario', 'fotoUrl', 'disponible', 'idiomas', 'promoTexto', 'promoHasta', 'faqPersonal', 'urgente24h', 'equipo'];
  const MAX_FAQ_PERSONAL = 5;
  const MAX_EQUIPO_MIEMBROS = 8;

  // ---- Adopción de Destacado por ciudad + especialidad ----
  // No hay cupo ni límite de cuántas cuentas pueden ser Destacado —
  // cualquiera puede pagar y activarse, sin tope. Esto solo mide, para
  // una categoría (ciudad + especialidad), cuántos de los competidores
  // ya son Destacado frente al total — la presión competitiva real no
  // viene de un cupo artificial, sino de que tu competencia ya te está
  // ganando el primer lugar en el buscador mientras tú no pagas.
  function getCategoriaCompetencia(listings, ciudad, especialidad){
    if(!ciudad || !especialidad) return {destacados: 0, total: 0};
    const enCategoria = (listings || []).filter(ab =>
      ab.status === 'approved' && ab.ciudad === ciudad && (ab.especialidades || []).includes(especialidad)
    );
    return {
      destacados: enCategoria.filter(ab => isDestacadoActivo(ab)).length,
      total: enCategoria.length
    };
  }

  function pickOwnerEditableFields(edits){
    const clean = {};
    OWNER_EDITABLE_FIELDS.forEach(key => {
      if(Object.prototype.hasOwnProperty.call(edits, key)) clean[key] = edits[key];
    });
    // No recortamos `especialidades` aquí a un número fijo: el tope real
    // (3 gratis, 5 si es Destacado) ya lo aplica el selector en la
    // interfaz y, de forma definitiva, las reglas de Firestore del lado
    // del servidor — cortar aquí a 3 le rompería el beneficio a las
    // cuentas Destacado.
    if(typeof clean.telefono === 'string') clean.telefono = clean.telefono.replace(/\D/g, '');
    if(typeof clean.nombre === 'string'){
      clean.nombre = clean.nombre.trim().slice(0, 120);
      // Nunca se manda un nombre vacío — las reglas de Firestore de todas
      // formas bloquean el cambio una vez que el perfil está verificado,
      // pero esto evita un guardado accidental en blanco mientras no lo está.
      if(!clean.nombre) delete clean.nombre;
    }
    if(Object.prototype.hasOwnProperty.call(clean, 'disponible')) clean.disponible = !!clean.disponible;
    if(Object.prototype.hasOwnProperty.call(clean, 'consultaDesde')){
      clean.consultaDesde = (clean.consultaDesde === '' || clean.consultaDesde === null || clean.consultaDesde === undefined)
        ? null : Math.max(0, Number(clean.consultaDesde) || 0);
    }
    if(Array.isArray(clean.serviciosPrecio)){
      clean.serviciosPrecio = clean.serviciosPrecio
        .slice(0, 8)
        .map(s => ({
          servicio: (s && s.servicio || '').toString().trim().slice(0, 60),
          desde: Math.max(0, Number(s && s.desde) || 0)
        }))
        .filter(s => s.servicio);
    }
    if(Array.isArray(clean.idiomas)){
      clean.idiomas = clean.idiomas
        .filter(i => IDIOMAS_OPTS.includes(i))
        .slice(0, IDIOMAS_OPTS.length);
    }
    if(typeof clean.promoTexto === 'string') clean.promoTexto = clean.promoTexto.trim().slice(0, 90);
    if(typeof clean.promoHasta === 'string'){
      // Solo se acepta el formato YYYY-MM-DD que manda un <input type="date">
      clean.promoHasta = /^\d{4}-\d{2}-\d{2}$/.test(clean.promoHasta) ? clean.promoHasta : '';
    }
    // FAQ personalizada -- funcionalidad de Destacado, pero el límite real
    // lo aplica la interfaz (no se muestra el editor si el perfil no es
    // Destacado); aquí solo sanitizamos por si acaso, igual que con
    // especialidades.
    if(Array.isArray(clean.faqPersonal)){
      clean.faqPersonal = clean.faqPersonal
        .slice(0, MAX_FAQ_PERSONAL)
        .map(f => ({
          pregunta: (f && f.pregunta || '').toString().trim().slice(0, 100),
          respuesta: (f && f.respuesta || '').toString().trim().slice(0, 300)
        }))
        .filter(f => f.pregunta && f.respuesta);
    }
    if(Object.prototype.hasOwnProperty.call(clean, 'urgente24h')) clean.urgente24h = !!clean.urgente24h;
    // Equipo del despacho -- "Comunidad" de Destacado para cuentas tipo
    // despacho. Igual que con especialidades y FAQ, el límite real lo
    // aplica la interfaz (no se muestra el editor si no es despacho
    // Destacado); aquí sanitizamos por si acaso.
    if(Array.isArray(clean.equipo)){
      clean.equipo = clean.equipo
        .slice(0, MAX_EQUIPO_MIEMBROS)
        .map(m => ({
          nombre: (m && m.nombre || '').toString().trim().slice(0, 80),
          rol: (m && m.rol || '').toString().trim().slice(0, 60),
          bio: (m && m.bio || '').toString().trim().slice(0, 200),
          telefono: (m && m.telefono || '').toString().replace(/\D/g, '').slice(0, 15)
        }))
        .filter(m => m.nombre);
    }
    return clean;
  }

  // Devuelve el texto de la promoción si está activa (tiene texto y, si
  // puso fecha límite, todavía no pasó), o null si no debe mostrarse.
  // Vive aquí para que todas las páginas que pintan tarjetas lo calculen
  // exactamente igual.
  function activePromo(l){
    if(!l || !l.promoTexto) return null;
    if(l.promoHasta && l.promoHasta < new Date().toISOString().slice(0, 10)) return null;
    return l.promoTexto;
  }

  // ---- Destacado con vigencia opcional ("Impulso puntual") ----
  // `destacado` sigue siendo el booleano de siempre (lo marca el admin al
  // activar una suscripción normal). `destacadoHasta` es opcional — solo
  // se usa para el Impulso puntual de 48-72 horas: el admin marca
  // `destacado: true` Y pone una fecha/hora límite en `destacadoHasta`
  // (ISO, ej. "2026-08-17T18:00:00"), y pasada esa fecha el perfil deja
  // de contar como Destacado automáticamente en TODAS las páginas, sin
  // que el admin tenga que acordarse de desmarcar la casilla. Una
  // suscripción normal simplemente no le pone `destacadoHasta` (o lo dejas
  // vacío) y dura hasta que se desmarque a mano. No es un campo editable
  // por el dueño del perfil — solo el admin lo controla, igual que
  // `destacado` mismo.
  function isDestacadoActivo(l){
    if(!l || !l.destacado) return false;
    if(l.destacadoHasta && new Date(l.destacadoHasta).getTime() < Date.now()) return false;
    return true;
  }

  // ---- Espacio publicitario vendible ----
  // Llena el `.ad-slot` que ya existía en perfil.html (antes solo decía
  // "Espacio publicitario disponible") con avisos reales, vendidos a
  // negocios complementarios (peritos, traductores certificados,
  // contadores, notarías) — no a otros abogados, para no competir
  // directamente con quien no pagó Destacado. Se administran a mano
  // desde la consola de Firestore (colección `avisos`) mientras no haya
  // panel — ver INSTRUCCIONES-FIREBASE.md, sección "Espacio publicitario
  // vendible". Un doc de `avisos`: {texto, linkUrl, especialidad
  // (opcional — vacío significa "en cualquier especialidad"), activo}.
  async function getAvisoActivo(especialidades){
    try{
      const snap = await requireDb().collection(AVISOS_COLLECTION).where('activo', '==', true).get();
      const avisos = snap.docs.map(doc => Object.assign({id: doc.id}, doc.data()));
      const props = especialidades || [];
      const relevantes = avisos.filter(a => !a.especialidad || props.includes(a.especialidad));
      const generales = avisos.filter(a => !a.especialidad);
      const pool = relevantes.length > 0 ? relevantes : generales;
      if(pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    } catch(err){
      console.error('No se pudo cargar el espacio publicitario.', err);
      return null;
    }
  }

  // ---- Comisión por caso ganado (auto-reporte) ----
  // Alternativa a la suscripción fija de Destacado: un despacho puede
  // reportar que cerró un caso real conseguido por Idóneo, y tú le
  // facturas por fuera (ver INSTRUCCIONES-FIREBASE.md, sección "Comisión
  // por caso ganado"). Es un registro que el dueño crea una sola vez por
  // caso y ya no puede editar ni borrar — sirve como bitácora confiable
  // de lo que hay que cobrar, no como algo que se pueda inflar o
  // manipular después.
  async function reportarCasoGanado(abogadoId, nota){
    const user = requireAuthUser();
    await requireDb().collection(CASOS_GANADOS_COLLECTION).add({
      abogadoId: String(abogadoId),
      reportedByUid: user.uid,
      nota: (nota || '').toString().trim().slice(0, 300),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  async function getMisCasosGanados(abogadoId){
    requireAuthUser();
    const snap = await requireDb().collection(CASOS_GANADOS_COLLECTION).where('abogadoId', '==', String(abogadoId)).get();
    return snap.docs.map(doc => Object.assign({id: doc.id}, doc.data()))
      .sort((a, b) => (b.createdAt ? b.createdAt.seconds : 0) - (a.createdAt ? a.createdAt.seconds : 0));
  }

  // ---- Foro de preguntas públicas ----
  // Cualquiera con sesión puede preguntar; solo cuentas dueñas de un
  // perfil aprobado pueden responder (lo hace cumplir firestore.rules
  // consultando el perfil real, no la interfaz) — así el foro no se
  // llena de respuestas anónimas o de quien no es abogado de verdad.
  // Ver INSTRUCCIONES-FIREBASE.md, sección "Foro de preguntas públicas".
  async function submitPregunta({titulo, cuerpo, especialidad}){
    const user = requireAuthUser();
    const tituloLimpio = (titulo || '').toString().trim().slice(0, 120);
    const cuerpoLimpio = (cuerpo || '').toString().trim().slice(0, 1000);
    if(!tituloLimpio) throw new Error('Escribe un título para tu pregunta.');
    const ref = await requireDb().collection(PREGUNTAS_COLLECTION).add({
      autorUid: user.uid,
      autorNombre: user.displayName || 'Usuario de Idóneo',
      titulo: tituloLimpio,
      cuerpo: cuerpoLimpio,
      especialidad: (especialidad || '').toString().trim().slice(0, 40),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  }

  async function getPreguntas(){
    const snap = await requireDb().collection(PREGUNTAS_COLLECTION).orderBy('createdAt', 'desc').limit(150).get();
    return snap.docs.map(doc => Object.assign({id: doc.id}, doc.data()));
  }

  async function getPregunta(preguntaId){
    const doc = await requireDb().collection(PREGUNTAS_COLLECTION).doc(String(preguntaId)).get();
    return doc.exists ? Object.assign({id: doc.id}, doc.data()) : null;
  }

  async function deletePregunta(preguntaId){
    requireAuthUser();
    await requireDb().collection(PREGUNTAS_COLLECTION).doc(String(preguntaId)).delete();
  }

  // Todas las respuestas de una sola vez, agrupadas por pregunta -- mismo
  // patrón que `getAllReviewsGrouped`, para mostrar "N respuestas" en la
  // lista del foro sin una consulta por pregunta.
  async function getAllRespuestasForoGrouped(){
    const snap = await requireDb().collection(RESPUESTAS_FORO_COLLECTION).get();
    const grouped = {};
    snap.docs.forEach(doc => {
      const data = doc.data();
      const key = String(data.preguntaId);
      if(!grouped[key]) grouped[key] = [];
      grouped[key].push(Object.assign({id: doc.id}, data));
    });
    return grouped;
  }

  async function getRespuestasForPregunta(preguntaId){
    const snap = await requireDb().collection(RESPUESTAS_FORO_COLLECTION).where('preguntaId', '==', String(preguntaId)).get();
    return snap.docs.map(doc => Object.assign({id: doc.id}, doc.data()))
      .sort((a, b) => (a.createdAt ? a.createdAt.seconds : 0) - (b.createdAt ? b.createdAt.seconds : 0));
  }

  async function submitRespuestaForo({preguntaId, abogadoId, texto}){
    const user = requireAuthUser();
    const textoLimpio = (texto || '').toString().trim().slice(0, 1500);
    if(!textoLimpio) throw new Error('Escribe tu respuesta.');
    const abogadoDoc = await requireDb().collection(COLLECTION).doc(String(abogadoId)).get();
    if(!abogadoDoc.exists) throw new Error('No encontramos tu perfil.');
    const abogado = abogadoDoc.data();
    if(abogado.ownerUid !== user.uid) throw new Error('Ese perfil no es tuyo.');
    if(abogado.status !== 'approved') throw new Error('Tu perfil todavía no está aprobado -- solo cuentas aprobadas pueden responder en el foro.');
    const ref = await requireDb().collection(RESPUESTAS_FORO_COLLECTION).add({
      preguntaId: String(preguntaId),
      autorUid: user.uid,
      abogadoId: String(abogadoId),
      abogadoNombre: abogado.nombre || 'Abogado de Idóneo',
      abogadoEspecialidades: abogado.especialidades || [],
      texto: textoLimpio,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  }

  async function deleteRespuestaForo(respuestaId){
    requireAuthUser();
    await requireDb().collection(RESPUESTAS_FORO_COLLECTION).doc(String(respuestaId)).delete();
  }

  // ---- Mensajeria interna ----
  // Alternativa privada al boton de WhatsApp: solo el cliente puede abrir
  // un hilo (nunca el despacho, para que nadie reciba mensajes en frio);
  // a partir de ahi ambos lados pueden escribirse dentro de Idoneo. Ver
  // INSTRUCCIONES-FIREBASE.md, seccion "Mensajeria interna".
  async function getOrCrearHilo(abogadoId, abogadoUid, nombreDespacho){
    const user = requireAuthUser();
    if(user.uid === abogadoUid) throw new Error('No puedes enviarte un mensaje a ti mismo.');
    const existente = await requireDb().collection(HILOS_COLLECTION)
      .where('clienteUid', '==', user.uid)
      .where('abogadoId', '==', String(abogadoId))
      .limit(1).get();
    if(!existente.empty) return existente.docs[0].id;
    const ref = await requireDb().collection(HILOS_COLLECTION).add({
      clienteUid: user.uid,
      clienteNombre: user.displayName || 'Cliente de Idóneo',
      abogadoId: String(abogadoId),
      abogadoUid: String(abogadoUid),
      abogadoNombre: (nombreDespacho || '').toString().trim().slice(0, 200) || 'Abogado de Idóneo',
      ultimoMensaje: '',
      ultimoMensajeAt: firebase.firestore.FieldValue.serverTimestamp(),
      ultimoMensajePor: '',
      noLeidoCliente: false,
      noLeidoAbogado: false,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    return ref.id;
  }

  async function getHilo(hiloId){
    const doc = await requireDb().collection(HILOS_COLLECTION).doc(String(hiloId)).get();
    return doc.exists ? Object.assign({id: doc.id}, doc.data()) : null;
  }

  function ordenarHilosPorActividad(lista){
    return lista.sort((a, b) => (b.ultimoMensajeAt ? b.ultimoMensajeAt.seconds : 0) - (a.ultimoMensajeAt ? a.ultimoMensajeAt.seconds : 0));
  }

  // Un hilo tiene dos lados (cliente y abogado) y Firestore no puede
  // filtrar por "clienteUid == X OR abogadoUid == X" en una sola
  // consulta con el SDK compat -- se piden ambos lados por separado y se
  // combinan aqui.
  async function getMisHilos(){
    const user = requireAuthUser();
    const [comoCliente, comoAbogado] = await Promise.all([
      requireDb().collection(HILOS_COLLECTION).where('clienteUid', '==', user.uid).get(),
      requireDb().collection(HILOS_COLLECTION).where('abogadoUid', '==', user.uid).get()
    ]);
    const lista = comoCliente.docs.concat(comoAbogado.docs).map(doc => Object.assign({id: doc.id}, doc.data()));
    return ordenarHilosPorActividad(lista);
  }

  // Version en vivo de getMisHilos: dos listeners (lado cliente y lado
  // abogado) que se combinan en un solo mapa por id de hilo, para que la
  // bandeja se actualice sola cuando llega un mensaje nuevo. Devuelve la
  // funcion para cancelar ambos listeners.
  function escucharMisHilos(callback){
    const user = requireAuthUser();
    const hilosPorId = new Map();
    function emit(){
      callback(ordenarHilosPorActividad(Array.from(hilosPorId.values())));
    }
    function wire(campo){
      return requireDb().collection(HILOS_COLLECTION).where(campo, '==', user.uid).onSnapshot(snap => {
        snap.docChanges().forEach(ch => {
          if(ch.type === 'removed') hilosPorId.delete(ch.doc.id);
          else hilosPorId.set(ch.doc.id, Object.assign({id: ch.doc.id}, ch.doc.data()));
        });
        emit();
      });
    }
    const unsub1 = wire('clienteUid');
    const unsub2 = wire('abogadoUid');
    return () => { unsub1(); unsub2(); };
  }

  // Requiere un indice compuesto (hiloId + createdAt) -- la primera vez
  // que corra en un proyecto real, Firestore da un link directo en la
  // consola de error para crearlo con un clic.
  function escucharMensajes(hiloId, callback){
    requireAuthUser();
    return requireDb().collection(MENSAJES_COLLECTION).where('hiloId', '==', String(hiloId)).orderBy('createdAt', 'asc')
      .onSnapshot(snap => {
        callback(snap.docs.map(doc => Object.assign({id: doc.id}, doc.data())));
      });
  }

  async function enviarMensaje(hiloId, texto){
    const user = requireAuthUser();
    const textoLimpio = (texto || '').toString().trim().slice(0, 2000);
    if(!textoLimpio) throw new Error('Escribe un mensaje.');
    const hilo = await getHilo(hiloId);
    if(!hilo) throw new Error('No encontramos esta conversación.');
    if(user.uid !== hilo.clienteUid && user.uid !== hilo.abogadoUid) throw new Error('No tienes acceso a esta conversación.');
    const esCliente = user.uid === hilo.clienteUid;
    await requireDb().collection(MENSAJES_COLLECTION).add({
      hiloId: String(hiloId),
      clienteUid: hilo.clienteUid,
      abogadoUid: hilo.abogadoUid,
      remitenteUid: user.uid,
      texto: textoLimpio,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await requireDb().collection(HILOS_COLLECTION).doc(String(hiloId)).update({
      ultimoMensaje: textoLimpio.slice(0, 300),
      ultimoMensajeAt: firebase.firestore.FieldValue.serverTimestamp(),
      ultimoMensajePor: user.uid,
      noLeidoCliente: !esCliente,
      noLeidoAbogado: esCliente
    });
  }

  async function marcarHiloLeido(hiloId){
    const user = requireAuthUser();
    const hilo = await getHilo(hiloId);
    if(!hilo) return;
    if(user.uid === hilo.clienteUid){
      await requireDb().collection(HILOS_COLLECTION).doc(String(hiloId)).update({noLeidoCliente: false});
    } else if(user.uid === hilo.abogadoUid){
      await requireDb().collection(HILOS_COLLECTION).doc(String(hiloId)).update({noLeidoAbogado: false});
    }
  }

  async function contarHilosNoLeidos(){
    const hilos = await getMisHilos();
    const user = requireAuthUser();
    return hilos.filter(h => (h.clienteUid === user.uid && h.noLeidoCliente) || (h.abogadoUid === user.uid && h.noLeidoAbogado)).length;
  }

  async function getMyListings(){
    const user = requireAuthUser();
    const snap = await requireDb().collection(COLLECTION).where('ownerUid', '==', user.uid).get();
    return snap.docs.map(docToEntry);
  }

  async function updateMyListing(id, edits){
    requireAuthUser();
    await requireDb().collection(COLLECTION).doc(id).update(pickOwnerEditableFields(edits || {}));
  }

  async function deleteMyListing(id){
    requireAuthUser();
    await requireDb().collection(COLLECTION).doc(id).delete();
  }

  // ---- Galería de fotos (exclusivo de cuentas Destacado) ----
  // arrayUnion/arrayRemove evitan condiciones de carrera con lecturas
  // viejas del arreglo. El tope real (hasta 4, solo si `destacado` es
  // true) lo aplican las reglas de Firestore, no este archivo.
  async function addToGaleria(id, url){
    requireAuthUser();
    await requireDb().collection(COLLECTION).doc(id).update({
      galeria: firebase.firestore.FieldValue.arrayUnion(url)
    });
  }

  async function removeFromGaleria(id, url){
    requireAuthUser();
    await requireDb().collection(COLLECTION).doc(id).update({
      galeria: firebase.firestore.FieldValue.arrayRemove(url)
    });
  }

  // Conveniencia para el panel de admin: ligar manualmente un registro
  // existente (de antes de que existiera este sistema de cuentas) a la
  // cuenta de su dueño, a partir del UID que el abogado te confirme.
  async function adminSetOwner(id, uid){
    await requireDb().collection(COLLECTION).doc(id).update({ownerUid: (uid || '').trim()});
  }

  async function approveRegistration(id, edits){
    await requireDb().collection(COLLECTION).doc(id).update(Object.assign({}, edits || {}, {status: 'approved'}));
  }

  async function rejectRegistration(id){
    await requireDb().collection(COLLECTION).doc(id).delete();
  }

  async function updateApproved(id, edits){
    await requireDb().collection(COLLECTION).doc(id).update(edits || {});
  }

  async function removeApproved(id){
    await requireDb().collection(COLLECTION).doc(id).delete();
  }

  function isDemo(id){
    return DEMO_ABOGADOS.some(d => String(d.id) === String(id));
  }

  // ---- Reseñas ----
  // Doc id = "<idAbogado>_<uidAutor>": como máximo una reseña por cuenta
  // por abogado (volver a enviar sobrescribe la anterior, no la duplica).
  function reviewDocId(abogadoId, uid){
    return String(abogadoId) + '_' + uid;
  }

  function getSeedReviews(abogadoId){
    const demo = DEMO_ABOGADOS.find(d => String(d.id) === String(abogadoId));
    if(!demo || !Array.isArray(demo.reseñas)) return [];
    return demo.reseñas.map((r, i) => ({
      id: 'seed_' + abogadoId + '_' + i,
      autorNombre: r.autor,
      texto: r.texto,
      estrellas: r.estrellas,
      autorUid: null,
      createdAt: null,
      seed: true
    }));
  }

  async function getReviews(abogadoId){
    const seed = getSeedReviews(abogadoId);
    const snap = await requireDb().collection(REVIEWS_COLLECTION).where('abogadoId', '==', String(abogadoId)).get();
    const live = snap.docs.map(doc => Object.assign({id: doc.id, seed: false}, doc.data()));
    return seed.concat(live);
  }

  // Trae TODAS las reseñas en una sola consulta y las agrupa por abogado —
  // mucho más eficiente que pedir las reseñas de cada abogado por separado
  // cuando se van a mostrar varias tarjetas a la vez (buscador principal).
  async function getAllReviewsGrouped(){
    const snap = await requireDb().collection(REVIEWS_COLLECTION).get();
    const byId = {};
    snap.docs.forEach(doc => {
      const data = doc.data();
      const key = String(data.abogadoId);
      if(!byId[key]) byId[key] = [];
      byId[key].push(Object.assign({id: doc.id, seed: false}, data));
    });
    return byId;
  }

  // Devuelve un mapa {abogadoId: {total, average, histogram}} para una
  // lista de abogados, combinando reseñas semilla (perfiles de ejemplo)
  // con las reseñas reales de Firestore.
  async function getStatsForListings(abogados){
    const grouped = await getAllReviewsGrouped();
    const statsMap = {};
    abogados.forEach(ab => {
      const seed = getSeedReviews(ab.id);
      const live = grouped[String(ab.id)] || [];
      statsMap[ab.id] = computeReviewStats(seed.concat(live));
    });
    return statsMap;
  }

  function computeReviewStats(reviews){
    const histogram = {5: 0, 4: 0, 3: 0, 2: 0, 1: 0};
    let sum = 0;
    reviews.forEach(r => {
      const stars = Math.min(5, Math.max(1, Math.round(r.estrellas)));
      histogram[stars]++;
      sum += r.estrellas;
    });
    const total = reviews.length;
    return { total, average: total ? sum / total : 0, histogram };
  }

  // ---- Idóneo Score ----
  // Puntaje de mérito (0-100), gratuito, calculado solo con datos que ya
  // existen — no es una insignia que se compre. Es lo que decide, además
  // de Destacado, quién entra a la Red de referidos y qué cuentas
  // gratuitas se distinguen en el buscador con "Alto desempeño". No mide
  // "tiempo de respuesta" porque el sitio no tiene mensajería interna
  // todavía (no hay forma honesta de medir eso sin inventar el dato).
  const IDONEO_SCORE_ALTO_DESEMPENO = 78;

  function computeProfileCompletenessScore(ab){
    const checks = [
      !!ab.fotoUrl, !!(ab.bio && ab.bio.trim()), !!(ab.experiencia && ab.experiencia.trim()),
      !!(ab.horario && ab.horario.trim()), !!(ab.direccion && ab.direccion.trim()),
      !!(ab.sitioWeb || ab.facebook || ab.instagram || ab.linkedin),
      typeof ab.consultaDesde === 'number',
      Array.isArray(ab.serviciosPrecio) && ab.serviciosPrecio.length > 0
    ];
    const done = checks.filter(Boolean).length;
    return done / checks.length; // 0..1
  }

  function computeIdoneoScore(ab, stats, casosGanadosCount){
    const s = stats || {average: 0, total: 0};
    const calificacion = s.total > 0 ? (s.average / 5) * 30 : 0;
    const participacion = Math.min(s.total, 15) * 1;
    const completitud = computeProfileCompletenessScore(ab) * 20;
    const verificacion = (ab.verificado ? 10 : 0) + (ab.verificadoEmpresa ? 5 : 0);
    const disponibilidad = (ab.disponible ? 5 : 0) + (ab.urgente24h ? 5 : 0);
    const casos = Math.min(casosGanadosCount || 0, 5) * 2;
    const total = calificacion + participacion + completitud + verificacion + disponibilidad + casos;
    return Math.round(Math.min(100, total));
  }

  async function getMyReview(abogadoId){
    const user = typeof auth !== 'undefined' ? auth.currentUser : null;
    if(!user) return null;
    const doc = await requireDb().collection(REVIEWS_COLLECTION).doc(reviewDocId(abogadoId, user.uid)).get();
    return doc.exists ? Object.assign({id: doc.id}, doc.data()) : null;
  }

  // Todas las reseñas que ha escrito el usuario actual, sin importar a qué
  // abogado — para la sección "Mis reseñas" en Mi cuenta. También trae el
  // nombre del abogado reseñado, porque la reseña sola no lo incluye.
  async function getMyReviewsAll(){
    const user = requireAuthUser();
    const snap = await requireDb().collection(REVIEWS_COLLECTION).where('autorUid', '==', user.uid).get();
    const reviews = snap.docs.map(doc => Object.assign({id: doc.id}, doc.data()));
    const abogadoIds = [...new Set(reviews.map(r => String(r.abogadoId)))];
    const nombres = {};
    await Promise.all(abogadoIds.map(async id => {
      try{
        const doc = await requireDb().collection(COLLECTION).doc(id).get();
        nombres[id] = doc.exists ? doc.data().nombre : 'Perfil eliminado';
      } catch(err){
        nombres[id] = 'Perfil eliminado';
      }
    }));
    return reviews.map(r => Object.assign({}, r, {abogadoNombre: nombres[String(r.abogadoId)] || 'Perfil eliminado'}));
  }

  async function submitReview(abogadoId, data){
    const user = requireAuthUser();
    const texto = (data.texto || '').trim().slice(0, 2000);
    const estrellas = Math.min(5, Math.max(1, Math.round(Number(data.estrellas) || 0)));
    // miembroNombre es opcional -- deja que quien reseña un despacho
    // etiquete su experiencia con un integrante específico del equipo
    // (ver "Equipo del despacho" en mi-cuenta.html) en vez de que la
    // reseña quede genérica sobre todo el despacho.
    const miembroNombre = (data.miembroNombre || '').toString().trim().slice(0, 80);
    // tramite es opcional y autoreportado por quien reseña -- no es una
    // "reseña verificada" (nadie confirma que el trámite ocurrió), es
    // contexto que el propio cliente añade para que la reseña sea más
    // útil ("Divorcio voluntario" en vez de un elogio genérico). Que
    // quede claro esto también en la interfaz, no solo aquí.
    const tramite = (data.tramite || '').toString().trim().slice(0, 60);
    // merge:true — así una edición del autor no borra la respuesta que el
    // despacho ya haya publicado en ese mismo documento de reseña.
    await requireDb().collection(REVIEWS_COLLECTION).doc(reviewDocId(abogadoId, user.uid)).set({
      abogadoId: String(abogadoId),
      autorUid: user.uid,
      autorNombre: user.displayName || user.email || 'Usuario de Idóneo',
      estrellas,
      texto,
      miembroNombre,
      tramite,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, {merge: true});
  }

  async function deleteMyReview(abogadoId){
    const user = requireAuthUser();
    await requireDb().collection(REVIEWS_COLLECTION).doc(reviewDocId(abogadoId, user.uid)).delete();
  }

  // ---- Respuesta del despacho a una reseña ----
  // Solo el dueño del despacho reseñado puede escribir/editar esto — las
  // reglas de Firestore lo hacen cumplir aparte de esta capa de cliente
  // (no pueden tocar el texto ni las estrellas de la reseña original).
  async function submitReviewReply(reviewId, respuesta){
    requireAuthUser();
    const texto = (respuesta || '').trim().slice(0, 1000);
    await requireDb().collection(REVIEWS_COLLECTION).doc(reviewId).update({
      respuesta: texto,
      respuestaAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  // ---- Contador de vistas de perfil ----
  // Público a propósito (no requiere sesión) para contar visitas reales,
  // no solo de cuentas logueadas. Las reglas de Firestore limitan esta
  // escritura exclusivamente a incrementar el campo `views` en 1 — no se
  // puede usar para cambiar ningún otro dato del registro.
  async function incrementProfileView(abogadoId){
    if(isDemo(abogadoId)) return;
    try{
      await requireDb().collection(COLLECTION).doc(String(abogadoId)).update({
        views: firebase.firestore.FieldValue.increment(1)
      });
    } catch(err){
      console.error('No se pudo registrar la vista del perfil.', err);
    }
  }

  // Igual que arriba, pero para clics al botón de WhatsApp — la señal más
  // directa de interés real (no solo "alguien abrió la página").
  async function incrementContactClick(abogadoId){
    if(isDemo(abogadoId)) return;
    try{
      await requireDb().collection(COLLECTION).doc(String(abogadoId)).update({
        contactClicks: firebase.firestore.FieldValue.increment(1)
      });
    } catch(err){
      console.error('No se pudo registrar el clic de contacto.', err);
    }
  }

  // ---- Sesión de administrador (Firebase Authentication) ----
  function adminSignIn(email, password){
    return auth.signInWithEmailAndPassword(email, password);
  }
  function adminSignOut(){
    return auth.signOut();
  }
  function onAdminAuthChanged(callback){
    return auth.onAuthStateChanged(callback);
  }

  global.IdoneoListings = {
    DEMO_ABOGADOS, MEXICO_ESTADOS, IDIOMAS_OPTS, MAX_FAQ_PERSONAL, MAX_EQUIPO_MIEMBROS,
    getCategoriaCompetencia,
    getApproved, getPending, getAllListings,
    submitRegistration, approveRegistration, rejectRegistration,
    updateApproved, removeApproved, isDemo,
    getHiddenDemoIds, hideDemo, unhideDemo, getVisibleDemos,
    getReviews, getAllReviewsGrouped, getStatsForListings, computeReviewStats,
    IDONEO_SCORE_ALTO_DESEMPENO, computeIdoneoScore, computeProfileCompletenessScore,
    getMyReview, getMyReviewsAll, submitReview, deleteMyReview, submitReviewReply, incrementProfileView, incrementContactClick, activePromo, isDestacadoActivo,
    getAvisoActivo, reportarCasoGanado, getMisCasosGanados,
    getMisReferidosAprobados,
    submitPregunta, getPreguntas, getPregunta, deletePregunta,
    getAllRespuestasForoGrouped, getRespuestasForPregunta, submitRespuestaForo, deleteRespuestaForo,
    getOrCrearHilo, getHilo, getMisHilos, escucharMisHilos, escucharMensajes, enviarMensaje, marcarHiloLeido, contarHilosNoLeidos,
    getMyListings, updateMyListing, deleteMyListing, adminSetOwner, addToGaleria, removeFromGaleria,
    adminSignIn, adminSignOut, onAdminAuthChanged
  };
})(window);
