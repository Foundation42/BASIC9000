REM Test NEW operator for elegant type construction

REM Constructor functions work with NEW
FUNCTION Point(x AS NUMBER, y AS NUMBER) AS RECORD
  RETURN { x: x, y: y }
END FUNCTION

FUNCTION Vector(x AS NUMBER, y AS NUMBER, z AS NUMBER = 0) AS RECORD
  RETURN { x: x, y: y, z: z }
END FUNCTION

REM Test basic NEW functionality
LET point = NEW Point(10, 20)
PRINT "Point: (" + STR$(point.x) + ", " + STR$(point.y) + ")"

LET vector = NEW Vector(1, 2, 3)
PRINT "Vector: (" + STR$(vector.x) + ", " + STR$(vector.y) + ", " + STR$(vector.z) + ")"

REM Test with default parameters
LET vector2d = NEW Vector(5, 7)
PRINT "Vector2D: (" + STR$(vector2d.x) + ", " + STR$(vector2d.y) + ", " + STR$(vector2d.z) + ")"

REM Test built-in objects with NEW
LET canvas = NEW CANVAS(400, 300)
PRINT "Canvas handle: " + STR$(canvas)

REM Test chaining with NEW-created objects
canvas.COLOR("#ff0000").RECT(0, 0, 100, 100)
PRINT "Canvas operations completed successfully"