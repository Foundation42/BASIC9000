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

## Next Up: CANVAS Implementation

### Canvas Spec Overview (from CanvasSpec.md)
- Instance-based design like AI namespace
- 2D graphics overlaying terminal
- Functions: CANVAS.CREATE(), CANVAS.DRAW(), CANVAS.SHOW(), etc.
- WebCanvas integration in Electron renderer
- Support for shapes, text, images, animations

### Implementation Plan for Canvas
1. Create canvas-namespace.ts similar to ai-namespace.ts
2. Use handle pattern like WebSocket/JSON
3. IPC communication between main and renderer for drawing
4. Canvas instances as first-class BASIC variables
5. Overlay canvases on terminal with z-index control

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
- `src/interpreter/config-namespace.ts` - Config/secrets management
- `src/interpreter/host-defaults.ts` - Core host environment
- `apps/retro-terminal/renderer/syntax-highlighter.js` - Syntax highlighting
- `AISpec.md` - Complete AI specification
- `CanvasSpec.md` - Canvas specification to implement

### Gotchas & Reminders
- Functions need parentheses: `FUNC()` not `FUNC`
- Export helper functions from host-defaults.ts for use in namespaces
- Check multiple env var formats for API keys (OPENAI_API_KEY, openai_key, etc.)
- Terminal uses green phosphor theme (#7bff78 on #001500 background)
- GPU errors at startup are normal and don't affect functionality

## Canvas Implementation TODO
When we return, implement Canvas namespace following the pattern established with AI:
1. Read CanvasSpec.md thoroughly
2. Create canvas-namespace.ts with instance management
3. Add IPC for renderer communication
4. Implement drawing commands
5. Test with demo programs
6. Document in README

The little things matter - we've built great security, now let's add beautiful graphics! 🎨