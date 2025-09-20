REM TEST: SPREAD operator with annotated types
REM EXPECT: Vector with SPREAD annotation can be spread in function calls

TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

LET point = Vector { x: 10, y: 20 }
LET result = MATH.DISTANCE(0, 0, point...)
PRINT "Distance:", result

REM Test with array spreading too
LET coords = [5, 12]
LET result2 = MATH.DISTANCE(0, 0, coords...)
PRINT "Array distance:", result2

PRINT "PASS: Spread operator works correctly"
END