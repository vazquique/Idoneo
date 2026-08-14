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
   como cualquier visitante que quiera reseñar o registrar su despacho con
   un clic). Firebase pide un correo de soporte del proyecto — pon el tuyo
   y guarda.
4. Pestaña **Users** → "Agregar usuario" → pon tu correo y una contraseña
   segura. Esta es la cuenta con la que vas a entrar al panel de admin
   (`index.html` dentro de la carpeta `admin`).
5. Haz clic en el usuario que acabas de crear y **copia su "User UID"**
   (una cadena larga tipo `aB3xY...`). La necesitas en el siguiente paso.

### Que Google funcione para cualquier persona, no solo para ti

Con solo activar el proveedor Google, el botón "Continuar con Google" ya
funciona **para ti** (el dueño del proyecto) — pero para que funcione con
cualquier cuenta de Google, sin importar de quién sea, faltan dos cosas:

1. **Publicar la pantalla de consentimiento OAuth**: ve a
   https://console.cloud.google.com/apis/credentials/consent (con el mismo
   proyecto que Firebase creó por ti — el selector de proyecto arriba debe
   decir el nombre de tu proyecto de Firebase). Si el "Estado de
   publicación" dice **Pruebas**, solo las cuentas que agregues a mano en
   "Usuarios de prueba" pueden iniciar sesión — cualquier otra persona ve
   un error o una advertencia. Dale clic a **Publicar aplicación**. Para
   los permisos básicos que usa Idóneo (correo, nombre, foto de perfil) no
   te va a pedir la revisión larga de Google — pasa a "Producción" de
   inmediato.
2. **Agregar el dominio de tu sitio a "Dominios autorizados"**: Firebase
   Console → Authentication → pestaña **Settings** → **Authorized
   domains**. Ahí ya vienen `localhost` y tu dominio de Firebase por
   default — agrega también el dominio de Netlify donde publiques
   `Idoneo/` (ej. `idoneo-abogados.netlify.app`, o tu dominio propio si
   usas uno). Sin este paso, el botón de Google falla con un error
   `auth/unauthorized-domain` en cualquier dominio que no esté en la lista.

(El inicio de sesión con correo y contraseña no tiene esta restricción —
funciona en cualquier dominio sin configuración extra.)

## 4. Activar Storage (fotos de perfil)

Esto es lo que permite que cualquier cuenta suba una foto de perfil real
desde `mi-cuenta.html` (se guarda en Firebase Storage, no en Firestore).
Si te lo saltas, el sitio sigue funcionando normal — solo el botón "Subir
foto" mostrará un mensaje de error en vez de subir la imagen.

1. Menú lateral: **Compilación → Storage**.
2. "Comenzar" → modo **producción** → misma región que elegiste para
   Firestore → Listo.
