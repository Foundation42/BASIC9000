REM Test simple UFCS chaining with user-defined functions

FUNCTION Double(n AS NUMBER) AS NUMBER
  RETURN n * 2
END FUNCTION

FUNCTION Square(n AS NUMBER) AS NUMBER
  RETURN n * n
END FUNCTION

FUNCTION Add5(n AS NUMBER) AS NUMBER
  RETURN n + 5
END FUNCTION

REM Test chaining user functions
LET result = 3.Double().Square().Add5()
PRINT "3.Double().Square().Add5() = " + STR$(result)

REM Should be: 3 -> 6 -> 36 -> 41
IF result = 41 THEN
  PRINT "✓ UFCS chaining works correctly!"
ELSE
  PRINT "✗ Expected 41, got " + STR$(result)
END IF