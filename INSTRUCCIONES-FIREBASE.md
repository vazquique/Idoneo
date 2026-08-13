# Configurar Firebase para Idóneo

Sin estos pasos, el sitio sigue funcionando (muestra solo los 8 perfiles de
ejemplo), pero el registro de abogados, las cuentas de usuario, las
reseñas y el panel de administración no guardarán nada real hasta que
completes esto.

## 1. Crear el proyecto

1. Ve a https://console.firebase.google.com
2. "Crear un proyecto" → ponle un nombre (ej. `idoneo-abogados`) → puedes
   desactivar Google Analytics, no lo necesitas → Crear.

## 2. Activar Firestore (la base de datos)

1. En el menú lateral: **Compilación → Firestore Database**.
2. "Crear base de datos".
3. Modo: **producción** (no "modo de prueba").
4. Elige una región cercana (ej. `us-central1` o `southamerica-east1`).

## 3. Activar Authentication y crear tu usuario admin

1. Menú lateral: **Compilación → Authentication**.
2. "Comenzar" → pestaña **Sign-in method** → habilita **Correo electrónico/contraseña**.
3. En la misma pestaña, habilita también **Google** (lo van a usar tanto tú
   como cualquier visitante que quiera reseñar con un clic). Firebase pide
   un correo de soporte del proyecto — pon el tuyo y guarda.
4. Pestaña **Users** → "Agregar usuario" → pon tu correo y una contraseña
   segura. Esta es la cuenta con la que vas a entrar a `admin.html`.
5. Haz clic en el usuario que acabas de crear y **copia su "User UID"**
   (una cadena larga tipo `aB3xY...`). La necesitas en el siguiente paso.

## 4. Marcarte como administrador

Firestore por sí solo no sabe quién eres "el dueño" del sitio — cualquier
visitante que reseñe también va a tener una cuenta de Firebase. Por eso
existe una colección aparte, `admins`, que solo tú (y quien tú agregues a
mano) puede tener:

1. Firestore Database → pestaña **Datos** → "Iniciar colección".
2. ID de la colección: `admins`
3. ID del documento: pega el **User UID** que copiaste en el paso 3.
4. Agrega un campo cualquiera, por ejemplo `role` (tipo string) con valor
   `admin` → Guardar.

Si en el futuro quieres que alguien más apruebe registros desde
`admin.html`, repite esto con el UID de esa persona.

## 5. Pegar las reglas de seguridad

