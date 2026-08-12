/*
  Idóneo — inicio de sesión / creación de cuenta.
  Se incluye en cada página con <script src="auth.js" defer></script>
  y requiere un elemento con id="navAuth" en el header de esa página
  (fuera de .nav-links, para que siga visible aunque el menú colapse en móvil).

  Cuentas por correo/contraseña: se guardan en localStorage del navegador
  (hash SHA-256 de la contraseña, no texto plano). Esto es un prototipo
  sin backend — cualquiera con las herramientas de desarrollador puede
  ver la lista de cuentas. No usar como autenticación real en producción.

  Google: usa Google Identity Services (funciona sin backend). Para
  activarlo necesitas tu propio Client ID:
    1. https://console.cloud.google.com/apis/credentials
    2. Crear credencial → ID de cliente de OAuth → Aplicación web
    3. En "Orígenes de JavaScript autorizados" agrega el dominio donde
       sirvas el sitio (o http://localhost:PUERTO si pruebas local con
       un servidor — no funciona abriendo el archivo directo con file://)
    4. Copia el Client ID (termina en .apps.googleusercontent.com) y
       pégalo abajo en GOOGLE_CLIENT_ID.
  Mientras el Client ID siga siendo el de ejemplo, el botón de Google
  se reemplaza por una nota discreta (el detalle técnico solo sale en
  la consola, no se le muestra a quien visita el sitio).
*/
(function(){
  const GOOGLE_CLIENT_ID = 'TU_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

  const USERS_KEY = 'idoneo_users';
  const SESSION_KEY = 'idoneo_session';

  function getUsers(){
    try{ return JSON.parse(localStorage.getItem(USERS_KEY)) || []; }
    catch(e){ return []; }
  }
  function saveUsers(users){ localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
  function getSession(){
    try{ return JSON.parse(localStorage.getItem(SESSION_KEY)); }
    catch(e){ return null; }
  }
  function setSession(session){ localStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); }

  async function hashPassword(password){
    if(window.crypto && window.crypto.subtle){
      try{
        const enc = new TextEncoder().encode(password);
        const buf = await window.crypto.subtle.digest('SHA-256', enc);
        return 'sha256:' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch(e){ /* SubtleCrypto bloqueado (contexto no seguro) — usa el respaldo abajo */ }
    }
    let hash = 0;
    for(let i = 0; i < password.length; i++){ hash = ((hash << 5) - hash + password.charCodeAt(i)) | 0; }
    return 'fnv:' + (hash >>> 0).toString(16);
  }

  function decodeJwt(token){
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(json);
  }

  function initials(name){
    return (name || '').split(' ').filter(w => w.length > 1).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  }

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  const styles = `
    .auth-overlay{position:fixed; inset:0; background:rgba(24,38,68,0.65); display:none; align-items:center; justify-content:center; z-index:200; padding:20px;}
    .auth-overlay.show{display:flex;}
    .auth-modal{background:var(--parchment); color:var(--ink); border-radius:8px; width:100%; max-width:380px; padding:30px; position:relative; max-height:92vh; overflow-y:auto; box-shadow:0 30px 70px rgba(0,0,0,0.4);}
    .auth-modal-title{font-family:'Newsreader', serif; font-size:1.25rem; font-weight:600; margin-bottom:18px;}
    .auth-close{position:absolute; top:14px; right:14px; width:30px; height:30px; background:none; border:none; border-radius:50%; font-size:1.3rem; line-height:1; color:var(--ink-2); cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background 0.15s ease;}
    .auth-close:hover{background:rgba(24,38,68,0.08);}
    .auth-close:focus-visible, .auth-trigger:focus-visible, .auth-tab:focus-visible, .nav-account-menu button:focus-visible{outline:2px solid var(--brass); outline-offset:2px;}
    .auth-tabs{display:flex; gap:4px; background:#e4dbc4; border-radius:4px; padding:3px; margin-bottom:20px;}
    .auth-tab{flex:1; background:none; border:none; padding:9px; border-radius:3px; font-family:'IBM Plex Mono', monospace; font-size:0.74rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--ink-2); cursor:pointer; transition:background 0.15s ease, color 0.15s ease;}
    .auth-tab:hover{color:var(--ink);}
    .auth-tab.active{background:var(--parchment); color:var(--ink); box-shadow:0 1px 3px rgba(0,0,0,0.15);}
    .google-btn-container{display:flex; justify-content:center; min-height:40px;}
    .google-btn-note{width:100%; text-align:center; font-family:'IBM Plex Mono', monospace; font-size:0.72rem; color:#8a8069; border:1px dashed #c9bd9c; border-radius:4px; padding:12px; line-height:1.4;}
    .auth-divider{display:flex; align-items:center; gap:10px; margin:18px 0; font-family:'IBM Plex Mono', monospace; font-size:0.68rem; text-transform:uppercase; letter-spacing:0.05em; color:#8a8069;}
    .auth-divider::before, .auth-divider::after{content:''; flex:1; height:1px; background:#ddd2b0;}
    .auth-form{display:flex; flex-direction:column; gap:13px;}
    .auth-form .field label{display:block; font-size:0.8rem; font-weight:600; margin-bottom:5px; color:var(--ink-2);}
    .auth-form .field input{width:100%; padding:11px 12px; border:1px solid #c9bd9c; border-radius:3px; background:#fbf8f0; font-family:'IBM Plex Sans', sans-serif; font-size:0.94rem; color:var(--ink);}
    .auth-form .field input:focus-visible{outline:2px solid var(--brass); outline-offset:1px;}
    .auth-msg{display:none; font-size:0.8rem; color:#6b2a2a; background:#f2e6e6; padding:9px 11px; border-radius:3px;}
    .auth-msg.show{display:block;}
    .auth-form .submit-btn{margin-top:2px; background:var(--ink); color:var(--parchment); border:none; border-radius:3px; padding:13px 20px; font-family:'IBM Plex Mono', monospace; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.07em; cursor:pointer; transition:background 0.15s ease, opacity 0.15s ease;}
    .auth-form .submit-btn:hover{background:var(--ink-2);}
    .auth-form .submit-btn:disabled{opacity:0.6; cursor:default;}
    .auth-switch{margin-top:14px; text-align:center; font-size:0.82rem; color:#6b6250;}
    .auth-switch a{color:var(--brass); text-decoration:none; font-weight:600; cursor:pointer;}
    .auth-switch a:hover{text-decoration:underline;}

    .auth-slot{position:relative; display:flex; align-items:center;}
    .auth-trigger{display:inline-flex; align-items:center; gap:8px; background:none; border:1px solid var(--line-strong); border-radius:20px; padding:4px 14px 4px 4px; cursor:pointer; color:rgba(241,234,216,0.9); font-family:'IBM Plex Mono', monospace; font-size:0.74rem; text-transform:uppercase; letter-spacing:0.05em; transition:border-color 0.2s ease, background 0.2s ease;}
    .auth-trigger:hover{border-color:var(--brass-light); background:rgba(241,234,216,0.06);}
    .auth-avatar{width:26px; height:26px; border-radius:50%; background:rgba(241,234,216,0.14); color:var(--parchment); display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden;}
    .auth-avatar.is-user{background:var(--brass-light); color:var(--ink); font-family:'Newsreader', serif; font-weight:600; font-size:0.72rem;}
    .auth-avatar img{width:100%; height:100%; object-fit:cover;}
    .auth-label{white-space:nowrap;}
    .nav-account-menu{position:absolute; top:calc(100% + 8px); right:0; background:var(--parchment); color:var(--ink); border-radius:6px; min-width:190px; box-shadow:0 12px 32px rgba(0,0,0,0.32); padding:8px; display:none; z-index:60;}
    .nav-account-menu.show{display:block;}
    .nav-account-menu .who{padding:8px 10px; font-size:0.8rem; border-bottom:1px solid #ddd2b0; margin-bottom:6px; word-break:break-word;}
    .nav-account-menu .who .name{font-weight:600;}
    .nav-account-menu .who .email{color:#6b6250; font-size:0.74rem;}
    .nav-account-menu button{width:100%; text-align:left; background:none; border:none; padding:9px 10px; border-radius:3px; font-family:'IBM Plex Mono', monospace; font-size:0.74rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--ink); cursor:pointer;}
    .nav-account-menu button:hover{background:#e9e0c8;}

    @media (max-width: 560px){
      .auth-label{display:none;}
      .auth-trigger{padding:5px; border-radius:50%; border-color:transparent;}
    }
  `;

  const modalHTML = `
    <div class="auth-overlay" id="authOverlay" role="dialog" aria-modal="true" aria-labelledby="authModalTitle">
      <div class="auth-modal">
        <button class="auth-close" id="authClose" type="button" aria-label="Cerrar">&times;</button>
        <div class="auth-modal-title" id="authModalTitle">Tu cuenta en Idóneo</div>
        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login" type="button">Iniciar sesión</button>
          <button class="auth-tab" data-tab="signup" type="button">Crear cuenta</button>
        </div>
        <div id="googleBtnContainer" class="google-btn-container"></div>
        <div class="auth-divider"><span>o con tu correo</span></div>
        <form id="loginForm" class="auth-form" novalidate>
          <div class="field"><label for="loginEmail">Correo</label><input type="email" id="loginEmail" autocomplete="username" required></div>
          <div class="field"><label for="loginPassword">Contraseña</label><input type="password" id="loginPassword" autocomplete="current-password" required minlength="6"></div>
          <div class="auth-msg" id="loginError" role="alert"></div>
          <button type="submit" class="submit-btn">Iniciar sesión</button>
          <div class="auth-switch">¿No tienes cuenta? <a data-switch="signup">Créala aquí</a></div>
        </form>
        <form id="signupForm" class="auth-form" style="display:none" novalidate>
          <div class="field"><label for="signupNombre">Nombre</label><input type="text" id="signupNombre" autocomplete="name" required></div>
          <div class="field"><label for="signupEmail">Correo</label><input type="email" id="signupEmail" autocomplete="username" required></div>
          <div class="field"><label for="signupPassword">Contraseña (mínimo 6 caracteres)</label><input type="password" id="signupPassword" autocomplete="new-password" required minlength="6"></div>
          <div class="auth-msg" id="signupError" role="alert"></div>
          <button type="submit" class="submit-btn">Crear cuenta</button>
          <div class="auth-switch">¿Ya tienes cuenta? <a data-switch="login">Inicia sesión</a></div>
        </form>
      </div>
    </div>
  `;

  let injected = false;
  function injectOnce(){
    if(injected) return;
    injected = true;
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    const wrap = document.createElement('div');
    wrap.innerHTML = modalHTML;
    document.body.appendChild(wrap.firstElementChild);
  }

  function loadGSIScript(cb){
    if(window.google && window.google.accounts && window.google.accounts.id){ cb(); return; }
    const existing = document.getElementById('gsiScript');
    if(existing){ existing.addEventListener('load', () => cb()); existing.addEventListener('error', () => cb(new Error('load-failed'))); return; }
    const s = document.createElement('script');
    s.id = 'gsiScript';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true;
    s.onload = () => cb();
    s.onerror = () => cb(new Error('load-failed'));
    document.head.appendChild(s);
  }

  async function handleGoogleCredential(response){
    try{
      const payload = decodeJwt(response.credential);
      const email = (payload.email || '').toLowerCase();
      if(!email) throw new Error('sin-correo');
      const nombre = payload.name || email;
      const users = getUsers();
      let user = users.find(u => u.email.toLowerCase() === email);
      if(!user){
        user = {nombre, email, method:'google', avatar: payload.picture || ''};
        users.push(user);
        saveUsers(users);
      }
      setSession({nombre: user.nombre, email: user.email, avatar: user.avatar || payload.picture || '', method:'google'});
      closeAuthModal();
      updateAuthUI();
    } catch(err){
      const container = document.getElementById('googleBtnContainer');
      if(container) container.innerHTML = '<div class="google-btn-note">No se pudo completar el inicio con Google. Intenta con correo y contraseña.</div>';
    }
  }

  function renderGoogleButton(){
    const container = document.getElementById('googleBtnContainer');
    if(!container) return;
    if(GOOGLE_CLIENT_ID.indexOf('TU_GOOGLE_CLIENT_ID') === 0){
      console.info('[Idóneo] Falta configurar GOOGLE_CLIENT_ID en auth.js para activar "Continuar con Google".');
      container.innerHTML = '<div class="google-btn-note">Muy pronto: acceso directo con tu cuenta de Google.</div>';
      return;
    }
    container.innerHTML = '';
    loadGSIScript((err) => {
      if(err){
        container.innerHTML = '<div class="google-btn-note">No se pudo cargar el inicio con Google. Revisa tu conexión.</div>';
        return;
      }
      try{
        window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
        window.google.accounts.id.renderButton(container, { theme:'outline', size:'large', width:280, text:'continue_with', locale:'es' });
      } catch(e){
        container.innerHTML = '<div class="google-btn-note">No se pudo inicializar Google. Verifica el Client ID y el dominio autorizado.</div>';
      }
    });
  }

  function openAuthModal(tab){
    injectOnce();
    const overlay = document.getElementById('authOverlay');
    if(!overlay) return;
    overlay.classList.add('show');
    switchTab(tab || 'login');
    renderGoogleButton();
    const firstInput = overlay.querySelector('form:not([style*="display: none"]) input');
    if(firstInput) firstInput.focus();
  }
  function closeAuthModal(){
    const overlay = document.getElementById('authOverlay');
    if(overlay) overlay.classList.remove('show');
  }

  function switchTab(tab){
    document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.getElementById('loginForm').style.display = tab === 'login' ? 'flex' : 'none';
    document.getElementById('signupForm').style.display = tab === 'signup' ? 'flex' : 'none';
    document.getElementById('loginError').classList.remove('show');
    document.getElementById('signupError').classList.remove('show');
  }

  function showError(el, msg){
    el.textContent = msg;
    el.classList.add('show');
  }

  async function withSubmitLock(form, fn){
    const btn = form.querySelector('.submit-btn');
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Un momento…';
    try{ await fn(); }
    finally{ btn.disabled = false; btn.textContent = original; }
  }

  let wired = false;
  function wireModal(){
    if(wired) return;
    wired = true;

    document.getElementById('authClose').addEventListener('click', closeAuthModal);
    document.getElementById('authOverlay').addEventListener('click', (e) => {
      if(e.target.id === 'authOverlay') closeAuthModal();
    });
    document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeAuthModal(); });
    document.querySelectorAll('.auth-tab').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    document.querySelectorAll('[data-switch]').forEach(a => {
      a.addEventListener('click', () => switchTab(a.dataset.switch));
    });

    document.getElementById('signupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const nombre = document.getElementById('signupNombre').value.trim();
      const email = document.getElementById('signupEmail').value.trim().toLowerCase();
      const password = document.getElementById('signupPassword').value;
      const errEl = document.getElementById('signupError');
      errEl.classList.remove('show');
      if(!nombre || !email || password.length < 6){
        showError(errEl, 'Completa nombre, correo y una contraseña de al menos 6 caracteres.');
        return;
      }
      await withSubmitLock(form, async () => {
        const users = getUsers();
        if(users.some(u => u.email.toLowerCase() === email)){
          showError(errEl, 'Ya existe una cuenta con ese correo.');
          return;
        }
        const passwordHash = await hashPassword(password);
        users.push({nombre, email, passwordHash, method:'local'});
        saveUsers(users);
        setSession({nombre, email, method:'local'});
        form.reset();
        closeAuthModal();
        updateAuthUI();
      });
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const email = document.getElementById('loginEmail').value.trim().toLowerCase();
      const password = document.getElementById('loginPassword').value;
      const errEl = document.getElementById('loginError');
      errEl.classList.remove('show');
      await withSubmitLock(form, async () => {
        const users = getUsers();
        const user = users.find(u => u.email.toLowerCase() === email);
        if(!user || user.method !== 'local'){
          showError(errEl, user ? 'Esa cuenta inicia sesión con Google.' : 'No hay cuenta con ese correo.');
          return;
        }
        const passwordHash = await hashPassword(password);
        if(passwordHash !== user.passwordHash){
          showError(errEl, 'Contraseña incorrecta.');
          return;
        }
        setSession({nombre: user.nombre, email: user.email, method:'local'});
        form.reset();
        closeAuthModal();
        updateAuthUI();
      });
    });
  }

  function loggedOutHTML(){
    return `
      <button class="auth-trigger" id="navAuthTrigger" type="button" aria-haspopup="dialog">
        <span class="auth-avatar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </span>
        <span class="auth-label">Iniciar sesión</span>
      </button>
    `;
  }

  function loggedInHTML(session){
    const safeName = escapeHtml(session.nombre);
    const safeEmail = escapeHtml(session.email);
    const firstName = escapeHtml((session.nombre || '').split(' ')[0] || session.email);
    const avatarInner = session.avatar ? `<img src="${escapeHtml(session.avatar)}" alt="">` : escapeHtml(initials(session.nombre));
    return `
      <button class="auth-trigger" id="navAuthTrigger" type="button" aria-haspopup="menu">
        <span class="auth-avatar is-user">${avatarInner}</span>
        <span class="auth-label">${firstName}</span>
      </button>
      <div class="nav-account-menu" id="navAccountMenu" role="menu">
        <div class="who"><div class="name">${safeName}</div><div class="email">${safeEmail}</div></div>
        <button type="button" id="navLogoutBtn" role="menuitem">Cerrar sesión</button>
      </div>
    `;
  }

  function updateAuthUI(){
    const slot = document.getElementById('navAuth');
    if(!slot) return;
    const session = getSession();
    slot.innerHTML = session ? loggedInHTML(session) : loggedOutHTML();
  }

  function onDocumentClick(e){
    const trigger = e.target.closest('#navAuthTrigger');
    if(trigger){
      e.preventDefault();
      if(getSession()){
        const menu = document.getElementById('navAccountMenu');
        if(menu) menu.classList.toggle('show');
      } else {
        openAuthModal('login');
      }
      return;
    }
    if(e.target.closest('#navLogoutBtn')){
      clearSession();
      updateAuthUI();
      return;
    }
    const menu = document.getElementById('navAccountMenu');
    if(menu && menu.classList.contains('show') && !menu.contains(e.target)){
      menu.classList.remove('show');
    }
  }

  function initMobileNav(){
    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if(!toggle || !links) return;
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
    document.addEventListener('click', (e) => {
      if(links.classList.contains('open') && !links.contains(e.target) && !toggle.contains(e.target)){
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
    window.addEventListener('resize', () => {
      if(window.innerWidth > 680 && links.classList.contains('open')){
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  function init(){
    injectOnce();
    wireModal();
    updateAuthUI();
    initMobileNav();
    document.addEventListener('click', onDocumentClick);
    window.addEventListener('storage', (e) => {
      if(e.key === SESSION_KEY) updateAuthUI();
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