3. Pestaña **Reglas** → borra lo que haya y pega esto:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{uid} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == uid
                   && request.resource.size < 3 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
    match /logos/{uid}/{listingId} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == uid
                   && request.resource.size < 3 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
    match /galeria/{uid}/{listingId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null
                   && request.auth.uid == uid
                   && request.resource.size < 3 * 1024 * 1024
                   && request.resource.contentType.matches('image/.*');
      allow delete: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

4. Clic en **Publicar**.

Qué hace esto: cada cuenta solo puede subir o borrar fotos que vivan bajo
su propio UID (`avatars/<su UID>` para su foto personal, `logos/<su
UID>/<id del despacho>` para la foto de cada despacho que administra,
`galeria/<su UID>/<id del despacho>/<archivo>` para las fotos de galería
de una cuenta Destacado) — no puede tocar la foto de nadie más —, el
archivo tiene que ser una imagen, y no puede pesar más de 3MB. Cualquier
visitante puede **ver** las fotos (son públicas, como cualquier foto de
perfil o logo en un
directorio).

## 5. Marcarte como administrador

Firestore por sí solo no sabe quién eres "el dueño" del sitio — cualquier
visitante que reseñe también va a tener una cuenta de Firebase. Por eso
existe una colección aparte, `admins`, que solo tú (y quien tú agregues a
mano) puede tener:

1. Firestore Database → pestaña **Datos** → "Iniciar colección".
2. ID de la colección: `admins`
3. ID del documento: pega el **User UID** que copiaste en el paso 3.
4. Agrega un campo cualquiera, por ejemplo `role` (tipo string) con valor
   `admin` → Guardar.

Si en el futuro quieres que alguien más apruebe registros desde el panel
de admin, repite esto con el UID de esa persona.

## 6. Pegar las reglas de seguridad de Firestore

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

    // Dueño del despacho abogadoId, o null si ese id no existe como
    // documento real (por ejemplo, uno de los 8 perfiles de ejemplo).
    // El operador ?: evalúa el segundo get() solo si exists() es cierto,
    // así nunca se intenta leer un documento que no existe.
    function ownerOf(abogadoId) {
      return exists(/databases/$(database)/documents/abogados_registrados/$(abogadoId))
        ? get(/databases/$(database)/documents/abogados_registrados/$(abogadoId)).data.ownerUid
        : null;
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
                    && request.resource.data.reviews == 0
                    && request.resource.data.especialidades.size() <= 3;

      allow update: if isAdmin()
                    || (
                      request.auth != null
                      && resource.data.ownerUid == request.auth.uid
                      && request.resource.data.ownerUid == resource.data.ownerUid
                      && request.resource.data.status == resource.data.status
                      && request.resource.data.verificado == resource.data.verificado
                      && request.resource.data.get('verificadoEmpresa', false) == resource.data.get('verificadoEmpresa', false)
                      && request.resource.data.get('destacado', false) == resource.data.get('destacado', false)
                      && request.resource.data.rating == resource.data.rating
                      && request.resource.data.reviews == resource.data.reviews
                      && request.resource.data.get('views', 0) == resource.data.get('views', 0)
                      && request.resource.data.get('contactClicks', 0) == resource.data.get('contactClicks', 0)
                      // El nombre y el tipo de cuenta (abogado individual vs.
                      // despacho) solo se bloquean una vez que el admin aprobo
                      // y publico el perfil -- el registro queda unico y
                      // definitivo a partir de ahi. Mientras este en revision
                      // ("pending"), el dueno puede corregir su nombre o el
                      // tipo de cuenta libremente. Si despues necesita otro
                      // perfil distinto, tiene que registrar uno nuevo aparte.
                      && (resource.data.status != 'approved' || request.resource.data.nombre == resource.data.nombre)
                      && (resource.data.status != 'approved' || request.resource.data.tipo == resource.data.tipo)
                      // Tope de especialidades: 3 gratis, 5 si el despacho es
                      // "Destacado" (pagó) — el dueño no puede subir su propio
                      // tope cambiando `destacado`, porque ese campo está
                      // bloqueado arriba y solo lo puede tocar un admin.
                      && (
                        resource.data.get('destacado', false)
                          ? request.resource.data.especialidades.size() <= 5
                          : request.resource.data.especialidades.size() <= 3
                      )
                      // Galería de fotos: 0 fotos si no es Destacado, hasta 4
                      // si lo es — mismo principio que las especialidades.
                      && (
                        resource.data.get('destacado', false)
                          ? request.resource.data.get('galeria', []).size() <= 4
                          : request.resource.data.get('galeria', []).size() == 0
                      )
                    )
                    // Contador de vistas del perfil y de clics a WhatsApp:
                    // públicos a propósito (un visitante no necesita cuenta
                    // para "ver" un perfil o darle clic a WhatsApp), pero
                    // cada uno solo puede tocar SU campo, y solo para
                    // sumarle exactamente 1 — no se puede usar para cambiar
                    // nada más ni para inflar el contador de golpe.
                    || (
                      request.resource.data.diff(resource.data).affectedKeys().hasOnly(['views'])
                      && request.resource.data.views == resource.data.get('views', 0) + 1
                    )
                    || (
                      request.resource.data.diff(resource.data).affectedKeys().hasOnly(['contactClicks'])
                      && request.resource.data.contactClicks == resource.data.get('contactClicks', 0) + 1
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
                    && request.resource.data.texto.size() <= 2000
                    && ownerOf(request.resource.data.abogadoId) != request.auth.uid;
      allow update: if request.auth != null
                    && (
                      // El autor edita su propia reseña — no puede tocar la
                      // respuesta que el despacho ya haya publicado ahí.
                      (
                        resource.data.autorUid == request.auth.uid
                        && request.resource.data.autorUid == request.auth.uid
                        && request.resource.data.estrellas is number
                        && request.resource.data.estrellas >= 1
                        && request.resource.data.estrellas <= 5
                        && request.resource.data.texto is string
                        && request.resource.data.texto.size() <= 2000
                        && request.resource.data.get('respuesta', '') == resource.data.get('respuesta', '')
                      )
                      // El dueño del despacho reseñado responde — solo puede
                      // tocar `respuesta`, nunca el texto ni las estrellas
                      // de la reseña original.
                      || (
                        ownerOf(resource.data.abogadoId) == request.auth.uid
                        && request.resource.data.abogadoId == resource.data.abogadoId
                        && request.resource.data.autorUid == resource.data.autorUid
                        && request.resource.data.texto == resource.data.texto
                        && request.resource.data.estrellas == resource.data.estrellas
                        && request.resource.data.respuesta is string
                        && request.resource.data.respuesta.size() <= 1000
                      )
                    );
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
  `verificadoEmpresa`, `rating`, `reviews`, `nombre` u `ownerUid`, aunque lo
  intente manipulando la petición directamente (no solo escondiendo esos
  campos en el HTML). Esos campos siguen siendo exclusivos de un admin. El
  dueño también puede eliminar su propio registro.
- Solo un admin puede **aprobar** un registro, cambiar su estatus o su
  verificación, y solo un admin puede ocultar/restaurar perfiles de
  ejemplo (`demos_ocultos`).
- **Verificación de despachos**: como un despacho no tiene cédula propia,
  el registro le pide el nombre y la cédula profesional de su
  **responsable legal** — el campo `verificado` para un despacho significa
  "la cédula de su responsable ya se confirmó", no que el despacho entero
  esté certificado. Si además proporciona un RFC de persona moral, puede
  obtener el sello adicional "Persona moral verificada"
  (`verificadoEmpresa`) una vez que el admin confirme su constancia de
  situación fiscal por WhatsApp — es un campo aparte de `verificado`,
  también exclusivo de un admin, para que ambas verificaciones se puedan
  dar de forma independiente.
- **Reseñas** (`resenas`): cualquiera puede leerlas. Para crear o editar
  una, hay que tener sesión iniciada, y el id del documento debe ser
  exactamente `<idDelAbogado>_<tuUID>` — eso es lo que impide tener dos
  reseñas de la misma cuenta para el mismo abogado (la segunda sobrescribe
  la primera, no la duplica) y que alguien firme una reseña con el nombre
  de otra persona. Solo el autor de la reseña (o un admin) puede borrarla.
- **Auto-reseña bloqueada de verdad**: la regla de `create` en `resenas`
  consulta el registro del abogado (`get(...)`) y rechaza la reseña si
  quien la escribe es el mismo `ownerUid` de ese despacho — no es solo que
  la interfaz oculte el botón, Firestore la rechaza aunque alguien intente
  crearla directamente. (No aplica a los 8 perfiles de ejemplo, que no
  tienen dueño real.)
- Además, en `perfil.html`, si quien escribe una reseña también es dueño
  de **otro** despacho publicado en Idóneo, su reseña se marca con la
  etiqueta "Cuenta de despacho registrado" — no se bloquea (podría ser una
  reseña legítima, como un abogado contratando a otro para su propio
  caso), pero queda visible que no es un cliente cualquiera.
- **Respuesta pública del despacho a una reseña**: el dueño del despacho
  reseñado (`ownerOf(abogadoId) == tu UID`) puede escribir o editar el
  campo `respuesta` de esa reseña desde "Mi cuenta" — pero las reglas le
  bloquean tocar `texto`, `estrellas` o `autorUid`, aunque lo intente
  manipulando la petición directamente. El autor de la reseña, por su
  lado, puede seguir editando su propio texto/estrellas pero no puede
  tocar la `respuesta` que ya se haya publicado ahí.
- **Contador de vistas de perfil y de clics a WhatsApp** (`views` y
  `contactClicks` en `abogados_registrados`): cualquier visitante, sin
  necesidad de cuenta, dispara un incremento de `views` al abrir
  `perfil.html`, y de `contactClicks` al darle clic al botón de
  WhatsApp. Ambas reglas son deliberadamente públicas, pero cada una
  solo permite tocar su propio campo, y solo para sumarle exactamente 1
  por petición — no se puede usar para cambiar ningún otro dato del
  registro ni para inflar los contadores de golpe. `views` se muestra a
  cualquier dueño de registro en "Mi cuenta"; `contactClicks` es un
  beneficio exclusivo de las cuentas "Destacado" (ver abajo).
- **"Idóneo Destacado"** (`destacado` en `abogados_registrados`): igual
  que `verificado`, es un campo exclusivo de admin — el dueño no puede
  activarlo por su cuenta aunque manipule la petición directamente. Un
  despacho "Destacado" aparece primero en `buscar.html`, puede registrar
  hasta 5 especialidades en vez de 3 (la regla de `update` calcula el
  tope según el valor de `destacado` que ya está guardado, no el que el
  dueño intente mandar), y ve sus clics a WhatsApp en "Mi cuenta". Ver la
  sección "Activar cobros" más abajo para cómo se activa en la práctica.

> Si ya habías publicado unas reglas antes de que existieran `admins` o
> `resenas`, vuelve a pegar este bloque completo y publica de nuevo.
> **Importante:** haz esto ANTES de anunciar el sitio públicamente — con
> las reglas viejas, cualquier cuenta nueva podía editar el directorio.

## 7. Copiar la configuración a tu sitio

1. Icono de engranaje (arriba a la izquierda) → **Configuración del proyecto**.
2. Baja hasta "Tus apps" → clic en el ícono **</>** (Web) → ponle un nombre
   (ej. "idoneo-web") → Registrar app (no necesitas Firebase Hosting).
3. Te va a mostrar un bloque `firebaseConfig = {...}`. Copia esos valores.
4. Pégalos en **dos** archivos (son copias independientes, cada carpeta se
   publica por separado en Netlify):
   - `Idoneo/firebase-config.js`
   - `admin/firebase-config.js`

## 8. Probar

1. En `registro.html`, crea una cuenta (o inicia sesión) y llena el
   formulario de un abogado. Al terminar, ve a **Mi cuenta** (menú de tu
   cuenta, arriba a la derecha) — deberías ver tu registro como
   "Pendiente de revisión", editable.
2. Abre `index.html` (carpeta `admin`, junto a `Idoneo`), inicia sesión con
   el correo/contraseña del paso 3 — deberías ver el registro en
   "Pendientes de revisión". Apruébalo.
3. Confirma que el abogado aparece en `buscar.html` y en su `perfil.html`, y
   que en **Mi cuenta** (con la cuenta del abogado) ahora se ve como
   "Publicado", con un link a "Ver mi perfil público".
4. Con esa misma cuenta, edita algún campo (ciudad, bio) desde Mi cuenta y
   confirma que se refleja en `perfil.html`.
5. Crea una **segunda** cuenta distinta (otro correo, o modo incógnito) y
   escribe una reseña con estrellas para ese abogado — debe aparecer de
   inmediato en la lista, en el promedio y en el conteo por estrellas.
6. Confirma que esa segunda cuenta (la que solo reseñó) **no puede** entrar
   al panel de admin, ni ve nada en "Mi cuenta" salvo la opción de
   registrar su propio despacho — su UID no está en `admins` ni es dueña
   de ningún registro.
7. En **Mi cuenta**, arriba de tu(s) despacho(s) debe verse una tarjeta con
   tu nombre y un botón "Subir foto" — sube una imagen (menos de 3MB) y
   confirma que aparece tu foto ahí, en el menú de tu cuenta (arriba a la
   derecha, en cualquier página) y junto a tus reseñas en `perfil.html`.
8. Dentro de la tarjeta de tu despacho, sube también una foto del
   despacho (botón "Subir foto del despacho") y confirma que aparece en
   `perfil.html` y en las tarjetas de `buscar.html`.
9. Llena "Dirección", "Sitio web", "Facebook", "Instagram" y "LinkedIn"
   (los cinco son opcionales — puedes pegar el link completo o solo tu
   usuario, ej. `@midespacho`), guarda, y confirma que en tu
   `perfil.html` público aparecen como botones de colores que llevan a
   cada red.
10. En "Horario de atención", prueba el modo guiado (elige días y hora,
    o marca "Abierto las 24 horas") y confirma que arma el texto solo;
    prueba también "Prefiero escribirlo yo mismo" para escribirlo a mano.
11. Intenta guardar la tarjeta de tu despacho después de borrar
    "Especialidad", "Ciudad" o "WhatsApp" (los tres marcados con `*`) —
    debe rechazar el guardado y marcar el campo en rojo hasta que lo
    llenes de nuevo.
12. Abre `perfil.html?id=<tu-id>` un par de veces (o recarga) — confirma
    en **Mi cuenta** que el contador "visitas a tu perfil" va subiendo.
13. Con la **segunda** cuenta (la que solo reseñó), escribe una reseña.
    Con tu cuenta de despacho, ve a **Mi cuenta** → tus reseñas → dale
    "Responder", escribe algo y guarda. Confirma que la respuesta aparece
    en `perfil.html` bajo esa reseña, etiquetada con el nombre de tu
    despacho. Confirma también que la segunda cuenta **no puede** editar
    esa respuesta (no le aparece esa opción en ningún lado del sitio).
14. En `perfil.html`, dale clic a "Compartir" — en celular debería abrir
    el panel nativo de compartir; en escritorio debería copiar el link y
    mostrar "✓ Link copiado".
15. Marca a alguno de tus perfiles de prueba como "Destacado" desde el
    panel de admin. En "Mi cuenta" con esa cuenta, confirma que aparece
    el panel de estadísticas (vistas, clics, tasa de conversión,
    reseñas) y la sección de galería. Sube 2-3 fotos a la galería, y
    confirma que en `perfil.html` aparecen como un carrusel que rota
    solo — prueba las flechas y los puntos, y confirma que se detiene
    al pasar el mouse encima.
16. Intenta subir una 5ª foto a la galería (debe bloquearlo con un
    aviso) y quita una foto para confirmar que sí se borra tanto de la
    lista como del carrusel público.
17. Con una cuenta **sin** Destacado, confirma que no ve el panel de
    estadísticas ni la sección de galería — solo la tarjeta "Destaca tu
    perfil" con el botón de pago.

## Estructura de carpetas

```
Escritorio/
  Idoneo/                 ← sitio público (se publica en Netlify)
    index.html              ← portada / landing
    buscar.html             ← buscador y resultados
    registro.html
    perfil.html
    mi-cuenta.html          ← panel del abogado/despacho (editar, ver reseñas, eliminar)
    listings.js            ← lógica compartida con Firestore
    firebase-config.js      ← tus llaves reales
    auth.js                 ← login de visitantes (para reseñar y registrar despacho)
    sitemap.xml             ← páginas fijas, para que Google las encuentre
    robots.txt               ← le dice a Google dónde está el sitemap
  admin/                  ← panel de administración (se publica en GitHub Pages)
    index.html              ← antes se llamaba admin.html; GitHub Pages necesita index.html
    listings.js             ← copia idéntica a la de Idoneo/
    firebase-config.js       ← copia idéntica a la de Idoneo/
    auth.js                  ← no se usa en el panel de admin, solo por si acaso
```

`Idoneo/` y `admin/` son independientes a propósito — cada una se publica
por separado (`Idoneo/` en Netlify, `admin/` en GitHub Pages) y no pueden
compartir archivos entre sí. Eso significa que **`listings.js` y
`firebase-config.js` viven duplicados** en ambas carpetas: cualquier
cambio a la lógica de datos o a la configuración de Firebase hay que
aplicarlo en las dos copias.

### Publicar `admin/` en GitHub Pages

1. Sube el contenido de la carpeta `admin/` a un repositorio de GitHub
   (puede ser un repo aparte del de `Idoneo/`, o el mismo repo con
   `admin/` como subcarpeta).
2. En el repo → **Settings → Pages** → elige la rama y carpeta desde
   donde publicar (rama `main`, carpeta `/` si `admin/` es la raíz del
   repo, o `/admin` si comparte repo con `Idoneo/`).
3. GitHub Pages sirve automáticamente `index.html` como página de
   entrada — por eso `admin.html` se renombró a `index.html`.
4. El sitio queda en una URL pública tipo
   `https://tu-usuario.github.io/tu-repo/` — eso no es un problema de
   seguridad: nadie puede hacer nada sin iniciar sesión con una cuenta
   que esté en la colección `admins` de Firestore (ver paso 5), igual
   que ya explicamos que el `apiKey` de `firebase-config.js` está
   pensado para ser público.
5. Recuerda agregar ese dominio de GitHub Pages a **Authorized domains**
   en Firebase Authentication (mismo paso que hiciste para el dominio de
   Netlify), si vas a iniciar sesión con Google desde ahí.

## SEO básico

El sitio ya trae lo esencial para que Google lo pueda indexar bien:

1. **Reemplaza el dominio de ejemplo**: busca `TU-SITIO-PRINCIPAL.netlify.app`
   en `index.html`, `buscar.html`, `sitemap.xml` y `robots.txt`, y
   cámbialo por tu dominio real de Netlify (o el tuyo propio si usas uno).
2. **`perfil.html` actualiza su propio SEO en automático**: en cuanto
   carga los datos de un abogado/despacho, reescribe el `<title>`, la
   meta descripción, y agrega datos estructurados (`schema.org`,
   `Attorney`/`LegalService` con `AggregateRating` si ya tiene reseñas) —
   así Google puede mostrar estrellas de calificación directo en el
   resultado de búsqueda, sin que tengas que hacer nada manual por cada
   perfil nuevo.
3. **Sube `sitemap.xml`** a Google Search Console (Search Console →
   Sitemaps → pega la URL completa, ej.
   `https://tu-sitio.netlify.app/sitemap.xml`) para que Google encuentre
   tus páginas fijas más rápido. Los perfiles individuales (`perfil.html
   ?id=...`) no están en ese archivo porque son dinámicos — Google los
   encuentra solo, siguiendo los links desde `buscar.html`.
4. Ten en cuenta que el sitio es 100% HTML+JavaScript sin servidor — el
   contenido de cada perfil se carga después de que la página abre, no
   viene ya escrito en el HTML. Google normalmente sí ejecuta el
   JavaScript al indexar, pero es una limitación real: si algún día el
   tráfico de búsqueda se vuelve crítico para el negocio, lo siguiente
   que valdría la pena invertir es un sitio con renderizado del lado del
   servidor (por ejemplo con Next.js) — eso es un cambio de arquitectura
   grande, no algo para hacer "de pasada".

## Activar cobros con Stripe ("Idóneo Destacado")

Esto es la primera fase de monetización del sitio: un plan pagado que le
da a un despacho/abogado más visibilidad, no más "confianza" — la cédula
verificada sigue siendo gratis y por mérito, nunca algo que se compre.

**Qué incluye "Destacado"** ($299 MXN/mes sugerido, ajústalo a tu gusto):
- Aparece primero en los resultados de su ciudad/especialidad en `buscar.html`.
- Insignia dorada "✦ Destacado" (con brillo animado) en su tarjeta y su perfil.
- **Sin el bloque de publicidad** en su perfil público — una cuenta gratis sí lo ve.
- **Etiqueta "Disponible ahora"** (punto verde pulsante), que el propio abogado
  activa/desactiva desde "Mi cuenta" cuando tiene capacidad para tomar casos —
  campo `disponible` (boolean), no necesita reglas nuevas de Firestore.
- Hasta 5 especialidades en vez de 3.
- **Panel de estadísticas** en "Mi cuenta": vistas totales, clics reales a
  WhatsApp, tasa de conversión (clics ÷ vistas) y desglose de sus
  reseñas por número de estrellas — nada de esto lo ve una cuenta gratis.
- **Galería de hasta 4 fotos**, mostradas como carrusel rotativo en su
  perfil público (oficinas, equipo, certificados) — una cuenta gratis
  solo tiene la foto principal.

**Por qué es manual en esta beta**: el sitio no tiene backend (es HTML +
JavaScript + Firebase, sin servidor propio), así que no hay forma segura
de que un pago confirme algo automáticamente sin un webhook — y montar
webhooks requiere un servidor (por ejemplo, Firebase Functions), que es
una pieza de infraestructura nueva, no algo para agregar de pasada. La
solución honesta para arrancar: el pago es real y seguro (lo procesa
Stripe, nunca pasa por tus manos ni por este sitio), pero **tú activas
"Destacado" a mano** en el panel de admin — el mismo patrón que ya usas
para confirmar la cédula profesional.

## Funciones gratuitas para todas las cuentas (no solo Destacado)

Estas no necesitan reglas nuevas de Firestore — usan el mismo permiso
general que ya tiene cualquier dueño para editar su propio perfil:

- **Idiomas adicionales** (`idiomas`, arreglo de texto): el abogado marca
  en qué idiomas atiende además de español (inglés, francés, portugués,
  alemán, italiano, chino mandarín). Se muestra como insignia en su
  tarjeta/perfil, y hay un filtro "Solo abogados que atienden en inglés"
  en `buscar.html`.
- **Promoción temporal** (`promoTexto` + `promoHasta`): el abogado escribe
  un texto corto ("20% de descuento en tu primera consulta") y, si quiere,
  una fecha límite — se muestra como una insignia roja/naranja llamativa
  en su tarjeta y perfil mientras no haya vencido. Dejar `promoTexto`
  vacío la quita.
- **Medidor de perfil completo**: en "Mi cuenta" cada abogado ve un
  porcentaje y qué le falta llenar (foto, bio, horario, dirección, sitio
  web/red social, precio de consulta, precios por trámite) — no se guarda
  en Firestore, se calcula al vuelo a partir de los campos que ya existen.
- **Mensaje de WhatsApp precargado**: el botón "Contactar por WhatsApp" en
  el perfil ya abre el chat con un mensaje inicial listo ("Hola, encontré
  tu perfil en Idóneo y me gustaría platicar sobre un caso de ___."),
  usando el parámetro `?text=` de wa.me — no se guarda nada nuevo.
- **"Agregar a contactos"**: botón en el perfil que genera y descarga una
  tarjeta vCard (.vcf) con nombre, teléfono, ciudad y especialidades —
  para que el cliente lo guarde en los contactos de su teléfono con un
  clic, sin necesidad de copiar el número a mano.
- **Guardados** (favoritos del visitante): el ícono de marcador en cada
  tarjeta de `buscar.html` y el botón "Guardar" en el perfil viven en
  `localStorage` del navegador de quien los usa, no en Firestore — por
  eso funcionan incluso sin iniciar sesión. Si el visitante sí tiene
  cuenta, ve su lista completa en "Mi cuenta", junto con "Mis reseñas"
  (todas las que ha escrito, sin importar a qué abogado).

### 1. Crear el link de pago en Stripe

1. Crea una cuenta en https://stripe.com si no tienes una (necesitas
   datos de tu negocio/persona para poder recibir el dinero — Stripe te
   va a pedir esto en algún momento antes del primer pago real, pero
   puedes crear el link de pago antes de completar todo ese papeleo).
2. En el Dashboard de Stripe → **Payment links** → **Crear link de pago**.
3. Crea un producto nuevo: nombre "Idóneo Destacado", precio $299 MXN,
   **recurrente, cada mes** (así Stripe cobra automáticamente cada mes
   sin que el despacho tenga que volver a pagar a mano).
4. Guarda el link — se ve algo como `https://buy.stripe.com/xxxxx`.

### 2. Pegar el link en el sitio

Busca `TU-LINK-DE-PAGO` en `Idoneo/mi-cuenta.html` (la constante
`STRIPE_DESTACADO_LINK`, cerca de `destacadoSectionHTML`) y cámbialo por
tu link real de Stripe.

### 3. Activar "Destacado" cuando alguien paga

1. Stripe te avisa por correo cuando alguien paga (o revisas el
   Dashboard → Payments).
2. Contacta al despacho (mismo WhatsApp/correo que usaste para
   verificar su cédula) para confirmar cuál es su cuenta/perfil.
3. Entra al panel de admin → pestaña de perfiles **aprobados** → busca
   su tarjeta → marca la casilla **"✨ Destacado"** → Guardar cambios.
4. Para renovaciones automáticas de Stripe, no necesitas hacer nada cada
   mes — el cobro sigue solo. Solo tienes que estar pendiente si alguien
   **cancela** su suscripción en Stripe, para entonces desmarcar la
   casilla y que deje de aparecer como Destacado.

### Qué automatizar más adelante (no ahora)

Si esto funciona y quieres quitar el paso manual: la pieza que falta es
un **webhook** de Stripe (`checkout.session.completed` /
`invoice.paid`) que reciba el aviso de pago y actualice `destacado` en
Firestore directamente — eso requiere un pequeño backend (Firebase
Functions es la opción más natural, ya que ya usas Firebase). Es un
cambio de arquitectura razonable cuando tengas varios despachos pagando
y el proceso manual empiece a pesar, no algo urgente para el lanzamiento.

## Notas

- El archivo `firebase-config.js` no es secreto — el `apiKey` de Firebase
  está pensado para ser público (la seguridad real vive en las reglas de
  Firestore del paso 6, no en ocultar esa llave).
- El plan gratuito de Firebase (Spark) cubre muchísimo tráfico para un
  directorio como este, incluyendo Storage (5GB guardados, 1GB de
  descarga al día) — no deberías pagar nada al empezar.
- Solo `mi-cuenta.html` carga el SDK de Firebase Storage
  (`firebase-storage-compat.js`) — es la única página con botón de subir
  foto. Si algún día agregas subida de archivos en otra página, agrega ahí
  también ese `<script>`, antes de `firebase-config.js`.
- Las cuentas de "reseñador", "abogado/despacho" y "administrador" usan el
  mismo sistema (Firebase Authentication) — es la misma cuenta la que
  puede reseñar Y administrar un despacho, si así lo usa la persona. Lo
  que las distingue es a qué está ligada cada cosa: un registro de
  despacho queda ligado a la cuenta que lo creó (`ownerUid`), y el panel
  de administración solo a las cuentas en la colección `admins`.
- Si tienes registros de abogados hechos **antes** de que existiera este
  sistema de cuentas (sin `ownerUid`), nadie puede administrarlos desde
  "Mi cuenta" hasta que tú los ligues manualmente: en el panel de admin,
  cada tarjeta tiene un campo "Cuenta dueña (UID)" — pídele al abogado su UID
  (Firebase Console → Authentication → Users, o que te lo comparta si él
  mismo se metió a crear su cuenta) y pégalo ahí con "Vincular".
