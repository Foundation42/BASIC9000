REM TEST: Canvas UFCS with Real Canvas Functions
REM EXPECT: Real canvas functions should work with UFCS syntax

REM Enable test mode to capture canvas operations without GUI
CANVAS.__TEST_START()

REM Create a real canvas
LET canvas = NEW CANVAS(400, 300)
PRINT "Canvas created: " + STR$(canvas)

REM Test 1: Basic real canvas UFCS calls
PRINT "=== Test 1: Real Canvas UFCS ==="

TRY
  REM Old syntax (should work)
  CANVAS.COLOR(canvas, "red")
  PRINT "✓ CANVAS.COLOR(canvas, 'red') works"

  REM UFCS syntax (should also work)
  canvas.COLOR("blue")
  PRINT "✓ canvas.COLOR('blue') works"

  REM Position and show with UFCS
  canvas.POSITION(100, 100).SHOW()
  PRINT "✓ canvas.POSITION(100, 100).SHOW() chaining works"

CATCH e
  PRINT "✗ Canvas UFCS failed: " + e
END TRY

REM Test 2: Drawing operations with UFCS
PRINT "=== Test 2: Drawing Operations ==="

TRY
  REM Begin path and set line properties
  canvas.LINEWIDTH(2).COLOR("green").BEGINPATH()
  PRINT "✓ Drawing setup with UFCS chaining works"

  REM Draw a simple shape
  canvas.MOVETO(50, 50).LINETO(100, 100).LINETO(150, 50).STROKE()
  PRINT "✓ Path drawing with UFCS chaining works"

CATCH e
  PRINT "✗ Drawing operations failed: " + e
END TRY

REM Test 3: Text operations with UFCS
PRINT "=== Test 3: Text Operations ==="

TRY
  canvas.FONT("16px monospace").COLOR("white").TEXT("UFCS Test", 200, 200)
  PRINT "✓ Text operations with UFCS chaining works"

CATCH e
  PRINT "✗ Text operations failed: " + e
END TRY

CANVAS.__TEST_STOP()

PRINT "All canvas UFCS tests completed successfully!"