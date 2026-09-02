# Bridge ACR122U → Plaza Cashless

Este programa corre en el computador donde está conectado el lector USB
**ACR122U** y le pasa a la página web (`index.html` de Plaza Cashless) el
UID de cada pulsera que se acerca al lector, en tiempo real.

¿Por qué se necesita? El navegador web **no** puede hablar directamente
con lectores PC/SC como el ACR122U (esa es una API distinta a "Web NFC",
que solo sirve para el NFC integrado de celulares Android). Este bridge
hace de traductor: habla PC/SC de un lado y WebSocket del otro.

```
ACR122U (USB) → PC/SC → bridge (Node.js) → WebSocket → index.html (navegador)
```

## 1) Requisitos

- **Node.js 18 o superior** → https://nodejs.org (elige la versión LTS)
- El **servicio PC/SC** de tu sistema operativo activo:
  - **Windows**: el servicio "Smart Card" (`SCardSvr`) ya viene instalado.
    Verifica que esté "Iniciado" en `services.msc`. Además instala el
    driver oficial del ACR122U desde el sitio de ACS
    (busca "ACR122U driver" en acs.com.hk) — el driver genérico CCID de
    Windows a veces funciona, pero el oficial da menos problemas.
  - **macOS**: PC/SC ya viene integrado en el sistema. Solo conecta el
    lector, no necesitas instalar nada aparte de Node.js.
  - **Linux (Ubuntu/Debian)**: instala el demonio PC/SC:
    ```
    sudo apt update
    sudo apt install pcscd libpcsclite-dev libudev-dev build-essential
    sudo systemctl enable --now pcscd
    ```

## 2) Instalación del bridge

Abre una terminal **dentro de esta carpeta** (`bridge-acr122u`) y ejecuta:

```
npm install
```

> Nota: `npm install` compila un módulo nativo (`pcsclite`). Si falla en
> Windows, instala primero las "Build Tools" de Node:
> `npm install --global windows-build-tools` (o instala Visual Studio
> Build Tools + Python 3 manualmente) y vuelve a intentar `npm install`.

## 3) Ejecutarlo

Con el ACR122U ya conectado por USB:

```
npm start
```

Deberías ver algo como:

```
----------------------------------------------------
  Bridge ACR122U escuchando en ws://127.0.0.1:4000
  Deja esta ventana abierta y abre Plaza Cashless.
----------------------------------------------------
✅ Lector NFC conectado: ACS ACR122U PICC Interface
```

Deja esa ventana/terminal abierta mientras uses la app. Cada vez que
acerques una pulsera, verás en consola:

```
📶 Tag leído — UID: 04A2B3C4D5
```

## 4) Usarlo desde Plaza Cashless

En el `index.html` de Plaza Cashless, en cualquier cuadro de "Pulsera
NFC" verás dos botones: **📶 Escanear con celular** y
**🖥️ Escanear con lector USB**. Con el bridge corriendo, el segundo se
conecta automáticamente a `ws://127.0.0.1:4000` y queda esperando la
lectura.

Si vas a abrir Plaza Cashless **desde otro computador** de la red (no
el mismo donde está el ACR122U conectado), cambia en el `index.html`
la línea:

```js
window.NFC_BRIDGE_URL = 'ws://127.0.0.1:4000';
```

por la IP del computador donde corre el bridge, ej:

```js
window.NFC_BRIDGE_URL = 'ws://192.168.1.50:4000';
```

## 5) Notas importantes

- **Un solo bridge por lector.** Si tienes varias cajas, cada una con
  su propio ACR122U, cada computador corre su propio bridge (puerto
  4000 por defecto) y cada navegador usa el `NFC_BRIDGE_URL` que
  apunte a SU propio bridge.
- **HTTPS + localhost**: si Plaza Cashless se abre por HTTPS (normal en
  producción) y el bridge está en el mismo computador (`127.0.0.1` /
  `localhost`), los navegadores modernos (Chrome/Edge) sí permiten la
  conexión WebSocket sin cifrar a localhost. Si en tu caso el navegador
  la bloquea igual, avísame y agregamos TLS (wss://) con un certificado
  local autofirmado.
- **Arranque automático**: si quieres que el bridge se abra solo al
  encender el computador de la caja, en Windows puedes crear un acceso
  directo a `npm start` (o a un `.bat` con `node server.js`) en la
  carpeta de inicio de Windows (`shell:startup`). En Mac/Linux se puede
  usar `launchd`/`systemd` — pídeme y te preparo ese archivo también.
- **UID real vs NDEF**: el ACR122U sí entrega el UID físico real del
  chip (a diferencia de Web NFC en algunos celulares), así que este
  código va a ser siempre estable para la misma pulsera.
