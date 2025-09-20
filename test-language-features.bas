REM ============================================
REM Comprehensive Language Features Test
REM Tests all features from Objects.md
REM ============================================

PRINT "=== BASIC9000 Language Features Test Suite ==="
PRINT

REM ============================================
REM Section 1: Basic TYPE Definitions
REM ============================================
PRINT "1. TYPE DEFINITIONS"
PRINT "-------------------"

TYPE Point
  x AS NUMBER
  y AS NUMBER
END TYPE

TYPE Person
  name AS STRING
  age AS NUMBER
  active AS BOOL
END TYPE

TYPE Rectangle
  topLeft AS Point
  width AS NUMBER
  height AS NUMBER
END TYPE

PRINT "✓ Types defined: Point, Person, Rectangle"
PRINT

REM ============================================
REM Section 2: Creating Records with Literals
REM ============================================
PRINT "2. RECORD LITERALS"
PRINT "------------------"

' Create records using literal syntax
LET p1 = Point { x: 10, y: 20 }
PRINT "Created Point: p1 = Point { x: 10, y: 20 }"

LET person1 = Person { name: "Alice", age: 30, active: TRUE }
PRINT "Created Person: person1"

' Nested record
LET rect = Rectangle { topLeft: Point { x: 0, y: 0 }, width: 100, height: 50 }
PRINT "Created nested Rectangle with embedded Point"
PRINT

REM ============================================
REM Section 3: Field Access
REM ============================================
PRINT "3. FIELD ACCESS"
PRINT "---------------"

PRINT "p1.x = " + STR$(p1.x)
PRINT "p1.y = " + STR$(p1.y)
PRINT "person1.name = " + person1.name
PRINT "person1.age = " + STR$(person1.age)
PRINT "person1.active = " + STR$(person1.active)
PRINT "rect.topLeft.x = " + STR$(rect.topLeft.x)
PRINT "rect.width = " + STR$(rect.width)
PRINT

REM ============================================
REM Section 4: Field Modification
REM ============================================
PRINT "4. FIELD MODIFICATION"
PRINT "--------------------"

p1.x = 30
p1.y = 40
PRINT "Modified p1.x to 30 and p1.y to 40"
PRINT "New p1.x = " + STR$(p1.x)

person1.age = 31
PRINT "Incremented person1.age to " + STR$(person1.age)
PRINT

REM ============================================
REM Section 5: LET with Type Annotations
REM ============================================
PRINT "5. TYPE ANNOTATIONS"
PRINT "-------------------"

LET count AS NUMBER = 42
LET message AS STRING = "Hello, BASIC9000!"
LET flag AS BOOL = TRUE

PRINT "count AS NUMBER = " + STR$(count)
PRINT "message AS STRING = " + message
PRINT "flag AS BOOL = " + STR$(flag)
PRINT

REM ============================================
REM Section 6: Arrays with Types
REM ============================================
PRINT "6. ARRAYS OF TYPES"
PRINT "------------------"

LET points AS ARRAY = [Point { x: 1, y: 1 }, Point { x: 2, y: 2 }, Point { x: 3, y: 3 }]
PRINT "Created array of Points"

' Access array elements
PRINT "points[0].x = " + STR$(points[0].x)
PRINT "points[1].y = " + STR$(points[1].y)
PRINT

REM ============================================
REM Section 7: Functions with Typed Parameters
REM ============================================
PRINT "7. TYPED FUNCTIONS"
PRINT "------------------"

FUNCTION Distance(p1 AS Point, p2 AS Point) AS NUMBER
  LET dx = p2.x - p1.x
  LET dy = p2.y - p1.y
  RETURN SQR(dx * dx + dy * dy)
END FUNCTION

FUNCTION FormatPerson(p AS Person) AS STRING
  RETURN p.name + " (age " + STR$(p.age) + ")"
END FUNCTION

LET origin = Point { x: 0, y: 0 }
LET target = Point { x: 3, y: 4 }
LET dist = Distance(origin, target)
PRINT "Distance from origin to (3,4) = " + STR$(dist)

LET formatted = FormatPerson(person1)
PRINT "Formatted person: " + formatted
PRINT

REM ============================================
REM Section 8: SUB with REF Parameters
REM ============================================
PRINT "8. REF PARAMETERS"
PRINT "-----------------"

SUB IncrementAge(REF p AS Person)
  p.age = p.age + 1
END SUB

PRINT "Before IncrementAge: " + STR$(person1.age)
CALL IncrementAge(person1)
PRINT "After IncrementAge: " + STR$(person1.age)
PRINT

REM ============================================
REM Section 9: UFCS (Method-like calls)
REM ============================================
PRINT "9. UFCS - Uniform Function Call Syntax"
PRINT "--------------------------------------"

FUNCTION Length(self AS Point) AS NUMBER
  RETURN SQR(self.x * self.x + self.y * self.y)
END FUNCTION

FUNCTION Scale(self AS Point, factor AS NUMBER) AS Point
  RETURN Point { x: self.x * factor, y: self.y * factor }
END FUNCTION

' UFCS style calls
LET pointLength = p1.Length()
PRINT "p1.Length() using UFCS = " + STR$(pointLength)

LET scaled = p1.Scale(2)
PRINT "p1.Scale(2) using UFCS created new point"
PRINT "scaled.x = " + STR$(scaled.x) + ", scaled.y = " + STR$(scaled.y)
PRINT

REM ============================================
REM Section 10: Properties (GET)
REM ============================================
PRINT "10. PROPERTIES"
PRINT "--------------"

PROPERTY Point.Magnitude(self AS Point) AS NUMBER GET
  RETURN SQR(self.x * self.x + self.y * self.y)
END PROPERTY

