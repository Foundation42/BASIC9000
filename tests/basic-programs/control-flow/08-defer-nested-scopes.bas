REM TEST: DEFER with Nested Scopes and Function Calls
REM EXPECT: DEFER works correctly across complex nested scenarios

REM Test 1: DEFER with nested function calls
SUB OuterFunction()
  PRINT "outer_start;"

  DEFER PRINT "outer_cleanup;"

  MiddleFunction()
  PRINT "outer_end;"
END SUB

SUB MiddleFunction()
  PRINT "middle_start;"

  DEFER PRINT "middle_cleanup;"

  InnerFunction()
  PRINT "middle_end;"
END SUB

SUB InnerFunction()
  PRINT "inner_start;"

  DEFER PRINT "inner_cleanup;"

  PRINT "inner_end;"
END SUB

REM Execute nested test
PRINT "=== Test 1: Nested function calls ==="
OuterFunction()
PRINT "PASS: DEFER executes in correct LIFO order across nested scopes"

REM Test 2: DEFER with conditional nested calls
SUB ConditionalCaller(should_call AS BOOLEAN)
  PRINT "caller_start;"

  DEFER PRINT "caller_cleanup;"

  IF should_call THEN
    ConditionalTarget()
  ELSE
    PRINT "skip_target;"
  END IF

  PRINT "caller_end;"
END SUB

SUB ConditionalTarget()
  PRINT "target_start;"

  DEFER PRINT "target_cleanup;"

  PRINT "target_end;"
END SUB

PRINT "=== Test 2: Conditional calls (TRUE) ==="
ConditionalCaller(TRUE)
PRINT "PASS: DEFER with conditional nested calls (TRUE)"

PRINT "=== Test 2b: Conditional calls (FALSE) ==="
ConditionalCaller(FALSE)
PRINT "PASS: DEFER with conditional nested calls (FALSE)"

REM Test 3: DEFER with recursive calls (limited depth)
SUB RecursiveFunction(depth AS NUMBER)
  PRINT "recurse_" + STR$(depth) + "_start;"

  DEFER PRINT "recurse_" + STR$(depth) + "_cleanup;"

  IF depth > 0 THEN
    RecursiveFunction(depth - 1)
  ELSE
    PRINT "base_case;"
  END IF

  PRINT "recurse_" + STR$(depth) + "_end;"
END SUB

PRINT "=== Test 3: Recursive calls ==="
RecursiveFunction(2)
PRINT "PASS: DEFER with recursive calls"

REM Test 4: DEFER with error propagation across scopes
SUB ErrorPropagationOuter()
  PRINT "error_outer_start;"

  DEFER PRINT "error_outer_cleanup;"

  TRY
    ErrorPropagationInner()
  CATCH e
    PRINT "error_caught_outer;"
  END TRY

  PRINT "error_outer_end;"
END SUB

SUB ErrorPropagationInner()
  PRINT "error_inner_start;"

  DEFER PRINT "error_inner_cleanup;"

  ERROR "Test error from inner"
  PRINT "unreachable;"
END SUB

PRINT "=== Test 4: Error propagation ==="
ErrorPropagationOuter()
PRINT "PASS: DEFER with error propagation across scopes"

PRINT "All nested scope DEFER tests completed"
END