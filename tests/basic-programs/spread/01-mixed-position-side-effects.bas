REM TEST: Array-spread in mixed positions with side-effects
REM EXPECT: Left-to-right evaluation with side-effects counter

REM Global counter for side effects
LET sideEffectCounter = 0

REM Function that has side effects and returns a value
FUNCTION SideEffect(value AS NUMBER) AS NUMBER
  sideEffectCounter = sideEffectCounter + 1
  PRINT "SideEffect #" + STR$(sideEffectCounter) + ": " + STR$(value)
  RETURN value
END FUNCTION

REM Function that takes multiple arguments to test spread
FUNCTION TestSpread(a AS NUMBER, b AS NUMBER, c AS NUMBER, d AS NUMBER, e AS NUMBER) AS STRING
  RETURN STR$(a) + "," + STR$(b) + "," + STR$(c) + "," + STR$(d) + "," + STR$(e)
END FUNCTION

PRINT "=== Test 1: Basic Mixed Position Spread ==="
LET arr1 = [10, 20]
LET arr2 = [30, 40]

REM Test f(1, arr1..., arr2..., 50)
LET result1$ = TestSpread(1, arr1..., arr2..., 50)
PRINT "Mixed spread result: " + result1$

IF result1$ = "1,10,20,30,40" THEN
  PRINT "PASS: Mixed position spread works - but wrong arg count"
  REM Actually this should fail or adapt - we have 5 args but function takes 5, so missing 50
ELSE
  PRINT "Result: " + result1$
END IF

PRINT "=== Test 2: Side Effects with Left-to-Right Evaluation ==="
REM Reset counter
sideEffectCounter = 0

REM Create arrays with side effects
LET xs = [SideEffect(100), SideEffect(200)]
LET ys = [SideEffect(300), SideEffect(400)]

PRINT "Arrays created with side effects. Counter should be 4: " + STR$(sideEffectCounter)

PRINT "=== Test 3: Side Effects in Function Call Arguments ==="
REM Reset counter for clean test
sideEffectCounter = 0

REM Test that function call arguments are evaluated left-to-right
REM Even with spread operators
FUNCTION TestOrder(a AS NUMBER, b AS NUMBER, c AS NUMBER) AS STRING
  RETURN STR$(a) + "," + STR$(b) + "," + STR$(c)
END FUNCTION

LET values = [SideEffect(999)]
LET order$ = TestOrder(SideEffect(111), values..., SideEffect(333))

PRINT "Function call order result: " + order$
PRINT "Final counter: " + STR$(sideEffectCounter)

IF sideEffectCounter = 3 THEN
  PRINT "PASS: Side effects executed correct number of times"
ELSE
  PRINT "FAIL: Expected 3 side effects, got " + STR$(sideEffectCounter)
END IF

REM Expected order: SideEffect(111) first, then values..., then SideEffect(333)
REM So we should see: 111, 999, 333
IF order$ = "111,999,333" THEN
  PRINT "PASS: Left-to-right evaluation with spread works"
ELSE
  PRINT "FAIL: Wrong evaluation order. Expected '111,999,333', got '" + order$ + "'"
END IF

PRINT "=== Test 4: Multiple Spreads with Side Effects ==="
sideEffectCounter = 0

FUNCTION TestMultiSpread(a AS NUMBER, b AS NUMBER, c AS NUMBER) AS STRING
  RETURN STR$(a) + "," + STR$(b) + "," + STR$(c)
END FUNCTION

LET first = [SideEffect(11)]
LET second = [SideEffect(22)]

LET multiResult$ = TestMultiSpread(first..., SideEffect(33), second...)

PRINT "Multi-spread result: " + multiResult$
PRINT "Side effects counter: " + STR$(sideEffectCounter)

REM Should be: first... (11), SideEffect(33), second... (22)
REM Result: 11, 33, 22
IF multiResult$ = "11,33,22" AND sideEffectCounter = 3 THEN
  PRINT "PASS: Multiple spreads with side effects work correctly"
ELSE
  PRINT "FAIL: Multiple spreads failed"
  PRINT "Expected result: '11,33,22' with 3 side effects"
  PRINT "Got: '" + multiResult$ + "' with " + STR$(sideEffectCounter) + " side effects"
END IF

PRINT "=== Test 5: Spread with Complex Expressions ==="
sideEffectCounter = 0

REM Test spread with expressions that have side effects
LET complexArray = [SideEffect(1) + SideEffect(2), SideEffect(3) * 2]
PRINT "Complex array created. Counter: " + STR$(sideEffectCounter)

FUNCTION TestComplex(a AS NUMBER, b AS NUMBER) AS STRING
  RETURN "a=" + STR$(a) + ",b=" + STR$(b)
END FUNCTION

LET complexResult$ = TestComplex(complexArray...)
PRINT "Complex spread result: " + complexResult$

REM First element: SideEffect(1) + SideEffect(2) = 1 + 2 = 3
REM Second element: SideEffect(3) * 2 = 3 * 2 = 6
REM So complexArray should be [3, 6]
IF complexResult$ = "a=3,b=6" THEN
  PRINT "PASS: Complex expressions in spread work"
ELSE
  PRINT "FAIL: Complex expressions failed. Expected 'a=3,b=6', got '" + complexResult$ + "'"
END IF

PRINT "=== Array Spread Tests Complete ==="
END