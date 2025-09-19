const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

const { InterpreterSession } = require('../../dist/index.js');

const session = new InterpreterSession();

function createWindow() {
  const window = new BrowserWindow({
    width: 960,
    height: 640,
    backgroundColor: '#000000',
    title: 'BASIC9000 Terminal',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  window.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('repl:execute', async (_event, source) => {
  const command = typeof source === 'string' ? source : '';
  if (!command.trim()) {
    return { ok: true, outputs: [], variables: {}, halted: null };
  }
  try {
    const result = await session.run(command);
    return {
      ok: true,
      outputs: Array.from(result.outputs),
      variables: result.variables,
      halted: result.halted ?? null
    };
  } catch (error) {
    return { ok: false, error: formatError(error) };
  }
});

ipcMain.handle('repl:reset', () => {
  session.reset();
  return { ok: true };
});

function formatError(error) {
  if (!error) {
    return 'Unknown error';
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return JSON.stringify(error);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
