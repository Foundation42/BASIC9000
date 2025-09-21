REM Test UFCS chaining with records and type instances

TYPE Point
  x AS NUMBER
  y AS NUMBER
END TYPE

FUNCTION MoveRight(p AS Point, distance AS NUMBER) AS Point
  RETURN Point { x: p.x + distance, y: p.y }
END FUNCTION

FUNCTION MoveUp(p AS Point, distance AS NUMBER) AS Point
  RETURN Point { x: p.x, y: p.y + distance }
END FUNCTION

FUNCTION Scale(p AS Point, factor AS NUMBER) AS Point
  RETURN Point { x: p.x * factor, y: p.y * factor }
END FUNCTION

REM Create a point and chain transformations
LET start = Point { x: 1, y: 2 }
LET result = start.MoveRight(3).MoveUp(4).Scale(2)

PRINT "Start: (" + STR$(start.x) + ", " + STR$(start.y) + ")"
PRINT "After chain: (" + STR$(result.x) + ", " + STR$(result.y) + ")"

REM Should be: (1,2) -> (4,2) -> (4,6) -> (8,12)
IF result.x = 8 AND result.y = 12 THEN
  PRINT "✓ Record UFCS chaining works perfectly!"
ELSE
  PRINT "✗ Expected (8, 12), got (" + STR$(result.x) + ", " + STR$(result.y) + ")"
END IF