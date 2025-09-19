const { contextBridge, ipcRenderer } = require('electron');
const { Terminal } = require('@xterm/xterm');
const { FitAddon } = require('@xterm/addon-fit');
const { WebLinksAddon } = require('@xterm/addon-web-links');

contextBridge.exposeInMainWorld('basic9000', {
  execute: (source) => ipcRenderer.invoke('repl:execute', source),
  reset: () => ipcRenderer.invoke('repl:reset'),
  Terminal,
  FitAddon,
  WebLinksAddon,
  onAction: (listener) => {
    ipcRenderer.on('terminal:action', (_event, payload) => listener?.(payload));
  }
});
