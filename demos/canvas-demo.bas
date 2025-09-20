REM ============================================
REM Canvas API Demo for BASIC9000
REM Shows basic drawing capabilities
REM Now with TYPE definitions for structured graphics
REM ============================================

' Define types for graphics primitives
TYPE Point
  x AS NUMBER
  y AS NUMBER
END TYPE

TYPE Rectangle
  x AS NUMBER
  y AS NUMBER
  width AS NUMBER
  height AS NUMBER
END TYPE

TYPE Circle
  center AS Point
  radius AS NUMBER
END TYPE

TYPE Color
  name AS STRING
END TYPE

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

REM Draw some shapes using typed structures
LET redRect = Rectangle { x: 50, y: 80, width: 100, height: 60 }
CANVAS.COLOR(canvas, "red")
CANVAS.FILLRECT(canvas, redRect.x, redRect.y, redRect.width, redRect.height)

LET blueCircle = Circle { center: Point { x: 250, y: 110 }, radius: 40 }
CANVAS.COLOR(canvas, "blue")
CANVAS.CIRCLE(canvas, blueCircle.center.x, blueCircle.center.y, blueCircle.radius)

LET yellowCircle = Circle { center: Point { x: 400, y: 110 }, radius: 35 }
CANVAS.COLOR(canvas, "yellow")
CANVAS.FILLCIRCLE(canvas, yellowCircle.center.x, yellowCircle.center.y, yellowCircle.radius)

REM Draw a gradient rectangle
LET cyanRect = Rectangle { x: 50, y: 180, width: 100, height: 60 }
CANVAS.COLOR(canvas, "cyan")
CANVAS.RECT(canvas, cyanRect.x, cyanRect.y, cyanRect.width, cyanRect.height)

REM Draw lines using points
LET lineStart1 = Point { x: 200, y: 180 }
LET lineEnd1 = Point { x: 300, y: 240 }
LET lineStart2 = Point { x: 300, y: 180 }
LET lineEnd2 = Point { x: 200, y: 240 }

CANVAS.COLOR(canvas, "magenta")
CANVAS.LINEWIDTH(canvas, 3)
CANVAS.LINE(canvas, lineStart1.x, lineStart1.y, lineEnd1.x, lineEnd1.y)
CANVAS.LINE(canvas, lineStart2.x, lineStart2.y, lineEnd2.x, lineEnd2.y)

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

REM Draw a path (triangle) using points
LET triPoint1 = Point { x: 250, y: 330 }
LET triPoint2 = Point { x: 300, y: 370 }
LET triPoint3 = Point { x: 200, y: 370 }

CANVAS.BEGINPATH(canvas)
CANVAS.MOVETO(canvas, triPoint1.x, triPoint1.y)
CANVAS.LINETO(canvas, triPoint2.x, triPoint2.y)
CANVAS.LINETO(canvas, triPoint3.x, triPoint3.y)
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