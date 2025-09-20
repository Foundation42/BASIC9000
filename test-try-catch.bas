PRINT "Testing TRY/CATCH"

TRY
  PRINT "In TRY block"
  ERROR "Test error"
  PRINT "Should not print"
CATCH e
  PRINT "Caught: " + e.message
END TRY

PRINT "After TRY/CATCH"