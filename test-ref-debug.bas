SUB TestRef(REF x AS NUMBER)
  PRINT "1. x = " + STR$(x)
  LET y = x
  PRINT "2. y = " + STR$(y)
  x = x + 1
  PRINT "3. x = " + STR$(x)
  x = 99
  PRINT "4. x = " + STR$(x)
END SUB

LET num = 10
CALL TestRef(num)
PRINT "Final: num = " + STR$(num)
END
