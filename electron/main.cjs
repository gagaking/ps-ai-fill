const { app, BrowserWindow, globalShortcut, ipcMain, nativeImage, Tray, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { fork, spawn } = require('child_process');

let mainWindow = null;
let tray = null;
let serverProcess = null;
let bridgeProcess = null;
let isAlwaysOnTop = true;
let serverPort = 3001;

const configPath = path.join(app.getPath('userData'), 'config.json');
function getConfig(key, def) {
  try { return JSON.parse(fs.readFileSync(configPath, 'utf8'))[key] ?? def; }
  catch { return def; }
}
function setConfig(key, val) {
  try {
    const d = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    d[key] = val; fs.writeFileSync(configPath, JSON.stringify(d));
  } catch { fs.writeFileSync(configPath, JSON.stringify({ [key]: val })); }
}

// ── Server path ────────────────────────────────────────────────────────────
function getServerPath() {
  return path.join(app.getAppPath(), 'dist', 'server.cjs');
}
function getBridgePath() {
  return path.join(app.getAppPath(), 'ps-bridge.js');
}

// ── Always-on-top ──────────────────────────────────────────────────────────
function toggleAlwaysOnTop() {
  isAlwaysOnTop = !isAlwaysOnTop;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setAlwaysOnTop(isAlwaysOnTop);
    mainWindow.webContents.send('always-on-top-changed', isAlwaysOnTop);
  }
}

// ── Tray ───────────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = path.join(app.getAppPath(), 'assets', 'tray-icon.png');
  let icon;
  try { icon = nativeImage.createFromPath(iconPath); } catch { icon = nativeImage.createEmpty(); }
  try {
    tray = new Tray(icon);
    tray.setToolTip('PS AI Fill');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: '显示窗口', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
      { type: 'separator' },
      { label: '退出', click: () => { app.isQuitting = true; app.quit(); } }
    ]));
  } catch {}
}

// ── Window ─────────────────────────────────────────────────────────────────
function createWindow() {
  // Load icon with nativeImage for robustness
  var iconToUse;
  try {
    var icoPath = path.join(__dirname, '..', 'assets', 'app.ico');
    var ico = nativeImage.createFromPath(icoPath);
    if (!ico.isEmpty()) iconToUse = ico;
  } catch (e) {
    console.warn('[Icon] Failed to load app.ico:', e.message);
  }

  mainWindow = new BrowserWindow({
    width: 390,
    height: 1000,
    minWidth: 350,
    minHeight: 500,
    resizable: true,
    frame: false,
    alwaysOnTop: true,
    backgroundColor: '#07090e',
    icon: iconToUse,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false,
  });

  // Re-assign icon after construction for Windows taskbar/Alt-Tab
  if (iconToUse && mainWindow.setIcon) {
    try { mainWindow.setIcon(iconToUse); } catch (e) { /* silent */ }
  }

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadURL('http://localhost:' + serverPort);

  // Minimize to tray on native close (e.g. Alt+F4)
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.on('maximize', () => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('window-state-changed', true);
  });
  mainWindow.on('unmaximize', () => {
    if (!mainWindow.isDestroyed()) mainWindow.webContents.send('window-state-changed', false);
  });
}

// ── PS Bridge ──────────────────────────────────────────────────────────────
function startBridge() {
  const bridgePath = getBridgePath();
  if (!fs.existsSync(bridgePath)) {
    console.warn('[Bridge] ps-bridge.js not found:', bridgePath);
    return;
  }

  bridgeProcess = spawn(process.execPath, [bridgePath, '--password', '123456'], {
    cwd: app.getAppPath(),
    stdio: 'pipe',
    windowsHide: true,
    env: Object.assign({}, process.env, { ELECTRON_RUN_AS_NODE: '1' }),
  });

  bridgeProcess.stdout.on('data', (data) => {
    console.log('[Bridge]', data.toString().trim());
  });

  bridgeProcess.stderr.on('data', (data) => {
    const msg = data.toString().trim();
    console.error('[Bridge ERR]', msg);
    // Send error to renderer if it looks like an auth/connection issue
    if (msg.toLowerCase().includes('password') || msg.toLowerCase().includes('error')) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('bridge-error', msg);
      }
    }
  });

  bridgeProcess.on('error', (err) => {
    console.error('[Bridge] Failed to start:', err.message);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('bridge-error', 'PS Bridge 启动失败: ' + err.message);
    }
  });

  bridgeProcess.on('exit', (code) => {
    console.log('[Bridge] Exited with code:', code);
  });
}

// ── Express Server ─────────────────────────────────────────────────────────
function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = getServerPath();
    if (!fs.existsSync(serverPath)) {
      reject(new Error('Server bundle not found at ' + serverPath));
      return;
    }

    serverProcess = fork(serverPath, [], {
      env: { ...process.env, NODE_ENV: 'production', APP_ROOT: app.getAppPath() },
      cwd: app.getAppPath(),
      stdio: 'pipe',
      silent: true,
    });

    let resolved = false;
    serverProcess.stdout.on('data', (d) => {
      const m = d.toString();
      console.log('[Server]', m.trim());
      if (!resolved && m.includes('running on http')) {
      const match = m.match(/localhost:(\d+)/);
      if (match) serverPort = parseInt(match[1]);
      resolved = true;
      resolve();
    }
    });
    serverProcess.stderr.on('data', (d) => console.error('[Server ERR]', d.toString().trim()));
    serverProcess.on('error', (err) => { if (!resolved) { resolved = true; reject(err); } });
    serverProcess.on('exit', (c) => {
      if (!resolved) { resolved = true; reject(new Error('Server exited with code ' + c)); }
    });
    setTimeout(() => { if (!resolved) { resolved = true; resolve(); } }, 5000);
  });
}

