# BASIC9000 Language Specification (v0.1)

**Status:** Draft for implementation.  
**Audience:** Implementers & power users.  
**Targets:** JS/TS VM (reference), C/C++ VM (embedded/desktop), Headless Server.  
**Design tag:** *D‑flavoured BASIC* — records + UFCS + properties; no classes, no inheritance.

---

## 1. Design Goals
1. **Familiar & fun:** Feels like 80s BASIC (PRINT, FOR/NEXT, GOTO if you must) but modern.  
2. **Small, deterministic core:** The VM is tiny; all side‑effects via explicit syscalls.  
3. **Portable:** Identical semantics across JS and C/C++; bytecode is the contract.  
4. **Network‑native:** Location‑transparent *Blocks*; services can be local or remote.  
5. **Composable:** Records + UFCS (Uniform Function Call Syntax) and light properties.  
6. **Safe concurrency:** Cooperative fibers, message passing, `AWAIT` for I/O.

---

## 2. Lexical Structure
- **Source form:** UTF‑8 text. Lines may be any length. Newlines end statements unless `_` (underscore) is used as a line‑continuation suffix.
- **Whitespace:** Insignificant except within strings. Indentation has no semantics.
- **Comments:**
  - Single line: `REM ...`  or ` ' ...` (apostrophe)
  - Block (optional): `/* ... */`
- **Case sensitivity:** Keywords are **case‑insensitive**. Identifiers are **case‑sensitive**.
- **Identifiers:** `/^[A-Za-z_][A-Za-z0-9_]*$/`. Unicode letters are allowed (non‑ASCII) but discouraged for portability.
- **Literals:**
  - Integer: `0`, `42`, `-7`, Hex `&HFF`, Binary `&B1010`.
  - Number (float): `3.14`, `1e-9`, `-2.0` (IEEE 754 double semantics).
  - String: `"hello"`, `"a\n b"`. Escapes: `\n`, `\r`, `\t`, `\"`, `\\`, `\xNN`.
  - Boolean: `TRUE`, `FALSE`.
  - Null: `NULL`.

---

## 3. Types
- **NUMBER**: 64‑bit IEEE 754. Implementation **may** optimize `INT32` fast‑path.
- **BOOL**: `TRUE` / `FALSE`.
- **STRING**: immutable UTF‑8.
- **ARRAY**: dynamic, 0‑based, heterogeneous by default; typed arrays allowed by annotation (see below).
- **RECORD (TYPE)**: nominal record defined with `TYPE ... END TYPE`.
- **ANY**: dynamic value (top type) — allowed for interop and JSON.
- **ALIAS**: type alias: `TYPE BYTES = ARRAY<NUMBER>` (implementation may map to byte buffer).  

Type annotations use `AS <Type>`. `Type` can be built‑ins (`NUMBER`, `STRING`, `BOOL`, `ANY`), a `TYPE` name, or parameterized forms `ARRAY<T>`.

### 3.1 Type Definitions (Records)
```basic
TYPE Vector
  x AS NUMBER
  y AS NUMBER
END TYPE
```
- Construction literal: `Vector { x: 3, y: 4 }`.
- Field access: `v.x`, `v.y`.
- Assignment copies by **value**; use `REF` for by‑reference params.

---

## 4. Variables & Constants
- **LET** declares and optionally initializes:
  ```basic
  LET a = 10
  LET b AS NUMBER = 3.14
  LET names = ["Ada", "Grace"]
  ```
- **CONST** for compile‑time constants:
  ```basic
  CONST PI = 3.1415926535
  ```
- **DIM** is accepted as an alias for array declarations (retro compatibility), but `LET` is preferred.
- **Scope:**
  - Module‑level declarations are global to the module.
  - Inside `SUB`/`FUNCTION`, variables are local (lexical scope).  
  - `STATIC` inside procedures preserves value across calls.

---

## 5. Expressions & Operators
- **Arithmetic:** `+ - * / %` (mod), `^` (power). Division is floating by default.
- **Comparison:** `= <> < <= > >=` (booleans).
- **Logic:** `AND OR NOT`.
- **Concatenation:** `&` (strings).
- **Indexing:** `a[i]`, slicing **(future)**: `a[i:j]`.
- **Member access:** `obj.field` or UFCS `obj.Method()` (see §9).
- **Null coalescing:** `IFNULL(a, b)` (function) — avoids new operator.

