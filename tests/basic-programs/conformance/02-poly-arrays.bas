REM CONFORMANCE TEST: Polygon Points Array
REM From CONFORMANCE.md poly.bas example

TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

REM Create array of vector points for a polygon
LET pts = [ Vector{ x:0, y:0 }, Vector{ x:50, y:10 }, Vector{ x:80, y:40 } ]

REM Expected output: 0,0;50,10;80,40
LET output$ = STR$(pts[0].x) + "," + STR$(pts[0].y) + ";" + STR$(pts[1].x) + "," + STR$(pts[1].y) + ";" + STR$(pts[2].x) + "," + STR$(pts[2].y)
PRINT output$

REM Additional verification
IF pts[0].x = 0 AND pts[0].y = 0 AND pts[1].x = 50 AND pts[1].y = 10 AND pts[2].x = 80 AND pts[2].y = 40 THEN
  PRINT "PASS: Polygon array with vector indexing works correctly"
ELSE
  PRINT "FAIL: Polygon points not correctly stored/accessed"
END IF

REM Test array length
IF LEN(pts) = 3 THEN
  PRINT "PASS: Array length is correct"
ELSE
  PRINT "FAIL: Expected array length 3, got " + STR$(LEN(pts))
END IF
END