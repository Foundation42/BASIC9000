SUB TestRef(REF x AS NUMBER)
  PRINT "Inside TestRef, x = " + STR$(x)
  x = 99
  PRINT "After assignment, x = " + STR$(x)
END SUB

LET num = 10
PRINT "Before call: num = " + STR$(num)
CALL TestRef(num)
PRINT "After call: num = " + STR$(num)
END