### 5.1 Operator Precedence (high → low)
1. `[]` member/idx, call `()`
2. unary `-` `NOT`
3. `^`
4. `*` `/` `%`
5. `+` `-` `&`
6. comparisons
7. `AND`
8. `OR`

Parentheses `()` override precedence.

---

## 6. Statements & Control Flow
- **Assignment:** `x = 5`, `v.x = 10`.
- **IF:**
  ```basic
  IF cond THEN
    ...
  ELSEIF other THEN
    ...
  ELSE
    ...
  END IF
  ```
- **SELECT CASE:**
  ```basic
  SELECT CASE k
    CASE 0
      PRINT "zero"
    CASE 1, 2
      PRINT "one or two"
    CASE ELSE
      PRINT "other"
  END SELECT
  ```
- **FOR / NEXT:**
  ```basic
  FOR i = 0 TO 10 STEP 2
    PRINT i
  NEXT i
  ```
- **WHILE / WEND:**
  ```basic
  WHILE ready
    ...
  WEND
  ```
- **DO / LOOP:**
  ```basic
  DO
    ...
  LOOP WHILE cond
  ```
- **REPEAT / UNTIL:**
  ```basic
  REPEAT
    ...
  UNTIL cond
  ```
- **GOTO** and **LABEL** (optional, off by default in linter):
  ```basic
  LABEL retry
  IF failed THEN GOTO retry
  ```
- **SLEEP ms**: cooperative delay.

---

## 7. Procedures & Functions
- **SUB** (no return) and **FUNCTION** (with `RETURN`):
  ```basic
  SUB Log(msg AS STRING)
    PRINT msg
  END SUB

  FUNCTION Add(a AS NUMBER, b AS NUMBER) AS NUMBER
    RETURN a + b
  END FUNCTION
  ```
- **Parameters:** by value; use `REF` for by reference.
  ```basic
  SUB Bump(REF x AS NUMBER)
    x = x + 1
  END SUB
  ```
- **Default arguments:** `FUNCTION F(x AS NUMBER = 1) AS NUMBER ...`
- **Varargs:** `...` last parameter packs into `ARRAY<ANY>`.
- **Return:** `RETURN <expr>` or `EXIT SUB`.

---

## 8. Properties (Lightweight)
Syntactic sugar that compiles to getter/setter functions. No runtime magic.
```basic
PROPERTY Vector.Norm(self AS Vector) AS NUMBER GET
  RETURN SQR(self.x*self.x + self.y*self.y)
END PROPERTY

PROPERTY Rect.Right(self AS Rect) AS NUMBER GET
  RETURN self.x + self.w
END PROPERTY

PRINT v.Norm
r.Right = 128   ' if a SET is defined; otherwise a compile error
```

---

## 9. UFCS & Method‑like Calls (D‑flavour)
If an identifier `Foo` is a visible function whose first argument type matches the receiver, then `obj.Foo(a,b)` desugars to `Foo(obj,a,b)`.

```basic
FUNCTION Length(self AS Vector) AS NUMBER
  RETURN SQR(self.x*self.x + self.y*self.y)
END FUNCTION

LET v = Vector { x:3, y:4 }
PRINT v.Length()      ' == Length(v)
```

Resolution order:
1. Try member field `obj.Foo` (if field exists and is invocable).  
2. Try UFCS free function `Foo(obj, ...)` in current module or imported modules.  
3. Try Block‑bound methods (see §12).  
If ambiguous, compile error.

---

## 10. Modules & Namespaces
- **Module = file**. Public items must be marked `PUBLIC`.
- **IMPORT** loads a module or namespace.

```basic
PUBLIC FUNCTION Add(a AS NUMBER, b AS NUMBER) AS NUMBER
  RETURN a + b
END FUNCTION
```

```basic
IMPORT Math.Add
PRINT Add(1,2)
```

- **Qualified names:** `Math.Add` or `IMPORT Math.*` to import sub‑names.
- **Namespaces:** implicit from folder structure (e.g., `Math/Vectors.bas` → `Math.Vectors`).

