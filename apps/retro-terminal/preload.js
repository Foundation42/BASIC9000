const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('basic9000', {
  execute: (source) => ipcRenderer.invoke('repl:execute', source),
  reset: () => ipcRenderer.invoke('repl:reset'),
  onAction: (listener) => {
    ipcRenderer.on('terminal:action', (_event, payload) => listener?.(payload));
  }
});
