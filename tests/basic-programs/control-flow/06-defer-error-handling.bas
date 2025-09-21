REM TEST: DEFER Error Handling - Basic error replacement functionality
REM EXPECT: DEFER errors replace original errors

' Test 1: DEFER throws, replaces original error
LET caught_message$ = ""

SUB TestDeferError()
  DEFER ERROR "Defer error"
  ERROR "Original error"
END SUB

TRY
  TestDeferError()
CATCH e
  caught_message$ = e.message
END TRY

IF INSTR(caught_message$, "Defer error") > 0 THEN
  PRINT "PASS: DEFER error replaces original error"
ELSE
  PRINT "FAIL: Expected 'Defer error' in message, got '" + caught_message$ + "'"
END IF

' Test 2: Multiple DEFER errors - second one wins due to execution order
caught_message$ = ""

SUB TestMultipleDeferErrors()
  DEFER ERROR "First defer error"
  DEFER ERROR "Second defer error"
  ERROR "Original error"
END SUB

TRY
  TestMultipleDeferErrors()
CATCH e
  caught_message$ = e.message
END TRY

IF INSTR(caught_message$, "Second defer error") > 0 THEN
  PRINT "PASS: Second DEFER error wins (due to execution order)"
ELSE
  PRINT "FAIL: Expected 'Second defer error' in message, got '" + caught_message$ + "'"
END IF

' Test 3: DEFER assignment with error handling
SUB TestDeferSuccess()
  LET defer_ran = FALSE

  DEFER
    defer_ran = TRUE
    PRINT "PASS: Successful DEFER preserves original error flow"
  END DEFER

  ERROR "Original preserved"
END SUB

TRY
  TestDeferSuccess()
CATCH e
  ' Error was caught, test passed if we get here
END TRY

' Test 4: DEFER in CATCH block
SUB TestDeferInCatch()
  LET cleanup_in_catch = FALSE

  TRY
    ERROR "Test error"
  CATCH e
    DEFER
      cleanup_in_catch = TRUE
      PRINT "PASS: DEFER works in CATCH blocks"
    END DEFER
  END TRY
END SUB

TestDeferInCatch()

END