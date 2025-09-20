REM TEST: Functions with Type Parameters
REM EXPECT: Functions can have typed parameters and return types

TYPE Point
  x AS NUMBER
  y AS NUMBER
END TYPE

FUNCTION Distance(p1 AS Point, p2 AS Point) AS NUMBER
  LET dx = p2.x - p1.x
  LET dy = p2.y - p1.y
  RETURN SQR(dx * dx + dy * dy)
END FUNCTION

FUNCTION MakePoint(x AS NUMBER, y AS NUMBER) AS Point
  RETURN Point { x: x, y: y }
END FUNCTION

' Test typed functions
LET origin = Point { x: 0, y: 0 }
LET target = Point { x: 3, y: 4 }
LET dist = Distance(origin, target)

IF dist = 5 THEN
  PRINT "PASS: Distance calculation = 5"
ELSE
  PRINT "FAIL: Distance != 5, got " + STR$(dist)
END IF

LET p = MakePoint(10, 20)
IF p.x = 10 AND p.y = 20 THEN
  PRINT "PASS: MakePoint created correct point"
ELSE
  PRINT "FAIL: MakePoint failed"
END IF

END