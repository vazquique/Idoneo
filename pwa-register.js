// Registra el service worker para que el sitio se pueda instalar
// ("Agregar a pantalla de inicio" / ícono de instalar en Chrome) --
// ver INSTRUCCIONES-FIREBASE.md, sección "Sitio instalable (PWA)".
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.error('No se pudo registrar el service worker.', err);
    });
  });
}
