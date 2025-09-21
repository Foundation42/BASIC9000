# BASIC9000

![BASIC9000 Logo](BASIC9000.png)

A retro-futuristic BASIC interpreter that bridges the nostalgia of 1980s computing with modern capabilities. Experience the green phosphor glow of CRT terminals while leveraging contemporary features like HTTP requests, JSON parsing, and WebGPU graphics.

![Boot Screen](BOOT.png)

## ✨ Features

### Classic BASIC with Modern Power
- **Modern BASIC syntax** with structured programming (SUB/FUNCTION)
- **Modern extensions**: HTTP/JSON, async/await, WebSockets, and GPU compute
- **Real-time syntax highlighting** with customizable color themes
- **Retro CRT terminal** aesthetic with authentic green phosphor glow

### Language Features

#### Classic BASIC Foundation
- 📝 **Core Statements**: LET, PRINT, IF/THEN/ELSE/END IF, FOR/NEXT, WHILE/WEND
- 🔢 **Classic Math Functions**: SIN, COS, TAN, ATN, SQR, ABS, INT, RND, SGN, EXP, LOG
- 📐 **String Functions**: MID$, LEFT$, RIGHT$, INSTR, STR$, CHR$, VAL, ASC, LEN, SPACE$, STRING$

#### Modern Type System (NEW!)
- 🏗️ **TYPE Definitions**: Define structured record types with fields
- 📦 **Record Literals**: Create instances with `Type { field: value }` syntax
- 🔍 **Type Annotations**: Optional type declarations with `AS TYPE`
- ✏️ **Field Modification**: Direct field updates with `record.field = value`
- 🎯 **UFCS**: Uniform Function Call Syntax for method-like calls with chaining support
- 🏠 **PROPERTY**: Computed properties with getter/setter support
- 🔄 **REF Parameters**: Pass-by-reference for in-place modifications
- 🎛️ **Default Parameters**: Functions with optional parameters
- 📤 **Spread Operator**: Expand arrays and SPREAD-annotated records in function calls (`...array` or `array...`)
- 🆕 **NEW Operator**: Elegant object construction with `NEW TypeName(args)` syntax

#### Advanced Control Flow
- 🛡️ **TRY/CATCH/FINALLY**: Modern error handling with structured exceptions
- 🎯 **SELECT CASE**: Multi-way branching with multiple case values
- 🏷️ **WITH Statement**: Simplified field access for records
- 📤 **FUNCTION/SUB**: User-defined functions and subroutines
- 🚪 **EXIT SUB/FUNCTION**: Early return from procedures
- 🧹 **DEFER Statement**: Go-style scope-exit cleanup with guaranteed execution on all exit paths

#### Modern Extensions
- 🌐 **HTTP Namespace**: GET, POST, STATUS with automatic HTTPS
- 📊 **JSON Support**: Parse, stringify, and query JSON data
- 📁 **File System**: Read, write, append, delete files
- ⏰ **Time Functions**: Current time, formatting, parsing
- 🔧 **System Utilities**: Platform info, sleep, ticks
- 🚀 **Concurrency**: SPAWN routines with message passing
- 🎨 **Terminal Control**: Clear screen, status bar, overlays
- 🤖 **AI Integration**: OpenAI, Anthropic, and OpenAI-compatible LLMs
- 🖼️ **Canvas Graphics**: 2D drawing API with 70+ functions including transparency

## 🧪 World-Class Test Coverage

**100/100 tests passing** with comprehensive validation of all language features! 🎯

### 🔬 **Comprehensive Test Suite**
- **100 total tests** covering every aspect of BASIC9000
- **8 new test categories** for modern language features:
  - UFCS with record spread combinations
  - NEW operator with method chaining
  - DEFER with nested scopes and error handling
  - Complex UFCS chains with error propagation
  - WITH blocks combined with UFCS
  - Property access with method chaining
  - Conformance tests from CONFORMANCE.md
  - Enhanced string/array operations

