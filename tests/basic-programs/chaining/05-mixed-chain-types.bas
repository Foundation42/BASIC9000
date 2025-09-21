REM Test UFCS chaining with mixed data types and operations

TYPE Calculator
  value AS NUMBER
END TYPE

FUNCTION SetValue(calc AS Calculator, val AS NUMBER) AS Calculator
  RETURN Calculator { value: val }
END FUNCTION

FUNCTION Add(calc AS Calculator, n AS NUMBER) AS Calculator
  RETURN Calculator { value: calc.value + n }
END FUNCTION

FUNCTION Multiply(calc AS Calculator, n AS NUMBER) AS Calculator
  RETURN Calculator { value: calc.value * n }
END FUNCTION

FUNCTION GetResult(calc AS Calculator) AS NUMBER
  RETURN calc.value
END FUNCTION

REM Create calculator and chain operations
LET calc = Calculator { value: 0 }
LET result = calc.SetValue(5).Add(3).Multiply(2).GetResult()

PRINT "Calculator chain result: " + STR$(result)

REM Should be: 0 -> 5 -> 8 -> 16
IF result = 16 THEN
  PRINT "✓ Mixed type UFCS chaining works!"
ELSE
  PRINT "✗ Expected 16, got " + STR$(result)
END IF

REM Test chaining different types in one expression
FUNCTION ToString(n AS NUMBER) AS STRING
  RETURN STR$(n)
END FUNCTION

FUNCTION Repeat(s AS STRING, times AS NUMBER) AS STRING
  LET result$ = ""
  FOR i = 1 TO times
    result$ = result$ + s
  NEXT i
  RETURN result$
END FUNCTION

LET chained$ = 3.ToString().Repeat(4)
PRINT "Number to string chain: '" + chained$ + "'"

IF chained$ = "3333" THEN
  PRINT "✓ Cross-type UFCS chaining works!"
ELSE
  PRINT "✗ Expected '3333', got '" + chained$ + "'"
END IF