REM TEST: Error when spreading record without SPREAD annotation
REM EXPECT: RuntimeError about missing SPREAD annotation

TYPE Point
  x AS NUMBER
  y AS NUMBER
END TYPE

LET p = Point {x: 5, y: 10}

REM This should throw an error
PRINT MATH.DISTANCE(0, 0, p...)
END