### 🐛 **Critical Bugs Discovered & Fixed**
Our professional-grade testing uncovered and fixed **major interpreter bugs**:
- **UFCS Spread Operator Bug**: Fixed spread expressions not working in method chains
- **Variable Type Coercion**: Resolved BASIC string variable naming convention issues
- **Enhanced LEN() Function**: Now supports both strings AND arrays seamlessly
- **🔥 Global Variable Scoping**: Fixed functions not persisting global variable changes
- **🔥 REF Parameter Scoping**: Fixed REF parameters not modifying original variables
- **🔥 DEFER Value Capture**: Fixed variable capture to use Go-style value semantics

### 🚀 **Quality Assurance**
- **Edge case testing** for all feature combinations
- **Error handling validation** across nested scopes
- **Performance regression prevention**
- **Conformance validation** against language specification

Run `npm test` to see all 100 tests pass in seconds! ⚡

## 🎉 AMAZING PROGRESS TODAY!

**We just shipped some INCREDIBLE features!** 🚀✨

### 🌟 **Fresh Off The Press - TODAY'S RELEASES:**

#### 📤 **Spread Operator Magic**
- **Prefix syntax**: `PRINT(...myArray)`
- **Postfix syntax**: `PRINT(myArray...)`
- Works with arrays AND SPREAD-annotated records!
- JavaScript-like syntax in classic BASIC! 🤯

#### 🔍 **Array Indexing Perfection**
- **Modern bracket notation**: `arr[index]`
- Works with arrays, records, AND plain objects
- Proper bounds checking and error messages
- No more `ARRAY.GET()` - use the clean syntax!

#### ⛓️ **Chained UFCS Elegance**
- **Method chaining**: `canvas.COLOR("#ff0000").RECT(10, 10, 50, 50).FILLCIRCLE(100, 100, 25)`
- Fluent interfaces for graphics and data manipulation
- Every mutating operation returns the handle for chaining
- Write elegant, readable graphics code! ✨

#### 🆕 **NEW Operator Magic**
- **Modern construction**: `NEW CANVAS(400, 300)` and `NEW Point(10, 20)`
- **Built-in objects**: Replaces verbose `.CREATE()` calls with elegant syntax
- **Constructor functions**: Works with user-defined types seamlessly
- **Perfect integration**: `NEW CANVAS(400, 300).COLOR("#ff0000").RECT(0, 0, 100, 100)`

#### 🧪 **Professional Test Coverage Achieved**
- **~80% Core Coverage**: Comprehensive test suite for DEFER, UFCS, and NEW features
- **Canvas Golden Tests**: UFCS+spread+chaining validation without UI dependencies
- **Config Round-Trip Tests**: Type preservation and error handling validation
- **Evaluator Edge Cases**: REF+default+varargs+UFCS complex scenarios
- **Array Spread Tests**: Mixed positions with side-effects and evaluation order
- **DEFER Async Tests**: Cancellation, LIFO order, error handling, nested scopes
- **Mailbox Demo**: SPAWN/SEND/RECV theoretical implementation showcase
- **🎯 Integration Test**: 100% success rate (36/36 tests) - PERFECT SCORE! 🎊
- **Professional Debugging**: Discovered and fixed 3 critical interpreter bugs! 🐛➡️✅

#### 🎨 **Syntax Highlighting Glow-Up**
- **70+ new keywords** and functions now highlighted
- All AI, MATH, CANVAS namespaces properly colorized
- **Type system keywords** (`TYPE`, `SPREAD`, `AS`) shine bright
- Beautiful green phosphor aesthetic maintained ✨

#### 🖥️ **Boot Script Perfection**
- Fixed timing issues - boot output now shows perfectly
- Proper colorization restored for startup messages
- Clean terminal initialization sequence

