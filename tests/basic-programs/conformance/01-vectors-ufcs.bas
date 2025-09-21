REM CONFORMANCE TEST: Vector UFCS Operations
REM From CONFORMANCE.md vectors.bas example

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

REM Expected output: 4,6
PRINT STR$(c.x) + "," + STR$(c.y)

REM Additional verification
IF c.x = 4 AND c.y = 6 THEN
  PRINT "PASS: Vector addition via UFCS works correctly"
ELSE
  PRINT "FAIL: Expected (4,6), got (" + STR$(c.x) + "," + STR$(c.y) + ")"
END IF
END