REM TEST: UFCS Chaining with Error Handling
REM EXPECT: Error handling works correctly with method chains

TYPE DataProcessor
  data AS STRING
  valid AS BOOLEAN
END TYPE

REM Functions that can succeed or fail in a chain
FUNCTION CreateProcessor(initial AS STRING) AS DataProcessor
  IF LEN(initial) = 0 THEN
    ERROR "Cannot create processor with empty data"
  END IF
  RETURN DataProcessor { data: initial, valid: TRUE }
END FUNCTION

FUNCTION Validate(proc AS DataProcessor) AS DataProcessor
  IF NOT proc.valid THEN
    ERROR "Processor is in invalid state"
  END IF
  IF LEN(proc.data) < 3 THEN
    ERROR "Data too short for processing"
  END IF
  RETURN proc
END FUNCTION

FUNCTION Transform(proc AS DataProcessor, suffix AS STRING) AS DataProcessor
  IF NOT proc.valid THEN
    ERROR "Cannot transform invalid processor"
  END IF
  RETURN DataProcessor { data: proc.data + suffix, valid: TRUE }
END FUNCTION

FUNCTION Finalize(proc AS DataProcessor) AS STRING
  IF NOT proc.valid THEN
    ERROR "Cannot finalize invalid processor"
  END IF
  RETURN "[" + proc.data + "]"
END FUNCTION

REM Test 1: Successful chain
TRY
  LET result1$ = CreateProcessor("test").Validate().Transform("_done").Finalize()
  IF result1$ = "[test_done]" THEN
    PRINT "PASS: Successful UFCS chain with potential errors"
  ELSE
    PRINT "FAIL: Expected '[test_done]', got '" + result1$ + "'"
  END IF
CATCH e
  PRINT "FAIL: Unexpected error in successful chain: " + e.message
END TRY

REM Test 2: Error at start of chain
TRY
  LET result2$ = CreateProcessor("").Validate().Transform("_done").Finalize()
  PRINT "FAIL: Should have thrown error for empty data"
CATCH e
  IF INSTR(e.message, "empty data") > 0 THEN
    PRINT "PASS: Error caught at start of chain"
  ELSE
    PRINT "FAIL: Wrong error message: " + e.message
  END IF
END TRY

REM Test 3: Error in middle of chain
TRY
  LET result3$ = CreateProcessor("ab").Validate().Transform("_done").Finalize()
  PRINT "FAIL: Should have thrown error for short data"
CATCH e
  IF INSTR(e.message, "too short") > 0 THEN
    PRINT "PASS: Error caught in middle of chain"
  ELSE
    PRINT "FAIL: Wrong error message: " + e.message
  END IF
END TRY

REM Test 4: Chain with intermediate error recovery
FUNCTION SafeTransform(proc AS DataProcessor, suffix AS STRING) AS DataProcessor
  TRY
    RETURN Transform(proc, suffix)
  CATCH e
    PRINT "Warning: Transform failed, using safe fallback"
    RETURN DataProcessor { data: proc.data + "_safe", valid: TRUE }
  END TRY
END FUNCTION

TRY
  REM Create an invalid processor to test recovery
  LET invalid_proc = DataProcessor { data: "test", valid: FALSE }
  LET result4$ = invalid_proc.SafeTransform("_normal").Finalize()
  IF result4$ = "[test_safe]" THEN
    PRINT "PASS: Error recovery in UFCS chain"
  ELSE
    PRINT "FAIL: Recovery failed, got '" + result4$ + "'"
  END IF
CATCH e
  PRINT "FAIL: Unexpected error in recovery test: " + e.message
END TRY

REM Test 5: Complex chaining with multiple try/catch blocks
FUNCTION LoggedTransform(proc AS DataProcessor, suffix AS STRING) AS DataProcessor
  PRINT "Transforming: " + proc.data + " with " + suffix
  RETURN Transform(proc, suffix)
END FUNCTION

SUB TestComplexChain()
  TRY
    LET step1 = CreateProcessor("base")
    PRINT "Step 1 complete"

    TRY
      LET step2 = step1.Validate().LoggedTransform("_mid")
      PRINT "Step 2 complete"

      LET final$ = step2.Finalize()
      PRINT "Final result: " + final$

      IF final$ = "[base_mid]" THEN
        PRINT "PASS: Complex nested error handling with UFCS"
      ELSE
        PRINT "FAIL: Wrong final result"
      END IF
    CATCH inner_e
      PRINT "Inner error: " + inner_e.message
    END TRY
  CATCH outer_e
    PRINT "Outer error: " + outer_e.message
  END TRY
END SUB

TestComplexChain()

REM Test 6: UFCS with DEFER and error handling
SUB TestUFCSWithDefer()
  LET cleanup_called = FALSE

  TRY
    DEFER
      cleanup_called = TRUE
      PRINT "PASS: DEFER executed with UFCS error handling"
    END DEFER

    REM This should fail and trigger DEFER
    LET result$ = CreateProcessor("x").Validate().Finalize()
    PRINT "FAIL: Should not reach here"
  CATCH e
    IF INSTR(e.message, "too short") > 0 THEN
      PRINT "Expected error caught in UFCS+DEFER test"
    END IF
  END TRY
END SUB

TestUFCSWithDefer()

PRINT "All UFCS error handling tests completed"
END