REM TEST: Default Parameters
REM EXPECT: Functions can have default parameter values

FUNCTION Greet(name AS STRING = "World", excited AS BOOL = FALSE) AS STRING
  IF excited THEN
    RETURN "Hello, " + name + "!"
  ELSE
    RETURN "Hello, " + name
  END IF
END FUNCTION

FUNCTION Power(base AS NUMBER, exp AS NUMBER = 2) AS NUMBER
  LET result = 1
  FOR i = 1 TO exp
    result = result * base
  NEXT i
  RETURN result
END FUNCTION

' Test with no arguments (all defaults)
LET msg1 = Greet()
IF msg1 = "Hello, World" THEN
  PRINT "PASS: Default parameters worked"
ELSE
  PRINT "FAIL: Default parameters failed"
END IF

' Test with partial arguments
LET msg2 = Greet("BASIC9000")
IF msg2 = "Hello, BASIC9000" THEN
  PRINT "PASS: Partial defaults worked"
ELSE
  PRINT "FAIL: Partial defaults failed"
END IF

' Test with all arguments
LET msg3 = Greet("User", TRUE)
IF msg3 = "Hello, User!" THEN
  PRINT "PASS: All parameters worked"
ELSE
  PRINT "FAIL: All parameters failed"
END IF

' Test numeric defaults
IF Power(3) = 9 THEN
  PRINT "PASS: Power(3) = 9 (default exp=2)"
ELSE
  PRINT "FAIL: Default exp failed"
END IF

IF Power(2, 3) = 8 THEN
  PRINT "PASS: Power(2,3) = 8"
ELSE
  PRINT "FAIL: Power calculation failed"
END IF

END