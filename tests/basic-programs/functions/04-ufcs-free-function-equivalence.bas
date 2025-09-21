REM TEST: UFCS Free Function Equivalence
REM EXPECT: Direct function call and UFCS call produce identical results

TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

FUNCTION Length(self AS Vector) AS NUMBER
  RETURN SQR(self.x * self.x + self.y * self.y)
END FUNCTION

FUNCTION Normalize(self AS Vector) AS Vector
  LET len = self.Length()
  RETURN Vector { x: self.x/len, y: self.y/len }
END FUNCTION

LET v = Vector { x: 3, y: 4 }

REM Test 1: Length function equivalence
LET directLength = Length(v)
LET ufcsLength = v.Length()

IF directLength = ufcsLength AND directLength = 5 THEN
  PRINT "PASS: Length(v) == v.Length() == 5"
ELSE
  PRINT "FAIL: Length equivalence failed"
END IF

REM Test 2: Normalize function equivalence
LET directNorm = Normalize(v)
LET ufcsNorm = v.Normalize()

IF directNorm.x = ufcsNorm.x AND directNorm.y = ufcsNorm.y THEN
  PRINT "PASS: Normalize(v) == v.Normalize()"
ELSE
  PRINT "FAIL: Normalize equivalence failed"
END IF

REM Test 3: Chained equivalence
LET directChain = Length(Normalize(v))
LET ufcsChain = v.Normalize().Length()

IF directChain = ufcsChain AND ABS(directChain - 1) < 0.0001 THEN
  PRINT "PASS: Length(Normalize(v)) == v.Normalize().Length() ≈ 1"
ELSE
  PRINT "FAIL: Chained equivalence failed"
END IF

END