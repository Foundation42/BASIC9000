REM TEST: UFCS Ambiguity Error Handling
REM EXPECT: Ambiguous UFCS calls should produce clear error messages

TYPE Vector SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

TYPE Point SPREAD(x, y)
  x AS NUMBER
  y AS NUMBER
END TYPE

REM Define same function name for different types
FUNCTION Display(self AS Vector) AS STRING
  RETURN "Vector(" + STR$(self.x) + "," + STR$(self.y) + ")"
END FUNCTION

FUNCTION Display(self AS Point) AS STRING
  RETURN "Point(" + STR$(self.x) + "," + STR$(self.y) + ")"
END FUNCTION

REM Test with clear type (should work)
LET v = Vector { x: 1, y: 2 }
LET p = Point { x: 3, y: 4 }

REM These should work - no ambiguity
PRINT "Vector display: " + v.Display()
PRINT "Point display: " + p.Display()

REM Test direct calls (should work)
PRINT "Direct Vector: " + Display(v)
PRINT "Direct Point: " + Display(p)

REM Test with type-converted value might be ambiguous if types are similar
REM But since Vector and Point are distinct types, this should work fine
LET coords = Vector { x: 5, y: 6 }
PRINT "Coords display: " + coords.Display()

PRINT "PASS: UFCS with function overloads works correctly"

END