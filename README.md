# BASIC9000

![BASIC9000 Logo](BASIC9000.png)

A retro-futuristic BASIC interpreter that bridges the nostalgia of 1980s computing with modern capabilities. Experience the green phosphor glow of CRT terminals while leveraging contemporary features like HTTP requests, JSON parsing, and WebGPU graphics.

![Boot Screen](BOOT.png)

## ✨ Features

### Classic BASIC with Modern Power
- **Traditional BASIC syntax** with line numbers, GOTO, and GOSUB
- **Modern extensions**: HTTP/JSON, async/await, WebSockets, and GPU compute
- **Real-time syntax highlighting** with customizable color themes
- **Retro CRT terminal** aesthetic with authentic green phosphor glow

### Language Features
- 📝 **Core Statements**: LET, PRINT, IF/THEN/ELSE, FOR/NEXT, WHILE/WEND
- 🌐 **HTTP Namespace**: GET, POST, STATUS with automatic HTTPS
- 📊 **JSON Support**: Parse, stringify, and query JSON data
- 📁 **File System**: Read, write, append, delete files
- ⏰ **Time Functions**: Current time, formatting, parsing
- 🔧 **System Utilities**: Platform info, sleep, ticks
- 🚀 **Concurrency**: SPAWN routines with message passing
- 🎨 **Terminal Control**: Clear screen, status bar, overlays

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/Foundation42/BASIC9000.git
cd BASIC9000

# Install dependencies
npm install

# Build the TypeScript interpreter
npm run build

# Start the retro terminal
cd apps/retro-terminal
npm install
npm start
```

### Your First Program

```basic
READY> PRINT "Hello from the future!"
Hello from the future!

READY> LET weather$ = HTTP.GET("wttr.in/London?format=3")
READY> PRINT weather$
London: 🌦 +27°C

READY> LET nums = [5, 2, 8, 1]
READY> PRINT ARRAY.SORT(nums)
[1, 2, 5, 8]
```

## 🎮 Terminal Controls

| Key Combination | Action |
|-----------------|--------|
| **Ctrl+L** | Clear screen |
| **Ctrl+R** | Reset session |
| **Ctrl+H** | Toggle syntax highlighting |
| **Ctrl+C** | Cancel current line |
| **↑/↓** | Navigate command history |

## 📚 Language Reference

### Variables and Types
```basic
LET name$ = "string variable"     ' String ($ suffix)
LET count = 42                    ' Number
LET pi! = 3.14159                ' Float (! suffix)
LET data% = 255                   ' Integer (% suffix)
LET items = [1, 2, 3]            ' Array
```

### Modern Namespaces

#### HTTP Operations
```basic
LET response$ = HTTP.GET("api.example.com/data")
LET result$ = HTTP.POST("api.example.com/save", body$)
LET status = HTTP.STATUS("example.com")
```

#### JSON Handling
```basic
LET data$ = HTTP.GET("api.weather.com/current")
LET temp = JSON.GET(data$, "main.temp")
PRINT "Temperature: " + STR$(temp) + "°C"
```

#### Array Operations
```basic
LET sorted = ARRAY.SORT(items)
LET reversed = ARRAY.REVERSE(items)
LET joined$ = ARRAY.JOIN(items, ", ")
LET length = ARRAY.LENGTH(items)
```

### Concurrent Programming
```basic
ROUTINE weather_monitor
  10 LET temp$ = HTTP.GET("api.weather.com/temp")
  20 PRINT "Current: " + temp$
  30 SYS.SLEEP(60000)
  40 GOTO 10
END ROUTINE

SPAWN weather_monitor
```

## 🏗️ Architecture

### Project Structure
```
BASIC9000/
├── src/                  # TypeScript interpreter core
│   ├── interpreter/      # Lexer, parser, evaluator
│   ├── types/           # Type definitions
│   └── index.ts         # Main exports
├── apps/
│   └── retro-terminal/  # Electron-based terminal
│       ├── renderer/    # Terminal UI & syntax highlighting
│       ├── main.js      # Electron main process
│       └── boot.bas     # Startup script
├── tests/               # Test suites
└── dist/               # Built JavaScript
```

### Core Components

- **Interpreter**: TypeScript-based BASIC interpreter with modern async support
- **Terminal**: Electron app with xterm.js for authentic terminal experience
- **Syntax Highlighter**: Real-time token-based highlighting with customizable themes
- **Host Environment**: Extensible namespace system for modern APIs

## 🛠️ Development

### Building from Source
```bash
npm run build          # Build TypeScript
npm run test          # Run tests
npm run test:watch    # Watch mode
npm run typecheck     # Type checking
```

### Running Tests
```bash
npm test
```

### Adding Host Functions
Extend the interpreter with custom namespaces in `src/interpreter/host-defaults.ts`:

```typescript
function createCustomNamespace() {
  return createNamespace('CUSTOM', {
    HELLO: createFunction('CUSTOM.HELLO', (args) => {
      return `Hello, ${args[0] || 'World'}!`;
    })
  });
}
```

## 🎨 Customization

### Terminal Themes
Edit `apps/retro-terminal/renderer/renderer.js` to customize colors:

```javascript
theme: {
  background: '#001500',    // Dark green background
  foreground: '#7bff78',    // Bright green text
  cursor: '#7bff78'         // Blinking cursor
}
```

### Syntax Highlighting Colors
Modify `apps/retro-terminal/renderer/syntax-highlighter.js`:

```javascript
const COLORS = {
  keyword: '\x1b[94m',      // Bright blue
  string: '\x1b[32m',       // Green
  number: '\x1b[38;5;208m', // Orange
  builtin: '\x1b[35m'       // Magenta
}
```

## 📖 Examples

### Fetch Weather Data
```basic
LET city$ = "Paris"
LET url$ = "wttr.in/" + city$ + "?format=j1"
LET data$ = HTTP.GET(url$)
LET temp = JSON.GET(data$, "current_condition[0].temp_C")
PRINT city$ + ": " + STR$(temp) + "°C"
```

### File Operations
```basic
FS.WRITE("data.txt", "Hello, World!")
LET content$ = FS.READ("data.txt")
PRINT content$
FS.APPEND("log.txt", TIME.NOW() + " - Event logged")
```

### Interactive Menu
```basic
10 PRINT "=== MAIN MENU ==="
20 PRINT "1. Weather"
30 PRINT "2. Time"
40 PRINT "3. Exit"
50 INPUT "Choice: ", choice
60 IF choice = 1 THEN GOSUB 100
70 IF choice = 2 THEN PRINT TIME.NOW()
80 IF choice = 3 THEN END
90 GOTO 10
100 REM Weather subroutine
110 PRINT HTTP.GET("wttr.in/?format=3")
120 RETURN
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run `npm test` to ensure tests pass
6. Submit a pull request

## 📜 License

MIT License - feel free to use BASIC9000 in your own projects!

## 🙏 Acknowledgments

- Inspired by classic 1980s BASIC interpreters
- Built with modern web technologies: TypeScript, Electron, xterm.js
- CRT aesthetic inspired by vintage computer terminals
- Special thanks to OpenAI Codex and Anthropic Claude for full retro approved coding assistance!
- Special thanks to all contributors and retro computing enthusiasts!

---

*Experience the future of retro computing with BASIC9000 - where nostalgia meets innovation!*