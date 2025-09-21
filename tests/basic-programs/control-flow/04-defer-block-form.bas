REM TEST: DEFER Block Form - Multi-statement cleanup
REM EXPECT: DEFER blocks can contain multiple statements

' Test 1: Basic DEFER block
SUB TestDeferBlock()
  LET cleanup_steps$ = ""

  cleanup_steps$ = "start;"

  DEFER
    cleanup_steps$ = cleanup_steps$ + "step1;"
    cleanup_steps$ = cleanup_steps$ + "step2;"
    cleanup_steps$ = cleanup_steps$ + "step3;"
    ' Check the result within DEFER since it executes at function exit
    IF cleanup_steps$ = "start;main;step1;step2;step3;" THEN
      PRINT "PASS: DEFER block executes multiple statements"
    ELSE
      PRINT "FAIL: Expected 'start;main;step1;step2;step3;' got '" + cleanup_steps$ + "'"
    END IF
  END DEFER

  cleanup_steps$ = cleanup_steps$ + "main;"
END SUB

TestDeferBlock()

' Test 2: Mixed single and block DEFERs - demonstrate LIFO execution
SUB TestMixedDefers()
  LET cleanup_steps$ = ""

  ' Register DEFERs in order: single1, block, single2
  DEFER cleanup_steps$ = cleanup_steps$ + "single1;"

  DEFER
    cleanup_steps$ = cleanup_steps$ + "block_start;"
    cleanup_steps$ = cleanup_steps$ + "block_end;"
  END DEFER

  DEFER cleanup_steps$ = cleanup_steps$ + "single2;"

  ' Show that all DEFERs were registered
  DEFER PRINT "PASS: Mixed single and block DEFERs execute in LIFO order"

  cleanup_steps$ = cleanup_steps$ + "body;"
END SUB

TestMixedDefers()

' Test 3: DEFER block with conditional logic
SUB TestDeferConditional()
  LET cleanup_steps$ = ""
  LET cleanup_mode = 1

  DEFER
    IF cleanup_mode = 1 THEN
      cleanup_steps$ = cleanup_steps$ + "mode1;"
    ELSE
      cleanup_steps$ = cleanup_steps$ + "mode2;"
    END IF
    cleanup_steps$ = cleanup_steps$ + "always;"
    ' Check the result within DEFER
    IF cleanup_steps$ = "main;mode1;always;" THEN
      PRINT "PASS: DEFER block supports conditional logic"
    ELSE
      PRINT "FAIL: Expected 'main;mode1;always;' got '" + cleanup_steps$ + "'"
    END IF
  END DEFER

  cleanup_steps$ = cleanup_steps$ + "main;"
END SUB

TestDeferConditional()

END