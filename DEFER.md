# DEFER.md — Scope‑Exit Semantics for BASIC9000 (v0.1)

**Status:** Draft addition to Language Spec v0.1
**Purpose:** Deterministic cleanup and ergonomic resource management.
**Design:** Go‑style scope exit; pure desugar to TRY/FINALLY; fiber‑safe.

---

## 1) Motivation

* Ensure cleanup runs on **normal exit**, **RETURN/EXIT SUB**, **ERROR/THROW**, and **fiber cancellation**.
* Reduce nesting/noise compared to explicit TRY/FINALLY.
* Keep VM simple: compile‑time desugaring with existing exception machinery.

---

## 2) Syntax

Two forms are supported. Spreads/UFCS are unaffected.

### 2.1 Single‑statement form

```basic
DEFER <SimpleStmt>
```

Examples:

```basic
DEFER s.CLOSE()
DEFER CONFIG.SET("tempo", old)
```

### 2.2 Block form (allows AWAIT)

```basic
DEFER
  <stmts>
END DEFER
```

Examples:

```basic
DEFER
  AWAIT http.POST("/metrics", JSON.STRINGIFY(stats))
END DEFER
```

**Disallowed:** module top‑level (no scope). Emit: `DEFER not allowed at module scope`.

---

## 3) Semantics

* **Scope:** A DEFER belongs to the **innermost lexical block** (SUB/FUNCTION body, IF arm, loop body, etc.).
* **Execution point:** Runs when exiting that scope **for any reason**.
* **Ordering:** Multiple DEFERs in the same scope execute **LIFO**.
* **Capture time:** Values in the DEFER statement are **evaluated at the point of DEFER**.

  * Scalars/immutable: captured by value.
  * `REF` vars/objects: capture by reference (current binding).
* **Async:** `AWAIT` is permitted **only** in the block form. Single‑statement form must be synchronous.
* **Errors in DEFER:** If a deferred action throws/ERRORs, it **replaces** any in‑flight error. The runtime may attach a diagnostic note: `defer replaced prior error`.
* **Cancellation:** Fiber cancellation raises an internal `CancelError` on resume; DEFERs run during unwinding just like FINALLY.

---

## 4) Desugaring

`DEFER <stmt>`

```basic
TRY
  ' <current code continues>
FINALLY
  <stmt>
END TRY
```

`DEFER ... END DEFER`

```basic
TRY
  ' <current code continues>
FINALLY
  ' deferred block
  ...
END TRY
```

Multiple DEFERs nest so they execute LIFO.

---

## 5) Examples

### 5.1 Sockets

```basic
SUB Fetch()
  LET s = WS.CONNECT("wss://host")
  DEFER s.CLOSE()

  AWAIT s.SEND("hello")
  PRINT AWAIT s.RECV()
END SUB
```

### 5.2 Canvas save/restore (chained UFCS)

```basic
SUB Draw(c AS Canvas)
  c.SAVE()
  DEFER c.RESTORE()

  c.Color("#0f0").Line(a..., b...).Rect(r...)
END SUB
```

### 5.3 Temp config

```basic
SUB WithTempo(t AS NUMBER)
  LET old = CONFIG.GET("tempo")
  DEFER CONFIG.SET("tempo", old)
  CONFIG.SET("tempo", t)
  ' work...
END SUB
```

### 5.4 Async cleanup in DEFER block

```basic
DEFER
  AWAIT http.POST("/metrics", JSON.STRINGIFY(stats))
END DEFER
```

### 5.5 Loops

```basic
FOR i = 1 TO 3
  LET h = OPEN(i)
  DEFER h.CLOSE()
  IF i = 2 THEN CONTINUE
NEXT i
' Each iteration's DEFER runs at end of that iteration
```

---

## 6) Grammar (EBNF additions)

```
Stmt        := ... | DeferStmt | DeferBlock
DeferStmt   := "DEFER" SimpleStmt
DeferBlock  := "DEFER" Block "END" "DEFER"
```

`SimpleStmt` excludes control‑structure starters. Parser may accept any `Stmt` and wrap when convenient.

---

## 7) Runtime Notes (Fibers)

* Cancellation should trigger unwinding at the next suspension point (`AWAIT`, `SLEEP`, `RECV`, or explicit `YIELD`).
* Unwinding runs FINALLY/DEFER in LIFO order; after all defers complete, the task transitions to cancelled state.

---

## 8) Tests (Vitest outline)

1. **Return triggers:** `RETURN` executes DEFER.
2. **Error triggers:** `ERROR` inside scope runs DEFER, original error preserved unless DEFER throws.
3. **LIFO order:** three DEFERs append to log; assert reverse order.
4. **Loop iteration:** DEFER inside loop executes per iteration after `CONTINUE`/`EXIT`.
5. **Defer throws:** ensure it replaces prior error; optional note in diagnostics.
6. **Cancellation:** spawn task, set DEFER, cancel; assert DEFER ran.
7. **Async defer block:** verify `AWAIT` inside DEFER completes and then next DEFER runs.

---

*End of DEFER.md v0.1*
