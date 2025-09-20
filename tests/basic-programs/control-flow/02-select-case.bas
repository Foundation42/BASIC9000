REM TEST: SELECT CASE Statement
REM EXPECT: SELECT CASE provides multi-way branching

TYPE Status
  code AS NUMBER
  message AS STRING
END TYPE

FUNCTION GetStatus(code AS NUMBER) AS Status
  LET status = Status { code: code, message: "" }

  SELECT CASE code
    CASE 0
      status.message = "Success"
    CASE 1
      status.message = "Warning"
    CASE 2, 3
      status.message = "Error"
    CASE 4, 5, 6
      status.message = "Critical"
    CASE ELSE
      status.message = "Unknown"
  END SELECT

  RETURN status
END FUNCTION

' Test each case
LET s0 = GetStatus(0)
IF s0.message = "Success" THEN
  PRINT "PASS: CASE 0 -> Success"
ELSE
  PRINT "FAIL: CASE 0 failed"
END IF

LET s2 = GetStatus(2)
IF s2.message = "Error" THEN
  PRINT "PASS: CASE 2,3 -> Error"
ELSE
  PRINT "FAIL: Multiple CASE failed"
END IF

LET s5 = GetStatus(5)
IF s5.message = "Critical" THEN
  PRINT "PASS: CASE 4,5,6 -> Critical"
ELSE
  PRINT "FAIL: Multiple values failed"
END IF

LET s99 = GetStatus(99)
IF s99.message = "Unknown" THEN
  PRINT "PASS: CASE ELSE -> Unknown"
ELSE
  PRINT "FAIL: CASE ELSE failed"
END IF

END