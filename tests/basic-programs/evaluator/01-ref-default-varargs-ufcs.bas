REM TEST: Evaluator edge cases - REF params + default args + varargs + UFCS
REM EXPECT: Complex parameter handling with all advanced features

TYPE Point SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

REM Test 1: REF parameters with UFCS
FUNCTION ModifyPoint(REF self AS Point, newX AS NUMBER, newY AS NUMBER) AS BOOL
  self.x = newX
  self.y = newY
  RETURN TRUE
END FUNCTION

PRINT "=== Test 1: REF Parameters with UFCS ==="
LET p = Point { x: 10, y: 20 }
PRINT "Before: (" + STR$(p.x) + "," + STR$(p.y) + ")"
LET success = p.ModifyPoint(100, 200)
PRINT "After: (" + STR$(p.x) + "," + STR$(p.y) + ")"
IF p.x = 100 AND p.y = 200 AND success = TRUE THEN
  PRINT "PASS: REF parameter UFCS works"
ELSE
  PRINT "FAIL: REF parameter UFCS failed"
END IF

REM Test 2: Function with default parameters
FUNCTION CreateVector(x AS NUMBER, y AS NUMBER, z AS NUMBER = 0) AS STRING
  RETURN STR$(x) + "," + STR$(y) + "," + STR$(z)
END FUNCTION

PRINT "=== Test 2: Default Parameters ==="
LET vec2d$ = CreateVector(1, 2)
LET vec3d$ = CreateVector(1, 2, 3)
PRINT "2D vector: " + vec2d$
PRINT "3D vector: " + vec3d$
IF vec2d$ = "1,2,0" AND vec3d$ = "1,2,3" THEN
  PRINT "PASS: Default parameters work"
ELSE
  PRINT "FAIL: Default parameters failed"
END IF

REM Test 3: Varargs (if supported)
REM This may not be implemented yet, so we'll test what we can

REM Test 4: UFCS with multiple parameter types
FUNCTION ProcessData(self AS Point, scale AS NUMBER = 1.0, label AS STRING = "point") AS STRING
  LET scaledX = self.x * scale
  LET scaledY = self.y * scale
  RETURN label + ": (" + STR$(scaledX) + "," + STR$(scaledY) + ")"
END FUNCTION

PRINT "=== Test 4: UFCS with Default Parameters ==="
LET p2 = Point { x: 5, y: 10 }
LET result1$ = p2.ProcessData()
LET result2$ = p2.ProcessData(2.0)
LET result3$ = p2.ProcessData(2.0, "scaled")
PRINT "Default: " + result1$
PRINT "Scale only: " + result2$
PRINT "Scale + label: " + result3$

IF result1$ = "point: (5,10)" AND result2$ = "point: (10,20)" AND result3$ = "scaled: (10,20)" THEN
  PRINT "PASS: UFCS with default parameters works"
ELSE
  PRINT "FAIL: UFCS with default parameters failed"
  PRINT "Expected: 'point: (5,10)', 'point: (10,20)', 'scaled: (10,20)'"
  PRINT "Got: '" + result1$ + "', '" + result2$ + "', '" + result3$ + "'"
END IF

REM Test 5: REF parameters with complex operations
FUNCTION SwapCoordinates(REF point AS Point) AS STRING
  LET temp = point.x
  point.x = point.y
  point.y = temp
  RETURN "swapped"
END FUNCTION

PRINT "=== Test 5: REF with Complex Operations ==="
LET p3 = Point { x: 3, y: 7 }
PRINT "Before swap: (" + STR$(p3.x) + "," + STR$(p3.y) + ")"
LET swapResult$ = p3.SwapCoordinates()
PRINT "After swap: (" + STR$(p3.x) + "," + STR$(p3.y) + ")"
IF p3.x = 7 AND p3.y = 3 AND swapResult$ = "swapped" THEN
  PRINT "PASS: REF with complex operations works"
ELSE
  PRINT "FAIL: REF with complex operations failed"
END IF

REM Test 6: UFCS resolution (our current overloading works by type)
FUNCTION FormatPoint(self AS Point) AS STRING
  RETURN "point: (" + STR$(self.x) + "," + STR$(self.y) + ")"
END FUNCTION

PRINT "=== Test 6: UFCS Function Resolution ==="
LET p4 = Point { x: 1.5, y: 2.5 }
LET formatted$ = p4.FormatPoint()
PRINT "Formatted: " + formatted$

IF formatted$ = "point: (1.5,2.5)" THEN
  PRINT "PASS: UFCS function resolution works"
ELSE
  PRINT "FAIL: UFCS function resolution failed"
  PRINT "Expected: 'point: (1.5,2.5)'"
  PRINT "Got: '" + formatted$ + "'"
END IF

PRINT "=== Evaluator Edge Cases Complete ==="
END