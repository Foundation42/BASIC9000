REM TEST: UFCS (Uniform Function Call Syntax)
REM EXPECT: Functions can be called as methods on first parameter

TYPE Vector
  x AS NUMBER
  y AS NUMBER
END TYPE

FUNCTION Length(self AS Vector) AS NUMBER
  RETURN SQR(self.x * self.x + self.y * self.y)
END FUNCTION

FUNCTION Add(self AS Vector, other AS Vector) AS Vector
  RETURN Vector { x: self.x + other.x, y: self.y + other.y }
END FUNCTION

FUNCTION Scale(self AS Vector, factor AS NUMBER) AS Vector
  RETURN Vector { x: self.x * factor, y: self.y * factor }
END FUNCTION

' Test UFCS calls
LET v1 = Vector { x: 3, y: 4 }
LET v2 = Vector { x: 1, y: 2 }

' Method-style call: v1.Length()
LET len = v1.Length()
IF len = 5 THEN
  PRINT "PASS: v1.Length() = 5"
ELSE
  PRINT "FAIL: v1.Length() != 5"
END IF

' Method-style with arguments: v1.Add(v2)
LET v3 = v1.Add(v2)
IF v3.x = 4 AND v3.y = 6 THEN
  PRINT "PASS: v1.Add(v2) worked"
ELSE
  PRINT "FAIL: Add failed"
END IF

' Chain calls
LET scaled = v1.Scale(2)
IF scaled.x = 6 AND scaled.y = 8 THEN
  PRINT "PASS: v1.Scale(2) worked"
ELSE
  PRINT "FAIL: Scale failed"
END IF

END