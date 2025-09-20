REM TEST: Properties with GET
REM EXPECT: Properties can compute values on access

TYPE Rectangle
  width AS NUMBER
  height AS NUMBER
END TYPE

TYPE Circle
  radius AS NUMBER
END TYPE

PROPERTY Rectangle.Area(self AS Rectangle) AS NUMBER GET
  RETURN self.width * self.height
END PROPERTY

PROPERTY Rectangle.Perimeter(self AS Rectangle) AS NUMBER GET
  RETURN 2 * (self.width + self.height)
END PROPERTY

PROPERTY Circle.Area(self AS Circle) AS NUMBER GET
  RETURN 3.14159 * self.radius * self.radius
END PROPERTY

PROPERTY Circle.Diameter(self AS Circle) AS NUMBER GET
  RETURN 2 * self.radius
END PROPERTY

' Test rectangle properties
LET rect = Rectangle { width: 10, height: 5 }

IF rect.Area = 50 THEN
  PRINT "PASS: rect.Area = 50"
ELSE
  PRINT "FAIL: rect.Area != 50"
END IF

IF rect.Perimeter = 30 THEN
  PRINT "PASS: rect.Perimeter = 30"
ELSE
  PRINT "FAIL: rect.Perimeter != 30"
END IF

' Test circle properties
LET circle = Circle { radius: 10 }

IF circle.Diameter = 20 THEN
  PRINT "PASS: circle.Diameter = 20"
ELSE
  PRINT "FAIL: circle.Diameter != 20"
END IF

' Area should be approximately 314.159
LET area = circle.Area
IF area > 314 AND area < 315 THEN
  PRINT "PASS: circle.Area ≈ 314.159"
ELSE
  PRINT "FAIL: circle.Area incorrect"
END IF

END