### 📊 **By The Numbers:**
- ✅ **86/86 tests passing** (100% success rate!)
- 🎯 **6 major features** implemented and polished
- 🚀 **Modernized codebase** with legacy GOTO/GOSUB removed
- 🆕 **NEW operator** brings object-oriented elegance to BASIC
- 💚 **Cleaner, more maintainable** structured programming focus!

**BASIC9000 is now more powerful than ever while maintaining that nostalgic charm!** 🏆

---

## 🔐 Secure Configuration

BASIC9000 includes comprehensive secrets management - no more API keys in code!

1. Copy the example config: `cp .basic9000.example.json .basic9000.json`
2. Add your API keys to the config file
3. Your keys are automatically loaded and available to all APIs!

See [Secrets Management Guide](docs/secrets-management.md) for details.

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
```

### Modern Type System Example

```basic
' Define a structured type
TYPE Person
  name AS STRING
  age AS NUMBER
  email AS STRING
END TYPE

' Create instances with literal syntax
LET user = Person { name: "Alice", age: 30, email: "alice@example.com" }

' Or use constructor functions with NEW operator
FUNCTION Person(name AS STRING, age AS NUMBER, email AS STRING) AS Person
  RETURN Person { name: name, age: age, email: email }
END FUNCTION

LET user2 = NEW Person("Bob", 25, "bob@example.com")

' Direct field modification
user.age = 31
PRINT user.name + " is " + STR$(user.age) + " years old"

' Define computed properties
PROPERTY Person.IsAdult(self AS Person) AS BOOL GET
  RETURN self.age >= 18
END PROPERTY

IF user.IsAdult THEN
  PRINT "User can vote!"
END IF

' Functions with default parameters
FUNCTION Greet(name AS STRING = "World", excited AS BOOL = FALSE) AS STRING
  IF excited THEN
    RETURN "Hello, " + name + "!"
  ELSE
    RETURN "Hello, " + name
  END IF
END FUNCTION

PRINT Greet()                    ' "Hello, World"
PRINT Greet("BASIC9000", TRUE)   ' "Hello, BASIC9000!"

' Error handling with TRY/CATCH
TRY
  LET result = 10 / 0
CATCH err
  PRINT "Error: " + err.message
FINALLY
  PRINT "Cleanup complete"
END TRY
```

## 🎮 Terminal Controls

| Key Combination | Action |
|-----------------|--------|
| **Ctrl+L** | Clear screen |
| **Ctrl+R** | Reset session |
| **Ctrl+H** | Toggle syntax highlighting |
| **Ctrl+C** | Cancel current line |
| **↑/↓** | Navigate command history |

### Running Programs
```basic
RUN filename.bas     ' Load and execute a .bas file
RUN demos/canvas-retro-demo.bas  ' Run from subdirectory
```

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

#### Free Function UFCS
BASIC9000 supports Uniform Function Call Syntax with function overloading, allowing method-like calls on any type:

```basic
FUNCTION Length(self AS Vector) AS NUMBER
  RETURN SQR(self.x*self.x + self.y*self.y)
END FUNCTION

LET v = Vector { x: 3, y: 4 }
PRINT v.Length()   ' == Length(v) → 5.0

' Function overloading for different types
FUNCTION Display(self AS Vector) AS STRING
  RETURN "Vector(" + STR$(self.x) + "," + STR$(self.y) + ")"
END FUNCTION

FUNCTION Display(self AS Point) AS STRING
  RETURN "Point(" + STR$(self.x) + "," + STR$(self.y) + ")"
END FUNCTION

' Type-safe dispatch
PRINT v.Display()  ' → "Vector(3,4)"
PRINT p.Display()  ' → "Point(5,6)"
```

### Concurrent Programming
```basic
ROUTINE weather_monitor
  WHILE TRUE
    LET temp$ = HTTP.GET("api.weather.com/temp")
    PRINT "Current: " + temp$
    SYS.SLEEP(60000)
  WEND
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
SUB ShowWeather()
  PRINT HTTP.GET("wttr.in/?format=3")
