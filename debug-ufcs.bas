REM Debug UFCS for Canvas namespace functions

PRINT "=== Testing Canvas UFCS ==="

REM Create a canvas
LET canvas = NEW CANVAS(400, 300)
PRINT "Canvas created: " + STR$(canvas)

REM Try old syntax (should work)
TRY
  CANVAS.COLOR(canvas, "red")
  PRINT "✓ CANVAS.COLOR(canvas, 'red') works"
CATCH e
  PRINT "✗ CANVAS.COLOR failed: " + e
END TRY

REM Try UFCS syntax (should work automatically)
TRY
  canvas.COLOR("blue")
  PRINT "✓ canvas.COLOR('blue') works - UFCS is working!"
CATCH e
  PRINT "✗ canvas.COLOR failed: " + e
END TRY

REM Try chaining (ultimate test)
TRY
  canvas.COLOR("green").POSITION(100, 100)
  PRINT "✓ Method chaining works!"
CATCH e
  PRINT "✗ Method chaining failed: " + e
END TRY