// ── Close dialog ───────────────────────────────────────────────────────────
async function handleClose() {
  const pref = getConfig('closeAction', null);
  if (pref === 'close') { app.isQuitting = true; app.quit(); return; }
  if (pref === 'minimize') { mainWindow?.hide(); return; }

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    buttons: ['关闭程序', '最小化到托盘'],
    defaultId: 1,
    title: 'PS AI Fill',
    message: '关闭窗口还是最小化到托盘？',
    checkboxLabel: '记住我的选择，下次不再询问',
    checkboxChecked: false,
  });

  if (result.checkboxChecked) {
    setConfig('closeAction', result.response === 0 ? 'close' : 'minimize');
  }

  if (result.response === 0) {
    app.isQuitting = true;
    app.quit();
  } else {
    mainWindow?.hide();
  }
}

// ── IPC ────────────────────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});
ipcMain.handle('window-close', handleClose);
ipcMain.handle('window-is-maximized', () => mainWindow?.isMaximized() ?? false);

ipcMain.handle('toggle-always-on-top', () => { toggleAlwaysOnTop(); return isAlwaysOnTop; });
ipcMain.handle('get-always-on-top', () => isAlwaysOnTop);

// ── Download Image ──────────────────────────────────────────────────────────
ipcMain.handle('download-image', async (event, { url, filename, downloadPath }) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return { success: false, error: 'HTTP ' + response.status };
    const buffer = Buffer.from(await response.arrayBuffer());

    const safeFilename = String(filename).replace(/[^a-zA-Z0-9_\u4e00-\u9fff.-]/g, '_') || 'image.png';
    let saveDir = downloadPath && downloadPath.trim() ? downloadPath.trim() : app.getPath('downloads');
    // Ensure save directory exists
    if (!fs.existsSync(saveDir)) {
      try { fs.mkdirSync(saveDir, { recursive: true }); } catch (e) { saveDir = app.getPath('downloads'); }
    }
    const savePath = path.join(saveDir, safeFilename);

    // Handle duplicate filenames
    let finalPath = savePath;
    let counter = 1;
    while (fs.existsSync(finalPath)) {
      const ext = path.extname(safeFilename);
      const base = path.basename(safeFilename, ext);
      finalPath = path.join(saveDir, base + '_' + counter + ext);
      counter++;
    }

    fs.writeFileSync(finalPath, buffer);
    return { success: true, path: finalPath };
  } catch (err) {
    console.error('[Download] Error:', err.message);
    return { success: false, error: err.message };
  }
});


ipcMain.handle("save-to-cache", async (event, { url, filename }) => {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return { success: false };
    const buf = Buffer.from(await resp.arrayBuffer());
    const cacheDir2 = getConfig("cachePath", path.join(app.getAppPath(), "cache"));
    if (!fs.existsSync(cacheDir2)) fs.mkdirSync(cacheDir2, { recursive: true });
    const safeName = (filename || "image_" + Date.now()).replace(/[^a-zA-Z0-9_.-]/g, "_") + ".png";
    const fp = path.join(cacheDir2, safeName);
    fs.writeFileSync(fp, buf);
    return { success: true, path: fp, name: safeName };
  } catch(e) { return { success: false, error: e.message }; }
});
ipcMain.handle("get-cached-images", () => {
  try {
    const cacheDir2 = getConfig("cachePath", path.join(app.getAppPath(), "cache"));
    if (!fs.existsSync(cacheDir2)) return [];
    return fs.readdirSync(cacheDir2).filter(function(f) { return /.(png|jpg|jpeg|webp)$/i.test(f); }).map(function(f) {
      const st = fs.statSync(path.join(cacheDir2, f));
      return { name: f, path: path.join(cacheDir2, f), mtime: st.mtimeMs };
    }).sort(function(a, b) { return b.mtime - a.mtime; });
  } catch(e) { return []; }
});
ipcMain.handle("get-cache-path", () => {
  return getConfig("cachePath", path.join(app.getAppPath(), "cache"));
});
ipcMain.handle("set-cache-path", (event, p) => {
  setConfig("cachePath", p);
  return true;
});
ipcMain.handle('get-download-path', () => {
  return getConfig('downloadPath', '');
});

ipcMain.handle('set-download-path', (event, p) => {
  setConfig('downloadPath', p);
  return true;
});

// ── App lifecycle ─────────────────────────────────────────────────────────
app.on('ready', async () => {
  try {
    console.log('Starting server...');
    await startServer();
    console.log('Server started.');
  } catch (err) {
    console.error('Failed to start server:', err);
    app.quit();
    return;
  }

  createWindow();
  createTray();
  startBridge();
  globalShortcut.register('CmdOrCtrl+Shift+T', toggleAlwaysOnTop);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => { app.isQuitting = true; });
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (serverProcess) { serverProcess.kill(); serverProcess = null; }
  if (bridgeProcess) { bridgeProcess.kill(); bridgeProcess = null; }
});
