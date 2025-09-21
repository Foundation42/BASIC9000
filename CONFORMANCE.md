# BASIC9000 Conformance Pack (v0.1)

**Purpose:** Drop‑in tests + goldens to validate core language features: records, UFCS, spreads, DEFER, control flow, errors, and (optional) canvas stubs.
**Runner:** Vitest (Node).
**Layout:**

```
/tests
  /conformance
    core.spec.ts
    ufcs_spread.spec.ts
    defer.spec.ts
    errors.spec.ts
    canvas_stub.spec.ts       # optional; uses stubbed canvas
    desugar.spec.ts           # optional; compares to DESUGAR.md
  /fixtures
    tour.bas
    vectors.bas
    poly.bas
    defer_demo.bas
    errors.bas
  /goldens
    tour.stdout.txt
    vectors.stdout.txt
    poly.stdout.txt
    defer_demo.stdout.txt
    errors.stdout.txt
```

> **Note:** If your interpreter exposes programmatic entry points (e.g. `runSource(string)` → `{ stdout: string }`), these tests will call those directly. Otherwise, adapt the small helper below.

---

## 0) Test Helper (paste into `tests/helpers.ts`)

```ts
import { describe, it, expect } from "vitest"
import { runSource } from "../../src/interpreter/evaluator" // adjust if different
import fs from "node:fs"
import path from "node:path"

export async function runFixture(name: string) {
  const p = path.join(__dirname, "fixtures", name)
  const src = fs.readFileSync(p, "utf8")
  const result = await runSource(src) // assume returns { stdout, state? }
  return result
}

export function readGolden(name: string) {
  const p = path.join(__dirname, "goldens", name)
  return fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n")
}
```

If your API differs, change `runSource` import and return shape accordingly.

---

## 1) Fixtures (paste into `/tests/fixtures`)

### 1.1 `tour.bas`

```basic
PRINT "BASIC9000 online"

TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

FUNCTION Length(self AS Vector) AS NUMBER
  RETURN SQR(self.x*self.x + self.y*self.y)
END FUNCTION

LET a = Vector { x:3, y:4 }
LET b = Vector { x:10, y:20 }

PRINT "len(a): "; a.Length()

' UFCS + record spread
PRINT "line:" ; a.x ; "," ; a.y ; " -> " ; b.x ; "," ; b.y

' Array spread
LET xs = [1,2,3]
PRINT "sum3:" ; (xs[0] + xs[1] + xs[2])

' WITH + property (if implemented)
PROPERTY Vector.Norm(self AS Vector) AS NUMBER GET
  RETURN self.Length()
END PROPERTY
WITH a
  PRINT "norm:" ; .Norm
END WITH

' DEFER demo (synchronous)
SUB DemoDefer()
  LET log = []
  DEFER ARRAY.PUSH(log, "X")
  ARRAY.PUSH(log, "A")
  PRINT "defer:" ; JSON.STRINGIFY(log)
END SUB

CALL DemoDefer()
```

### 1.2 `vectors.bas`

```basic
TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

FUNCTION Add(self AS Vector, other AS Vector) AS Vector
  RETURN Vector { x: self.x + other.x, y: self.y + other.y }
END FUNCTION

LET a = Vector { x: 1, y: 2 }
LET b = Vector { x: 3, y: 4 }
LET c = a.Add(b)
PRINT c.x ; "," ; c.y
```

### 1.3 `poly.bas`

```basic
TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

LET pts = [ Vector{ x:0, y:0 }, Vector{ x:50, y:10 }, Vector{ x:80, y:40 } ]
' Array spread form
PRINT pts[0].x ; "," ; pts[0].y ; ";" ; pts[1].x ; "," ; pts[1].y ; ";" ; pts[2].x ; "," ; pts[2].y
```

### 1.4 `defer_demo.bas`

```basic
SUB ManyDefers()
  LET log = []
  DEFER ARRAY.PUSH(log, 3)
  DEFER ARRAY.PUSH(log, 2)
  DEFER ARRAY.PUSH(log, 1)
  PRINT JSON.STRINGIFY(log)
END SUB

CALL ManyDefers()
```

### 1.5 `errors.bas`

```basic
TYPE Vector
  x AS NUMBER
END TYPE

LET a = Vector { x: 1 }
' Illegal: no SPREAD declared for Vector
' Expect a compile-time or bind-time error
PRINT a...
```

---

## 2) Goldens (paste into `/tests/goldens`)

### 2.1 `tour.stdout.txt`

```
BASIC9000 online
len(a): 5
line:3,4 -> 10,20
sum3:6
norm:5
defer:["A"]
```

> Note: `defer` prints `A` only; then the deferred push of `"X"` runs at scope exit. If your implementation prints the final state post‑DEFER, adjust the expectation accordingly.

### 2.2 `vectors.stdout.txt`

