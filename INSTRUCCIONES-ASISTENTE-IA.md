# Cómo conectar un asistente con IA real y gratis a `cuestionario.html`

Este tutorial asume que **nunca has programado ni usado una terminal**.
Cada paso te dice exactamente qué vas a ver en la pantalla y qué
escribir. No vas a "programar" nada — vas a copiar y pegar texto que ya
te doy, en el orden correcto. Tómate tu tiempo, no hay prisa, y si algo
no se ve como se describe aquí, para y revisa antes de seguir.

## Qué vas a lograr (en español de a de veras)

Hoy, cuando alguien escribe su problema en `cuestionario.html`, el
sitio lo lee buscando palabras conocidas ("me despidieron" → laboral,
"me detuvieron" → penal). Funciona para casos claros, pero no entiende
nada raro o mal escrito. Vamos a conectarlo a Gemini, la inteligencia
artificial de Google, para que entienda de verdad lo que la persona
escribió — **gratis**, usando el nivel sin costo de Gemini.

No podemos simplemente "conectarlo y ya" porque tu llave secreta de
acceso a Gemini no se puede pegar directo en el sitio — cualquiera que
visite tu página podría robarla. Por eso el camino pasa por una pieza
intermedia de Google (una "Cloud Function") que guarda tu llave a
salvo. Instalar y configurar esa pieza es lo que hacen los pasos de
abajo.

## Antes de empezar: qué es una terminal

Vas a usar algo llamado **terminal** (o "PowerShell" en Windows): una
ventana donde escribes órdenes con el teclado en vez de hacer clic en
botones. Se ve como texto sobre fondo negro o azul oscuro. Da miedo la
primera vez, pero solo vas a escribir exactamente lo que este documento
te diga, tecla por tecla.

**Cómo abrirla en Windows:** aprieta la tecla de Windows (la del logo,
entre Ctrl y Alt), escribe `PowerShell`, y dale Enter cuando aparezca
"Windows PowerShell" en la lista. Se abre una ventana azul con texto —
esa es tu terminal.

Cada vez que este documento diga "escribe esto y dale Enter", es en esa
ventana. Vas a ver que, mientras algo está trabajando, el cursor no te
deja escribir — es normal, espera a que regrese.

## Paso 0 — Instala Node.js (si no lo tienes)

Todo lo demás depende de un programa llamado Node.js. Es gratis y se
instala como cualquier programa:

