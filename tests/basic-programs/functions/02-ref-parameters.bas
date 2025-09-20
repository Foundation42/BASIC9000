REM TEST: REF Parameters (Pass by Reference)
REM EXPECT: REF parameters can modify the original value

TYPE Counter
  value AS NUMBER
END TYPE

SUB Increment(REF x AS NUMBER)
  x = x + 1
END SUB

SUB IncrementCounter(REF c AS Counter)
  c.value = c.value + 1
END SUB

' Test REF with primitive
LET num = 10
PRINT "Before: num = " + STR$(num)
CALL Increment(num)
IF num = 11 THEN
  PRINT "PASS: REF modified num to 11"
ELSE
  PRINT "FAIL: REF did not modify num"
END IF

' Test REF with record
LET counter = Counter { value: 0 }
CALL IncrementCounter(counter)
IF counter.value = 1 THEN
  PRINT "PASS: REF modified counter.value"
ELSE
  PRINT "FAIL: REF did not modify counter"
END IF

END