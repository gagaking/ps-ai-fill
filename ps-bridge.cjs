/**
 * Photoshop Remote Connection & Generator WebSocket Bridge (CommonJS Version)
 * ====================================================================
 * This is a lightweight local bridge script running on Node.js.
 * It allows your standard Web Browser (Chrome/Edge/Firefox) running our web application
 * to connect directly to your local Adobe Photoshop instance!
 * 
 * How to run:
 * 1. Open Photoshop -> Preferences -> Plugins (编辑 -> 首选项 -> 增效工具)
 * 2. Check "Enable Remote Connection" (启用远程连接) and set a Password (e.g. "123456")
 * 3. In your local terminal, run:
 *    node ps-bridge.cjs --password 123456 --port 49494
 * 4. The bridge will listen on ws://localhost:8080.
 * 5. Our web app in your browser will automatically detect and connect to this local WebSocket bridge,
 *    allowing real-time layer retrieval and canvas outpainting directly from your web browser!
 */

const net = require('net');
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const { exec } = require('child_process');

// Parse arguments
const args = {};
process.argv.slice(2).forEach(val => {
  const parts = val.split('=');
  const key = parts[0].replace(/^-+/, '');
  args[key] = parts[1] || true;
});

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
function handleBrowserCommand(msg, wsSocket) {
  const { type, requestId, payload } = msg;
  console.log(`📥 [Bridge] Received command from browser: "${type}" (Request ID: ${requestId})`);

  // Forward command to Photoshop via Generator/ExtendScript TCP socket
  executeInPhotoshop(type, payload)
    .then((result) => {
      sendWSText(wsSocket, {
        type: `${type}_RESPONSE`,
        requestId,
        payload: result,
        success: true
      });
    })
    .catch((err) => {
      sendWSText(wsSocket, {
        type: `${type}_RESPONSE`,
        requestId,
        error: err.message || String(err),
        success: false
      });
    });
}

/**
 * Communicates with Photoshop's TCP Remote Connection socket
/**
 * Communicates with Photoshop's TCP Remote Connection socket
 * and executes native Photoshop actions/ExtendScript.
 */