1. Ve a [nodejs.org](https://nodejs.org)
2. Descarga la versión que dice **LTS** (la recomendada, no la más
   nueva)
3. Ábrelo y dale "Siguiente" a todo, con las opciones que vienen por
   default — no necesitas cambiar nada
4. Cuando termine, **cierra la terminal si la tenías abierta y ábrela
   de nuevo** (si no, no va a reconocer el programa que acabas de
   instalar)

Para confirmar que quedó instalado, escribe esto en la terminal y dale
Enter:

```bash
node -v
```

Si ves algo como `v20.11.0` (un número empezando con "v"), ya quedó.
Si en vez de eso dice algo como "no se reconoce como un comando", el
programa no se instaló bien — repite este paso.

## Paso 1 — Activa el plan Blaze de Firebase

Esto es dar clics en una página web, no en la terminal:

1. Ve a [console.firebase.google.com](https://console.firebase.google.com)
   y entra a tu proyecto
2. Clic en el engranaje ⚙️ (arriba a la izquierda) → **Cambiar plan**
3. Elige **Blaze (pago por uso)**
4. Te va a pedir los datos de una tarjeta — es tuya, es tu cuenta, solo
   tú puedes ponerla

Esto **no te cobra nada por activarlo**. "Pago por uso" significa que
solo pagarías si algún día usas más de lo que Google regala gratis cada
mes — y para este sitio, es muy poco probable que eso pase pronto.

## Paso 2 — Consigue tu llave de acceso a Gemini (gratis)

1. Ve a [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Inicia sesión con una cuenta de Google (no pide tarjeta)
3. Botón **Create API key**
4. Te va a mostrar un texto largo tipo `AIzaSy...` — cópialo completo y
   pégalo en algún lugar seguro (una nota, un correo a ti mismo) porque
   lo vas a necesitar en el Paso 5

Piensa en esta llave como la contraseña de una cuenta — no la compartas
ni la publiques en ningún lado.

## Paso 3 — Instala la herramienta de Firebase

Con la terminal abierta (ver arriba cómo abrirla), escribe este primer
comando y dale Enter. Es un solo renglón; cópialo completo:

```bash
npm install -g firebase-tools
```

Vas a ver texto pasando por un rato (puede tardar 1-2 minutos) — está
descargando el programa. Cuando termine y te regrese el cursor, sigue
con el siguiente comando:

```bash
firebase login
```

Esto abre tu navegador automáticamente y te pide iniciar sesión con la
cuenta de Google de tu proyecto de Firebase. Dale clic a "Permitir" o
"Allow" donde te lo pida, y regresa a la ventana de la terminal — ya
debería decir algo como "Success! Logged in as..." con tu correo.

Ahora, muy importante: **necesitas estar parado en la carpeta correcta**
antes del siguiente comando. Si tu proyecto está en, por ejemplo,
`C:\Users\vazqu\OneDrive\Escritorio\Idoneo`, quieres estar un nivel
arriba de esa carpeta (en `Escritorio`, no dentro de `Idoneo`). Para
moverte ahí, escribe (ajustando la ruta a la tuya):

```bash
cd "C:\Users\vazqu\OneDrive\Escritorio"
```

Y ahora sí:

```bash
firebase init functions
```

Esto te va a hacer preguntas, una por una, directo en la terminal.
Contesta así (usa las flechas ↑↓ del teclado para moverte entre
opciones, y Enter para confirmar cada una):

1. **"Are you ready to proceed?"** → escribe `y` y Enter
2. Te muestra una lista de tus proyectos de Firebase → baja con la
   flecha hasta el tuyo, Enter
3. **"What language would you like to use?"** → baja hasta
   **JavaScript**, Enter
4. **"Do you want to use ESLint...?"** → escribe `n` (no) y Enter
5. **"Do you want to install dependencies now?"** → escribe `y` (sí) y
   Enter

Va a tardar otro par de minutos instalando cosas. Cuando termine, va a
haber aparecido una carpeta nueva llamada `functions` (dentro de la
carpeta donde corriste el comando) — eso es lo que necesitas para el
siguiente paso.

## Paso 4 — Pega el código de la Function

Esto ya no es en la terminal — es editar un archivo de texto.

1. Abre el explorador de archivos de Windows y busca la carpeta
   `functions` que se creó en el paso anterior
2. Adentro hay un archivo `index.js` — dale clic derecho → **Abrir
   con** → **Bloc de notas**
3. Selecciona todo el texto que ya tiene (Ctrl+A) y bórralo (tecla
   Suprimir)
4. Pega esto completo (Ctrl+V), respetando que quede exactamente así:

```js
const {onRequest} = require('firebase-functions/v2/https');
const {defineSecret} = require('firebase-functions/params');

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// Mismo orden que SITUACIONES en cuestionario.html -- si agregas una
// especialidad ahí, agrégala aquí también.
const ESPECIALIDADES = ['Familiar','Penal','Laboral','Mercantil','Corporativo','Migratorio','Bienes raíces','Fiscal','Amparo','Otra'];

// Límite muy simple contra abuso: máximo 20 peticiones por minuto por
// IP, guardado en memoria (se reinicia si la Function "se enfría" --
// para más tráfico, cambia esto por un contador en Firestore con un
// documento por IP y un TTL).
const rateLimitMap = new Map();
function rateLimited(ip){
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || {count: 0, resetAt: now + 60000};
  if(now > entry.resetAt){ entry.count = 0; entry.resetAt = now + 60000; }
  entry.count++;
  rateLimitMap.set(ip, entry);
  return entry.count > 20;
}

exports.asistente = onRequest(
  {secrets: [GEMINI_API_KEY], cors: true, region: 'us-central1'},
  async (req, res) => {
    if(req.method !== 'POST'){
      res.status(405).json({error: 'Usa POST'});
      return;
    }
    const ip = req.headers['x-forwarded-for'] || req.ip || 'desconocida';
    if(rateLimited(ip)){
      res.status(429).json({error: 'Demasiadas peticiones, espera un momento.'});
      return;
    }
    const texto = ((req.body && req.body.texto) || '').toString().trim().slice(0, 1000);
    if(!texto){
      res.status(400).json({error: 'Falta el texto'});
      return;
    }

    const prompt = `Eres el asistente de Idóneo, un directorio legal en México. Un usuario describió su situación legal. Clasifícala.

Especialidades válidas (usa EXACTAMENTE uno de estos valores, el que mejor aplique): ${ESPECIALIDADES.join(', ')}.

Responde ÚNICAMENTE con un objeto JSON válido, con esta forma exacta:
{"especialidad": "...", "urgencia": "urgente" | "normal" | "informativo" | null, "presupuesto": "economico" | "normal" | "premium" | null, "estado": "..." | null, "resumen": "una frase breve resumiendo su situación en tono cercano"}

"estado" es un estado de México si el texto lo menciona (ej. "Jalisco"), o null si no.

Texto del usuario: "${texto}"`;

    try{
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-goog-api-key': GEMINI_API_KEY.value()
          },
          body: JSON.stringify({
            contents: [{parts: [{text: prompt}]}],
            // Le pide a Gemini que regrese JSON directo, sin que tengas
            // que limpiar texto extra alrededor.
            generationConfig: {responseMimeType: 'application/json'}
          })
        }
      );
      if(!r.ok){
        console.error('Error de la API de Gemini:', r.status, await r.text());
        res.status(502).json({error: 'El asistente no está disponible ahora mismo.'});
        return;
      }
      const data = await r.json();
      const textoRespuesta = data.candidates
        && data.candidates[0]
        && data.candidates[0].content
        && data.candidates[0].content.parts
        && data.candidates[0].content.parts[0]
        && data.candidates[0].content.parts[0].text;
      let parsed;
      try{
        parsed = JSON.parse(textoRespuesta);
      } catch(e){
        console.error('Respuesta no era JSON válido:', textoRespuesta);
        res.status(502).json({error: 'No se pudo interpretar la respuesta del asistente.'});
        return;
      }
      if(!ESPECIALIDADES.includes(parsed.especialidad)) parsed.especialidad = 'Otra';
      res.status(200).json(parsed);
    } catch(err){
      console.error('Error llamando a la API de Gemini:', err);
      res.status(500).json({error: 'Algo falló. Intenta de nuevo.'});
    }
  }
);
```

5. Guarda con Ctrl+S y cierra el Bloc de notas

Eso es todo en este paso — no necesitas entender el código, solo que
quede pegado completo y guardado.

## Paso 5 — Guarda tu llave de Gemini de forma segura

De regreso en la terminal (la misma ventana de antes), escribe:

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Te va a preguntar algo como `Enter a value for GEMINI_API_KEY:` — ahí
pega la llave que copiaste en el Paso 2 (clic derecho → Pegar, porque
Ctrl+V a veces no funciona en la terminal) y dale Enter. **No vas a ver
lo que pegaste en pantalla** — es normal, es por seguridad, igual se
guardó. Si te pregunta algo más después, contesta que sí / Enter.

## Paso 6 — Sube tu Function a los servidores de Google ("desplegar")

```bash
firebase deploy --only functions
```

Esto tarda 1 a 3 minutos. Vas a ver mucho texto de progreso — normal,
no lo canceles. Si todo salió bien, cerca del final vas a ver algo como:

```
Function URL (asistente): https://us-central1-tu-proyecto.cloudfunctions.net/asistente
```

**Copia esa URL completa** — la necesitas ya para el último paso.

Si en vez de eso ves texto en rojo con la palabra "Error", algo salió
mal — revisa la sección de "Si algo no funciona" al final de este
documento antes de seguir.

## Paso 7 — Conecta `cuestionario.html`

Abre el archivo `Idoneo/cuestionario.html` con el Bloc de notas (clic
derecho → Abrir con → Bloc de notas) o, si tienes, con un editor como
VS Code o Notepad++ (más fáciles para encontrar texto largo).

Usa **Buscar** (Ctrl+F en el Bloc de notas) y busca el texto
`function procesarConsulta`. Justo **antes** de esa línea, pega esto,
reemplazando `TU-URL-AQUI` por la URL que copiaste en el Paso 6:

```js
const ASISTENTE_FUNCTION_URL = 'TU-URL-AQUI';
```

Ahora selecciona **toda** la función `procesarConsulta` — desde donde
dice `function procesarConsulta({texto, especialidadManual}){` hasta su
llave de cierre `}` que le corresponde (justo antes de la siguiente
función) — y reemplázala completa por esto:

```js
async function procesarConsulta({texto, especialidadManual}){
  const textoNorm = normalize(texto || '');
  let confianza = 0;
  if(especialidadManual){
    answers.situacion = especialidadManual;
    confianza = 99;
  } else if(texto && ASISTENTE_FUNCTION_URL){
    try{
      const r = await fetch(ASISTENTE_FUNCTION_URL, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({texto})
      });
      if(!r.ok) throw new Error('El asistente no respondió bien.');
      const data = await r.json();
      answers.situacion = data.especialidad || 'Otra';
      if(data.urgencia) answers.urgencia = data.urgencia;
      if(data.presupuesto) answers.presupuesto = data.presupuesto;
      if(data.estado) answers.estado = data.estado;
      confianza = 99;
    } catch(err){
      console.error('El asistente con IA no respondió, usando el clasificador local.', err);
      const det = detectarEspecialidad(textoNorm);
      answers.situacion = det.especialidad;
      confianza = det.confianza;
    }
  } else {
    const det = detectarEspecialidad(textoNorm);
    answers.situacion = det.especialidad;
    confianza = det.confianza;
  }
  answers.urgencia = detectarUrgencia(textoNorm) || answers.urgencia;
  answers.presupuesto = detectarPresupuesto(textoNorm) || answers.presupuesto;
  const estadoDet = detectarEstado(textoNorm);
  if(estadoDet) answers.estado = estadoDet;
  // (deja todo lo que seguía después de este punto exactamente igual —
  // solo cambiaste el inicio de la función, no lo que sigue abajo)
```

**Ojo:** no borres nada de lo que venía después de esas líneas dentro
de la función original — solo cambiaste el principio (cómo se detecta
la especialidad), el resto de la función (mostrar resultados, etc.)
sigue igual.

Luego busca (Ctrl+F) el texto `asistenteSubmitBtn').addEventListener`
y reemplaza ese bloque completo por:

```js
document.getElementById('asistenteSubmitBtn').addEventListener('click', async (e) => {
  const input = document.getElementById('asistenteInput');
  const texto = input.value.trim();
  if(!texto){ input.focus(); return; }
  const btn = e.currentTarget;
  const original = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Pensando…';
  try{
    await procesarConsulta({texto});
  } finally {
    btn.disabled = false;
    btn.textContent = original;
  }
});
```

Guarda el archivo (Ctrl+S). Listo — ya está conectado.

*(Opcional, cosmético: busca el texto `.asistente-disclaimer` y el
párrafo que dice "no es un chatbot con inteligencia artificial real" —
puedes cambiar esa frase ahora que sí lo es, dejando algo como "esto no
sustituye una consulta real con un abogado".)*

## Paso 8 — Pruébalo

Abre `index.html` en tu navegador (doble clic al archivo), ve al
cuestionario, escribe una situación como la escribiría un cliente real,
y dale a "Preguntar al asistente". Si después de unos segundos te
manda a una recomendación, funcionó.

Para confirmar que sigue siendo gratis: entra a
[aistudio.google.com](https://aistudio.google.com) y revisa tu consumo
contra el límite gratuito — mientras el sitio no tenga mucho tráfico,
vas a estar muy por debajo.

## Si algo no funciona

- **"no se reconoce como un comando interno o externo"** → el programa
  que intentaste usar no está instalado, o cerraste/abriste la terminal
  en el orden equivocado. Revisa el Paso 0 (Node.js) y que hayas
  cerrado y vuelto a abrir la terminal después de instalarlo.
- **El comando `firebase` no funciona** → repite
  `npm install -g firebase-tools` del Paso 3, y si sigue sin
  funcionar, cierra y abre la terminal de nuevo.
- **`firebase deploy` da error mencionando "Blaze" o "billing"** →
  significa que el Paso 1 no quedó activado del todo. Regresa a la
  consola de Firebase y confirma que tu proyecto diga "Blaze" junto al
  nombre del plan.
- **El asistente en el sitio no responde nada** → revisa que hayas
  pegado la URL correcta en el Paso 7 (sin espacios de más, con las
  comillas `'` incluidas), y que sea la misma que te dio el Paso 6.
- **No entiendes un mensaje de error** — cópialo completo (selecciónalo
  con el mouse, Ctrl+C) y pégamelo en el chat; dime en qué paso ibas.
