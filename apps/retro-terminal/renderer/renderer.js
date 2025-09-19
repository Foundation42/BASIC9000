const PROMPT = 'READY> ';
const banner = [
  'BASIC9000 Interactive Terminal',
  '--------------------------------',
  'Type HELP for ideas. Press Ctrl+L to clear, Ctrl+R to reset session.'
];

const term = new Terminal({
  cursorBlink: true,
  cols: 120,
  rows: 32,
  allowTransparency: true,
  theme: {
    background: '#001500',
    foreground: '#7bff78',
    cursor: '#7bff78',
    selectionForeground: '#001500',
    selectionBackground: '#7bff78'
  }
});

const fitAddon = new FitAddon.FitAddon();
const linksAddon = new WebLinksAddon.WebLinksAddon((_, url) => {
  window.open(url, '_blank');
});

term.loadAddon(fitAddon);
term.loadAddon(linksAddon);

const terminalHost = document.getElementById('terminal');
const statusBar = document.getElementById('status-bar');
const overlays = document.getElementById('overlays');

term.open(terminalHost);
fitAddon.fit();

// Delay initial focus to ensure terminal is ready
setTimeout(() => {
  term.focus();
}, 10);

// Re-focus on various events
window.addEventListener('focus', () => term.focus());
terminalHost.addEventListener('mousedown', () => term.focus());
terminalHost.addEventListener('click', () => term.focus());
document.addEventListener('click', (e) => {
  if (e.target.closest('#terminal-container')) {
    term.focus();
  }
});

window.addEventListener('resize', () => {
  fitAddon.fit();
});

let buffer = '';
const history = [];
let historyIndex = -1;
let executing = false;
let overlayTimer = null;

window.basic9000.onAction((payload) => {
  if (!payload || typeof payload !== 'object') {
    return;
  }

  switch (payload.type) {
    case 'write':
      term.writeln(String(payload.text ?? ''));
      break;
    case 'clear':
      clearScreen();
      break;
    case 'status':
      setStatus(String(payload.text ?? ''));
      break;
    case 'bell':
      term.write('\u0007');
      break;
    case 'overlay':
      showOverlay(String(payload.text ?? ''), Math.max(0, Number(payload.duration ?? 0)));
      break;
    default:
      break;
  }
});

function writeBanner() {
  term.write('\x1b[?25l');
  branch(() => banner.forEach((line) => term.writeln(line)));
  term.writeln('');
  term.write('\x1b[?25h');
}

function branch(fn) {
  term.write('\x1b[38;2;123;255;120m');
  fn();
  term.write('\x1b[0m');
}

function showPrompt() {
  term.write(`\r\n${PROMPT}`);
  buffer = '';
}

function renderInput() {
  term.write(`\x1b[2K\r${PROMPT}${buffer}`);
}

function clearScreen() {
  term.write('\x1b[2J\x1b[H');
  writeBanner();
  term.write(PROMPT);
  buffer = '';
}

function setStatus(text) {
  if (statusBar) {
    statusBar.textContent = text || 'READY';
  }
}

function showOverlay(text, duration) {
  if (!overlays) {
    return;
  }
  overlays.textContent = text || '';
  overlays.style.opacity = text ? '1' : '0';
  if (overlayTimer) {
    clearTimeout(overlayTimer);
    overlayTimer = null;
  }
  if (text && duration > 0) {
    overlayTimer = setTimeout(() => {
      overlays.style.opacity = '0';
      overlayTimer = null;
    }, duration);
  }
}

async function executeBuffer() {
  const command = buffer;
  term.write('\r\n');
  buffer = '';
  history.push(command);
  historyIndex = history.length;

  if (!command.trim()) {
    showPrompt();
    return;
  }

  executing = true;
  try {
    const response = await window.basic9000.execute(command);
    if (response.ok) {
      if (response.outputs?.length) {
        response.outputs.forEach((line) => {
          // Handle multiline output by splitting on newlines
          const lines = String(line).split('\n');
          lines.forEach((l, i) => {
            if (i === lines.length - 1 && l === '') {
              // Skip empty last line from split
              return;
            }
            term.writeln(l);
          });
        });
      }
      if (response.halted) {
        term.writeln(`(HALTED: ${response.halted})`);
      }
    } else {
      // Format error output to handle long lines and JSON
      const errorText = String(response.error);
      const lines = errorText.split('\n');
      lines.forEach((line) => {
        // Break long lines at reasonable width
        const maxWidth = 100;
        if (line.length > maxWidth) {
          for (let i = 0; i < line.length; i += maxWidth) {
            term.writeln(`? ${i === 0 ? '' : '  '}${line.substring(i, i + maxWidth)}`);
          }
        } else {
          term.writeln(`? ${line}`);
        }
      });
    }
  } catch (error) {
    term.writeln(`! ${(error && error.message) || error}`);
  }
  executing = false;
  showPrompt();
}

function handleHistory(direction) {
  if (!history.length) {
    return;
  }
  historyIndex += direction;
  if (historyIndex < 0) {
    historyIndex = 0;
  } else if (historyIndex >= history.length) {
    historyIndex = history.length;
    buffer = '';
    renderInput();
    return;
  }
  buffer = history[historyIndex] ?? '';
  renderInput();
}

async function resetSession() {
  await window.basic9000.reset();
  history.length = 0;
  historyIndex = -1;
  term.writeln('\r\nSession reset.');
  showPrompt();
}

term.onData(async (data) => {
  if (executing) {
    return;
  }

  switch (data) {
    case '\r':
      await executeBuffer();
      return;
    case '\u0003': // Ctrl+C
      term.write('^C');
      buffer = '';
      showPrompt();
      return;
    case '\u000c': // Ctrl+L
      clearScreen();
      return;
    case '\u0012': // Ctrl+R
      await resetSession();
      return;
    case '\u007f': // Backspace
      if (buffer.length > 0) {
        buffer = buffer.slice(0, -1);
        term.write('\b \b');
      }
      return;
    case '\u001b[A':
      handleHistory(-1);
      return;
    case '\u001b[B':
      handleHistory(1);
      return;
    default:
      break;
  }

  if (data[0] === '\u001b') {
    // Ignore other escape sequences for now.
    return;
  }

  if (data >= ' ' && data <= '~') {
    buffer += data;
    term.write(data);
  }
});

writeBanner();
setStatus('READY');
term.write(PROMPT);
