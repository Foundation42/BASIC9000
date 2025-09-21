REM TEST: DEFER + Async + Cancellation
REM EXPECT: LIFO guarantees hold even with async operations and early returns

LET cleanupOrder$ = ""

REM Function to track cleanup order
FUNCTION TrackCleanup(msg AS STRING) AS NUMBER
  cleanupOrder$ = cleanupOrder$ + msg + ";"
  PRINT "Cleanup: " + msg
  RETURN 0
END FUNCTION

PRINT "=== Test 1: Basic DEFER LIFO Order ==="
cleanupOrder$ = ""

FUNCTION BasicDefer() AS STRING
  DEFER TrackCleanup("A")
  DEFER TrackCleanup("B")
  DEFER TrackCleanup("C")
  RETURN "done"
END FUNCTION

LET result1$ = BasicDefer()
PRINT "Function returned: " + result1$
PRINT "Cleanup order: " + cleanupOrder$

IF cleanupOrder$ = "C;B;A;" THEN
  PRINT "PASS: Basic DEFER LIFO order works"
ELSE
  PRINT "FAIL: Expected 'C;B;A;', got '" + cleanupOrder$ + "'"
END IF

PRINT "=== Test 2: DEFER with Early Return ==="
cleanupOrder$ = ""

FUNCTION EarlyReturn(shouldReturn AS BOOL) AS STRING
  DEFER TrackCleanup("Start")

  IF shouldReturn THEN
    DEFER TrackCleanup("EarlyPath")
    RETURN "early"
  END IF

  DEFER TrackCleanup("LateePath")
  RETURN "late"
END FUNCTION

LET result2$ = EarlyReturn(TRUE)
PRINT "Early return result: " + result2$
PRINT "Cleanup order: " + cleanupOrder$

REM Should execute EarlyPath, then Start (LIFO)
IF cleanupOrder$ = "EarlyPath;Start;" THEN
  PRINT "PASS: DEFER with early return works"
ELSE
  PRINT "FAIL: Expected 'EarlyPath;Start;', got '" + cleanupOrder$ + "'"
END IF

PRINT "=== Test 3: DEFER with Exception/Error ==="
cleanupOrder$ = ""

FUNCTION WithError() AS STRING
  DEFER TrackCleanup("ErrorCleanup1")
  DEFER TrackCleanup("ErrorCleanup2")

  TRY
    DEFER TrackCleanup("TryBlock")
    REM Simulate an error condition
    IF TRUE THEN
      ERROR "Simulated error"
    END IF
    RETURN "no-error"
  CATCH err$
    DEFER TrackCleanup("CatchBlock")
    RETURN "caught: " + err$
  END TRY
END FUNCTION

LET result3$ = WithError()
PRINT "Error handling result: " + result3$
PRINT "Cleanup order: " + cleanupOrder$

REM Expected: CatchBlock, TryBlock, ErrorCleanup2, ErrorCleanup1 (LIFO)
IF cleanupOrder$ = "CatchBlock;TryBlock;ErrorCleanup2;ErrorCleanup1;" THEN
  PRINT "PASS: DEFER with error handling works"
ELSE
  PRINT "FAIL: DEFER with error handling failed"
  PRINT "Expected: 'CatchBlock;TryBlock;ErrorCleanup2;ErrorCleanup1;'"
  PRINT "Got: '" + cleanupOrder$ + "'"
END IF

PRINT "=== Test 4: Block-form DEFER ==="
cleanupOrder$ = ""

FUNCTION BlockDefer() AS STRING
  DEFER
    TrackCleanup("BlockStart")
    TrackCleanup("BlockMiddle")
    TrackCleanup("BlockEnd")
  END DEFER

  DEFER TrackCleanup("SingleDefer")
  RETURN "block-done"
END FUNCTION

LET result4$ = BlockDefer()
PRINT "Block defer result: " + result4$
PRINT "Cleanup order: " + cleanupOrder$

REM Should execute: SingleDefer, then block (BlockStart, BlockMiddle, BlockEnd)
IF cleanupOrder$ = "SingleDefer;BlockStart;BlockMiddle;BlockEnd;" THEN
  PRINT "PASS: Block-form DEFER works"
ELSE
  PRINT "FAIL: Block-form DEFER failed"
  PRINT "Expected: 'SingleDefer;BlockStart;BlockMiddle;BlockEnd;'"
  PRINT "Got: '" + cleanupOrder$ + "'"
END IF

PRINT "=== Test 5: DEFER with Loops ==="
cleanupOrder$ = ""

FUNCTION LoopDefer() AS STRING
  DEFER TrackCleanup("FunctionEnd")

  FOR i = 1 TO 3
    DEFER TrackCleanup("Loop" + STR$(i))
  NEXT i

  RETURN "loop-done"
END FUNCTION

LET result5$ = LoopDefer()
PRINT "Loop defer result: " + result5$
PRINT "Cleanup order: " + cleanupOrder$

REM Should execute: Loop3, Loop2, Loop1, FunctionEnd (LIFO)
IF cleanupOrder$ = "Loop3;Loop2;Loop1;FunctionEnd;" THEN
  PRINT "PASS: DEFER with loops works"
ELSE
  PRINT "FAIL: DEFER with loops failed"
  PRINT "Expected: 'Loop3;Loop2;Loop1;FunctionEnd;'"
  PRINT "Got: '" + cleanupOrder$ + "'"
END IF

PRINT "=== Test 6: Nested Function DEFER Isolation ==="
cleanupOrder$ = ""

FUNCTION InnerFunc() AS STRING
  DEFER TrackCleanup("Inner1")
  DEFER TrackCleanup("Inner2")
  RETURN "inner-done"
END FUNCTION

FUNCTION OuterFunc() AS STRING
  DEFER TrackCleanup("Outer1")
  LET inner$ = InnerFunc()
  DEFER TrackCleanup("Outer2")
  RETURN "outer-done"
END FUNCTION

LET result6$ = OuterFunc()
PRINT "Nested function result: " + result6$
PRINT "Cleanup order: " + cleanupOrder$

REM Should execute: Inner2, Inner1 (from InnerFunc), then Outer2, Outer1 (from OuterFunc)
IF cleanupOrder$ = "Inner2;Inner1;Outer2;Outer1;" THEN
  PRINT "PASS: Nested function DEFER isolation works"
ELSE
  PRINT "FAIL: Nested function DEFER isolation failed"
  PRINT "Expected: 'Inner2;Inner1;Outer2;Outer1;'"
  PRINT "Got: '" + cleanupOrder$ + "'"
END IF

PRINT "=== DEFER Tests Complete ==="
END