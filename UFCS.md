# UFCS.md — Free Functions & Resolution in BASIC9000 (v0.1)

**Status:** Draft companion to DESUGAR.md
**Purpose:** Define Uniform Function Call Syntax rules, free function support, and resolution order.

---

## 1) Philosophy

* **Ergonomics without OO**: Dot-call syntax is sugar for free functions or block methods.
* **Predictable**: Always desugars to a function call with explicit first argument.
* **Minimal VM impact**: Parser and binder handle UFCS; runtime just sees a normal call.

---

## 2) Syntax

**Surface:**

```basic
obj.Func(a, b)
```

**Desugar:**

```basic
Func(obj, a, b)
```

---

## 3) Resolution Order

When binding `obj.m(…)`, the compiler resolves as follows:

1. **Direct field access**: If `obj.m` is a value and invocable (rare; advanced use).
2. **Free function in scope**: If there is a visible function `m(self, …)` whose first parameter type is compatible with `obj`.
3. **Block/service method**: If `obj` is a service handle (from `USE`), check registered Block methods with matching name and signature.

If none match → `UnknownMethodError(objType, name)`.
If >1 match → `AmbiguousUFCSCall(name, candidates)`.

---

## 4) Free Function Rules

* Free functions are declared normally:

```basic
FUNCTION Length(self AS Vector) AS NUMBER
  RETURN SQR(self.x*self.x + self.y*self.y)
END FUNCTION
```

* Can be called directly (`Length(v)`) or via UFCS (`v.Length()`).
* First parameter is conventionally named `self` but any identifier is accepted.
* Works across modules with `IMPORT`.

---

## 5) Examples

### 5.1 Free function UFCS

```basic
TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

FUNCTION Length(self AS Vector) AS NUMBER
  RETURN SQR(self.x*self.x + self.y*self.y)
END FUNCTION

LET v = Vector { x:3, y:4 }
PRINT v.Length()    ' desugars to Length(v)
```

### 5.2 Chained UFCS

```basic
FUNCTION Normalize(self AS Vector) AS Vector
  LET len = self.Length()
  RETURN Vector { x: self.x/len, y: self.y/len }
END FUNCTION

PRINT v.Normalize().Length()
```

### 5.3 With service handle

```basic
LET midi = USE "co/pilot/midi:1.0"

' UFCS on a service handle calls into Block methods
midi.NOTE_ON(0, 60, 127)   ' desugars to NOTE_ON(midi, 0, 60, 127)
```

### 5.4 Ambiguity

```basic
FUNCTION F(self AS Vector)
  PRINT "Vector version"
END FUNCTION

FUNCTION F(self AS Point)
  PRINT "Point version"
END FUNCTION

LET v = Vector { x:1, y:2 }
v.F()  ' ERROR: AmbiguousUFCSCall("F", [Vector, Point])
```

---

## 6) Error Messages

* **Unknown:** `No function 'Length' matches receiver type Vector`.
* **Ambiguous:** `Ambiguous UFCS call 'F': candidates (Vector), (Point)`.

---

## 7) Grammar (EBNF excerpt)

```
CallExpr := Primary ('.' Identifier ArgList)?
```

Binder rewrites `obj.Identifier(args)` to `Identifier(obj, args)` if rule 2 or 3 applies.

---

## 8) Implementation Notes

* **Binder stage**: Detect dot-calls. Try resolution in order; rewrite AST to plain call.
* **Runtime**: Sees only normal calls; no special handling.
* **Modules**: `IMPORT Foo` brings `Foo.Length` into scope, enabling UFCS on that function.
* **Services**: Same; Block registry supplies candidate methods.

---

## 9) Tests (Vitest outline)

1. `Length(v)` == `v.Length()` (free function).
2. Chained UFCS (`v.Normalize().Length()`).
3. UFCS on service handle (`midi.NOTE_ON`).
4. Ambiguity error with multiple matching free functions.
5. Unknown function error with clear message.

---

*End of UFCS.md v0.1*
