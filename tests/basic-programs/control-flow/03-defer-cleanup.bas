REM TEST: DEFER Statement - Working Examples of Resource Management
REM EXPECT: DEFER executes on all exit paths demonstrating practical patterns

' Test 1: DEFER with resource simulation (file handle pattern)
SUB TestResourceCleanup()
  LET file_handle = 42
  LET cleanup_called = FALSE

  DEFER cleanup_called = TRUE
  DEFER PRINT "PASS: Resource cleanup DEFER executed"

  ' Simulate file operations
  PRINT "Working with file handle: " + STR$(file_handle)
END SUB

TestResourceCleanup()

' Test 2: DEFER with RETURN path
SUB TestReturnPath()
  LET return_cleanup = FALSE

  DEFER return_cleanup = TRUE
  DEFER PRINT "PASS: DEFER executed on RETURN path"

  RETURN  ' Early return should still trigger DEFER
  PRINT "This should not execute"
END SUB

TestReturnPath()

' Test 3: DEFER with ERROR path
SUB TestErrorPath()
  LET error_cleanup = FALSE

  TRY
    DEFER error_cleanup = TRUE
    DEFER PRINT "PASS: DEFER executed on ERROR path"
    ERROR "Test error"
    PRINT "This should not execute"
  CATCH e
    ' Error was caught, DEFER should have executed
  END TRY
END SUB

TestErrorPath()

' Test 4: Multiple DEFERs in LIFO order
SUB TestLIFOOrder()
  DEFER PRINT "DEFER 1 (executes LAST)"
  DEFER PRINT "DEFER 2 (executes MIDDLE)"
  DEFER PRINT "DEFER 3 (executes FIRST)"
  DEFER PRINT "PASS: Multiple DEFERs execute in LIFO order"

  PRINT "Main function body"
END SUB

TestLIFOOrder()

END