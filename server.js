/**
 * Bridge ACR122U -> WebSocket
 * -------------------------------------------------------------
 * Programa que corre en el computador donde está conectado el
 * lector USB ACR122U. Habla PC/SC de un lado (con el lector) y
 * expone un WebSocket local del otro lado, para que la página
 * web de Plaza Cashless se conecte y reciba el UID de cada tag
 * apenas se acerca al lector.
 *
 * Instalación:
 *   1) Instala Node.js 18+ (https://nodejs.org)
 *   2) En esta carpeta, abre una terminal y ejecuta:
 *        npm install
 *   3) Conecta el ACR122U por USB (con su driver/servicio PC/SC
 *      instalado y corriendo — ver README.md).
 *   4) Ejecuta:
 *        npm start
 *   5) Deja esta ventana abierta mientras usas Plaza Cashless.
 *      Verás en consola cada tag leído.
 *
 * La página web se conecta por defecto a ws://127.0.0.1:4000
 * (puedes cambiar el puerto con la variable de entorno PORT).
 */

const { NFC } = require('nfc-pcsc');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 4000;

const wss = new WebSocketServer({ port: PORT });
const clientes = new Set();

wss.on('connection', (ws) => {
  clientes.add(ws);
  console.log('🔌 Página web conectada al bridge (' + clientes.size + ' conexión/es activas)');
  ws.on('close', () => clientes.delete(ws));
});

function enviarATodos(payload) {
  const data = JSON.stringify(payload);
  for (const ws of clientes) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
}

const nfc = new NFC();

nfc.on('reader', (reader) => {
  console.log('✅ Lector NFC conectado:', reader.reader.name);

  // Evita procesar el mismo "card present" repetidas veces mientras
  // la pulsera sigue apoyada sobre el lector.
  reader.autoProcessing = true;

  reader.on('card', (card) => {
    // card.uid llega como string hexadecimal, ej: "04A2B3C4D5"
    console.log('📶 Tag leído — UID:', card.uid);
    enviarATodos({ type: 'nfc-uid', uid: card.uid, reader: reader.reader.name, ts: Date.now() });
  });

  reader.on('card.off', (card) => {
    // se retiró el tag del lector — informativo, no se usa por ahora
  });

  reader.on('error', (err) => {
    console.error('⚠️ Error del lector', reader.reader.name, ':', err.message);
    enviarATodos({ type: 'nfc-error', message: err.message });
  });

  reader.on('end', () => {
    console.log('🔌 Lector desconectado:', reader.reader.name);
  });
});

nfc.on('error', (err) => {
  console.error('⚠️ Error NFC/PC-SC:', err.message);
  console.error('   ¿Está el ACR122U conectado y el servicio PC/SC corriendo? Revisa el README.md');
});

console.log('----------------------------------------------------');
console.log('  Bridge ACR122U escuchando en ws://127.0.0.1:' + PORT);
console.log('  Deja esta ventana abierta y abre Plaza Cashless.');
console.log('----------------------------------------------------');
