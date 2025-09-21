REM Test UFCS chaining with CANVAS operations (the main feature)

LET canvas = NEW CANVAS(400, 300)

REM Traditional approach (still works)
CANVAS.COLOR(canvas, "#ff0000")
CANVAS.RECT(canvas, 10, 10, 50, 50)

REM New chained approach - much more elegant!
canvas.COLOR("#00ff00").FILLRECT(70, 10, 50, 50).COLOR("#0000ff").CIRCLE(150, 35, 25)

REM More complex chaining
canvas.COLOR("#ffff00").LINEWIDTH(5).LINE(200, 10, 250, 60).COLOR("#ff00ff").FILLCIRCLE(300, 35, 20)

REM Chain with positioning and styling
canvas.COLOR("#ffffff").FONT("20px Arial").TEXT("Chained!", 10, 100)

PRINT "✓ Canvas UFCS chaining demo complete!"
PRINT "All canvas operations chained successfully."

REM Show the canvas
CANVAS.SHOW(canvas)