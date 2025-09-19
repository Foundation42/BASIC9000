REM ============================================
REM Canvas API Demo for BASIC9000
REM Shows basic drawing capabilities
REM ============================================

PRINT "=== BASIC9000 Canvas Demo ==="
PRINT "Creating a 600x400 canvas..."
PRINT

REM Create main canvas
LET canvas = CANVAS.CREATE(600, 400)
CANVAS.POSITION(canvas, 100, 100)
CANVAS.SHOW(canvas)

REM Clear with black background
CANVAS.CLEAR(canvas, "black")

REM Draw a title
CANVAS.COLOR(canvas, "green")
CANVAS.FONT(canvas, "24px monospace")
CANVAS.TEXT(canvas, "BASIC9000 CANVAS", 200, 30)

REM Draw some shapes
CANVAS.COLOR(canvas, "red")
CANVAS.FILLRECT(canvas, 50, 80, 100, 60)

CANVAS.COLOR(canvas, "blue")
CANVAS.CIRCLE(canvas, 250, 110, 40)

CANVAS.COLOR(canvas, "yellow")
CANVAS.FILLCIRCLE(canvas, 400, 110, 35)

REM Draw a gradient rectangle
CANVAS.COLOR(canvas, "cyan")
CANVAS.RECT(canvas, 50, 180, 100, 60)

REM Draw lines
CANVAS.COLOR(canvas, "magenta")
CANVAS.LINEWIDTH(canvas, 3)
CANVAS.LINE(canvas, 200, 180, 300, 240)
CANVAS.LINE(canvas, 300, 180, 200, 240)

REM Draw an arc
CANVAS.COLOR(canvas, "orange")
CANVAS.ARC(canvas, 400, 210, 30, 0, 3.14159)

REM Draw text with different alignments
CANVAS.COLOR(canvas, "white")
CANVAS.FONT(canvas, "16px monospace")
CANVAS.TEXT(canvas, "Left aligned", 50, 300)

CANVAS.TEXTALIGN(canvas, "center")
CANVAS.TEXT(canvas, "Center aligned", 300, 300)

CANVAS.TEXTALIGN(canvas, "right")
CANVAS.TEXT(canvas, "Right aligned", 550, 300)

REM Draw a path
CANVAS.BEGINPATH(canvas)
CANVAS.MOVETO(canvas, 250, 330)
CANVAS.LINETO(canvas, 300, 370)
CANVAS.LINETO(canvas, 200, 370)
CANVAS.CLOSEPATH(canvas)
CANVAS.COLOR(canvas, "lime")
CANVAS.FILL(canvas)

PRINT "Canvas demo complete!"
PRINT "You should see:"
PRINT "- A title at the top"
PRINT "- Various colored shapes"
PRINT "- Lines and arcs"
PRINT "- Text with different alignments"
PRINT "- A filled triangle at the bottom"
PRINT
PRINT "Press Ctrl+L to clear terminal"
PRINT "Press Ctrl+R to reset everything"

END