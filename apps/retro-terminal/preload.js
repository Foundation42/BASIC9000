const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('basic9000', {
  execute: (source) => ipcRenderer.invoke('repl:execute', source),
  reset: () => ipcRenderer.invoke('repl:reset'),
  onAction: (listener) => {
    ipcRenderer.on('terminal:action', (_event, payload) => listener?.(payload));
  }
});

// Also expose a simpler API object for canvas manager
contextBridge.exposeInMainWorld('api', {
  on: (channel, callback) => {
    const validChannels = ['canvas:command'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, data) => callback(data));
    }
  }
});
