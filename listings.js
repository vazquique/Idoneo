/*
  Idóneo — datos de abogados/despachos: los 8 perfiles de ejemplo del
  lanzamiento (fijos, en este archivo) + los registros reales, que ahora
  viven en Firestore (compartidos de verdad entre cualquier dispositivo).

  Se incluye en index.html, perfil.html, registro.html y admin.html
  DESPUÉS de firebase-app-compat.js, firebase-firestore-compat.js,
  firebase-auth-compat.js y firebase-config.js (ese orden importa: este
  archivo usa `db` y `auth`, definidos en firebase-config.js).

  Todas las funciones de datos son async (devuelven Promesas) porque ahora
  hablan con Firestore por red — el código que las usa debe hacer
  `await` o `.then()`.
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

  const COLLECTION = 'abogados_registrados';
  const HIDDEN_DEMOS_COLLECTION = 'demos_ocultos';

  function requireDb(){
    if(typeof db === 'undefined'){
      throw new Error('Firestore no está inicializado. Revisa que firebase-config.js esté cargado antes que listings.js, y que hayas pegado tu configuración real.');
    }
    return db;
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
    const entry = {
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
      status: 'pending',
      submittedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const ref = await requireDb().collection(COLLECTION).add(entry);
    return ref.id;
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
    DEMO_ABOGADOS,
    getApproved, getPending, getAllListings,
    submitRegistration, approveRegistration, rejectRegistration,
    updateApproved, removeApproved, isDemo,
    getHiddenDemoIds, hideDemo, unhideDemo, getVisibleDemos,
    adminSignIn, adminSignOut, onAdminAuthChanged
  };
})(window);
