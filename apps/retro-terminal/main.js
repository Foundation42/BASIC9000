const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');

const sessionPromise = (async () => {
  const {
    InterpreterSession,
    createDefaultHostEnvironment,
    createNamespace,
    createFunction
  } = await import('../../dist/index.js');

  const env = createDefaultHostEnvironment();
  env.register('TERMINAL', createTerminalNamespace(createNamespace, createFunction));
  return new InterpreterSession({ hostEnvironment: env });
})();

let terminalWindow;

function createWindow() {
  terminalWindow = new BrowserWindow({
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

  terminalWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

ipcMain.handle('repl:execute', async (_event, source) => {
  const command = typeof source === 'string' ? source : '';
  if (!command.trim()) {
    return { ok: true, outputs: [], variables: {}, halted: null };
  }
  try {
    const session = await sessionPromise;
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

ipcMain.handle('repl:reset', async () => {
  const session = await sessionPromise;
  session.reset();
  return { ok: true };
});

function createTerminalNamespace(createNamespace, createFunction) {
  const action = (payload) => {
    if (terminalWindow && !terminalWindow.isDestroyed()) {
      terminalWindow.webContents.send('terminal:action', payload);
    }
  };

  return createNamespace('TERMINAL', {
    WRITE: createFunction('TERMINAL.WRITE', (args) => {
      const text = args[0] ?? '';
      action({ type: 'write', text: String(text) });
      return 0;
    }),
    CLEAR: createFunction('TERMINAL.CLEAR', () => {
      action({ type: 'clear' });
      return 0;
    }),
    STATUS: createFunction('TERMINAL.STATUS', (args) => {
      const text = args[0] ?? '';
      action({ type: 'status', text: String(text ?? '') });
      return 0;
    }),
    BELL: createFunction('TERMINAL.BELL', () => {
      action({ type: 'bell' });
      return 0;
    })
  });
}

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
