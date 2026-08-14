/*
  Idóneo — abogados guardados por el visitante (localStorage, no Firestore).
  Es intencional que viva en el navegador y no en la cuenta: así funciona
  incluso para quien todavía no inició sesión, y no necesita reglas nuevas
  de seguridad ni una colección extra en la base de datos.
  Se incluye en cada página con: <script src="favorites.js"></script>
*/
(function(global){
  const KEY = 'idoneo_favoritos';

  function getAll(){
    try{
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {};
    } catch(err){
      return {};
    }
  }

  function persist(all){
    try{ localStorage.setItem(KEY, JSON.stringify(all)); } catch(err){ /* localStorage no disponible, no truena */ }
  }

  function isFavorite(id){
    return !!getAll()[String(id)];
  }

  // meta guarda una copia ligera del perfil (nombre, ciudad, etc.) para
  // poder pintar la lista de "Guardados" sin tener que releer Firestore —
  // puede quedar desactualizada si el abogado edita su perfil después.
  function toggle(id, meta){
    const all = getAll();
    const key = String(id);
    if(all[key]){
      delete all[key];
    } else {
      all[key] = Object.assign({savedAt: Date.now()}, meta || {});
    }
    persist(all);
    return !!all[key];
  }

  function remove(id){
    const all = getAll();
    delete all[String(id)];
    persist(all);
  }

  function list(){
    const all = getAll();
    return Object.keys(all)
      .map(id => Object.assign({id}, all[id]))
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }

  function count(){
    return Object.keys(getAll()).length;
  }

  global.IdoneoFavorites = {isFavorite, toggle, remove, list, count};
})(window);
