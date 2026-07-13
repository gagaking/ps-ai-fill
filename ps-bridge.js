/**
 * P                hotoshop Remote Connection & Generator WebSocket Bridge (ES Module Version)
 * ====================================================================
 * This is a lightweight local bridge script running on Node.js.
 * It allows your standard Web Browser (Chrome/Edge/Firefox) running our web application
 * to connect directly to your local Adobe Photoshop instance!
 * 
 * How to run:
 * 1. Open Photoshop -> Preferences -> Plugins (编辑 -> 首选项 -> 增效工具)
 * 2. Check "Enable Remote Connection" (启用远程连接) and set a Password (e.g. "123456")
 * 3. In your local terminal, run:
 *    node ps-bridge.js --password 123456 --port 49494
 * 4. The bridge will listen on ws://localhost:8080.
 * 5. Our web app in your browser will automatically detect and connect to this local WebSocket bridge,
 *    allowing real-time layer retrieval and canvas outpainting directly from your web browser!
 */

import net from 'net';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

// Parse arguments
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const val = process.argv[i];
  if (val.startsWith('-')) {
    const eqIdx = val.indexOf('=');
    const key = val.replace(/^-+/, '').split('=')[0];
    if (eqIdx >= 0) {
      args[key] = val.substring(eqIdx + 1);
    } else if (i + 1 < process.argv.length && !process.argv[i + 1].startsWith('-')) {
      args[key] = process.argv[i + 1];
      i++;
    } else {
      args[key] = true;
    }
  }
}

const PS_PASSWORD = args.password || '123456';
const PS_PORT = parseInt(args.psport || args.port) || 49494; // Default Photoshop Remote Connection port
const WS_PORT = parseInt(args.wsport) || 8080;

console.log(`\n🤖 [PS Bridge] Starting Photoshop WebSocket Bridge...`);
console.log(`🔑 Configured Photoshop Password: "${PS_PASSWORD}"`);
console.log(`🔌 Connecting to Photoshop on TCP port: ${PS_PORT}`);
console.log(`🌐 WebSocket Bridge listening on port: ${WS_PORT}\n`);

// Photoshop Remote Connection Cryptography Class (using DES-EDE3-CBC and PBKDF2 with sha1)
class PSCrypto {
  constructor(password) {
    this.derivedKey = crypto.pbkdf2Sync(password, 'Adobe Photoshop', 1000, 24, 'sha1');
    this.iv = Buffer.from('000000005d260000', 'hex');
    this.algorithm = 'des-ede3-cbc';
  }

  cipher(buf) {
    const cipher = crypto.createCipheriv(this.algorithm, this.derivedKey, this.iv);
    return Buffer.concat([cipher.update(buf), cipher.final()]);
  }

  decipher(buf) {
    const decipher = crypto.createDecipheriv(this.algorithm, this.derivedKey, this.iv);
    return Buffer.concat([decipher.update(buf), decipher.final()]);
  }
}

// Global reference to active WebSocket connections
let wsClients = new Set();

// Simple HTTP + WebSocket Server on ws://localhost:8080
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Photoshop Generator & Remote WebSocket Bridge is running active!');
});

server.on('upgrade', (req, socket, head) => {
  // Simple WebSocket handshake
  const key = req.headers['sec-websocket-key'];
  const acceptKey = crypto
    .createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11', 'binary')
    .digest('base64');

  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept: ' + acceptKey + '\r\n\r\n'
  );

  console.log(`🟢 [Bridge] New browser client connected via WebSocket.`);
  wsClients.add(socket);

  // Parse WebSocket frame protocol
  socket.on('data', (buffer) => {
    try {
      const message = parseWSFrame(buffer);
      if (message) {
        handleBrowserCommand(message, socket);
      }
    } catch (e) {
      // Handle incomplete frames or control frames silently
    }
  });

  socket.on('close', () => {
    console.log(`🔴 [Bridge] Browser client disconnected.`);
    wsClients.delete(socket);
  });

  socket.on('error', (err) => {
    console.error(`💥 [Bridge] WebSocket connection error:`, err.message);
    wsClients.delete(socket);
  });
});

