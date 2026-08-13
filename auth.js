/*
  Idóneo — inicio de sesión / creación de cuenta para visitantes del sitio.
  Se incluye en cada página con:
    <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js"></script>
    <script src="firebase-config.js"></script>
    <script src="auth.js" defer></script>
  y requiere un elemento con id="navAuth" en el header de esa página
  (fuera de .nav-links, para que siga visible aunque el menú colapse en móvil).

  Usa Firebase Authentication real (mismo proyecto que admin.html usa para
  el panel) — no localStorage. Esto es lo que permite que "hay que tener
  cuenta para reseñar" sea una regla de verdad, aplicada por las reglas de
  seguridad de Firestore (request.auth != null), no solo una pantalla que
  cualquiera podría saltarse desde la consola del navegador.

  Google: usa el proveedor de Google de Firebase Authentication. Actívalo en
  Firebase Console → Authentication → Sign-in method → Google. No necesita
  ningún Client ID pegado a mano aquí — Firebase lo maneja solo.

  Cuentas de reseñador vs. cuenta de administrador: son el mismo sistema de
  autenticación (Firebase Auth), pero NO dan los mismos permisos — quién
  puede editar el directorio de abogados lo deciden las reglas de Firestore
  (colección "admins"), no el simple hecho de haber iniciado sesión aquí.
*/
(function(){
  function requireAuth(){
    if(typeof auth === 'undefined'){
      throw new Error('Firebase Auth no está inicializado. Revisa que firebase-config.js esté cargado antes que auth.js.');
    }
    return auth;
  }

  function getCurrentUser(){
    return typeof auth === 'undefined' ? null : auth.currentUser;
  }
  function onAuthChanged(cb){
    return requireAuth().onAuthStateChanged(cb);
  }
  async function signUp(nombre, email, password){
    const cred = await requireAuth().createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({displayName: nombre});
    return cred.user;
  }
  function logIn(email, password){
    return requireAuth().signInWithEmailAndPassword(email, password);
  }
  function logOut(){
    return requireAuth().signOut();
  }
  function logInWithGoogle(){
    const provider = new firebase.auth.GoogleAuthProvider();
    return requireAuth().signInWithPopup(provider);
  }

  function friendlyAuthError(err){
    const map = {
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo.',
      'auth/invalid-email': 'Ese correo no es válido.',
      'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres.',
      'auth/wrong-password': 'Contraseña incorrecta.',
      'auth/user-not-found': 'No hay cuenta con ese correo.',
      'auth/invalid-login-credentials': 'Correo o contraseña incorrectos.',
      'auth/invalid-credential': 'Correo o contraseña incorrectos.',
      'auth/too-many-requests': 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
      'auth/network-request-failed': 'Revisa tu conexión a internet.',
      'auth/popup-blocked': 'Tu navegador bloqueó la ventana de Google. Permite ventanas emergentes e intenta de nuevo.'
    };
    return map[err.code] || 'Algo falló. Intenta de nuevo.';
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
    .auth-close:focus-visible, .auth-trigger:focus-visible, .auth-tab:focus-visible, .nav-account-menu button:focus-visible, .google-auth-btn:focus-visible{outline:2px solid var(--brass); outline-offset:2px;}
    .auth-tabs{display:flex; gap:4px; background:#e4dbc4; border-radius:4px; padding:3px; margin-bottom:20px;}
    .auth-tab{flex:1; background:none; border:none; padding:9px; border-radius:3px; font-family:'IBM Plex Mono', monospace; font-size:0.74rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--ink-2); cursor:pointer; transition:background 0.15s ease, color 0.15s ease;}
    .auth-tab:hover{color:var(--ink);}
    .auth-tab.active{background:var(--parchment); color:var(--ink); box-shadow:0 1px 3px rgba(0,0,0,0.15);}
    .google-auth-btn{width:100%; display:flex; align-items:center; justify-content:center; gap:10px; background:#fff; color:#3c4043; border:1px solid #c9bd9c; border-radius:3px; padding:11px 12px; font-family:'IBM Plex Sans', sans-serif; font-size:0.9rem; font-weight:600; cursor:pointer; transition:box-shadow 0.15s ease;}
    .google-auth-btn:hover{box-shadow:0 1px 6px rgba(0,0,0,0.2);}
    .google-auth-btn:disabled{opacity:0.6; cursor:default;}
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
    .auth-consent-row{display:flex; align-items:flex-start; gap:8px; font-size:0.78rem; color:#6b6250; cursor:pointer;}
    .auth-consent-row input{width:14px; height:14px; margin-top:2px; flex-shrink:0;}
    .auth-consent-row a{color:var(--brass); text-decoration:underline; font-weight:400;}
    .google-consent-note{font-size:0.72rem; color:#8a8069; text-align:center; margin-top:8px; line-height:1.4;}
    .google-consent-note a{color:var(--brass); text-decoration:underline;}

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
        <button class="google-auth-btn" id="googleAuthBtn" type="button">
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 12.4 3 3 12.4 3 24s9.4 21 21 21 21-9.4 21-21c0-1.4-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34.5 5.1 29.5 3 24 3 16.3 3 9.7 7.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 45c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.5 35.9 26.9 37 24 37c-5.2 0-9.6-3.3-11.3-8l-6.6 5.1C9.6 40.6 16.3 45 24 45z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.9l6.5 5.5C40.7 36.5 43 30.7 43 24c0-1.4-.1-2.7-.4-3.5z"/></svg>
          Continuar con Google
        </button>
        <p class="google-consent-note">Al continuar con Google, aceptas nuestro <a href="aviso-privacidad.html" target="_blank" rel="noopener">Aviso de Privacidad</a> y <a href="terminos.html" target="_blank" rel="noopener">Términos y Condiciones</a>.</p>
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
          <label class="auth-consent-row">
            <input type="checkbox" id="signupConsent">
            <span>Acepto el <a href="aviso-privacidad.html" target="_blank" rel="noopener">Aviso de Privacidad</a> y los <a href="terminos.html" target="_blank" rel="noopener">Términos y Condiciones</a>.</span>
          </label>
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

  function openAuthModal(tab){
    injectOnce();
    const overlay = document.getElementById('authOverlay');
    if(!overlay) return;
    overlay.classList.add('show');
    switchTab(tab || 'login');
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

  async function withSubmitLock(btn, fn){
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

    document.getElementById('googleAuthBtn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      await withSubmitLock(btn, async () => {
        try{
          await logInWithGoogle();
          closeAuthModal();
          updateAuthUI();
        } catch(err){
          if(err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
          const errEl = document.getElementById('loginError');
          showError(errEl, friendlyAuthError(err));
        }
      });
    });

    document.getElementById('signupForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('signupNombre').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const password = document.getElementById('signupPassword').value;
      const consent = document.getElementById('signupConsent').checked;
      const errEl = document.getElementById('signupError');
      errEl.classList.remove('show');
      if(!nombre || !email || password.length < 6){
        showError(errEl, 'Completa nombre, correo y una contraseña de al menos 6 caracteres.');
        return;
      }
      if(!consent){
        showError(errEl, 'Debes aceptar el Aviso de Privacidad y los Términos y Condiciones para crear tu cuenta.');
        return;
      }
      const btn = e.target.querySelector('.submit-btn');
      await withSubmitLock(btn, async () => {
        try{
          await signUp(nombre, email, password);
          e.target.reset();
          closeAuthModal();
          updateAuthUI();
        } catch(err){
          showError(errEl, friendlyAuthError(err));
        }
      });
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const errEl = document.getElementById('loginError');
      errEl.classList.remove('show');
      const btn = e.target.querySelector('.submit-btn');
      await withSubmitLock(btn, async () => {
        try{
          await logIn(email, password);
          e.target.reset();
          closeAuthModal();
          updateAuthUI();
        } catch(err){
          showError(errEl, friendlyAuthError(err));
        }
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

  function loggedInHTML(user){
    const nombre = user.displayName || user.email || 'Tu cuenta';
    const safeName = escapeHtml(nombre);
    const safeEmail = escapeHtml(user.email || '');
    const firstName = escapeHtml(nombre.split(' ')[0]);
    const avatarInner = user.photoURL ? `<img src="${escapeHtml(user.photoURL)}" alt="">` : escapeHtml(initials(nombre));
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
    const user = getCurrentUser();
    slot.innerHTML = user ? loggedInHTML(user) : loggedOutHTML();
  }

  function onDocumentClick(e){
    const trigger = e.target.closest('#navAuthTrigger');
    if(trigger){
      e.preventDefault();
      if(getCurrentUser()){
        const menu = document.getElementById('navAccountMenu');
        if(menu) menu.classList.toggle('show');
      } else {
        openAuthModal('login');
      }
      return;
    }
    if(e.target.closest('#navLogoutBtn')){
      logOut();
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
    initMobileNav();
    document.addEventListener('click', onDocumentClick);
    if(typeof auth !== 'undefined'){
      onAuthChanged(() => updateAuthUI());
    } else {
      console.error('[Idóneo] auth.js no pudo inicializarse: falta firebase-config.js con tu configuración real.');
      updateAuthUI();
    }
  }

  window.IdoneoAuth = { getCurrentUser, onAuthChanged, openAuthModal, closeAuthModal, logOut };

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
