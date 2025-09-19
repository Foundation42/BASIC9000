# BASIC9000 System Specification

## 1. Vision & Pillars
- **Retro immersion**: Deliver a CRT-era terminal aesthetic—scanlines, amber/green phosphor, boot rituals—while keeping UI latency near-zero.
- **Immediate creation**: Users can type a line of BASIC9000 and watch it execute instantly; frictionless iteration is a core value.
- **Supercharged primitives**: Ship built-in commands for WebGPU graphics, AI/tensor tooling, distributed IPC, and web access without extra setup.
- **Expandable fabric**: Treat every routine as a node in a shared computing fabric that can live locally or remote, persist across sessions, and evolve over time.

## 2. Experience Walkthrough
1. **Boot**: Splash logo → POST diagnostics (CPU/GPU/AI status) → auto-run of onboarding script that highlights `HELP`, `DEMO`, and `LIST ROUTINES`.
2. **Idle terminal**: Styled xterm.js surface with status bar (clock, GPU state, routine count) and subtle CRT curvature shader. Keyboard shortcuts toggle split panes, open inspector windows, or summon command palette.
3. **Executing code**: Single-line execution (`PRINT "HELLO"`) or multi-line program blocks with `RUN`. Output streams show in-terminal; long-running jobs surface notifications in status bar.
4. **Graphics & AI sidecars**: GPU commands open auxiliary canvases/windows while reporting handles back to the terminal (`CANVAS #3 READY`). AI completions stream tokens with retro teletype effect.
5. **Management tools**: `LIST`, `WHO`, `TRACE`, and `RESOURCE.USE` expose a live dashboard. The inspector window displays routine mailboxes, queued messages, and GPU workloads.
6. **Persistence**: When quitting, the environment offers to `SAVE IMAGE` to snapshot routines and state; on launch users can `LOAD IMAGE last-session` to restore.

## 3. Architecture Overview
- **Electron shell**: Renderer hosts the retro terminal UI, WebGPU canvases, and debugging side panels. Main process manages the interpreter, routine scheduler, and system integrations.
- **Renderer stack**:
  - `xterm.js` + custom shaders/CSS for CRT look.
  - WebGPU adapters for graphics/compute presented either inline or in floating canvases.
  - Diagnostics overlay rendered with React-lite component set (optional).
- **Main process stack**:
  - BASIC9000 interpreter running on Node.js (TypeScript preferred for maintainability) with pluggable evaluators.
  - Routine manager backed by Worker Threads for isolation and concurrency; future support for cluster/remote adapters.
  - IPC fabric providing message routing, persistence, and optional remote bridging (WebSocket/gRPC layer).
  - Capability system enforcing resource access (file system, network, AI endpoints).
- **Shared contracts**:
  - Typed IPC schema (`CommandRequest`, `InterpreterResult`, `RoutineSnapshot`, etc.) enforced via `zod` or TypeScript interfaces.
  - Asset pipeline for shaders, demos, and fonts.

## 4. BASIC9000 Language Specification
### 4.1 Syntax & Structure
- Accept classic line numbers (`10 PRINT "HI"`) or modern, label-based blocks (`SUB boot()` … `END SUB`).
- Case-insensitive keywords; identifiers preserve case.
- Statements separated by newlines or `:`. `REM` or `'` introduce comments.
- Support `MODULE name` files with optional version metadata; `IMPORT module@version` loads them.

### 4.2 Data Types
- Scalars: numeric (double precision), integer, boolean, string.
- Composite: arrays (`DIM A(10)`), dictionaries (`DICT.CREATE`), records (`TYPE` definitions), JSON, tensor handles, async handles.
- Special handles: `ROUTINE`, `CHANNEL`, `CANVAS`, `TENSOR`, `AISESSION`.

### 4.3 Core Statements
- Assignment via `LET var = expression` (LET optional).
- Control flow: `IF…THEN…ELSE`, `SELECT CASE`, `FOR/NEXT`, `WHILE/WEND`, `DO…LOOP`, `GOTO`, `GOSUB/RETURN`.
- Procedures: `SUB name(args)`, `FUNCTION name(args) RETURNS type`, `END SUB`, `END FUNCTION`.
- Error handling: `ON ERROR GOTO label`, `TRY`/`CATCH` extension (modern mode) with `ERROR$` exposing message.

### 4.4 Concurrency & IPC
- `ROUTINE name` … `END ROUTINE` defines concurrent code; optional attributes (`ROUTINE weather_monitor WITH PERSISTENCE`).
- `SPAWN routine [WITH options]` launches routine; `SPAWN … ON "node-id"` for remote dispatch.
- `CHANNEL name BUFFER n` declares pub/sub channels.
- `SEND target, payload`, `RECEIVE()` (blocking) / `RECEIVE TIMEOUT ms`, `BROADCAST channel, payload`.
- `AWAIT handle` waits on async results; `ASYNC` keyword promotes functions returning handles.

### 4.5 Modern Libraries
- **HTTP**: `HTTP.GET url TO response$`, `HTTP.POST url, body$ TO result`, `HTTP.HEADERS handle TO dict`.
- **JSON**: `JSON.PARSE text$ TO data`, `JSON.STRINGIFY data TO text$`, `JSON.PATH data, "$.items[0]" TO value`.
- **AI/Tensor**: `AI.LOAD model$ TO handle`, `AI.COMPLETE handle, prompt$ TO text$`, `AI.EMBED`, `TENSOR.CREATE`, `TENSOR.MATMul`, `TENSOR.SAVE/LOAD`.
- **GPU**: `GPU.INFO`, `CANVAS.CREATE w, h TO canvas`, `GPU.PIPELINE { … }`, `GPU.DRAW canvas, pipeline, data`, `GPU.COMPUTE shader$, bufferHandle TO resultHandle`.
- **System**: `FS.READ path$ TO text$`, `FS.WRITE path$, text$`, guarded by capabilities; `PROCESS.EXEC command$ TO exitCode` with sandbox prompts.