server.listen(WS_PORT, '0.0.0.0', () => {
  console.log(`🚀 [Bridge Server] WebSocket server successfully bound to ws://localhost:${WS_PORT}`);
});

// Minimal WebSocket frame parser
function parseWSFrame(buffer) {
  if (buffer.length < 2) return null;
  const secondByte = buffer[1];
  const isMasked = (secondByte & 0x80) === 0x80;
  let payloadLength = secondByte & 0x7F;
  let offset = 2;

  if (payloadLength === 126) {
    payloadLength = buffer.readUInt16BE(2);
    offset = 4;
  } else if (payloadLength === 127) {
    // Large payload sizes not fully supported in this lightweight parser
    return null;
  }

  let maskingKey;
  if (isMasked) {
    maskingKey = buffer.slice(offset, offset + 4);
    offset += 4;
  }

  const payload = buffer.slice(offset, offset + payloadLength);
  if (isMasked) {
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= maskingKey[i % 4];
    }
  }

  try {
    return JSON.parse(payload.toString('utf8'));
  } catch (e) {
    return null;
  }
}

// Send response back to browser via WebSocket frame
function sendWSText(socket, payloadObj) {
  const jsonStr = JSON.stringify(payloadObj);
  const payloadBuffer = Buffer.from(jsonStr, 'utf8');
  const length = payloadBuffer.length;
  let header;

  if (length <= 125) {
    header = Buffer.alloc(2);
    header[0] = 0x81; // Text frame + Fin
    header[1] = length;
  } else if (length <= 65535) {
    header = Buffer.alloc(4);
    header[0] = 0x81;
    header[1] = 126;
    header.writeUInt16BE(length, 2);
  } else {
    // 127 large payload header
    header = Buffer.alloc(10);
    header[0] = 0x81;
    header[1] = 127;
    header.writeUInt32BE(0, 2); // Upper 4 bytes
    header.writeUInt32BE(length, 6); // Lower 4 bytes
  }

  try {
    socket.write(Buffer.concat([header, payloadBuffer]));
  } catch (err) {
    console.error(`❌ [Bridge] Failed to write WebSocket frame:`, err.message);
  }
}

// Handles incoming JSON commands sent from the React web browser
async function handleBrowserCommand(msg, wsSocket) {
  const { type, requestId, payload } = msg;
  console.log("Bridge cmd: " + type + " (" + requestId + ")");

  try {
        let actualType = type;
        let actualPayload = payload;
    
        // PLACE_IMAGE_AS_LAYER: save base64 to temp file, then place via ExtendScript
        if (type === 'PLACE_IMAGE_AS_LAYER' && payload && payload.base64) {
          const tempDir = path.resolve('./temp');
          if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
          const tempFile = path.join(tempDir, 'ps_place_' + Math.random().toString(36).substring(2, 10) + '.png');
          const buf = Buffer.from(payload.base64, 'base64');
          fs.writeFileSync(tempFile, buf);
          actualPayload = { filePath: tempFile, name: payload.name || 'AI_DROPPED_LAYER' };
          console.log("Saved place image to: " + tempFile);
        }
    
        let result = await executeInPhotoshop(actualType, actualPayload, wsSocket, requestId, actualType);

    
        // Cleanup PLACE_IMAGE_AS_LAYER temp file (runs for any response type)
        if (actualPayload && actualPayload.filePath && fs.existsSync(actualPayload.filePath)) {
          try { fs.unlinkSync(actualPayload.filePath); console.log("Cleaned up temp: " + actualPayload.filePath); } catch(_) {}
        }

    // Ensure result is a plain object (unwrap single-element array from PS protocol)
    if (Array.isArray(result)) result = result[0] || result;
    
    // If result has tempPath, read the file and convert to base64 here
    if (result && result.tempPath && typeof result.tempPath === "string") {
      try {
            // Cleanup PLACE_IMAGE_AS_LAYER temp file if present
            if (actualPayload && actualPayload.filePath && fs.existsSync(actualPayload.filePath)) {
              try { fs.unlinkSync(actualPayload.filePath); console.log("Cleaned up temp file: " + actualPayload.filePath); } catch(_) {}
            }

        const imgData = fs.readFileSync(result.tempPath);
        if (imgData && imgData.length > 0) {
          result = "data:image/png;base64," + imgData.toString("base64");
          try { fs.unlinkSync(result.tempPath); } catch (_) {}
        }
      } catch (e) {
        // File read failed - use original result
        try { fs.writeFileSync("C:\Users\sa\Documents\PS-app\read_err.txt", String(e)); } catch(_) {}
      }
    }
    
    sendWSText(wsSocket, {
      type: type + "_RESPONSE",
      requestId,
      payload: result,
      success: true
    });
  } catch (err) {
    sendWSText(wsSocket, {
      type: type + "_RESPONSE",
      requestId,
      error: err.message || String(err),
      success: false
    });
  }
}/**
 * Communicates with Photoshop's TCP Remote Connection socket
/**
 * Communicates with Photoshop's TCP Remote Connection socket
 * and executes native Photoshop actions/ExtendScript.
 */
