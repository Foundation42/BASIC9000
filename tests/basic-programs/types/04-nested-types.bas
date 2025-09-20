REM TEST: Nested Type Definitions
REM EXPECT: Types can contain other types

TYPE Point
  x AS NUMBER
  y AS NUMBER
END TYPE

TYPE Rectangle
  topLeft AS Point
  width AS NUMBER
  height AS NUMBER
END TYPE

' Create nested structure
LET rect = Rectangle { topLeft: Point { x: 0, y: 0 }, width: 100, height: 50 }

IF rect.topLeft.x = 0 THEN
  PRINT "PASS: Nested x = 0"
ELSE
  PRINT "FAIL: Nested x != 0"
END IF

IF rect.width = 100 THEN
  PRINT "PASS: Width = 100"
ELSE
  PRINT "FAIL: Width != 100"
END IF

END