---

## 11. Error Handling
- **ERROR** raises; **TRY/CATCH/FINALLY** handles.
```basic
TRY
  CALL Risky()
CATCH e
  PRINT "Error "; e.code; ": "; e.message
FINALLY
  PRINT "cleanup"
END TRY
```
- **Error object:** has `code AS NUMBER`, `message AS STRING`, optional `data AS ANY`.
- **THROW** is an alias of `ERROR`.

---

## 12. Blocks (Location‑Transparent Services)
A **Block** is a deployable unit that exports routines. The same CALL site works whether the block is local or remote.

### 12.1 Declaring a Block
```basic
BLOCK "co/pilot/midi:1.0"

PUBLIC TYPE MidiHandle
  endpoint AS STRING
  token    AS STRING
END TYPE

PUBLIC FUNCTION NOTE_ON(self AS MidiHandle, ch AS NUMBER, note AS NUMBER, vel AS NUMBER)
  RETURN SYS.CALL(self, "NOTE_ON", [ch, note, vel])
END FUNCTION
```

### 12.2 Using a Block
```basic
LET midi = USE "co/pilot/midi:1.0"    ' returns MidiHandle (local/remote)
midi.NOTE_ON(0, 60, 127)               ' UFCS → NOTE_ON(midi, ...)
```

**Resolution:**
- `USE` consults the local registry (headless daemon) and may fetch or connect to a remote endpoint.  
- A *handle* is just a record. The VM treats it like any record; `SYS.CALL` does the transport.

---

## 13. Concurrency Model
- **Fibers:** `SPAWN fn(args...)` creates a cooperative fiber; returns a `Task` handle.
- **Scheduler:** run‑to‑completion per timeslice; yields only at `AWAIT`, `SLEEP`, `RECV`, or explicit `YIELD`.
- **Message passing:** per‑fiber mailbox; `SEND task, value` and `RECV([timeout_ms])`.
- **Promises/Futures:** many syscalls return awaitables. Use `AWAIT`.

```basic
LET t = SPAWN Worker(42)
SEND t, "go"
PRINT RECV(5000)

FUNCTION Worker(n AS NUMBER)
  LET msg = RECV()          ' waits for a message
  RETURN n * 2
END FUNCTION
```

- **Cancellation:** `CANCEL task` requests cooperative cancellation; code should check `TASK.CANCELLED()`.
- **Determinism:** Scheduling is deterministic under the same message timing; avoid hidden wall‑clock calls.

---

## 14. I/O & Syscalls (Host Surface)
Syscalls are the only side‑effecting operations. Exposed via namespaces. Implementations may stub or deny based on policy.

### 14.1 Console
- `PRINT args...` (space‑separated; `;` to avoid newline).  
- `INPUT prompt?` returns a line (headless may pipe stdin).

### 14.2 HTTP
```basic
LET resp = AWAIT HTTP.GET("https://example.com/api")
PRINT resp.status, resp.body
```
- Minimal surface: `GET(url)`, `POST(url, body, headers?)`, `FETCH(opts)` returning `{ status, headers, body }`.

### 14.3 WebSocket
- `WS.CONNECT(url)` → handle
- `AWAIT ws.SEND(data)`; `AWAIT ws.RECV()`; `ws.CLOSE()`

### 14.4 Storage
- `STORAGE.READ(key)`, `STORAGE.WRITE(key, value)`, `STORAGE.DELETE(key)` (host‑defined scope).

### 14.5 Time
- `TIME.NOW()` returns epoch ms.  
- `SLEEP(ms)` cooperative delay.

### 14.6 MIDI (example host ext)
- `MIDI.SEND(port, bytes[])`
- `MIDI.LIST()`

### 14.7 Canvas (desktop/retro terminal)
- `CANVAS.CREATE(w,h) → handle`, drawing ops like `MOVETo`, `LINETo`, `STROKE`, `FILLRECT`, etc. (see API ref).

---

## 15. Arrays, JSON, and Data
- **Array literal:** `[1,2,3]`. Push/len via `ARRAY.PUSH(a, v)`, `ARRAY.LEN(a)`.
- **Iteration:** `FOR EACH x IN arr : ... : NEXT` (colon is optional separator).
- **JSON:** `JSON.PARSE(string) → ANY`, `JSON.STRINGIFY(value) → STRING`.

