REM Test UFCS chaining with string manipulation functions

FUNCTION ToUpper(s AS STRING) AS STRING
  REM Simple uppercase conversion (for first letter only in this demo)
  IF LEN(s) > 0 THEN
    LET first = ASC(LEFT$(s, 1))
    IF first >= 97 AND first <= 122 THEN
      RETURN CHR$(first - 32) + MID$(s, 2)
    END IF
  END IF
  RETURN s
END FUNCTION

FUNCTION AddPrefix(s AS STRING) AS STRING
  RETURN ">> " + s
END FUNCTION

FUNCTION AddSuffix(s AS STRING) AS STRING
  RETURN s + " <<"
END FUNCTION

REM Test chaining string functions
LET result$ = "hello".ToUpper().AddPrefix().AddSuffix()
PRINT "Chained result: " + result$

REM Should be: "hello" -> "Hello" -> ">> Hello" -> ">> Hello <<"
LET expected$ = ">> Hello <<"
IF result$ = expected$ THEN
  PRINT "✓ String UFCS chaining works!"
ELSE
  PRINT "✗ Expected '" + expected$ + "', got '" + result$ + "'"
END IF