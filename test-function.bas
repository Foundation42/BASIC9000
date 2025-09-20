REM Test basic function definition and call

FUNCTION Add(a AS NUMBER, b AS NUMBER) AS NUMBER
  PRINT "In Add function"
  RETURN a + b
END FUNCTION

' Test function call
PRINT "Before calling Add"
LET result = Add(5, 3)
PRINT "After calling Add"
PRINT "Result: "
PRINT result

END