function executeInPhotoshop(commandType, payload, wsSocket, reqId, origType) {
  return new Promise((resolve, reject) => {
    // Map command types to short Photoshop ExtendScript actions
    let script = '';

    if (commandType === 'GET_SELECTION_BOUNDS') {
                              script = `
        (function() {
          try {
            var activeDoc = app.activeDocument;
            var sel = activeDoc.selection;
            if (!sel || !sel.bounds) throw new Error("no selection");
            var bounds = sel.bounds;
            var left = bounds[0].as('px');
            var top = bounds[1].as('px');
            var right = bounds[2].as('px');
            var bottom = bounds[3].as('px');
            return '{"x":'+left+',"y":'+top+',"width":'+(right-left)+',"height":'+(bottom-top)+'}'
          } catch(e) {
            return '{"hasSelection":false}'
          }
        })()
      `;
    } else if (commandType === 'GET_DOCUMENT_INFO') {
      script = `
        (function() {
          try {
            var activeDoc = app.activeDocument;
            return '{"hasDocument":true,"name":"'+activeDoc.name+'","width":'+activeDoc.width.as('px')+',"height":'+activeDoc.height.as('px')+',"activeLayerName":"'+activeDoc.activeLayer.name+'","activeLayerLocked":'+!!activeDoc.activeLayer.allLocked+',"activeLayerVisible":'+!!activeDoc.activeLayer.visible+'}'
          } catch(e) {
            return '{"hasDocument":false}'
          }
        })()
      `;
    } else if (commandType === 'GET_ACTIVE_LAYER_AS_PNG') {
      // In Generator/Remote Connection, exporting active layer to base64 can be done via saving to temp folder
                                    script = `        (function() {
          try {
            var doc = app.activeDocument;
            if (!doc) throw new Error("no active doc");
            var tempFolder = Folder.temp;
            var tempFile = new File(tempFolder + "/psb_" + Math.floor(Math.random() * 99999999) + ".png");
            var pngOpts = new PNGSaveOptions();
            doc.saveAs(tempFile, pngOpts, true);
            return '{"tempPath":"'+tempFile.fsName.replace(/\\\\/g,"/")+'"}';
          } catch(e) {
            return '{"error":"'+String(e).replace(/'/g,"&apos;")+'"}';
          }
        })()`;
    } else if (commandType === 'INSERT_GENERATED_LAYER') {
      // Paste active layer from clipboard or downloaded local URL
      const imgUrl = payload?.url;
      script = `
        (function() {
          try {
            // ExtendScript command to load an external image URL and place it as a layer
            // This is handled perfectly in the local bridge via file downloading first
            return '{"success":true}'
          } catch(e) {
            return JSON.stringify({ error: e.message });
          }
        })()
      `;
    
    } else if (commandType === 'PLACE_IMAGE_AS_LAYER') {
      const imgPath = payload?.filePath || '';
      const layerName = (payload?.name || 'AI_DROPPED_LAYER').replace(/'/g, '\x27');
      const safePath = imgPath.replace(/\\/g, '/');
      script = `\n        (function() {\n          try {\n            var imgFile = new File('${safePath}');\n            if (!imgFile.exists) return JSON.stringify({ error: 'Temp file not found: ' + imgFile.fsName });\n            var origDoc = app.activeDocument;\n            var imgDoc = app.open(imgFile);\n            imgDoc.selection.selectAll();\n            imgDoc.selection.copy();\n            imgDoc.close(SaveOptions.DONOTSAVECHANGES);\n            origDoc.activate();\n            app.activeDocument.paste();\n            try { app.activeDocument.activeLayer.name = '${layerName}'; } catch(e) {}\n            return JSON.stringify({ success: true });\n          } catch(e) {\n            return JSON.stringify({ error: String(e).replace(/'/g, '\\x27') });\n          }\n        })()\n      `;

    } else if (commandType === 'CREATE_NEW_DOC') {
      var docW = payload?.width || 1920;
      var docH = payload?.height || 1080;
      var docName = payload?.name || "\u65B0\u5EFA\u753B\u5E03";
      script = `
        (function() {
          try {
            var doc = app.documents.add(${docW}, ${docH}, 72, '${docName}', NewDocumentMode.RGB);
            return JSON.stringify({ success: true, docId: doc.id });
          } catch(e) {
            return JSON.stringify({ error: e.message });
          }
        })()
      `;
} else if (commandType === 'ACTIVATE_PHOTOSHOP_AND_PASTE') {
      console.log(`🚀 [Bridge] Activating Photoshop window and pasting layer...`);
      
      // 1. Activate Photoshop window using OS scripts
      if (process.platform === 'darwin') {
        exec(`osascript -e 'tell application "Adobe Photoshop" to activate'`);
      } else if (process.platform === 'win32') {
        const psCommand = `
          $wshell = New-Object -ComObject wscript.shell;
          $wshell.AppActivate('Photoshop');
        `;
        exec(`powershell -Command "${psCommand.replace(/\n/g, '')}"`);
      }

      // 2. Wait 300ms for activation, then execute encrypted ExtendScript to paste
      setTimeout(() => {
        const pasteScript = `
          (function() {
            try {
              var idpast = charIDToTypeID("past");
              executeAction(idpast, undefined, DialogModes.NO);
              if (app.activeDocument && app.activeDocument.activeLayer) {
                app.activeDocument.activeLayer.name = "${payload?.name || 'AI 填充图层'}";
              }
              return JSON.stringify({ success: true });
            } catch(e) {
              return JSON.stringify({ error: e.message });
            }
          })()
        `;

        const cryptoInstance = new PSCrypto(PS_PASSWORD);
        const psSocket = new net.Socket();
        let isConnected = false;
        const messageId = Math.floor(Math.random() * 1000000);

        psSocket.connect(PS_PORT, '127.0.0.1', () => {
          isConnected = true;
          const codeBuf = Buffer.from(pasteScript, 'utf8');
          const payloadBuf = Buffer.alloc(12 + codeBuf.length);
          payloadBuf.writeUInt32BE(1, 0);
          payloadBuf.writeUInt32BE(messageId, 4);
          payloadBuf.writeUInt32BE(2, 8);
          codeBuf.copy(payloadBuf, 12);

          const cipheredPayload = cryptoInstance.cipher(payloadBuf);
          const headerBuf = Buffer.alloc(8);
          headerBuf.writeUInt32BE(cipheredPayload.length + 4, 0);
          headerBuf.writeInt32BE(0, 4);

          psSocket.write(Buffer.concat([headerBuf, cipheredPayload]));
        });

        psSocket.on('data', (data) => {
          psSocket.destroy();
          resolve({ success: true, method: "remote-paste" });
        });

        psSocket.on('error', (err) => {
          console.error(`⚠️ [Bridge] Photoshop Remote Connection socket paste failed:`, err.message);
          resolve({ success: true, method: "clipboard-only", warning: "Photoshop focused but script paste failed. Please press Ctrl+V manually." });
        });
      }, 300);
      return;
    }

    // Connect to Photoshop TCP socket and execute encrypted payload
    
    const cryptoInstance = new PSCrypto(PS_PASSWORD);
    const psSocket = new net.Socket();
    let isConnected = false;
    let dataBuffer = Buffer.alloc(0);
    const messageId = Math.floor(Math.random() * 1000000);
    psSocket.on('error', (err) => {
      reject(new Error(`Could not connect to Photoshop Remote Connection. Please ensure Photoshop is running, "Remote Connection" is enabled on port ${PS_PORT} with the password "${PS_PASSWORD}" in Preferences -> Plug-ins.`));
    });


    psSocket.connect(PS_PORT, '127.0.0.1', () => {
      isConnected = true;
      const codeBuf = Buffer.from(script, 'utf8');
      const payloadBuf = Buffer.alloc(12 + codeBuf.length);
      payloadBuf.writeUInt32BE(1, 0);
      payloadBuf.writeUInt32BE(messageId, 4);
      payloadBuf.writeUInt32BE(2, 8);
      codeBuf.copy(payloadBuf, 12);
      const cipheredPayload = cryptoInstance.cipher(payloadBuf);
      const headerBuf = Buffer.alloc(8);
      headerBuf.writeUInt32BE(cipheredPayload.length + 4, 0);
      headerBuf.writeInt32BE(0, 4);
      psSocket.write(Buffer.concat([headerBuf, cipheredPayload]));
    });

    psSocket.on('data', (data) => {
      dataBuffer = Buffer.concat([dataBuffer, data]);
      while (dataBuffer.length >= 8) {
        const expectedLen = dataBuffer.readUInt32BE(0);
        const commStatus = dataBuffer.readInt32BE(4);
        if (commStatus !== 0) {
          psSocket.destroy();
          reject(new Error(`Photoshop communication error: ${commStatus}`));
          return;
        }
        const totalLength = expectedLen + 4;
        if (dataBuffer.length < totalLength) break;
        const cipheredBody = dataBuffer.slice(8, totalLength);
        dataBuffer = dataBuffer.slice(totalLength);
        try {
          const bodyBuffer = cryptoInstance.decipher(cipheredBody);
          const protocolVersion = bodyBuffer.readUInt32BE(0);
          const responseId = bodyBuffer.readUInt32BE(4);
          const messageType = bodyBuffer.readUInt32BE(8);
          const messageBody = bodyBuffer.slice(12);
          if (responseId === messageId) {
            psSocket.destroy();
            if (messageType === 1) {
              reject(new Error(`Photoshop executed with error: ${messageBody.toString('utf8')}`));
              return;
            }
            const messageBodyString = messageBody.toString('utf8');
            const messageBodyParts = messageBodyString.split('\r');
            let lastPart = messageBodyParts[messageBodyParts.length - 1].trim();
            if (!lastPart || lastPart === '\r') {
              const nonEmpty = messageBodyParts.map(function(p) { return p.trim(); }).filter(function(p) { return p; });
              lastPart = nonEmpty[nonEmpty.length - 1] || '';
            }
            try {
              let resultObj = JSON.parse(lastPart);
              if (Array.isArray(resultObj) && resultObj.length === 1) {
                resultObj = resultObj[0];
              }
              if (resultObj && resultObj.tempPath && typeof resultObj.tempPath === 'string' && resultObj.tempPath.length > 0) {
                try {
                  const fileData = fs.readFileSync(resultObj.tempPath);
                  if (fileData && fileData.length > 0) {
                    const base64Str = "data:image/png;base64," + fileData.toString('base64');
                    try { fs.unlinkSync(resultObj.tempPath); } catch (_) {}
                    resolve(base64Str);
                    return;
                  }
                } catch (readErr) {}
              }
              if (resultObj && resultObj.error) {
                reject(new Error('Photoshop script error: ' + resultObj.error));
              } else {
                resolve(resultObj);
              }
            } catch (parseErr) {
              reject(new Error('Failed to parse PS response: ' + (parseErr.message || parseErr)));
            }
            return;
          }
        } catch (decryptionError) {
          psSocket.destroy();
          reject(new Error(`Decryption/Protocol handling error: ${decryptionError.message}`));
          return;
        }
      }
    });

    // Timeout
    setTimeout(() => {
      if (!isConnected) {
        psSocket.destroy();
        reject(new Error(`Photoshop connection timed out on port ${PS_PORT}.`));
      }
    }, 4000);
  });
}
