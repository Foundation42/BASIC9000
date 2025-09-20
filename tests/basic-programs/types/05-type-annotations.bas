REM TEST: Type Annotations in LET
REM EXPECT: LET statements can have type annotations

TYPE Point
  x AS NUMBER
  y AS NUMBER
END TYPE

' Primitive type annotations
LET count AS NUMBER = 42
LET message AS STRING = "Hello"
LET flag AS BOOL = TRUE

PRINT "count = " + STR$(count)
PRINT "message = " + message
PRINT "flag = " + STR$(flag)

' Type annotation with record
LET origin AS Point = Point { x: 0, y: 0 }

IF origin.x = 0 AND origin.y = 0 THEN
  PRINT "PASS: Type-annotated Point created"
ELSE
  PRINT "FAIL: Type annotation failed"
END IF

END