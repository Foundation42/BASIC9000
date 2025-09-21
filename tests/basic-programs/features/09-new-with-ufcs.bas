REM TEST: NEW operator combined with UFCS chaining
REM EXPECT: Objects created with NEW can be immediately chained

REM Constructor functions that return objects suitable for chaining
FUNCTION StringBuilder(initial AS STRING = "") AS RECORD
  RETURN { text: initial }
END FUNCTION

FUNCTION Counter(start AS NUMBER = 0) AS RECORD
  RETURN { value: start }
END FUNCTION

REM Methods that work with the constructed objects
FUNCTION Append(sb AS RECORD, text AS STRING) AS RECORD
  RETURN { text: sb.text + text }
END FUNCTION

FUNCTION Prepend(sb AS RECORD, text AS STRING) AS RECORD
  RETURN { text: text + sb.text }
END FUNCTION

FUNCTION GetText(sb AS RECORD) AS STRING
  RETURN sb.text
END FUNCTION

FUNCTION Increment(counter AS RECORD, amount AS NUMBER = 1) AS RECORD
  RETURN { value: counter.value + amount }
END FUNCTION

FUNCTION Multiply(counter AS RECORD, factor AS NUMBER) AS RECORD
  RETURN { value: counter.value * factor }
END FUNCTION

FUNCTION GetValue(counter AS RECORD) AS NUMBER
  RETURN counter.value
END FUNCTION

REM Test 1: NEW with immediate UFCS chaining
LET temp1 = NEW StringBuilder("Hello")
LET temp2 = temp1.Append(" ")
LET temp3 = temp2.Append("World")
LET result1$ = temp3.GetText()
PRINT "StringBuilder result: '" + result1$ + "'"

IF result1$ = "Hello World" THEN
  PRINT "PASS: NEW + UFCS chaining works"
ELSE
  PRINT "FAIL: Expected 'Hello World', got '" + result1$ + "'"
END IF

REM Test 2: NEW with mathematical operations
LET counter1 = NEW Counter(5)
LET counter2 = counter1.Increment(3)
LET counter3 = counter2.Multiply(2)
LET counter4 = counter3.Increment(1)
LET result2 = counter4.GetValue()
PRINT "Counter result: " + STR$(result2)

REM Should be: 5 -> 8 -> 16 -> 17
IF result2 = 17 THEN
  PRINT "PASS: NEW with math operations chain"
ELSE
  PRINT "FAIL: Expected 17, got " + STR$(result2)
END IF

REM Test 3: NEW with Canvas (built-in objects)
LET canvas1 = NEW CANVAS(400, 300)
LET canvas2 = canvas1.COLOR("#ff0000")
LET canvas3 = canvas2.RECT(10, 10, 50, 50)
LET canvas = canvas3.COLOR("#00ff00")
PRINT "Canvas handle after chaining: " + STR$(canvas)

REM Test 4: Complex chaining with NEW and parameters
LET sb1 = NEW StringBuilder()
LET sb2 = sb1.Prepend("[")
LET sb3 = sb2.Append("test")
LET sb4 = sb3.Append("]")
LET result3$ = sb4.GetText()
IF result3$ = "[test]" THEN
  PRINT "PASS: Complex NEW chaining with parameters"
ELSE
  PRINT "FAIL: Expected '[test]', got '" + result3$ + "'"
END IF

REM Test 5: NEW in expressions with other operations
LET left1 = NEW Counter(10)
LET left2 = left1.Increment(5)
LET leftVal = left2.GetValue()
LET right1 = NEW Counter(2)
LET right2 = right1.Multiply(3)
LET rightVal = right2.GetValue()
LET combined = leftVal + rightVal
PRINT "Combined result: " + STR$(combined)

IF combined = 21 THEN
  PRINT "PASS: NEW in complex expressions"
ELSE
  PRINT "FAIL: Expected 21, got " + STR$(combined)
END IF

PRINT "All NEW + UFCS tests completed successfully"
END