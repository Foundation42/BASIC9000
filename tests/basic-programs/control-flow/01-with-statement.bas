REM TEST: WITH Statement
REM EXPECT: WITH provides shorthand for accessing fields

TYPE Person
  name AS STRING
  age AS NUMBER
  city AS STRING
END TYPE

LET person = Person { name: "Alice", age: 30, city: "Boston" }

PRINT "Testing WITH statement:"

WITH person
  PRINT "Name: " + .name
  PRINT "Age: " + STR$(.age)
  PRINT "City: " + .city

  ' Modify fields within WITH
  .age = 31
  .city = "Cambridge"

  IF .age = 31 THEN
    PRINT "PASS: Modified age within WITH"
  ELSE
    PRINT "FAIL: WITH modification failed"
  END IF
END WITH

' Check modifications persist
IF person.age = 31 THEN
  PRINT "PASS: Changes persisted after WITH"
ELSE
  PRINT "FAIL: Changes did not persist"
END IF

IF person.city = "Cambridge" THEN
  PRINT "PASS: City changed to Cambridge"
ELSE
  PRINT "FAIL: City not changed"
END IF

END