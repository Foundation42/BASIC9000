REM TEST: Basic TYPE Definition
REM EXPECT: Types can be defined and used

TYPE Point
  x AS NUMBER
  y AS NUMBER
END TYPE

TYPE Person
  name AS STRING
  age AS NUMBER
  active AS BOOL
END TYPE

PRINT "PASS: TYPE definitions compiled"
END