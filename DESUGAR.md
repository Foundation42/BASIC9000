# DESUGAR.md — BASIC9000 Desugaring Rules (v0.1)

**Status:** Draft companion to Language Spec v0.1
**Purpose:** Define sugar → core transformations for consistent parser, evaluator, and future VM.

---

## 1) Philosophy

* Keep syntax approachable and expressive.
* Internally compile down to a **small, regular core**.
* All sugar must be purely mechanical and predictable.

---

## 2) UFCS (Uniform Function Call Syntax)

**Surface:**

```basic
obj.Method(a, b)
```

**Desugar:**

```basic
Method(obj, a, b)
```

**Notes:**

* Resolution order: field, free function, Block method.
* Enables chaining when functions return `self`.

---

## 3) Record Spread (`a...` / `...a`)

**Surface:**

```basic
canvas.LINE(a..., b...)
```

Where `TYPE Vector SPREAD(x, y)`.

**Desugar:**

```basic
canvas.LINE(a.x, a.y, b.x, b.y)
```

**Rules:**

* Requires declared `SPREAD(...)` in TYPE.
* Order defined by spread signature.
* Error if no SPREAD defined.

---

## 4) Array Spread (`xs...` / `...xs`)

**Surface:**

```basic
F(1, xs..., 2)
```

**Desugar (conceptual):**

```basic
F(1, xs[0], xs[1], ..., 2)
```

**Runtime:** expand array snapshot left‑to‑right.
**Errors:** if not an array → `TypeError`.

---

## 5) Properties

**Surface:**

```basic
PROPERTY Vector.Norm(self AS Vector) AS NUMBER GET
  RETURN SQR(self.x*self.x + self.y*self.y)
END PROPERTY

PRINT v.Norm
```

**Desugar:**

```basic
FUNCTION get_Vector_Norm(self AS Vector) AS NUMBER
  RETURN SQR(self.x*self.x + self.y*self.y)
END FUNCTION

PRINT get_Vector_Norm(v)
```

**Notes:** setters become `set_Vector_Norm(self, value)`.

---

## 6) WITH blocks

**Surface:**

```basic
WITH v
  PRINT .x, .y
  PRINT .Length()
END WITH
```

**Desugar:**

```basic
PRINT v.x, v.y
PRINT v.Length()
```

**Notes:** prefix `.` replaced by WITH target.

---

## 7) DEFER

**Surface:**

```basic
DEFER s.CLOSE()
```

**Desugar:**

```basic
TRY
  ' current code continues
FINALLY
  s.CLOSE()
END TRY
```

**Block form:**

```basic
DEFER
  AWAIT DoSomething()
END DEFER
```

**Desugar:**

```basic
TRY
  ' current code continues
FINALLY
  AWAIT DoSomething()
END TRY
```

**Notes:** runs at scope exit; LIFO order; see DEFER.md.

---

## 8) Overload Resolution (lightweight)

After spreads/UFCS are expanded, argument list is flat.
Binder selects overloads by **arity** and **type compatibility**.
Ambiguity → error.

---

## 9) Convenience Aliases

* `PRINT a, b` → `PRINT a : PRINT b` (may stay as is if multi‑arg PRINT supported).
* `INPUT "?"` → `PRINT "?"; : INPUT()` (implementation choice).
* Legacy keywords (`DIM`, `REM`) desugar to preferred modern forms (`LET`, comment).

---

## 10) Example: Canvas call tour

**Source:**

```basic
TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

LET a = Vector { x:10, y:20 }
LET b = Vector { x:30, y:40 }

canvas.Color("#0f0").LINE(a..., b...).RECT(r...)
```

**Desugar:**

```basic
LET a = Vector { x:10, y:20 }
LET b = Vector { x:30, y:40 }

Color(canvas, "#0f0")
LINE(canvas, a.x, a.y, b.x, b.y)
RECT(canvas, r.x, r.y, r.w, r.h)
```

---

## 11) Core VM Target (summary)

After desugaring, all programs reduce to:

* Simple assignments, control flow, arrays, records.
* Function calls with explicit positional arguments only.
* TRY/CATCH/FINALLY for error handling.
* No UFCS, no spreads, no property sugar, no WITH.

---

*End of DESUGAR.md v0.1*
