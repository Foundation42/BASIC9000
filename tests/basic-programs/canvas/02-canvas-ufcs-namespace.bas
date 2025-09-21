REM TEST: Canvas UFCS with Namespace Functions
REM EXPECT: Canvas namespace functions should work with UFCS syntax

REM Start test mode for canvas
CANVAS.__TEST_START()

REM Create a test canvas
LET canvas = CANVAS.__TEST_NEW(400, 300)
PRINT "Canvas created: " + STR$(canvas)

REM Test 1: Basic UFCS method calls
PRINT "=== Test 1: Basic UFCS Method Calls ==="

REM Old namespace syntax (baseline)
LET result1 = CANVAS.__TEST_COLOR(canvas, "red")
PRINT "Namespace syntax works: " + STR$(result1)

REM New UFCS syntax (should work the same)
LET result2 = canvas.__TEST_COLOR("blue")
PRINT "UFCS syntax works: " + STR$(result2)

REM Test 2: Method chaining with UFCS
PRINT "=== Test 2: Method Chaining ==="
LET result3 = canvas.__TEST_COLOR("green").__TEST_CIRCLE(50, 50, 25)
PRINT "Method chaining works: " + STR$(result3)

REM Test 3: Complex chaining
PRINT "=== Test 3: Complex Chaining ==="
CANVAS.__TEST_CLEAR()
LET final = canvas.__TEST_COLOR("purple").__TEST_RECT(10, 10, 100, 50).__TEST_CIRCLE(200, 100, 30)
PRINT "Complex chaining result: " + STR$(final)

REM Test 4: Verify output
PRINT "=== Test 4: Verify Output ==="
LET output$ = CANVAS.__TEST_OUTPUT()
PRINT "Canvas commands executed:"
PRINT output$

REM Expected output should contain the chained commands
IF INSTR(output$, "COLOR purple") > 0 AND INSTR(output$, "RECT 10,10,100,50") > 0 AND INSTR(output$, "CIRCLE 200,100,30") > 0 THEN
  PRINT "PASS: All UFCS canvas methods executed correctly"
ELSE
  PRINT "FAIL: UFCS canvas methods not working properly"
  PRINT "Expected: COLOR purple, RECT 10,10,100,50, CIRCLE 200,100,30"
  PRINT "Actual: " + output$
END IF

CANVAS.__TEST_STOP()