PROPERTY Rectangle.Area(self AS Rectangle) AS NUMBER GET
  RETURN self.width * self.height
END PROPERTY

PROPERTY Rectangle.Right(self AS Rectangle) AS NUMBER GET
  RETURN self.topLeft.x + self.width
END PROPERTY

PROPERTY Rectangle.Bottom(self AS Rectangle) AS NUMBER GET
  RETURN self.topLeft.y + self.height
END PROPERTY

PRINT "p1.Magnitude = " + STR$(p1.Magnitude)
PRINT "rect.Area = " + STR$(rect.Area)
PRINT "rect.Right = " + STR$(rect.Right)
PRINT "rect.Bottom = " + STR$(rect.Bottom)
PRINT

REM ============================================
REM Section 11: Control Flow with Types
REM ============================================
PRINT "11. CONTROL FLOW WITH TYPES"
PRINT "---------------------------"

IF person1.active THEN
  PRINT person1.name + " is active"
ELSE
  PRINT person1.name + " is inactive"
END IF

FOR i AS NUMBER = 0 TO 2
  PRINT "Point " + STR$(i) + ": (" + STR$(points[i].x) + ", " + STR$(points[i].y) + ")"
NEXT i
PRINT

REM ============================================
REM Section 12: Error Handling
REM ============================================
PRINT "12. ERROR HANDLING"
PRINT "------------------"

TRY
  LET result = 10 / 2
  PRINT "10 / 2 = " + STR$(result)
CATCH e
  PRINT "Error caught: " + e.message
END TRY

TRY
  ' This should cause an error if we try to divide by zero
  LET zero AS NUMBER = 0
  IF zero = 0 THEN
    ERROR "Division by zero attempted"
  END IF
  LET bad = 10 / zero
CATCH e
  PRINT "Successfully caught error: " + e.message
FINALLY
  PRINT "Finally block executed"
END TRY
PRINT

REM ============================================
REM Section 13: Type Aliases
REM ============================================
PRINT "13. TYPE ALIASES"
PRINT "----------------"

TYPE Coordinate = Point
TYPE Age = NUMBER
TYPE Name = STRING

LET coord AS Coordinate = Point { x: 5, y: 10 }
LET userAge AS Age = 25
LET userName AS Name = "Bob"

PRINT "Coordinate alias: (" + STR$(coord.x) + ", " + STR$(coord.y) + ")"
PRINT "Age alias: " + STR$(userAge)
PRINT "Name alias: " + userName
PRINT

REM ============================================
REM Section 14: WITH Statement
REM ============================================
PRINT "14. WITH STATEMENT"
PRINT "------------------"

WITH rect
  PRINT "Inside WITH block for rect:"
  PRINT "  Width: " + STR$(.width)
  PRINT "  Height: " + STR$(.height)
  PRINT "  Area: " + STR$(.Area)
  ' Modify fields
  .width = 200
  .height = 100
  PRINT "  Modified width to 200 and height to 100"
  PRINT "  New area: " + STR$(.Area)
END WITH
PRINT

REM ============================================
REM Section 15: Constants
REM ============================================
PRINT "15. CONSTANTS"
PRINT "-------------"

CONST PI = 3.14159265359
CONST MAX_SIZE = 1000
CONST APP_NAME = "TestApp"

PRINT "PI = " + STR$(PI)
PRINT "MAX_SIZE = " + STR$(MAX_SIZE)
PRINT "APP_NAME = " + APP_NAME
PRINT

REM ============================================
REM Section 16: Default Parameters
REM ============================================
PRINT "16. DEFAULT PARAMETERS"
PRINT "----------------------"

FUNCTION Greet(name AS STRING = "World") AS STRING
  RETURN "Hello, " + name + "!"
END FUNCTION

PRINT Greet()
PRINT Greet("BASIC9000")
PRINT

REM ============================================
REM Section 17: SELECT CASE
REM ============================================
PRINT "17. SELECT CASE"
PRINT "---------------"

LET testValue AS NUMBER = 2

SELECT CASE testValue
  CASE 0
    PRINT "Value is zero"
  CASE 1, 2, 3
    PRINT "Value is 1, 2, or 3"
  CASE ELSE
    PRINT "Value is something else"
END SELECT
PRINT

REM ============================================
REM Section 18: Boolean Operations
REM ============================================
PRINT "18. BOOLEAN OPERATIONS"
PRINT "----------------------"

LET a AS BOOL = TRUE
LET b AS BOOL = FALSE

PRINT "a = " + STR$(a)
PRINT "b = " + STR$(b)
PRINT "a AND b = " + STR$(a AND b)
PRINT "a OR b = " + STR$(a OR b)
PRINT "NOT a = " + STR$(NOT a)
PRINT "NOT b = " + STR$(NOT b)
PRINT

REM ============================================
REM Final Summary
REM ============================================
PRINT "============================================"
PRINT "Language Feature Test Complete!"
PRINT "============================================"
PRINT
PRINT "Features tested:"
PRINT "✓ TYPE definitions"
PRINT "✓ Record literals"
PRINT "✓ Field access and modification"
PRINT "✓ Type annotations"
PRINT "✓ Arrays of types"
PRINT "✓ Typed functions and SUBs"
PRINT "✓ REF parameters"
PRINT "✓ UFCS (Uniform Function Call Syntax)"
PRINT "✓ Properties (GET)"
PRINT "✓ Control flow with types"
PRINT "✓ Error handling (TRY/CATCH/FINALLY)"
PRINT "✓ Type aliases"
PRINT "✓ WITH statement"
PRINT "✓ Constants"
PRINT "✓ Default parameters"
PRINT "✓ SELECT CASE"
PRINT "✓ Boolean operations"
PRINT
PRINT "If you see this message, core features are working!"

END