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
      reseñas: [],
      status: 'pending',
      submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await requireDb().collection(COLLECTION).add(entry);
    return ref.id;
  }

  // ---- Panel del abogado/despacho (dueño de un registro) ----
  // Campos que un dueño puede editar de su propio perfil. status, verificado,
  // rating, reviews, ownerUid y nombre quedan fuera — esos los controla el
  // admin (o, en el caso de nombre, requieren contactar al admin para evitar
  // que alguien cambie de identidad después de ser verificado).
  const OWNER_EDITABLE_FIELDS = ['tipo', 'numAbogados', 'anioFundacion', 'responsableNombre', 'responsableCedula', 'rfcPersonaMoral', 'especialidades', 'ciudad', 'telefono', 'precio', 'consultaDesde', 'serviciosPrecio', 'experiencia', 'bio', 'direccion', 'sitioWeb', 'facebook', 'instagram', 'linkedin', 'horario', 'fotoUrl', 'disponible'];

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
    return clean;
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

  async function getMyReview(abogadoId){
    const user = typeof auth !== 'undefined' ? auth.currentUser : null;
    if(!user) return null;
    const doc = await requireDb().collection(REVIEWS_COLLECTION).doc(reviewDocId(abogadoId, user.uid)).get();
    return doc.exists ? Object.assign({id: doc.id}, doc.data()) : null;
  }

  async function submitReview(abogadoId, data){
    const user = requireAuthUser();
    const texto = (data.texto || '').trim().slice(0, 2000);
    const estrellas = Math.min(5, Math.max(1, Math.round(Number(data.estrellas) || 0)));
    // merge:true — así una edición del autor no borra la respuesta que el
    // despacho ya haya publicado en ese mismo documento de reseña.
    await requireDb().collection(REVIEWS_COLLECTION).doc(reviewDocId(abogadoId, user.uid)).set({
      abogadoId: String(abogadoId),
      autorUid: user.uid,
      autorNombre: user.displayName || user.email || 'Usuario de Idóneo',
      estrellas,
      texto,
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
    DEMO_ABOGADOS, MEXICO_ESTADOS,
    getApproved, getPending, getAllListings,
    submitRegistration, approveRegistration, rejectRegistration,
    updateApproved, removeApproved, isDemo,
    getHiddenDemoIds, hideDemo, unhideDemo, getVisibleDemos,
    getReviews, getAllReviewsGrouped, getStatsForListings, computeReviewStats,
    getMyReview, submitReview, deleteMyReview, submitReviewReply, incrementProfileView, incrementContactClick,
    getMyListings, updateMyListing, deleteMyListing, adminSetOwner, addToGaleria, removeFromGaleria,
    adminSignIn, adminSignOut, onAdminAuthChanged
  };
})(window);