---

## 16. With‑syntax (optional sugar)
```basic
WITH v
  PRINT .x, .y
  PRINT .Length()
END WITH
```
Desugars to repeated receiver usage. Forbidden to mutate `.` outside record fields.

---

## 17. Standard Library (Core Surface)
**MATH:** `ABS, SQRT, POW, SIN, COS, TAN, ATAN2, FLOOR, CEIL, ROUND, RAND`  
**STRING:** `LEN, SUBSTR, INDEXOF, SPLIT, JOIN, REPLACE, TOUPPER, TOLOWER, TRIM`  
**ARRAY:** `LEN, PUSH, POP, SHIFT, SLICE, SORT(fn?)`  
**JSON:** `PARSE, STRINGIFY`  
**TIME:** `NOW, FORMAT` (impl‑defined)  
**CONSOLE:** `PRINT, INPUT`  
**TASK:** `CANCELLED()`

(Host may add `FS`, `MIDI`, `BLE`, `GPIO`, `AI`, `CANVAS`, etc.)

---

## 18. Grammar (EBNF – excerpt)
```
Program        := { Decl | Stmt } EOF
Decl           := ConstDecl | VarDecl | TypeDecl | FuncDecl | SubDecl | PropertyDecl | BlockDecl
ConstDecl      := "CONST" Identifier '=' Expr
VarDecl        := ("LET" | "DIM") Identifier [ 'AS' Type ] [ '=' Expr ]
TypeDecl       := "TYPE" Identifier { FieldDecl } "END" "TYPE"
FieldDecl      := Identifier 'AS' Type
FuncDecl       := "FUNCTION" Identifier '(' [ ParamList ] ')' [ 'AS' Type ] Block "END" "FUNCTION"
SubDecl        := "SUB" Identifier '(' [ ParamList ] ')' Block "END" "SUB"
PropertyDecl   := "PROPERTY" QualifiedId '.' Identifier '(' 'self' 'AS' Type ')' 'AS' Type ('GET' | 'SET') Block "END" "PROPERTY"
BlockDecl      := "BLOCK" StringLiteral { Decl }   // declares block namespace within file
ParamList      := Param { ',' Param }
Param          := [ 'REF' ] Identifier [ 'AS' Type ] [ '=' Expr ] | '...'
Stmt           := Assign | If | For | While | DoLoop | RepeatUntil | Select | Goto | Label | Call | Sleep | TryCatch | With | Return | Print | Import | Use
Assign         := LValue '=' Expr
If             := "IF" Expr "THEN" Block { "ELSEIF" Expr "THEN" Block } [ "ELSE" Block ] "END" "IF"
For            := "FOR" Identifier '=' Expr "TO" Expr [ "STEP" Expr ] Block "NEXT" Identifier
While          := "WHILE" Expr Block "WEND"
DoLoop         := "DO" Block "LOOP" ( "WHILE" | "UNTIL" ) Expr
RepeatUntil    := "REPEAT" Block "UNTIL" Expr
Select         := "SELECT" "CASE" Expr { CaseArm } "END" "SELECT"
CaseArm        := "CASE" ( "ELSE" | Expr { ',' Expr } ) Block
Goto           := "GOTO" Identifier
Label          := "LABEL" Identifier
Call           := Identifier '(' [ ArgList ] ')'
Sleep          := "SLEEP" Expr
TryCatch       := "TRY" Block "CATCH" Identifier Block [ "FINALLY" Block ] "END" "TRY"
With           := "WITH" Expr Block "END" "WITH"
Return         := "RETURN" [ Expr ] | "EXIT" "SUB"
Print          := "PRINT" PrintArgs
Import         := "IMPORT" QualifiedId | "IMPORT" QualifiedId ".*"
Use            := "LET" Identifier '=' "USE" StringLiteral
ArgList        := Expr { ',' Expr }
Block          := { Stmt }
Expr           := ... // standard precedence; includes member, call, index, literals
LValue         := Identifier | Member | Index
Type           := Identifier [ '<' Type { ',' Type } '>' ]
QualifiedId    := Identifier { '.' Identifier }
```

