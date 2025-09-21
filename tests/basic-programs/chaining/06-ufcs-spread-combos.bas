REM TEST: UFCS + Spread Operator Combinations
REM EXPECT: Complex chaining with spread works correctly

TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

TYPE Box SPREAD(x, y, width, height)
  x AS NUMBER
  y AS NUMBER
  width AS NUMBER
  height AS NUMBER
END TYPE

REM Test functions that expect spread parameters
FUNCTION DrawLine(canvas, x1 AS NUMBER, y1 AS NUMBER, x2 AS NUMBER, y2 AS NUMBER) AS RECORD
  PRINT "Drawing line from (" + STR$(x1) + "," + STR$(y1) + ") to (" + STR$(x2) + "," + STR$(y2) + ")"
  RETURN canvas
END FUNCTION

FUNCTION DrawRect(canvas, x AS NUMBER, y AS NUMBER, w AS NUMBER, h AS NUMBER) AS RECORD
  PRINT "Drawing rect at (" + STR$(x) + "," + STR$(y) + ") size " + STR$(w) + "x" + STR$(h)
  RETURN canvas
END FUNCTION

FUNCTION SetColor(canvas, color AS STRING) AS RECORD
  PRINT "Setting color to " + color
  RETURN canvas
END FUNCTION

REM Create test data
LET start = Vector { x: 10, y: 20 }
LET endpt = Vector { x: 100, y: 80 }
LET box = Box { x: 150, y: 200, width: 50, height: 30 }
LET canvas = { id: 1 }

REM Test UFCS chaining with spread operators
canvas.SetColor("#ff0000").DrawLine(start..., endpt...).SetColor("#00ff00").DrawRect(box...)

REM Test mixed spread and normal parameters
FUNCTION DrawCircle(canvas, cx AS NUMBER, cy AS NUMBER, radius AS NUMBER) AS RECORD
  PRINT "Drawing circle at (" + STR$(cx) + "," + STR$(cy) + ") radius " + STR$(radius)
  RETURN canvas
END FUNCTION

LET center = Vector { x: 250, y: 300 }
canvas.SetColor("#0000ff").DrawCircle(center..., 25)

REM Test array spread with UFCS
LET coords = [400, 450, 500, 550]
canvas.DrawLine(coords...)

PRINT "PASS: UFCS with spread combinations work correctly"
END