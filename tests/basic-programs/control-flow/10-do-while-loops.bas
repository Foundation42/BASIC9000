REM TEST: DO-WHILE Loop Functionality
REM EXPECT: DO-WHILE loops work correctly with body executing at least once

REM Test 1: Basic DO-WHILE loop counting
PRINT "=== Test 1: Basic DO-WHILE loop counting ==="
LET counter = 1
LET sum = 0

DO
  sum = sum + counter
  counter = counter + 1
WHILE counter <= 5

IF sum = 15 THEN
  PRINT "✓ PASS: Basic DO-WHILE loop counting works (sum = 15)"
ELSE
  PRINT "✗ FAIL: Basic DO-WHILE loop counting failed (sum = " + STR$(sum) + ")"
END IF

REM Test 2: DO-WHILE loop with FALSE condition (should execute once)
PRINT "=== Test 2: DO-WHILE loop with FALSE condition ==="
LET executed = 0

DO
  executed = executed + 1
WHILE FALSE

IF executed = 1 THEN
  PRINT "✓ PASS: DO-WHILE loop with FALSE condition executed body exactly once"
ELSE
  PRINT "✗ FAIL: DO-WHILE loop with FALSE condition executed " + STR$(executed) + " times"
END IF

REM Test 3: DO-WHILE loop with complex condition
PRINT "=== Test 3: DO-WHILE loop with complex condition ==="
LET x = 10
LET result = 0

DO
  result = result + x
  x = x - 3
WHILE x > 0 AND x < 100

IF result = 22 AND x = -2 THEN
  PRINT "✓ PASS: DO-WHILE loop with complex condition works correctly"
ELSE
  PRINT "✗ FAIL: DO-WHILE loop with complex condition failed (result = " + STR$(result) + ", x = " + STR$(x) + ")"
END IF

REM Test 4: DO-WHILE loop that executes only once
PRINT "=== Test 4: DO-WHILE loop that executes only once ==="
LET value = 100
LET iterations = 0

DO
  iterations = iterations + 1
  value = value + 50
WHILE value < 100

IF iterations = 1 AND value = 150 THEN
  PRINT "✓ PASS: DO-WHILE loop executed exactly once when condition is false"
ELSE
  PRINT "✗ FAIL: DO-WHILE loop failed (iterations = " + STR$(iterations) + ", value = " + STR$(value) + ")"
END IF

REM Test 5: Nested DO-WHILE loops
PRINT "=== Test 5: Nested DO-WHILE loops ==="
LET outer = 1
LET total = 0

DO
  LET inner = 1
  DO
    total = total + (outer * inner)
    inner = inner + 1
  WHILE inner <= 2
  outer = outer + 1
WHILE outer <= 3

IF total = 18 THEN
  PRINT "✓ PASS: Nested DO-WHILE loops work correctly (total = 18)"
ELSE
  PRINT "✗ FAIL: Nested DO-WHILE loops failed (total = " + STR$(total) + ")"
END IF

REM Test 6: DO-WHILE with variable condition
PRINT "=== Test 6: DO-WHILE with variable condition ==="
LET keepGoing = TRUE
LET count = 0

DO
  count = count + 1
  IF count >= 3 THEN
    keepGoing = FALSE
  END IF
WHILE keepGoing

IF count = 3 THEN
  PRINT "✓ PASS: DO-WHILE with variable condition works correctly"
ELSE
  PRINT "✗ FAIL: DO-WHILE with variable condition failed (count = " + STR$(count) + ")"
END IF

PRINT "All DO-WHILE loop tests completed!"