### 4.6 Tooling & Debug
- `TRACE routineName`, `BREAK label`, `INSPECT var`, `PROFILE START/STOP`, `LOG level, message$`.
- `DESCRIBE handle` prints metadata for canvases, tensors, channels.

## 5. Runtime Subsystems
### 5.1 Interpreter Core
- Tokenizer + Pratt/recursive-descent parser generating bytecode or AST.
- Evaluator supports step execution, breakpoints, and time-sliced cooperative scheduling.
- Memory model: global environment, routine-local scopes, module namespaces.
- Persistence: snapshot global state + routine AST + mailbox contents to JSON/binary images.

### 5.2 Scheduler & Workers
- Default cooperative scheduler running routines on Worker Threads; each worker hosts interpreter instances with message pump.
- Time-slice budget per routine; overflow surfaces warning and optional `YIELD` insertion.
- Remote execution adapter (Phase 5+) using WebSockets to forward bytecode/state to peer nodes.

### 5.3 IPC Fabric
- Message broker that supports direct messages, publish/subscribe channels, and system topics (`sys.events`, `sys.metrics`).
- Messages are structured (`{from, to, type, payload, timestamp}`) and optionally signed for remote trust.
- Dead-letter queue for undeliverable messages; `TRACE` command taps into message stream.

### 5.4 GPU Pipeline
- WebGPU context managed in renderer; commands from interpreter marshalled via IPC.
- Resource registry tracks canvases, buffers, textures with reference counting.
- Optional compatibility layer for systems without WebGPU (fall back to WebGL, warn user).

### 5.5 AI/Tensor Engine
- Thin abstraction over ONNX/WebGPU-based runtimes; support loading local `.onnx` or remote inference endpoints.
- Tensors stored in shared GPU memory when possible; CPU fallbacks available.
- Safety prompts if commands attempt to access network-based AI endpoints without capability.

### 5.6 Capability & Security Model
- Users grant abilities per session (`CAPABILITY.GRANT routine, "network"`).
- Sandboxing for FS/Process commands; audit log available via `SECURITY.LOG`.
- Remote nodes authenticate via shared keys or device pairing flow.

## 6. Development Roadmap
1. **Phase 1 — Shell (done)**: Electron app, retro terminal UI, basic command dispatcher, WebGPU detection check.
2. **Phase 2 — Core Interpreter**: Tokenizer, parser, evaluator for classic BASIC subset, REPL integration, unit tests for expressions/control flow.
3. **Phase 3 — Modern Primitives**: HTTP + JSON library, async/await plumbing, file access with capability gating.
4. **Phase 4 — GPU & Canvas**: WebGPU service, drawing DSL, sidecar canvases, demo programs.
5. **Phase 5 — Routine & IPC**: Worker-based routines, message queues, `SPAWN/LIST/KILL`, TRACE tooling.
6. **Phase 6 — AI/Tensor Stack**: Model loader, inference commands, tensor ops (matmul, conv), sample demos.
7. **Phase 7 — Persistence & Remote Fabric**: Snapshot/restore, distributed node discovery, capability hardening, plugin API.

Each phase should land with:
- Automated tests for new subsystems.
- Demo script under `demos/` executed via `RUN "demos/phaseX.bas"`.
- Documentation updates in `docs/` (quickstart + API references).

## 7. Assistant Handoff Notes
- **Environment**: Node.js >= 20, npm >= 9, WebGPU-capable browser runtime. Install with `npm install`; run via `npm start` or `npm run dev` (opens DevTools).
- **Coding standards**: TypeScript in both renderer and main; ESLint + Prettier configs pending. Interpreter modules live under `src/interpreter/`. Tests use Vitest.
- **When unsure**: Ask before altering capability/security defaults, GPU shader formats, or rewriting existing demo assets.
- **Ready tasks**: Phase 2 backlog (`src/interpreter/tokenizer.ts`, `parser.ts`, `executor.ts`) seeded with TODO scaffolds; refer to `tests/interpreter/*.spec.ts` for acceptance criteria.
- **Diagnostics**: `npm run test` for unit suites, `npm run lint` prior to PR.

## 8. Sample Sessions (Appendix)
```
REM Classic loop
FOR I = 1 TO 5
  PRINT "•"; I
NEXT I

REM Async HTTP fetch with JSON parsing
ASYNC FUNCTION fetch_weather(city$)
  HTTP.GET "https://api.example.com/weather?city=" + city$ TO raw$
  JSON.PARSE raw$ TO data
  RETURN data.temperature
END FUNCTION

PRINT "Seattle temp:"; AWAIT fetch_weather("Seattle")

REM Cooperative routines communicating over a channel
CHANNEL weather_feed BUFFER 5

ROUTINE weather_agent WITH PERSISTENCE
10  TEMP = HTTP.GET "api.weather.com/temp"
20  BROADCAST weather_feed, TEMP
30  SLEEP 60000
40  GOTO 10
END ROUTINE

ROUTINE display_agent
10  DATA = RECEIVE()
20  PRINT "☁  " + STR$(DATA) + " °F"
30  GOTO 10
END ROUTINE

SPAWN weather_agent
SPAWN display_agent

REM WebGPU demo
CANVAS.CREATE 800, 600 TO canvas1
GPU.PIPELINE {
  VERTEX "shaders/retro_triangle.vert"
  FRAGMENT "shaders/neon.frag"
} TO pipeline
GPU.DRAW canvas1, pipeline, {}
```

---
*Update this spec as features land; keep assistant onboarding friction low by noting deviations from the plan.*
