/*
  Idóneo — configuración de Firebase.

  1. Ve a https://console.firebase.google.com y crea un proyecto (gratis).
  2. Configuración del proyecto (engranaje) → General → "Tus apps" → agrega
     una app web (ícono </>) → copia el objeto de configuración que te da.
  3. Pega esos valores abajo, reemplazando los "TU_..._AQUI".

  Ver INSTRUCCIONES-FIREBASE.md en esta misma carpeta para los pasos
  completos (Firestore, Authentication, reglas de seguridad).
*/
const firebaseConfig = {
  apiKey: "AIzaSyDWeTKSHe0md2acFQNlr6yanfjmUXIa3lI",
  authDomain: "idoneo-b9e76.firebaseapp.com",
  projectId: "idoneo-b9e76",
  storageBucket: "idoneo-b9e76.firebasestorage.app",
  messagingSenderId: "410839600199",
  appId: "1:410839600199:web:d58e59377685322a853562",
  measurementId: "G-J06YD9QGEH"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
