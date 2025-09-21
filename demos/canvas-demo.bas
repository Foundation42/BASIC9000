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

REM Create main canvas with UFCS method chaining
LET canvas = NEW CANVAS(600, 400)
canvas.POSITION(100, 100).SHOW().CLEAR("black")

REM Draw a title with elegant chaining
canvas.COLOR("green").FONT("24px monospace").TEXT("BASIC9000 CANVAS", 200, 30)

REM Draw some shapes using typed structures and UFCS
LET redRect = Rectangle { x: 50, y: 80, width: 100, height: 60 }
canvas.COLOR("red").FILLRECT(redRect.x, redRect.y, redRect.width, redRect.height)

LET blueCircle = Circle { center: Point { x: 250, y: 110 }, radius: 40 }
canvas.COLOR("blue").CIRCLE(blueCircle.center.x, blueCircle.center.y, blueCircle.radius)

LET yellowCircle = Circle { center: Point { x: 400, y: 110 }, radius: 35 }
canvas.COLOR("yellow").FILLCIRCLE(yellowCircle.center.x, yellowCircle.center.y, yellowCircle.radius)

REM Draw a gradient rectangle with UFCS
LET cyanRect = Rectangle { x: 50, y: 180, width: 100, height: 60 }
canvas.COLOR("cyan").RECT(cyanRect.x, cyanRect.y, cyanRect.width, cyanRect.height)

REM Draw lines using points with beautiful chaining
LET lineStart1 = Point { x: 200, y: 180 }
LET lineEnd1 = Point { x: 300, y: 240 }
LET lineStart2 = Point { x: 300, y: 180 }
LET lineEnd2 = Point { x: 200, y: 240 }

canvas.COLOR("magenta").LINEWIDTH(3).LINE(lineStart1.x, lineStart1.y, lineEnd1.x, lineEnd1.y).LINE(lineStart2.x, lineStart2.y, lineEnd2.x, lineEnd2.y)

REM Draw an arc with UFCS
canvas.COLOR("orange").ARC(400, 210, 30, 0, 3.14159)

REM Draw text with different alignments
canvas.COLOR("white").FONT("16px monospace").TEXT("Left aligned", 50, 300)

canvas.TEXTALIGN("center").TEXT("Center aligned", 300, 300)

canvas.TEXTALIGN("right").TEXT("Right aligned", 550, 300)

REM Draw a path (triangle) using points
LET triPoint1 = Point { x: 250, y: 330 }
LET triPoint2 = Point { x: 300, y: 370 }
LET triPoint3 = Point { x: 200, y: 370 }

canvas.BEGINPATH().MOVETO(triPoint1.x, triPoint1.y).LINETO(triPoint2.x, triPoint2.y).LINETO(triPoint3.x, triPoint3.y).CLOSEPATH().COLOR("lime").FILL()

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