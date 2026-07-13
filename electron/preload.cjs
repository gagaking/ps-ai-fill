const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.invoke('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
  onMaximizedChanged: (callback) => {
    ipcRenderer.on('window-state-changed', (_event, value) => callback(value));
  },

  // Always-on-top (hidden from UI)
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  getAlwaysOnTop: () => ipcRenderer.invoke('get-always-on-top'),
  onAlwaysOnTopChanged: (callback) => {
    ipcRenderer.on('always-on-top-changed', (_event, value) => callback(value));
  },

  // Bridge error notifications from main process
  onBridgeError: (callback) => {
    ipcRenderer.on('bridge-error', (_event, msg) => callback(msg));
  },

  // Image download (bypasses CORS by going through main process)
  downloadImage: (data) => ipcRenderer.invoke('download-image', data),

 // Get/set download path config
 getDownloadPath: () => ipcRenderer.invoke('get-download-path'),
 setDownloadPath: (p) => ipcRenderer.invoke('set-download-path', p),

  // Cache management
  getCachePath: () => ipcRenderer.invoke('get-cache-path'),
  setCachePath: (p) => ipcRenderer.invoke('set-cache-path', p),
  saveToCache: (data) => ipcRenderer.invoke('save-to-cache', data),
  getCachedImages: () => ipcRenderer.invoke('get-cached-images'),
});
