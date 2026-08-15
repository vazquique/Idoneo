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
                      && request.resource.data.get('destacadoHasta', null) == resource.data.get('destacadoHasta', null)
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

    // Espacio publicitario vendible (perfil.html, tarjeta ".ad-slot" en
    // perfiles que no son Destacado) — ver sección "Espacio publicitario
    // vendible" abajo. Solo el admin crea/edita avisos (se hace a mano
    // desde la consola de Firestore, no hay panel todavía), cualquiera
    // los puede leer para que se muestren.
    match /avisos/{avisoId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Auto-reporte de "caso ganado" para el esquema de comisión por
    // éxito — ver sección "Comisión por caso ganado" abajo. Es un
    // registro inmutable: el dueño del perfil lo crea una vez (no lo
    // puede editar ni borrar después, para que sirva como bitácora
    // confiable de lo que hay que facturar), y solo él o el admin lo
    // pueden leer.
    match /casos_ganados/{casoId} {
      allow read: if isAdmin() || (request.auth != null && ownerOf(resource.data.abogadoId) == request.auth.uid);
      allow create: if request.auth != null
                    && ownerOf(request.resource.data.abogadoId) == request.auth.uid
                    && request.resource.data.reportedByUid == request.auth.uid
                    && request.resource.data.abogadoId is string
                    && request.resource.data.nota is string
                    && request.resource.data.nota.size() <= 300;
      allow update, delete: if false;
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

(Este bloque es exactamente el contenido de `firestore.rules` en la carpeta del proyecto — si en algún momento no coinciden, confía en el archivo, no en esta copia.)

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
- **"Impulso puntual"** (`destacadoHasta` en `abogados_registrados`):
  igual que `destacado`, exclusivo de admin. Cuando lo pones junto con
  `destacado: true`, el perfil cuenta como Destacado solo hasta esa
  fecha/hora — pasada, deja de aparecer como tal en todo el sitio
  automáticamente (lo calcula `isDestacadoActivo()` en `listings.js`),
  sin que tengas que acordarte de desmarcar la casilla. Ver "Impulso
  puntual" más abajo.
- **`avisos`** (espacio publicitario vendible): colección aparte,
  pública para leer, exclusiva de admin para escribir — ver "Espacio
  publicitario vendible" más abajo.
- **`casos_ganados`** (comisión por caso ganado): colección aparte,
  cada documento lo crea una sola vez el dueño del perfil al que
  pertenece y después nadie lo puede editar ni borrar (ni el dueño ni
  el admin) — sirve como bitácora confiable de qué facturar. Ver
  "Comisión por caso ganado" más abajo.

> Si ya habías publicado unas reglas antes de que existieran `admins`,
> `resenas`, `avisos` o `casos_ganados`, vuelve a pegar este bloque
> completo y publica de nuevo. **Importante:** haz esto ANTES de anunciar
> el sitio públicamente — con las reglas viejas, cualquier cuenta nueva
> podía editar el directorio.

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
  una fecha límite — se muestra como una insignia "Oferta" en tono
  dorado/tinta (consistente con el resto del sitio) en su tarjeta y perfil
  mientras no haya vencido. Dejar `promoTexto` vacío la quita.
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
- **Radar de Plazos Legales** (`plazos.html` + `plazos.js`): calculadora
  de plazos legales orientativos (despido, amparo, demandas, recurso ante
  el SAT) que cuenta días hábiles reales en México (excluye fines de
  semana y los días de descanso obligatorio del Art. 74 LFT). Muestra una
  cuenta regresiva con semáforo de urgencia, deja descargar un
  recordatorio de calendario (.ics), copiar un resumen del caso para
  WhatsApp, y saltar directo al buscador filtrado por la especialidad
  correspondiente. Los plazos guardados también viven en `localStorage`
  (`idoneo_plazos`) — cero cambios de Firestore o reglas. El catálogo de
  trámites/plazos es editable directamente en el arreglo `TRAMITES` dentro
  de `plazos.js`.

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

Busca `TU-LINK-DE-PAGO` en **dos** archivos y cámbialo por tu link real
de Stripe en ambos (son dos constantes `STRIPE_DESTACADO_LINK`
independientes, una por archivo):
- `Idoneo/mi-cuenta.html` (cerca de `destacadoSectionHTML`) — el botón
  dentro de la vitrina que ve un abogado ya logueado.
- `Idoneo/destacado.html` (al final, antes de `</body>`) — el botón de
  la página de ventas pública, a la que ahora apuntan todos los enlaces
  "Idóneo Destacado" del menú y el pie de página.

### 3. Activar "Destacado" cuando alguien paga

1. Stripe te avisa por correo cuando alguien paga (o revisas el
   Dashboard → Payments).
2. Contacta al despacho (mismo WhatsApp/correo que usaste para
   verificar su cédula) para confirmar cuál es su cuenta/perfil.
3. Entra al panel de admin → pestaña de perfiles **aprobados** → busca
   su tarjeta → marca la casilla **"✨ Destacado"** → Guardar cambios.
   No hay cupo ni límite de cuántas cuentas pueden ser Destacado —
   actívalas todas las que paguen, sin excepción ni lista de espera.
4. Para renovaciones automáticas de Stripe, no necesitas hacer nada cada
   mes — el cobro sigue solo. Solo tienes que estar pendiente si alguien
   **cancela** su suscripción en Stripe, para entonces desmarcar la
   casilla y que deje de aparecer como Destacado.

### Impulso puntual — Destacado de 72 horas por $99 MXN

Alternativa a la suscripción mensual para quien no quiere comprometerse:
todas las ventajas de Destacado durante 3 días, pago único. Vive en
`destacado.html` (tarjeta debajo del precio principal, con su propio
botón "Activar mi Impulso de 72h").

1. **Crear el link de pago** (opcional pero recomendado): en Stripe,
   Payment Links → producto nuevo "Impulso puntual — Idóneo Destacado",
   $99 MXN, **pago único** (no recurrente). Mientras no lo crees, el
   botón manda un correo pre-armado — busca `IMPULSO_MAILTO` en
   `destacado.html` y `CONTACTO_ANUAL_EMAIL` (mismo correo que usa el
   plan anual) y cámbialo por el tuyo.
2. **Cuando alguien pague/pida un Impulso**: panel de admin → perfil
   aprobado → marca **"✨ Destacado"** igual que con la suscripción
   normal, **y además** ponle una fecha/hora límite al campo
   `destacadoHasta` (formato ISO, ej. `2026-08-17T18:00:00` — 72 horas
   después de activarlo). Si el panel de admin no tiene un campo para
   esto todavía, agrégalo ahí (es un campo más de texto en el mismo
   documento de Firestore) o edítalo directamente desde la consola de
   Firestore → colección `abogados_registrados` → el documento del
   perfil → agrega el campo `destacadoHasta` (tipo string).
3. **No tienes que acordarte de quitarlo**: pasada esa fecha,
   `isDestacadoActivo()` en `listings.js` deja de contarlo como
   Destacado en todo el sitio automáticamente (buscador, insignias,
   panel de estadísticas, especialidades extra, todo) — nunca desmarques
   la casilla "Destacado" a mano para un Impulso, solo pon la fecha y
   olvídalo.
4. Si el despacho decide pasarse a la suscripción mensual antes de que
   termine su Impulso, simplemente borra el campo `destacadoHasta` (o
   ponlo vacío) para que vuelva a ser Destacado indefinido, como
   cualquier suscripción normal.

### Competencia entre despachos (sin cupo)

En vez de limitar cuántas cuentas pueden ser Destacado, el sitio genera
presión competitiva real de dos formas, ambas sin quitarle nada a las
cuentas gratuitas ni topar cuántas pueden pagar:
- **Adopción por categoría**: `mi-cuenta.html` le muestra a cualquier
  cuenta no-Destacado cuántos de sus competidores directos (misma
  ciudad + especialidad) ya son Destacado (`getCategoriaCompetencia` en
  `listings.js`) — "3 de 5 despachos de Familiar en tu ciudad ya se
  destacaron". `destacado.html` tiene el mismo verificador para
  cualquier visitante, antes de pagar. Esto crea urgencia orgánica: entre
  más gente compra Destacado, más se queda atrás quien no lo hace — sin
  que tú tengas que topar nada.
- **Orden por desempeño dentro de Destacado**: pagar solo te mete al
  grupo que aparece primero — dentro de ese grupo, `buscar.html` ordena
  por señales reales (`destacadoScore` en `buscar.html`): si tiene
  "Disponible ahora" activo, su calificación promedio, número de
  reseñas, y qué tan completo está el perfil (foto, bio, urgente 24/7).
  Así que un despacho Destacado que se esfuerza le puede ganar el primer
  lugar a otro Destacado que solo pagó y dejó el perfil a medias — la
  competencia sigue siendo real todos los días, no solo el día del pago.

## Otros esquemas de cobro (ya construidos)

Todo lo de esta sección funciona hoy — cada uno es independiente de los
demás y de la suscripción Destacado, así que puedes activar solo los que
te interesen. Ninguno le quita nada a las cuentas gratuitas.

### Espacio publicitario vendible

`perfil.html` reserva un espacio con la etiqueta "Publicidad" en
perfiles que **no** son Destacado (para no competir con quien sí pagó).
Antes solo decía "Espacio publicitario disponible"; ahora carga avisos
reales desde Firestore (`getAvisoActivo()` en `listings.js`, colección
`avisos`) filtrados por especialidad, o generales si no hay uno
específico.

**A quién vendérselo**: negocios complementarios que quieren estar
frente a alguien que ya está viendo un abogado — peritos, traductores
certificados, contadores, notarías, agencias de trámites migratorios.
No a otros abogados (competirían directamente con el perfil que están
viendo).

**Cómo se administra** (no hay panel todavía, se hace a mano):
1. Ponte de acuerdo con el negocio sobre precio y duración (sugerido:
   $499–999 MXN/mes según qué tan específica sea la especialidad).
2. Firestore → colección `avisos` → nuevo documento con estos campos:
   - `texto` (string): el mensaje del aviso, ej. "Contadora certificada
     — declaraciones anuales desde $499".
   - `linkUrl` (string, opcional): a dónde va si le hacen clic. Si lo
     dejas vacío, se muestra el texto sin liga.
   - `especialidad` (string, opcional): déjalo vacío para que aparezca
     en cualquier especialidad, o pon el nombre exacto de una (ej.
     "Fiscal") para que solo aparezca ahí.
   - `activo` (boolean): `true` para que se muestre. Cuando termine el
     periodo pagado, ponlo en `false` (no lo borres — así conservas el
     historial de qué has vendido).
3. Listo — empieza a aparecer en los perfiles no-Destacado que
   correspondan, elegido al azar si hay varios avisos activos para la
   misma especialidad.

### Verificación de persona moral — $299 MXN, pago único

Ya existía el campo `verificadoEmpresa` y su insignia ("Persona moral
verificada"); lo que faltaba era el flujo de cobro. Ahora "Mi cuenta"
le muestra a cualquier despacho aprobado sin verificar una tarjeta
"Verifica tu persona moral" con un botón que manda un correo
pre-armado (constante `EMPRESA_VERIF_MAILTO` en `mi-cuenta.html`, mismo
correo que ya configuraste para el plan anual y el Impulso puntual).

1. El despacho te escribe pidiendo la verificación (con acta
   constitutiva y RFC adjuntos, según el mensaje pre-armado) y paga —
   mándale un Payment Link de Stripe para el monto que decidas cobrar
   (no es recurrente, así que un link simple sin suscripción basta).
2. Confirmas los documentos igual que ya confirmas cédulas
   profesionales.
3. Panel de admin → su perfil aprobado → marca el campo
   `verificadoEmpresa` → Guardar. La insignia "Persona moral verificada"
   aparece de inmediato en su perfil público y en "Mi cuenta".

### Comisión por caso ganado — alternativa sin riesgo a la suscripción

Para quien no quiere comprometerse a $299/mes: reporta cada caso real
que cerró gracias a Idóneo y le facturas aparte, solo por resultados.
Vive en "Mi cuenta" (tarjeta "Comisión por caso ganado", visible para
**cualquier** cuenta aprobada, no solo Destacado) — el dueño del perfil
escribe una nota breve y la envía; queda guardada en Firestore
(colección `casos_ganados`) de forma inmutable (ni él ni tú la pueden
editar o borrar después) para que sirva como bitácora confiable de qué
facturar.

**Precio sugerido**: $150–350 MXN por caso confirmado (monto fijo, no
porcentaje — no tienes forma de verificar cuánto cobró el despacho por
el caso, así que un monto fijo es lo único que se puede facturar de
forma justa y sin fricción).

**Cómo cobrar**:
1. Revisa periódicamente los reportes: no hay vista de admin todavía,
   así que entra a Firestore → colección `casos_ganados` para ver todos
   los reportes de todos los despachos (`abogadoId` te dice de quién
   es, cruza con `abogados_registrados` para el nombre/contacto).
2. Factura por fuera (transferencia, Stripe Payment Link, como
   prefieras) — este esquema no tiene checkout automático, es
   deliberadamente manual y basado en confianza, como cualquier cobro
   por resultados al inicio de un negocio.
3. Si alguien reporta casos falsos para presumir (poco probable, no hay
   incentivo — no le da nada gratis, solo te avisa que te debe dinero),
   trátalo como cualquier otro problema de honestidad con un cliente: es
   un riesgo aceptado de un modelo basado en confianza, no un hueco de
   seguridad de Firestore.

### Red de referidos entre Destacados (beneficio incluido, no se vende aparte)

No es un producto nuevo que cobrar — es una razón más para que alguien
elija la suscripción Destacado en vez del plan gratuito. "Mi cuenta" le
muestra a cualquier cuenta Destacado activa un directorio de otras
cuentas Destacado (priorizando especialidades distintas a la suya y su
misma ciudad — lo más útil para referir) con un botón "Referir un caso"
que abre WhatsApp con un mensaje profesional ya armado. No necesita
configuración de tu parte — funciona solo, en automático, a partir de
quién ya es Destacado.

### Kit de documentos legales descargables

Página nueva, `documentos.html` (enlazada desde el menú y el pie de
página de todo el sitio): 5 plantillas legales de referencia (carta
poder, contrato de arrendamiento básico, queja PROFECO, aviso de
rescisión laboral, contrato de prestación de servicios) desde $49 MXN
cada una, o las 5 juntas en el "Kit completo" por $199 MXN. Es el único
producto de este sitio dirigido al **cliente**, no al abogado — no
toca el directorio ni la búsqueda para nada, es un producto digital
aparte.

**Importante — esto no es contenido legal real todavía**: la página
describe los productos (nombre, precio, para qué sirve cada uno) pero
tú tienes que conseguir/redactar las plantillas de verdad antes de
vender nada — no uses un documento generado por IA sin que un abogado
real lo revise primero. Es exactamente el mismo principio que el resto
del sitio: aquí se construyó la tienda, no el producto legal.

1. **Consigue o redacta las 5 plantillas** — idealmente con un abogado
   real (tú mismo, si lo eres, o alguien de tu red) revisando cada una,
   en Word y PDF.
2. **Crea el link de pago del Kit completo** en Stripe (Payment Links →
   producto "Kit de documentos legales Idóneo", $199 MXN, pago único) y
   pégalo en `documentos.html` reemplazando `STRIPE_KIT_LINK`.
3. Para las compras individuales, el botón "Pedir por correo" de cada
   documento ya manda un correo pre-armado a `DOCUMENTOS_EMAIL` (mismo
   patrón que el resto del sitio) — busca esa constante en
   `documentos.html` y cámbiala por tu correo real.
4. Cuando te escriban pidiendo un documento: mándales un Payment Link
   de Stripe para ese monto específico (o cóbrales por otro medio) y,
   una vez pagado, respóndeles el correo con el documento adjunto.
5. Si un documento en particular se vende mucho, vale la pena crearle
   su propio Payment Link fijo (como el del Kit completo) en vez de
   cobrarlo por correo cada vez.

### Qué automatizar más adelante (no ahora)

Si esto funciona y quieres quitar el paso manual: la pieza que falta es
un **webhook** de Stripe (`checkout.session.completed` /
`invoice.paid`) que reciba el aviso de pago y actualice `destacado` en
Firestore directamente — eso requiere un pequeño backend (Firebase
Functions es la opción más natural, ya que ya usas Firebase). Es un
cambio de arquitectura razonable cuando tengas varios despachos pagando
y el proceso manual empiece a pesar, no algo urgente para el lanzamiento.

## Ideas para seguir monetizando y mejorando (sin implementar todavía)

Ya está construido: la página de ventas `destacado.html` (con toggle
mensual/anual), el espacio publicitario en `plazos.html` (un despacho
Destacado recomendado según la especialidad del plazo que acaba de
calcular el visitante — el momento de mayor intención de todo el
sitio), el Cuestionario de Match (`cuestionario.html`), la insignia
"Urgente 24/7" (gratis, en `buscar.html` y `perfil.html`), las
Preguntas frecuentes personalizadas por perfil (exclusivas de
Destacado, se editan en "Mi cuenta" y se ven en el perfil público), y
**Equipo del despacho** (exclusiva de Destacado, solo para cuentas tipo
despacho): cada integrante del equipo aparece con su nombre,
especialidad, bio breve y un botón de WhatsApp directo (a su propio
número si lo puso, o al número general del despacho si no) — para que
el cliente elija con quién quiere hablar en vez de escribirle a un
número genérico sin saber quién le va a contestar. Se edita en "Mi
cuenta" (campo `equipo`, hasta 8 integrantes) y se ve como directorio
en `perfil.html`. Ahora los clientes también pueden dejar una reseña
sobre un integrante específico del equipo (campo `miembroNombre` en la
reseña, seleccionable en el formulario de `perfil.html` y filtrable en
la lista de reseñas del perfil) — no solo del despacho en general.

También está construido el **panel de estadísticas con comparación de
categoría**: además de vistas, clics a WhatsApp y conversión, Destacado
ahora le dice a cada abogado/despacho cuánto va por encima o por debajo
del promedio de otros perfiles en su misma ciudad y especialidad
(`categoriaBenchmarkHTML` en `mi-cuenta.html`) — convierte un número
suelto ("340 vistas") en una prueba de que la suscripción está
funcionando ("40% arriba del promedio de tu categoría").

Y está construida la **competencia entre despachos sin cupo** (ver
sección "Competencia entre despachos (sin cupo)" arriba): cualquier
cuenta puede ser Destacado sin límite ni lista de espera, pero
`mi-cuenta.html` y `destacado.html` le muestran a cada quien cuántos de
sus competidores directos ya se destacaron, y dentro del grupo
Destacado el orden en `buscar.html` lo deciden señales reales
(disponibilidad, calificación, qué tan completo está el perfil), no
solo quién pagó primero. Genera presión competitiva real ("tu
competencia ya te está ganando el primer lugar") sin topar cuántas
cuentas pueden pagar ni quitarle nada a las cuentas gratuitas.

Y ahora está construido todo el resto de esquemas de cobro descritos
arriba en "Otros esquemas de cobro (ya construidos)": Impulso puntual
(Destacado de 72h por $99 MXN), espacio publicitario vendible
(`avisos`), verificación de persona moral como cargo único, comisión
por caso ganado (`casos_ganados`), red de referidos entre Destacados, y
el Kit de documentos legales (`documentos.html`). Cada uno tiene su
propia sección más arriba con los pasos exactos para activarlo/cobrarlo
— este resumen es solo para que no se te pierda ninguno:

| Esquema | A quién le cobra | Precio sugerido | Sección |
|---|---|---|---|
| Destacado (suscripción) | Abogado/despacho | $299 MXN/mes o $2,990/año | "Activar cobros con Stripe" |
| Impulso puntual | Abogado/despacho | $99 MXN / 72h | "Impulso puntual" |
| Espacio publicitario | Negocios complementarios | $499–999 MXN/mes | "Espacio publicitario vendible" |
| Verificación persona moral | Despacho | $299 MXN, único | "Verificación de persona moral" |
| Comisión por caso ganado | Abogado/despacho | $150–350 MXN/caso | "Comisión por caso ganado" |
| Red de referidos | (incluido en Destacado) | — | "Red de referidos" |
| Kit de documentos | Cliente final | $49–79 c/u, $199 el kit | "Kit de documentos legales" |

Quedan estas ideas sin construir, para cuando quieras seguir creciendo
el negocio:

- **"Idóneo Protegido" — garantía de primera respuesta** (ambiciosa, no
  construida a propósito): el cliente pagaría una cuota pequeña y única
  (ej. $79 MXN) al contactar a un abogado por el sitio; si no responde
  en 24 horas, se le reembolsa automáticamente y se le ofrece contactar
  a otro abogado de la misma especialidad sin costo extra. Es un
  producto de confianza real (no solo "aparece primero"), pero un sitio
  estático sin backend no puede prometer reembolsos automáticos de
  forma segura y honesta — necesitas manejar dinero en depósito y un
  flujo de disputa real, que es una pieza de infraestructura mucho más
  grande que el resto de este documento. No se construyó una versión a
  medias porque una "garantía" que no se puede cumplir de verdad es
  peor que no ofrecerla — cuando tengas un backend real (ver "Qué
  automatizar más adelante" abajo), retómala.

**Ambiciosas, no necesariamente de cobro (para cuando quieras seguir
"pensando en grande"):**
- **Sitio bilingüe para expatriados** — ya existe el filtro "atiende en
  inglés"; un sitio completo en inglés (o un toggle ES/EN) abriría el
  directorio a extranjeros viviendo en México que buscan abogado en su
  idioma — un segmento real y hoy desatendido. Es un proyecto grande
  (traducir cada página), no una tarde de trabajo — a propósito no se
  tocó esta vez, según lo que pediste.
- **Verificación de reseñas por teléfono real** — para blindar aún más
  la confianza del sitio frente a reseñas falsas, más allá del nombre
  real que ya se exige. Firebase Auth ya soporta verificación por SMS de
  forma nativa (gratis hasta cierto volumen), así que es técnicamente
  viable sin backend adicional — pero es un cambio de flujo de cuentas
  más grande que el resto de lo de esta lista, por eso quedó pendiente.

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
