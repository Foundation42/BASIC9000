REM TEST: Canvas UFCS + Spread + Chaining Golden Test
REM EXPECT: Test the luxurious canvas experience with method chaining

TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

REM Define free functions for canvas operations with UFCS
FUNCTION TestColor(canvas AS NUMBER, color AS STRING) AS NUMBER
  RETURN CANVAS.__TEST_COLOR(canvas, color)
END FUNCTION

FUNCTION TestLine(canvas AS NUMBER, x1 AS NUMBER, y1 AS NUMBER, x2 AS NUMBER, y2 AS NUMBER) AS NUMBER
  RETURN CANVAS.__TEST_LINE(canvas, x1, y1, x2, y2)
END FUNCTION

FUNCTION TestCircle(canvas AS NUMBER, x AS NUMBER, y AS NUMBER, radius AS NUMBER) AS NUMBER
  RETURN CANVAS.__TEST_CIRCLE(canvas, x, y, radius)
END FUNCTION

FUNCTION TestRect(canvas AS NUMBER, x AS NUMBER, y AS NUMBER, width AS NUMBER, height AS NUMBER) AS NUMBER
  RETURN CANVAS.__TEST_RECT(canvas, x, y, width, height)
END FUNCTION

REM Start test mode
CANVAS.__TEST_START()

REM Create mock canvas
LET canvas = CANVAS.__TEST_NEW(400, 300)

REM Test 1: Basic UFCS chaining with free functions
PRINT "=== Test 1: Basic UFCS Chaining ==="
LET result1 = canvas.TestColor("red")
LET result2 = result1.TestCircle(50, 50, 25)
PRINT "Chaining result: " + STR$(result2)

REM Test 2: UFCS + Spread operator
PRINT "=== Test 2: UFCS + Spread ==="
LET a = Vector { x: 10, y: 20 }
LET b = Vector { x: 100, y: 200 }
LET result3 = canvas.TestLine(a..., b...)
PRINT "Spread result: " + STR$(result3)

REM Test 3: Complex chaining with spread
PRINT "=== Test 3: Complex Chaining + Spread ==="
CANVAS.__TEST_CLEAR()
LET start = Vector { x: 5, y: 10 }
LET endpt = Vector { x: 95, y: 190 }
LET final = canvas.TestColor("blue").TestLine(start..., endpt...).TestCircle(200, 100, 30)
PRINT "Complex chaining result: " + STR$(final)

REM Test 4: Golden output verification
PRINT "=== Test 4: Golden Output ==="
LET output$ = CANVAS.__TEST_OUTPUT()
PRINT "Golden output:"
PRINT output$

REM Expected:
REM COLOR blue
REM LINE 5,10,95,190
REM CIRCLE 200,100,30

CANVAS.__TEST_STOP()

IF output$ = "COLOR blue" + CHR$(10) + "LINE 5,10,95,190" + CHR$(10) + "CIRCLE 200,100,30" THEN
  PRINT "PASS: Golden output matches expected"
ELSE
  PRINT "FAIL: Golden output mismatch"
  PRINT "Expected: COLOR blue\\nLINE 5,10,95,190\\nCIRCLE 200,100,30"
  PRINT "Actual: " + output$
END IF

END