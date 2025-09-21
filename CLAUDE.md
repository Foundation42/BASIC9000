# CLAUDE.md - Development Notes

## Project Overview
BASIC9000 is a retro-futuristic BASIC interpreter combining 1980s computing nostalgia with modern capabilities. Built with TypeScript, it features a beautiful Electron-based terminal with green phosphor CRT aesthetics and real-time syntax highlighting.

## Recent Achievements

### AI Integration (Complete)
- Implemented comprehensive AI namespace supporting OpenAI, Anthropic, and OpenAI-compatible endpoints
- Instance-based design for managing multiple AI conversations
- Support for generic/custom endpoints (Ollama, Together AI, etc.)
- Functions use parentheses: `AI.KEY("openai", "key")`, `AI.CREATE("openai", "gpt-3.5-turbo")`
- Auto-detects API keys from environment and config files

### Secrets Management (Complete)
- CONFIG namespace for loading JSON/YAML config files
- Auto-loads from standard locations: `.basic9000.json`, `~/.basic9000/`, etc.
- SYS.ENV() and SYS.SETENV() for environment variables
- Config files in .gitignore for security
- Comprehensive documentation in `docs/secrets-management.md`

### Terminal Features (Complete)
- xterm.js integration with proper module loading
- Syntax highlighting with toggle (Ctrl+H)
- Fixed input focus issues with delayed initialization
- Proper multiline output handling
- Command history with up/down arrows

## Canvas Implementation (Complete! 🎨)

### Canvas Features Implemented
✅ Instance-based design like AI namespace
✅ 2D graphics overlaying terminal with HTML5 Canvas
✅ Full drawing API: 70+ functions for shapes, text, paths, transforms
✅ IPC communication between main and renderer
✅ Canvas instances as first-class BASIC variables
✅ Multiple canvases with z-index layering
✅ Mouse interaction support (MOUSEX, MOUSEY, CLICKED)
✅ Gradients, patterns, and image loading
✅ Animation support with physics demos
✅ Transparency with GLOBALPHA for visual effects
✅ Mathematical art generation (spirograph demo!)

## Language Enhancements (Complete!)

### Multi-line IF/THEN/ELSE/END IF Blocks
✅ Support for both single-line and multi-line IF statements
✅ Proper block parsing with END IF terminator
✅ Nested statement support within blocks

### Classic BASIC Functions Added
✅ **Math Functions**: SIN, COS, TAN, ATN, SQR, ABS, INT, RND, SGN, EXP, LOG
✅ **String Functions**: MID$, LEFT$, RIGHT$, INSTR, SPACE$, STRING$
✅ **Conversion Functions**: STR$, CHR$, VAL, ASC, LEN
✅ All available as global functions (no namespace required)

### RUN Command Improvements
✅ Smart path resolution (searches demos/, project root, etc.)
✅ Automatic .bas extension handling
✅ Better error messages for file not found

### Canvas Demo Programs
- `demos/canvas-demo.bas` - Basic shapes and drawing
- `demos/canvas-animation.bas` - Bouncing ball with physics
- `demos/canvas-paint.bas` - Interactive paint program
- `demos/canvas-retro-demo.bas` - Full retro computer visualization with scan lines

### Key Architecture Patterns
- Host namespaces in `src/interpreter/`
- Instance handles stored in Maps
- Functions require parentheses for all arguments
- Error handling with try/catch in BASIC
- Auto-loading and configuration through CONFIG

### Testing Notes
- Build with `npm run build`
- Test in retro terminal with `cd apps/retro-terminal && npm start`
- Syntax highlighting shows keywords in bright blue, strings in green, numbers in orange
- API keys auto-load from .basic9000.json or environment

### Important Files
- `src/interpreter/ai-namespace.ts` - AI implementation
- `src/interpreter/canvas-namespace.ts` - Canvas graphics implementation
- `src/interpreter/config-namespace.ts` - Config/secrets management
- `src/interpreter/host-defaults.ts` - Core host environment
- `apps/retro-terminal/renderer/syntax-highlighter.js` - Syntax highlighting
- `apps/retro-terminal/renderer/canvas-manager.js` - Canvas rendering engine
- `AISpec.md` - Complete AI specification
- `CanvasSpec.md` - Canvas specification (implemented)

### Gotchas & Reminders
- Functions need parentheses: `FUNC()` not `FUNC`
- Export helper functions from host-defaults.ts for use in namespaces
- Check multiple env var formats for API keys (OPENAI_API_KEY, openai_key, etc.)
- Terminal uses green phosphor theme (#7bff78 on #001500 background)
- GPU errors at startup are normal and don't affect functionality

## Latest Session Achievements 🚀

This session we successfully:
1. ✅ **IMPLEMENTED WHILE/WEND LOOPS** - Full parser, AST, and evaluator support
2. ✅ **IMPLEMENTED DO-WHILE LOOPS** - Complete loop control with body-first execution
3. ✅ **MODERNIZED CANVAS DEMOS** - Updated all demos with UFCS method chaining
4. ✅ **FIXED UFCS METHOD CHAINING** - Canvas methods now return handles properly
5. ✅ **COMPREHENSIVE TESTING** - 11 new test cases, all 118 tests passing
6. ✅ **FIXED COMMAND HISTORY** - RUN commands now stay in history even when they fail
7. ✅ **STRUCTURED PROGRAMMING** - Replaced old ROUTINE/GOTO with modern functions and loops

## Previous Session Achievements 🌟

Earlier we successfully implemented:
1. ✅ Multi-line IF/THEN/ELSE/END IF blocks
2. ✅ ALL classic BASIC math functions (SIN, COS, TAN, etc.)
3. ✅ ALL classic BASIC string functions (MID$, LEFT$, RIGHT$, etc.)
4. ✅ Fixed RUN command with smart path resolution
5. ✅ Added CANVAS.GLOBALPHA for transparency effects
6. ✅ Created a stunning spirograph demo showcasing mathematical art
7. ✅ Demonstrated that BASIC9000 can create sophisticated visualizations

## Next Steps
1. ✅ **Full AI namespace** with handle/ID pattern for IPC compatibility
2. ✅ **Dynamic UFCS discovery** - language engine agnostic of specific namespaces
3. ✅ **Unified config system** with proper loading order and parent directory search
4. ✅ **Auto-detection** from `.basic9000.json` config file
5. ✅ **Default AI instance** in boot sequence - immediate `ai.GENERATE()` availability
6. ✅ **Enhanced boot error reporting** - errors now visible to users
7. ✅ **Perfect architecture** - both `ai.GENERATE("prompt")` and `AI.GENERATE(ai, "prompt")` work

### Technical Achievements
- **Handle-based design** prevents Electron IPC cloning issues
- **Config auto-loading** with proper working directory resolution
- **Standardized namespace architecture** - all follow same patterns
- **Production-ready** with comprehensive error handling

## Next Steps

### Immediate Improvements Needed
1. **🔤 String Literal Handling** - Currently requires `CHR$(34)` workaround for quotes in strings
   - Need proper escape sequence support (`\"`, `\\`, `\n`, etc.)
   - Should support both single and double quotes
   - Critical for improving developer experience

### Future Enhancements
2. Add more image formats and loading from URLs for Canvas
3. Implement sprite sheets for game development
4. Add sound/audio support for full multimedia
5. Create more advanced demos (games, data visualization)
6. Add WebGL support for 3D graphics
7. Implement save/export functionality for canvases

The combination of classic BASIC simplicity, modern AI integration, and advanced graphics capabilities makes BASIC9000 truly revolutionary! 🤖🎨✨