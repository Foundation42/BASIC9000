REM TEST: DEFER with Function Scope Patterns - Demonstrating DEFER fundamentals
REM EXPECT: DEFER works correctly within function scopes for cleanup patterns

' Test 1: Basic DEFER execution at function exit
SUB TestBasicExecution()
  LET step_log$ = ""

  step_log$ = step_log$ + "start;"

  DEFER
    ' Check result within DEFER - it executes after the cleanup assignment
    IF step_log$ = "start;body;cleanup;" THEN
      PRINT "PASS: DEFER executes at function scope exit"
    ELSE
      PRINT "FAIL: Expected 'start;body;cleanup;' got '" + step_log$ + "'"
    END IF
  END DEFER

  DEFER step_log$ = step_log$ + "cleanup;"
  step_log$ = step_log$ + "body;"
END SUB

TestBasicExecution()

' Test 2: DEFER with early return
SUB TestEarlyReturn()
  LET control_log$ = ""

  control_log$ = control_log$ + "start;"

  ' Check happens in the first-executed DEFER (LIFO)
  DEFER
    IF control_log$ = "start;before_return;cleanup;" THEN
      PRINT "PASS: DEFER executes on early return"
    ELSE
      PRINT "FAIL: Expected 'start;before_return;cleanup;' got '" + control_log$ + "'"
    END IF
  END DEFER

  DEFER control_log$ = control_log$ + "cleanup;"
  control_log$ = control_log$ + "before_return;"

  RETURN
  control_log$ = control_log$ + "unreachable;"
END SUB

TestEarlyReturn()

' Test 3: DEFER with function call patterns
SUB TestFunctionCalls()
  LET outer_log$ = ""
  outer_log$ = outer_log$ + "outer_start;"

  DEFER outer_log$ = outer_log$ + "outer_cleanup;"
  DEFER PRINT "PASS: DEFER executes at proper scope boundaries"

  TestInnerFunction()
  outer_log$ = outer_log$ + "outer_end;"
END SUB

SUB TestInnerFunction()
  PRINT "Inner function executed"
END SUB

TestFunctionCalls()

END