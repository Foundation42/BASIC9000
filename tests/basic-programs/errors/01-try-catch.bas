REM TEST: TRY/CATCH/FINALLY Error Handling
REM EXPECT: Errors can be caught and handled

TYPE Result
  success AS BOOL
  value AS NUMBER
  error AS STRING
END TYPE

FUNCTION SafeDivide(a AS NUMBER, b AS NUMBER) AS Result
  LET result = Result { success: FALSE, value: 0, error: "" }

  TRY
    IF b = 0 THEN
      ERROR "Division by zero"
    END IF
    result.value = a / b
    result.success = TRUE
  CATCH e
    result.error = e.message
  END TRY

  RETURN result
END FUNCTION

' Test successful division
LET r1 = SafeDivide(10, 2)
IF r1.success AND r1.value = 5 THEN
  PRINT "PASS: Successful division"
ELSE
  PRINT "FAIL: Normal division failed"
END IF

' Test division by zero
LET r2 = SafeDivide(10, 0)
IF NOT r2.success AND INSTR(r2.error, "Division by zero") > 0 THEN
  PRINT "PASS: Caught division by zero"
ELSE
  PRINT "FAIL: Error not caught properly"
END IF

' Test FINALLY block
LET cleanup_ran = FALSE

TRY
  PRINT "In TRY block"
  ERROR "Test error"
CATCH e
  PRINT "Caught: " + e.message
FINALLY
  cleanup_ran = TRUE
  PRINT "FINALLY block executed"
END TRY

IF cleanup_ran THEN
  PRINT "PASS: FINALLY block ran"
ELSE
  PRINT "FAIL: FINALLY block did not run"
END IF

END