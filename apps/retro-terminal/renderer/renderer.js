const PROMPT = 'READY> ';
const banner = [
  'BASIC9000 Interactive Terminal',
  '--------------------------------',
  'Type HELP for ideas. Ctrl+L: clear, Ctrl+R: reset, Ctrl+H: toggle highlighting'
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

// Initialize syntax highlighter
const highlighter = new SyntaxHighlighter(true);

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
let cursorPos = 0; // Cursor position within the buffer
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
  cursorPos = 0;
}

function renderInput() {
  // Clear the line and render with syntax highlighting
  const highlighted = highlighter.highlightLine(buffer);
  term.write(`\x1b[2K\r${PROMPT}${highlighted}`);

  // Position cursor correctly within the line
  const promptLength = PROMPT.length;
  const targetCol = promptLength + cursorPos;
  term.write(`\x1b[${targetCol + 1}G`); // Move to column (1-based)
}

function clearScreen() {
  term.write('\x1b[2J\x1b[H');
  writeBanner();
  term.write(PROMPT);
  buffer = '';
  cursorPos = 0;
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
  const command = buffer.trim();
  term.write('\r\n');
  buffer = '';
  cursorPos = 0;

  // Handle special RUN command for loading .bas files
  if (command.toUpperCase().startsWith('RUN ')) {
    const filename = command.substring(4).trim().replace(/^["']|["']$/g, '');

    executing = true;
    try {
      // Use a simpler approach - execute commands in sequence
      // First, try to read the file
      term.write(`Loading ${filename}...\r\n`);

      // Build list of paths to try
      const searchPaths = [];

      // If it's an absolute path, just use it
      if (filename.startsWith('/')) {
        searchPaths.push(filename);
      } else {
        // For relative paths, try multiple locations
        searchPaths.push(filename);
        searchPaths.push(`../../demos/${filename}`);
        searchPaths.push(`../../${filename}`);
        searchPaths.push(`demos/${filename}`);

        // If no .bas extension, try adding it
        if (!filename.endsWith('.bas')) {
          searchPaths.push(`${filename}.bas`);
          searchPaths.push(`../../demos/${filename}.bas`);
          searchPaths.push(`../../${filename}.bas`);
          searchPaths.push(`demos/${filename}.bas`);
        }
      }

      let fileContent = null;
      let successPath = null;

      // Try each path until we find the file
      for (const tryPath of searchPaths) {
        // Use FS.READ with LET to capture the content
        const readCommand = `LET fileContent$ = FS.READ("${tryPath}")`;
        const readResponse = await window.basic9000.execute(readCommand);

        if (readResponse.ok) {
          // Now retrieve the content by printing the variable
          const getCommand = `PRINT fileContent$`;
          const getResponse = await window.basic9000.execute(getCommand);

          if (getResponse.ok && getResponse.outputs && getResponse.outputs.length > 0) {
            fileContent = getResponse.outputs.join('\n');
            successPath = tryPath;
            break;
          }
        }
      }

      if (!fileContent) {
        term.write(`? Error: File not found: ${filename}\r\n`);
        term.write(`? Searched in: current dir, ../../demos/, ../../\r\n`);
        showPrompt();
        executing = false;
        return;
      }

      term.write(`Running ${filename}...\r\n`);

      // Execute the loaded program
      const runResponse = await window.basic9000.execute(fileContent);

      if (runResponse.ok) {
        if (runResponse.outputs?.length) {
          runResponse.outputs.forEach((line) => {
            const lines = String(line).split('\n');
            lines.forEach((l, i) => {
              if (i === lines.length - 1 && l === '') return;
              const highlighted = highlighter.highlightLine(l);
              term.writeln(highlighted);
            });
          });
        }
        if (runResponse.halted) {
          term.writeln(`(HALTED: ${runResponse.halted})`);
        }
      } else {
        const errorText = String(runResponse.error);
        const lines = errorText.split('\n');
        lines.forEach((line) => {
          term.writeln(`? ${line}`);
        });
      }
    } catch (error) {
      term.write(`? Error: ${error.message}\r\n`);
    } finally {
      executing = false;
      showPrompt();
    }
    return;
  }
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
            // Apply syntax highlighting to output
            const highlighted = highlighter.highlightLine(l);
            term.writeln(highlighted);
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
    cursorPos = 0;
    renderInput();
    return;
  }
  buffer = history[historyIndex] ?? '';
  cursorPos = buffer.length; // Position cursor at end when loading from history
  renderInput(); // This already uses the highlighter
}

async function resetSession() {
  await window.basic9000.reset();
  history.length = 0;
  historyIndex = -1;
  term.writeln('\r\nSession reset.');
  showPrompt();
}

// Helper functions for cursor and text manipulation
function insertAtCursor(text) {
  buffer = buffer.slice(0, cursorPos) + text + buffer.slice(cursorPos);
  cursorPos += text.length;
  renderInput();
}

function deleteAtCursor() {
  if (cursorPos > 0) {
    buffer = buffer.slice(0, cursorPos - 1) + buffer.slice(cursorPos);
    cursorPos--;
    renderInput();
  }
}

function deleteForwardAtCursor() {
  if (cursorPos < buffer.length) {
    buffer = buffer.slice(0, cursorPos) + buffer.slice(cursorPos + 1);
    renderInput();
  }
}

function moveCursor(offset) {
  cursorPos = Math.max(0, Math.min(buffer.length, cursorPos + offset));
  renderInput();
}

function setCursor(pos) {
  cursorPos = Math.max(0, Math.min(buffer.length, pos));
  renderInput();
}

function findWordBoundary(forward) {
  let pos = cursorPos;
  if (forward) {
    // Move to end of current word, then to start of next word
    while (pos < buffer.length && /\S/.test(buffer[pos])) pos++;
    while (pos < buffer.length && /\s/.test(buffer[pos])) pos++;
  } else {
    // Move to start of current word, then to start of previous word
    if (pos > 0) pos--; // Step back if not at start
    while (pos > 0 && /\s/.test(buffer[pos])) pos--;
    while (pos > 0 && /\S/.test(buffer[pos - 1])) pos--;
  }
  return pos;
}

term.onData(async (data) => {
  if (executing) {
    return;
  }

  // Handle single characters first
  switch (data) {
    case '\r': // Enter
      await executeBuffer();
      return;
    case '\u0003': // Ctrl+C
      term.write('^C');
      buffer = '';
      cursorPos = 0;
      showPrompt();
      return;
    case '\u000c': // Ctrl+L
      clearScreen();
      return;
    case '\u0012': // Ctrl+R
      await resetSession();
      return;
    case '\u0008': // Ctrl+H
      const enabled = highlighter.toggle();
      term.writeln(`\r\n(Syntax highlighting ${enabled ? 'enabled' : 'disabled'})`);
      showPrompt();
      return;
    case '\u007f': // Backspace
      deleteAtCursor();
      return;
    case '\u0001': // Ctrl+A (Home)
      setCursor(0);
      return;
    case '\u0005': // Ctrl+E (End)
      setCursor(buffer.length);
      return;
    case '\u0004': // Ctrl+D (Delete forward)
      deleteForwardAtCursor();
      return;
    case '\u000b': // Ctrl+K (Delete to end of line)
      buffer = buffer.slice(0, cursorPos);
      renderInput();
      return;
    case '\u0015': // Ctrl+U (Delete to start of line)
      buffer = buffer.slice(cursorPos);
      cursorPos = 0;
      renderInput();
      return;
  }

  // Handle escape sequences
  if (data.startsWith('\u001b[')) {
    switch (data) {
      case '\u001b[A': // Up arrow
        handleHistory(-1);
        return;
      case '\u001b[B': // Down arrow
        handleHistory(1);
        return;
      case '\u001b[C': // Right arrow
        moveCursor(1);
        return;
      case '\u001b[D': // Left arrow
        moveCursor(-1);
        return;
      case '\u001b[H': // Home
        setCursor(0);
        return;
      case '\u001b[F': // End
        setCursor(buffer.length);
        return;
      case '\u001b[3~': // Delete
        deleteForwardAtCursor();
        return;
      case '\u001b[1;5C': // Ctrl+Right (word forward)
        setCursor(findWordBoundary(true));
        return;
      case '\u001b[1;5D': // Ctrl+Left (word backward)
        setCursor(findWordBoundary(false));
        return;
    }
  }

  // Ignore other escape sequences
  if (data[0] === '\u001b') {
    return;
  }

  // Handle printable characters
  if (data >= ' ' && data <= '~') {
    insertAtCursor(data);
  }
});

writeBanner();
setStatus('READY');

// Run boot script after terminal is ready
window.basic9000.boot().then(result => {
  if (result.ok && result.outputs.length > 0) {
    // Display boot script output with same formatting as regular REPL output
    result.outputs.forEach(output => {
      // Handle multiline output by splitting on newlines
      const lines = String(output).split('\n');
      lines.forEach((l, i) => {
        if (i === lines.length - 1 && l === '') {
          // Skip empty last line from split
          return;
        }
        // Apply syntax highlighting to output
        const highlighted = highlighter.highlightLine(l);
        term.writeln(highlighted);
      });
    });
    term.writeln(''); // Add blank line after boot output
  } else if (!result.ok) {
    // Display boot errors to the user
    term.writeln('\x1b[91m? Boot script error:\x1b[0m');
    const errorText = String(result.error || 'Unknown boot error');
    const lines = errorText.split('\n');
    lines.forEach((line) => {
      term.writeln(`? ${line}`);
    });
    term.writeln('');
  }
  term.write(PROMPT);
}).catch(error => {
  console.error('Boot script failed:', error);
  term.writeln('\x1b[91m? Boot script failed to load\x1b[0m');
  term.writeln(`? ${error.message || error}`);
  term.writeln('');
  term.write(PROMPT);
});