1. Firestore Database → pestaña **Reglas**.
2. Borra lo que haya y pega exactamente esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAdmin() {
      return request.auth != null
             && exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /admins/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if false;
    }

    match /abogados_registrados/{docId} {
      allow read: if resource.data.status == 'approved'
                  || isAdmin()
                  || (request.auth != null && resource.data.ownerUid == request.auth.uid);

      allow create: if request.auth != null
                    && request.resource.data.ownerUid == request.auth.uid
                    && request.resource.data.status == 'pending'
                    && request.resource.data.verificado == false
                    && request.resource.data.rating == 0
                    && request.resource.data.reviews == 0;

      allow update: if isAdmin()
                    || (
                      request.auth != null
                      && resource.data.ownerUid == request.auth.uid
                      && request.resource.data.ownerUid == resource.data.ownerUid
                      && request.resource.data.status == resource.data.status
                      && request.resource.data.verificado == resource.data.verificado
                      && request.resource.data.rating == resource.data.rating
                      && request.resource.data.reviews == resource.data.reviews
                      && request.resource.data.nombre == resource.data.nombre
                    );

      allow delete: if isAdmin() || (request.auth != null && resource.data.ownerUid == request.auth.uid);
    }

    match /demos_ocultos/{docId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /resenas/{reviewId} {
      allow read: if true;
      allow create: if request.auth != null
                    && reviewId == request.resource.data.abogadoId + '_' + request.auth.uid
                    && request.resource.data.autorUid == request.auth.uid
                    && request.resource.data.estrellas is number
                    && request.resource.data.estrellas >= 1
                    && request.resource.data.estrellas <= 5
                    && request.resource.data.texto is string
                    && request.resource.data.texto.size() <= 2000;
      allow update: if request.auth != null
                    && resource.data.autorUid == request.auth.uid
                    && request.resource.data.autorUid == request.auth.uid
                    && request.resource.data.estrellas is number
                    && request.resource.data.estrellas >= 1
                    && request.resource.data.estrellas <= 5
                    && request.resource.data.texto is string
                    && request.resource.data.texto.size() <= 2000;
      allow delete: if request.auth != null
                    && (resource.data.autorUid == request.auth.uid || isAdmin());
    }
  }
}
```

3. Clic en **Publicar**.

Qué hacen estas reglas:
- `isAdmin()` solo es verdad si tu UID está en la colección `admins` — no
  basta con tener sesión iniciada, así que una cuenta creada para reseñar
  o para registrar un despacho **no** puede tocar el directorio entero.
- Cualquier visitante puede **leer** perfiles ya aprobados. Los pendientes
  solo los puede leer un admin o el dueño de ese registro (`ownerUid`).
- Para **crear** un registro de abogado hay que tener sesión iniciada, y el
  registro queda automáticamente ligado a esa cuenta (`ownerUid`), como
  pendiente, sin verificar y sin rating.
- El **dueño** de un registro (`ownerUid == tu UID`) puede editarlo desde
  "Mi cuenta" — pero las reglas le bloquean cambiar `status`, `verificado`,
  `rating`, `reviews`, `nombre` u `ownerUid`, aunque lo intente manipulando
  la petición directamente (no solo escondiendo esos campos en el HTML).
  Esos campos siguen siendo exclusivos de un admin. El dueño también puede
  eliminar su propio registro.
- Solo un admin puede **aprobar** un registro, cambiar su estatus o su
  verificación, y solo un admin puede ocultar/restaurar perfiles de
  ejemplo (`demos_ocultos`).
- **Reseñas** (`resenas`): cualquiera puede leerlas. Para crear o editar
  una, hay que tener sesión iniciada, y el id del documento debe ser
  exactamente `<idDelAbogado>_<tuUID>` — eso es lo que impide tener dos
  reseñas de la misma cuenta para el mismo abogado (la segunda sobrescribe
  la primera, no la duplica) y que alguien firme una reseña con el nombre
  de otra persona. Solo el autor de la reseña (o un admin) puede borrarla.

> Si ya habías publicado unas reglas antes de que existieran `admins` o
> `resenas`, vuelve a pegar este bloque completo y publica de nuevo.
> **Importante:** haz esto ANTES de anunciar el sitio públicamente — con
> las reglas viejas, cualquier cuenta nueva podía editar el directorio.

## 6. Copiar la configuración a tu sitio

1. Icono de engranaje (arriba a la izquierda) → **Configuración del proyecto**.
2. Baja hasta "Tus apps" → clic en el ícono **</>** (Web) → ponle un nombre
   (ej. "idoneo-web") → Registrar app (no necesitas Firebase Hosting).
3. Te va a mostrar un bloque `firebaseConfig = {...}`. Copia esos valores.
4. Pégalos en **dos** archivos (son copias independientes, cada carpeta se
   publica por separado en Netlify):
   - `Idoneo/firebase-config.js`
   - `admin/firebase-config.js`

## 7. Probar

1. En `registro.html`, crea una cuenta (o inicia sesión) y llena el
   formulario de un abogado. Al terminar, ve a **Mi cuenta** (menú de tu
   cuenta, arriba a la derecha) — deberías ver tu registro como
   "Pendiente de revisión", editable.
2. Abre `admin.html` (carpeta `admin`, junto a `Idoneo`), inicia sesión con
   el correo/contraseña del paso 3 — deberías ver el registro en
   "Pendientes de revisión". Apruébalo.
3. Confirma que el abogado aparece en `index.html` y en su `perfil.html`, y
   que en **Mi cuenta** (con la cuenta del abogado) ahora se ve como
   "Publicado", con un link a "Ver mi perfil público".
4. Con esa misma cuenta, edita algún campo (ciudad, bio) desde Mi cuenta y
   confirma que se refleja en `perfil.html`.
5. Crea una **segunda** cuenta distinta (otro correo, o modo incógnito) y
   escribe una reseña con estrellas para ese abogado — debe aparecer de
   inmediato en la lista, en el promedio y en el conteo por estrellas.
6. Confirma que esa segunda cuenta (la que solo reseñó) **no puede** entrar
   a `admin.html`, ni ve nada en "Mi cuenta" salvo la opción de registrar
   su propio despacho — su UID no está en `admins` ni es dueña de ningún
   registro.

## Estructura de carpetas

```
Escritorio/
  Idoneo/                 ← sitio público (se publica solo en Netlify)
    index.html
    registro.html
    perfil.html
    mi-cuenta.html          ← panel del abogado/despacho (editar, ver reseñas, eliminar)
    listings.js            ← lógica compartida con Firestore
    firebase-config.js      ← tus llaves reales
    auth.js                 ← login de visitantes (para reseñar y registrar despacho)
  admin/                  ← panel de administración (se publica solo en Netlify)
    admin.html
    listings.js             ← copia idéntica a la de Idoneo/
    firebase-config.js       ← copia idéntica a la de Idoneo/
    auth.js                  ← no se usa en admin.html, solo por si acaso
```

`Idoneo/` y `admin/` son independientes a propósito — cada una se despliega
como un sitio de Netlify separado y no pueden compartir archivos entre sí.
Eso significa que **`listings.js` y `firebase-config.js` viven duplicados**
en ambas carpetas: cualquier cambio a la lógica de datos o a la
configuración de Firebase hay que aplicarlo en las dos copias.

## Notas

- El archivo `firebase-config.js` no es secreto — el `apiKey` de Firebase
  está pensado para ser público (la seguridad real vive en las reglas de
  Firestore del paso 5, no en ocultar esa llave).
- El plan gratuito de Firebase (Spark) cubre muchísimo tráfico para un
  directorio como este; no deberías pagar nada al empezar.
- Las cuentas de "reseñador", "abogado/despacho" y "administrador" usan el
  mismo sistema (Firebase Authentication) — es la misma cuenta la que
  puede reseñar Y administrar un despacho, si así lo usa la persona. Lo
  que las distingue es a qué está ligada cada cosa: un registro de
  despacho queda ligado a la cuenta que lo creó (`ownerUid`), y el panel
  de administración solo a las cuentas en la colección `admins`.
- Si tienes registros de abogados hechos **antes** de que existiera este
  sistema de cuentas (sin `ownerUid`), nadie puede administrarlos desde
  "Mi cuenta" hasta que tú los ligues manualmente: en `admin.html`, cada
  tarjeta tiene un campo "Cuenta dueña (UID)" — pídele al abogado su UID
  (Firebase Console → Authentication → Users, o que te lo comparta si él
  mismo se metió a crear su cuenta) y pégalo ahí con "Vincular".
