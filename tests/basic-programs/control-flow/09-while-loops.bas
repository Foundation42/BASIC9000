REM TEST: WHILE/WEND Loop Functionality
REM EXPECT: WHILE loops work correctly with proper condition evaluation and body execution

REM Test 1: Basic WHILE loop counting
PRINT "=== Test 1: Basic WHILE loop counting ==="
LET counter = 1
LET sum = 0

WHILE counter <= 5
  sum = sum + counter
  counter = counter + 1
WEND

IF sum = 15 THEN
  PRINT "✓ PASS: Basic WHILE loop counting works (sum = 15)"
ELSE
  PRINT "✗ FAIL: Basic WHILE loop counting failed (sum = " + STR$(sum) + ")"
END IF

REM Test 2: WHILE loop with FALSE condition (should not execute)
PRINT "=== Test 2: WHILE loop with FALSE condition ==="
LET executed = FALSE

WHILE FALSE
  executed = TRUE
WEND

IF executed = FALSE THEN
  PRINT "✓ PASS: WHILE loop with FALSE condition correctly skipped body"
ELSE
  PRINT "✗ FAIL: WHILE loop with FALSE condition incorrectly executed body"
END IF

REM Test 3: WHILE loop with complex condition
PRINT "=== Test 3: WHILE loop with complex condition ==="
LET x = 10
LET result = 0

WHILE x > 0 AND x < 100
  result = result + x
  x = x - 2
WEND

IF result = 30 AND x = 0 THEN
  PRINT "✓ PASS: WHILE loop with complex condition works correctly"
ELSE
  PRINT "✗ FAIL: WHILE loop with complex condition failed (result = " + STR$(result) + ", x = " + STR$(x) + ")"
END IF

REM Test 4: Nested WHILE loops
PRINT "=== Test 4: Nested WHILE loops ==="
LET i = 1
LET total = 0

WHILE i <= 3
  LET j = 1
  WHILE j <= 2
    total = total + (i * j)
    j = j + 1
  WEND
  i = i + 1
WEND

IF total = 18 THEN
  PRINT "✓ PASS: Nested WHILE loops work correctly (total = 18)"
ELSE
  PRINT "✗ FAIL: Nested WHILE loops failed (total = " + STR$(total) + ")"
END IF

REM Test 5: WHILE loop with string comparison
PRINT "=== Test 5: WHILE loop with string comparison ==="
LET text$ = "ABC"
LET length = 0

WHILE length < LEN(text$)
  length = length + 1
WEND

IF length = 3 THEN
  PRINT "✓ PASS: WHILE loop with string comparison works"
ELSE
  PRINT "✗ FAIL: WHILE loop with string comparison failed (length = " + STR$(length) + ")"
END IF

PRINT "All WHILE/WEND loop tests completed!"