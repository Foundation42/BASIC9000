REM TEST: Config namespace round-trip and negative tests
REM EXPECT: Comprehensive CONFIG.SET/GET testing with type coercion

PRINT "=== Config Round-Trip Tests ==="

REM Test 1: Basic round-trip with numbers
PRINT "Test 1: Number round-trip"
CONFIG.SET("test_number", 42)
LET retrieved_num = CONFIG.GET("test_number")
IF retrieved_num = 42 THEN
  PRINT "PASS: Number round-trip works"
ELSE
  PRINT "FAIL: Expected 42, got " + STR$(retrieved_num)
END IF

REM Test 2: String round-trip
PRINT "Test 2: String round-trip"
CONFIG.SET("test_string", "Hello World")
LET retrieved_str$ = CONFIG.GET("test_string")
IF retrieved_str$ = "Hello World" THEN
  PRINT "PASS: String round-trip works"
ELSE
  PRINT "FAIL: Expected 'Hello World', got '" + retrieved_str$ + "'"
END IF

REM Test 3: Boolean round-trip
PRINT "Test 3: Boolean round-trip"
CONFIG.SET("test_bool", TRUE)
LET retrieved_bool = CONFIG.GET("test_bool")
IF retrieved_bool = TRUE THEN
  PRINT "PASS: Boolean round-trip works"
ELSE
  PRINT "FAIL: Expected TRUE, got " + STR$(retrieved_bool)
END IF

REM Test 4: Type coercion - string to number
PRINT "Test 4: Type coercion (string to number)"
CONFIG.SET("numeric_string", "123")
LET stored_val = CONFIG.GET("numeric_string")
LET coerced_num = VAL(stored_val) + 1
IF coerced_num = 124 THEN
  PRINT "PASS: String '123' retrieved and converted to number"
ELSE
  PRINT "FAIL: Expected 124, got " + STR$(coerced_num)
END IF

REM Test 5: Overwrite existing key
PRINT "Test 5: Overwrite existing key"
CONFIG.SET("overwrite_test", "first")
CONFIG.SET("overwrite_test", "second")
LET final_value$ = CONFIG.GET("overwrite_test")
IF final_value$ = "second" THEN
  PRINT "PASS: Key overwrite works"
ELSE
  PRINT "FAIL: Expected 'second', got '" + final_value$ + "'"
END IF

REM Test 6: Case sensitivity
PRINT "Test 6: Case sensitivity"
CONFIG.SET("CaseTest", "upper")
CONFIG.SET("casetest", "lower")
LET upper_val$ = CONFIG.GET("CaseTest")
LET lower_val$ = CONFIG.GET("casetest")
IF upper_val$ = "upper" AND lower_val$ = "lower" THEN
  PRINT "PASS: Keys are case-sensitive"
ELSE
  PRINT "FAIL: Case sensitivity broken"
END IF

PRINT "=== Negative Tests ==="

REM Test 7: Missing key error handling
PRINT "Test 7: Missing key handling"
TRY
  LET missing_val = CONFIG.GET("nonexistent_key_12345")
  PRINT "FAIL: Should have thrown error for missing key"
CATCH err$
  IF INSTR(err$, "not found") > 0 OR INSTR(err$, "missing") > 0 OR INSTR(err$, "exist") > 0 THEN
    PRINT "PASS: Proper error for missing key: " + err$
  ELSE
    PRINT "FAIL: Wrong error message: " + err$
  END IF
END TRY

REM Test 8: Empty key handling
PRINT "Test 8: Empty key handling"
TRY
  CONFIG.SET("", "empty_key_test")
  PRINT "FAIL: Should reject empty key"
CATCH err$
  PRINT "PASS: Rejected empty key: " + err$
END TRY

REM Test 9: Null/undefined handling
PRINT "Test 9: Special value handling"
CONFIG.SET("null_test", "")
LET empty_val$ = CONFIG.GET("null_test")
IF empty_val$ = "" THEN
  PRINT "PASS: Empty string handled correctly"
ELSE
  PRINT "FAIL: Empty string not preserved"
END IF

REM Test 10: Large value handling
PRINT "Test 10: Large value handling"
LET large_str$ = STRING$(1000, "A")
CONFIG.SET("large_value", large_str$)
LET retrieved_large$ = CONFIG.GET("large_value")
IF LEN(retrieved_large$) = 1000 THEN
  PRINT "PASS: Large value (1000 chars) handled correctly"
ELSE
  PRINT "FAIL: Large value truncated, got " + STR$(LEN(retrieved_large$)) + " chars"
END IF

PRINT "=== Config Tests Complete ==="
END