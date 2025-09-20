REM TEST: Record Literal Creation
REM EXPECT: Create records using literal syntax

TYPE Point
  x AS NUMBER
  y AS NUMBER
END TYPE

' Create record with literal syntax
LET p1 = Point { x: 10, y: 20 }
PRINT "Created point p1"

' Test field access
IF p1.x = 10 THEN
  PRINT "PASS: p1.x = 10"
ELSE
  PRINT "FAIL: p1.x != 10"
END IF

IF p1.y = 20 THEN
  PRINT "PASS: p1.y = 20"
ELSE
  PRINT "FAIL: p1.y != 20"
END IF

END