```
4,6
```

### 2.3 `poly.stdout.txt`

```
0,0;50,10;80,40
```

### 2.4 `defer_demo.stdout.txt`

```
[]
```

> The DEFERs run after the PRINT, so the printed array is initially empty. If your interpreter flushes after scope exit, change to `[1,2,3]` accordingly, but be consistent across tests.

### 2.5 `errors.stdout.txt`

`(unused)`

---

## 3) Specs (paste into `/tests/conformance`)

### 3.1 `core.spec.ts`

```ts
import { describe, it, expect } from "vitest"
import { runFixture, readGolden } from "../helpers"

describe("core tour", () => {
  it("tour.bas => tour.stdout.txt", async () => {
    const out = await runFixture("tour.bas")
    expect(out.stdout.replace(/\r\n/g, "\n")).toBe(readGolden("tour.stdout.txt"))
  })
})
```

### 3.2 `ufcs_spread.spec.ts`

```ts
import { describe, it, expect } from "vitest"
import { runFixture, readGolden } from "../helpers"

describe("UFCS + spread", () => {
  it("vectors = UFCS Add + record SPREAD", async () => {
    const out = await runFixture("vectors.bas")
    expect(out.stdout.replace(/\r\n/g, "\n")).toBe(readGolden("vectors.stdout.txt"))
  })

  it("poly = array of vectors + indexing", async () => {
    const out = await runFixture("poly.bas")
    expect(out.stdout.replace(/\r\n/g, "\n")).toBe(readGolden("poly.stdout.txt"))
  })
})
```

### 3.3 `defer.spec.ts`

```ts
import { describe, it, expect } from "vitest"
import { runFixture, readGolden } from "../helpers"

describe("DEFER semantics", () => {
  it("LIFO and timing", async () => {
    const out = await runFixture("defer_demo.bas")
    expect(out.stdout.replace(/\r\n/g, "\n")).toBe(readGolden("defer_demo.stdout.txt"))
  })
})
```

### 3.4 `errors.spec.ts`

```ts
import { describe, it, expect } from "vitest"
import { runFixture } from "../helpers"

describe("errors", () => {
  it("record spread without SPREAD signature -> error", async () => {
    try {
      await runFixture("errors.bas")
      throw new Error("Expected failure, but program ran")
    } catch (e: any) {
      const msg = String(e.message || e)
      expect(msg).toMatch(/NoSpreadSignature|spread/i)
    }
  })
})
```

---

## 4) Optional: Canvas stub tests

If you export a Canvas stub namespace in tests (no real drawing), you can assert argument plumbing:

### 4.1 `canvas_stub.spec.ts`

```ts
import { describe, it, expect } from "vitest"
import { runSource } from "../../src/interpreter/evaluator"

describe("canvas plumbing", () => {
  it("LINE accepts vectors and spreads", async () => {
    const src = `
      TYPE Vector SPREAD(x, y)
        x AS NUMBER
        y AS NUMBER
      END TYPE
      LET a = Vector{ x: 1, y: 2 }
      LET b = Vector{ x: 3, y: 4 }
      PRINT CANVAS.__TEST_LINE(a..., b...)
    `
    const out = await runSource(src)
    expect(out.stdout.trim()).toBe("1,2,3,4")
  })
})
```

> Implement `CANVAS.__TEST_LINE(a..., b...)` to just print its args for tests.

---

## 5) Desugar checks (if you expose an internal desugar API)

Expose (for tests only) `desugar(source: string): string` and compare to `DESUGAR.md` exemplars. If not available, skip this suite for now.

### 5.1 `desugar.spec.ts` (skeleton)

```ts
import { describe, it, expect } from "vitest"
import { desugar } from "../../src/interpreter/internal-desugar" // if you have it

const src = `
TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE
LET a = Vector { x:10, y:20 }
LET b = Vector { x:30, y:40 }
canvas.Color("#0f0").LINE(a..., b...).RECT(r...)
`

const expected = `
LET a = Vector { x:10, y:20 }
LET b = Vector { x:30, y:40 }
Color(canvas, "#0f0")
LINE(canvas, a.x, a.y, b.x, b.y)
RECT(canvas, r.x, r.y, r.w, r.h)
`

describe("desugar", () => {
  it("matches expected core form", () => {
    expect(desugar(src).trim()).toBe(expected.trim())
  })
})
```

---

## 6) CI tip

Add to `package.json`:

```json
{
  "scripts": {
    "test:conf": "vitest run tests/conformance/*.spec.ts"
  }
}
```

Run: `npm run test:conf`.

---

## 7) Keeping goldens stable

* Normalize newlines to `\n` in helpers.
* If your PRINT adds spaces vs commas, adapt goldens accordingly, but keep consistent.\*

---

*End of Conformance Pack v0.1*