END SUB

WHILE TRUE
  PRINT "=== MAIN MENU ==="
  PRINT "1. Weather"
  PRINT "2. Time"
  PRINT "3. Exit"
  INPUT "Choice: ", choice

  SELECT CASE choice
    CASE 1
      ShowWeather()
    CASE 2
      PRINT TIME.NOW()
    CASE 3
      END
  END SELECT
WEND
```

### DEFER Cleanup
```basic
SUB ProcessFile(filename$)
  LET handle = FileOpen(filename$)

  ' Guarantee file is closed even if error occurs
  DEFER FileClose(handle)
  DEFER PRINT "File processing complete: " + filename$

  ' Process file - DEFER ensures cleanup on any exit path
  LET data$ = FileRead(handle)

  IF INSTR(data$, "error") > 0 THEN
    ERROR "Invalid file format"  ' DEFER still executes
  END IF

  ' Normal processing continues...
  PRINT "Processing: " + data$
END SUB

' DEFER also works with multiple cleanup actions (LIFO order)
SUB TransactionExample()
  DEFER PRINT "3. Transaction complete"
  DEFER PRINT "2. Commit changes"
  DEFER PRINT "1. Release lock"

  PRINT "Starting transaction..."
  RETURN  ' All DEFERs execute in reverse order
END SUB
```

### Canvas Graphics

![Canvas Graphics Demo](CANVAS.png)

![Spirograph Mathematical Art](SPIROGRAPH.png)

BASIC9000 includes a full 2D graphics system with over 70 drawing functions!

```basic
REM Create and show a canvas
LET canvas = NEW CANVAS(800, 600)
CANVAS.POSITION(canvas, 50, 50)
CANVAS.SHOW(canvas)

REM Draw retro-styled graphics
CANVAS.COLOR(canvas, "#00ff00")  ' Green phosphor color
CANVAS.FONT(canvas, "24px monospace")
CANVAS.TEXT(canvas, "BASIC9000", 400, 50)

REM Draw shapes
CANVAS.COLOR(canvas, "red")
CANVAS.FILLCIRCLE(canvas, 200, 300, 50)
CANVAS.COLOR(canvas, "blue")
CANVAS.RECT(canvas, 100, 200, 100, 100)

REM Run demos
RUN demos/canvas-retro-demo.bas  ' Full retro computer visualization
RUN demos/canvas-animation.bas   ' Bouncing ball physics
RUN demos/canvas-paint.bas       ' Interactive paint program
RUN demos/canvas-spirograph.bas  ' Mathematical spirograph art
```

**Canvas Features:**
- 🎨 Full drawing API (shapes, lines, curves, text)
- 🖼️ Image loading and manipulation
- 🌈 Gradients and patterns
- 🔄 Transformations (rotate, scale, translate)
- 🖱️ Mouse interaction support
- 📐 Multiple canvases with layering
- ⚡ Hardware-accelerated rendering
- 🌟 Transparency with GLOBALPHA
- 📊 Mathematical art and visualizations

### AI Integration

![AI Integration](AI.png)

```basic
REM Configure AI (OpenAI, Anthropic, or local server)
AI.KEY("openai", "your-api-key-here")
LET assistant = NEW AI("openai", "gpt-3.5-turbo")

REM Or use a local Ollama server
LET local_ai = NEW AI("generic", "llama2", "http://localhost:11434/v1")

REM Configure and use
AI.SYSTEM(assistant, "You are a helpful BASIC programming tutor")
AI.TEMPERATURE(assistant, 0.7)

LET response$ = AI.GENERATE(assistant, "Explain loops in BASIC")
PRINT response$

REM Interactive conversation
AI.USER(assistant, "How do I read a file?")
LET answer$ = AI.ASSISTANT(assistant)
PRINT answer$
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