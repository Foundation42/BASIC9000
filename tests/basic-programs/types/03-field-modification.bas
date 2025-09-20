REM TEST: Field Modification
REM EXPECT: Fields can be modified after creation

TYPE Point
  x AS NUMBER
  y AS NUMBER
END TYPE

LET p = Point { x: 5, y: 10 }
PRINT "Initial: x=" + STR$(p.x) + " y=" + STR$(p.y)

' Modify fields
p.x = 15
p.y = 25

IF p.x = 15 THEN
  PRINT "PASS: Modified x to 15"
ELSE
  PRINT "FAIL: x not modified correctly"
END IF

IF p.y = 25 THEN
  PRINT "PASS: Modified y to 25"
ELSE
  PRINT "FAIL: y not modified correctly"
END IF

END