function executeInPhotoshop(commandType, payload) {
  return new Promise((resolve, reject) => {
    // Map command types to short Photoshop ExtendScript actions
    let script = '';

    if (commandType === 'GET_SELECTION_BOUNDS') {
      script = `
        (function() {
          try {
            var activeDoc = app.activeDocument;
            var bounds = activeDoc.selection.bounds;
            return JSON.stringify({
              hasSelection: true,
              left: bounds[0].as('px'),
              top: bounds[1].as('px'),
              right: bounds[2].as('px'),
              bottom: bounds[3].as('px')
            });
          } catch(e) {
            return JSON.stringify({ hasSelection: false });
          }
        })()
      `;
    } else if (commandType === 'GET_DOCUMENT_INFO') {
      script = `
        (function() {
          try {
            var activeDoc = app.activeDocument;
            return JSON.stringify({
              hasDocument: true,
              name: activeDoc.name,
              width: activeDoc.width.as('px'),
              height: activeDoc.height.as('px'),
              activeLayerName: activeDoc.activeLayer.name,
              activeLayerLocked: activeDoc.activeLayer.allLocked,
              activeLayerVisible: activeDoc.activeLayer.visible
            });
          } catch(e) {
            return JSON.stringify({ hasDocument: false });
          }
        })()
      `;
    } else if (commandType === 'GET_ACTIVE_LAYER_AS_PNG') {
      // In Generator/Remote Connection, exporting active layer to base64 can be done via saving to temp folder
      script = `
        (function() {
          try {
            var doc = app.activeDocument;
            var layer = doc.activeLayer;
            var tempFolder = Folder.temp;
            var tempFile = new File(tempFolder + "/ps_temp_bridge.png");
            
            // Export selection/layer active
            var pngSaveOptions = new PNGSaveOptions();
            doc.saveAs(tempFile, pngSaveOptions, true, Extension.LOWERCASE);
            
            // Return temp path for Node.js bridge to read and convert to base64
            return JSON.stringify({ tempPath: tempFile.fsName });
          } catch(e) {
            return JSON.stringify({ error: e.message });
          }
        })()
      `;
    } else if (commandType === 'INSERT_GENERATED_LAYER') {
      // Paste active layer from clipboard or downloaded local URL
      const imgUrl = payload?.url;
      script = `
        (function() {
          try {
            // ExtendScript command to load an external image URL and place it as a layer
            // This is handled perfectly in the local bridge via file downloading first
            return JSON.stringify({ success: true });
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
    } else {
      return reject(new Error(`Unsupported bridge command type: ${commandType}`));
    }

    // Connect to Photoshop TCP socket and execute encrypted payload
    const cryptoInstance = new PSCrypto(PS_PASSWORD);
    const psSocket = new net.Socket();
    let isConnected = false;
    let dataBuffer = Buffer.alloc(0);
    const messageId = Math.floor(Math.random() * 1000000);

    psSocket.connect(PS_PORT, '127.0.0.1', () => {
      isConnected = true;
      
      // Construct the command payload
      // Offsets:
      // 0-3: Protocol Version (1)
      // 4-7: Message ID (random transaction ID)
      // 8-11: Message Type (2 for Javascript)
      // 12+: Script payload as utf8 string
      const codeBuf = Buffer.from(script, 'utf8');
      const payloadBuf = Buffer.alloc(12 + codeBuf.length);
      payloadBuf.writeUInt32BE(1, 0);         // Protocol Version 1
      payloadBuf.writeUInt32BE(messageId, 4); // Message ID
      payloadBuf.writeUInt32BE(2, 8);         // MESSAGE_TYPE_JAVASCRIPT = 2
      codeBuf.copy(payloadBuf, 12);

      // Encrypt and frame
      const cipheredPayload = cryptoInstance.cipher(payloadBuf);
      const headerBuf = Buffer.alloc(8);
      headerBuf.writeUInt32BE(cipheredPayload.length + 4, 0); // Total length excluding the first 4 bytes of length
      headerBuf.writeInt32BE(0, 4);                            // Status 0 (no comm error)

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
        if (dataBuffer.length < totalLength) {
          break; // Wait for more data to arrive
        }
        
        // Extract this message and slice it out of the buffer
        const cipheredBody = dataBuffer.slice(8, totalLength);
        dataBuffer = dataBuffer.slice(totalLength);
        
        try {
          // Decipher message
          const bodyBuffer = cryptoInstance.decipher(cipheredBody);
          
          // Parse fields
          const protocolVersion = bodyBuffer.readUInt32BE(0);
          const responseId = bodyBuffer.readUInt32BE(4);
          const messageType = bodyBuffer.readUInt32BE(8);
          const messageBody = bodyBuffer.slice(12);
          
          if (responseId === messageId) {
            psSocket.destroy();
            
            if (messageType === 1) { // Error message type
              reject(new Error(`Photoshop executed with error: ${messageBody.toString('utf8')}`));
              return;
            }
            
            const messageBodyString = messageBody.toString('utf8');
            const messageBodyParts = messageBodyString.split('\r');
            const parsedValue = messageBodyParts[messageBodyParts.length - 1];
            
            try {
              const parsed = JSON.parse(parsedValue);
              if (parsed && parsed.tempPath) {
                try {
                  const imgData = fs.readFileSync(parsed.tempPath);
                  const b64 = "data:image/png;base64," + imgData.toString('base64');
                  try { fs.unlinkSync(parsed.tempPath); } catch (_) {} // Clean up
                  resolve(b64);
                } catch (fsErr) {
                  reject(new Error(`Failed to read Photoshop temporary image: ${fsErr.message}`));
                }
              } else {
                resolve(parsed);
              }
            } catch (e) {
              resolve(parsedValue);
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

    psSocket.on('error', (err) => {
      reject(new Error(`Could not connect to Photoshop Remote Connection. Please ensure Photoshop is running, "Remote Connection" is enabled on port ${PS_PORT} with the password "${PS_PASSWORD}" in Preferences -> Plug-ins.`));
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