---

## 19. Bytecode & VM Semantics (overview)
- **Stack machine**; constants in a pool. Essential opcodes: `PUSHI, PUSHF, PUSHSTR, LOAD, STORE, GETF, SETF, GETIDX, SETIDX, ADD, SUB, MUL, DIV, MOD, POW, CMP, JMP, JZ, CALL, RET, NEWREC, NEWARR, LEN, AWAIT, YIELD, SEND, RECV`.
- **Determinism:** No implicit time or randomness; `RAND` and `NOW` are syscalls.
- **Numbers:** IEEE 754; integer ops may use 32‑bit fast path.
- **Strings:** immutable; interning optional; concat via `&` or `STRING.JOIN`.
- **Error:** exceptions map to tagged error results; `TRY/CATCH` handled by VM frames.
- **Fibers:** scheduler run loop; `AWAIT` parks fiber; host resumes on completion.

---

## 20. Security & Capabilities
- Host may enforce **policies** (deny `HTTP`, `FS`, `MIDI`, etc.).  
- `USE` of Blocks can require **capability tokens** supplied via config/registry.

---

## 21. Portability Profiles
- **Desktop (Electron/Node):** full stdlib + Canvas + WS.  
- **Headless (Daemon):** no Canvas; console, HTTP/WS, Storage.  
- **Embedded (C/C++ VM):** selected syscalls; no dynamic allocation beyond arena; optional GC.

---

## 22. Examples

### 22.1 A tiny tour
```basic
IMPORT JSON.*

PRINT "BASIC9000 online"
LET who = { name: "world" }   ' record literal requires TYPE; this is ANY via JSON
LET text = JSON.STRINGIFY(who)
PRINT text

LET resp = AWAIT HTTP.GET("https://wttr.in/London?format=3")
PRINT resp.body

TYPE Vector : x AS NUMBER : y AS NUMBER : END TYPE
FUNCTION Length(self AS Vector) AS NUMBER : RETURN SQR(self.x*self.x + self.y*self.y) : END FUNCTION
LET v = Vector { x:3, y:4 }
PRINT v.Length()

LET t = SPAWN (SUB() PRINT "async hi" END SUB)()
AWAIT t
```

### 22.2 Using a Block (MIDI)
```basic
LET midi = USE "co/pilot/midi:1.0"
midi.NOTE_ON(0, 60, 127)
```

---

## 23. Reserved Keywords
`ABS, AND, ARRAY, AS, AWAIT, BLOCK, BOOL, BYTES, CATCH, CONST, DO, ELSE, ELSEIF, END, EXIT, FALSE, FINALLY, FOR, FUNCTION, GET, GOTO, IF, IMPORT, INPUT, JSON, LABEL, LEN, LET, LOOP, MATH, MOD, NEW, NEXT, NOT, NULL, NUMBER, OR, PRINT, PROPERTY, PUBLIC, RAND, RECORD, REF, REM, REPEAT, RETURN, SELECT, SET, SLEEP, SQRT, STEP, STRING, SUB, THEN, TIME, TRUE, TRY, TYPE, UNTIL, USE, WEND, WHILE, WITH`

---

## 24. Compatibility Notes
- Arrays are **0‑based**.  
- `DIM` is accepted but identical to `LET` for arrays.  
- `GOSUB/RETURN` are **not** supported; use `SUB`/`FUNCTION`.  
- Line numbers are supported **only** in comment form (no execution semantics).

---

## 25. Implementation Checklist (next sprint)
- [ ] Parser: keywords, literals, statements, UFCS desugar, properties.
- [ ] Type checker (lightweight): ensure `REF` & field existence; allow `ANY` fallback.
- [ ] Bytecode emitter: core ops + calls + try/catch + fibers.
- [ ] JS VM: stack engine, fibers, syscalls surface.
- [ ] Headless daemon: `serve`, registry, `USE`, `SYS.CALL` routing.
- [ ] C/C++ VM skeleton: arena, stack, dispatch, syscall table.
- [ ] Stdlib (MATH, STRING, ARRAY, JSON, TIME, HTTP minimal).
- [ ] Conformance tests: golden outputs; differential (JS vs C++).

---

*End of v0.1 spec.*

