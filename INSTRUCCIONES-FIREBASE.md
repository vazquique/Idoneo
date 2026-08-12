# Configurar Firebase para Idóneo

Sin estos pasos, el sitio sigue funcionando (muestra solo los 8 perfiles de
ejemplo), pero el registro de abogados y el panel de administración no
guardarán nada real hasta que completes esto.

## 1. Crear el proyecto

1. Ve a https://console.firebase.google.com
2. "Crear un proyecto" → ponle un nombre (ej. `idoneo-abogados`) → puedes
   desactivar Google Analytics, no lo necesitas → Crear.

## 2. Activar Firestore (la base de datos)

1. En el menú lateral: **Compilación → Firestore Database**.
2. "Crear base de datos".
3. Modo: **producción** (no "modo de prueba").
4. Elige una región cercana (ej. `us-central1` o `southamerica-east1`).

## 3. Pegar las reglas de seguridad

1. Dentro de Firestore Database, pestaña **Reglas**.
2. Borra lo que haya y pega exactamente esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /abogados_registrados/{docId} {
      allow read: if resource.data.status == 'approved' || request.auth != null;
      allow create: if request.resource.data.status == 'pending'
                    && request.resource.data.verificado == false
                    && request.resource.data.rating == 0
                    && request.resource.data.reviews == 0;
      allow update, delete: if request.auth != null;
    }
    match /demos_ocultos/{docId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

3. Clic en **Publicar**.

Qué hacen estas reglas:
- Cualquier visitante puede **leer** perfiles ya aprobados (para que el buscador funcione).
- Solo tú, ya con sesión iniciada, puedes leer los **pendientes**.
- Cualquiera puede **crear** un registro nuevo (el formulario público), pero
  solo como pendiente, sin verificar y sin rating — nadie puede publicarse
  solo ni inventarse reseñas desde el formulario.
- Solo tú puedes **aprobar, editar o eliminar** registros.
- `demos_ocultos` guarda qué perfiles de ejemplo escondiste desde el panel —
  cualquiera puede leerla (para que el buscador sepa qué ocultar), pero solo
  tú puedes escribir en ella.

> Si ya habías publicado las reglas antes de que existiera `demos_ocultos`,
> vuelve a pegar este bloque completo y publica de nuevo — si no, el botón
> "Eliminar" de los perfiles de ejemplo en el panel fallará.

## 4. Activar Authentication y crear tu usuario admin

1. Menú lateral: **Compilación → Authentication**.
2. "Comenzar" → pestaña **Sign-in method** → habilita **Correo electrónico/contraseña**.
3. Pestaña **Users** → "Agregar usuario" → pon tu correo y una contraseña
   segura. Esta es la cuenta con la que vas a entrar a `admin.html`.

## 5. Copiar la configuración a tu sitio

1. Icono de engranaje (arriba a la izquierda) → **Configuración del proyecto**.
2. Baja hasta "Tus apps" → clic en el ícono **</>** (Web) → ponle un nombre
   (ej. "idoneo-web") → Registrar app (no necesitas Firebase Hosting).
3. Te va a mostrar un bloque `firebaseConfig = {...}`. Copia esos valores.
4. Abre [firebase-config.js](firebase-config.js) en esta carpeta y reemplaza
   cada `"TU_..._AQUI"` con el valor real correspondiente.

## 6. Probar

1. Abre `registro.html` en tu navegador y llena el formulario.
2. Abre `admin.html` (está en la carpeta `admin`, junto a `Idoneo`, no dentro
   de ella), inicia sesión con el correo/contraseña que creaste en el
   paso 4 — deberías ver el registro en "Pendientes de revisión".
3. Apruébalo y confirma que aparece en `index.html` y en su `perfil.html`.
4. Repite el registro desde **otro dispositivo o navegador** (o el modo
   incógnito) para confirmar que sí llega al mismo panel — esa es la
   diferencia con la versión anterior basada en localStorage.

## Estructura de carpetas

```
Escritorio/
  Idoneo/            ← sitio público
    index.html
    registro.html
    perfil.html
    listings.js       ← lógica compartida (Firestore)
    firebase-config.js ← tus llaves reales van aquí
    auth.js
  admin/              ← panel de administración
    admin.html         ← referencia ../Idoneo/listings.js y
                          ../Idoneo/firebase-config.js, no tiene copia propia
```

Las dos carpetas deben quedarse **una junto a la otra** (mismo nivel, dentro
de `Escritorio`) porque `admin.html` usa rutas relativas (`../Idoneo/...`)
para no duplicar `listings.js` ni `firebase-config.js`. Si mueves una
carpeta sin la otra, el panel dejará de cargar los datos.

## Notas

- El archivo `firebase-config.js` no es secreto — el `apiKey` de Firebase
  está pensado para ser público (la seguridad real vive en las reglas de
  Firestore del paso 3, no en ocultar esa llave).
- Si necesitas más de una persona aprobando registros, repite el paso 4
  para crear un usuario por persona — todos entran con las mismas reglas.
- El plan gratuito de Firebase (Spark) cubre muchísimo tráfico para un
  directorio como este; no deberías pagar nada al empezar.
