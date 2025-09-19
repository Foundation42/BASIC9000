REM ================================
REM       SPIROGRAPH DEMO
REM   Parametric curve drawing
REM ================================

PRINT "=== SPIROGRAPH GENERATOR ==="
PRINT "Creating mathematical art..."
PRINT

REM Create canvas
LET width = 800
LET height = 600
LET canvas = CANVAS.CREATE(width, height)
CANVAS.POSITION(canvas, 100, 50)
CANVAS.SHOW(canvas)

REM Clear with dark background
CANVAS.COLOR(canvas, "#000000")
REM CANVAS.FILLRECT(canvas, 0, 0, width, height)

REM Center point
LET centerX = width / 2
LET centerY = height / 2

REM Spirograph parameters
LET R = 180   ' Outer circle radius
LET r = 70    ' Inner circle radius
LET d = 90    ' Pen distance from inner circle center

REM Calculate drawing parameters
LET gcd = 1   ' Simplified GCD for this demo
LET numRotations = 10

REM Set line style
CANVAS.LINEWIDTH(canvas, 1)

REM Function to draw one spirograph
REM Color cycle for rainbow effect
LET colors$ = "#ff0000,#ff7700,#ffdd00,#00ff00,#0099ff,#6633ff"

FOR colorIndex = 1 TO 6
  REM Parse color from list
  LET colorStart = (colorIndex - 1) * 8 + 1
  LET color$ = MID$(colors$, colorStart, 7)

  REM Set drawing color
  CANVAS.COLOR(canvas, color$)

  REM Adjust parameters for each layer
  LET r = 60 + colorIndex * 10
  LET d = 70 + colorIndex * 5

  REM Begin path
  CANVAS.BEGINPATH(canvas)

  REM Draw spirograph
  LET firstPoint = 1
  FOR t = 0 TO 360 * numRotations STEP 2
    LET angle = t * 3.14159 / 180

    REM Spirograph equations
    LET x = (R - r) * COS(angle) + d * COS((R - r) * angle / r)
    LET y = (R - r) * SIN(angle) - d * SIN((R - r) * angle / r)

    REM Translate to canvas center
    LET px = centerX + x
    LET py = centerY + y

    REM Draw line
    IF firstPoint = 1 THEN
      CANVAS.MOVETO(canvas, px, py)
      LET firstPoint = 0
    ELSE
      CANVAS.LINETO(canvas, px, py)
    END IF
  NEXT t

  REM Stroke the path
  CANVAS.STROKE(canvas)

  PRINT "Layer " + STR$(colorIndex) + " complete..."
NEXT colorIndex

REM Add title with glow effect
CANVAS.FONT(canvas, "bold 36px monospace")

REM Draw glow
CANVAS.COLOR(canvas, "#00ff00")
CANVAS.GLOBALPHA(canvas, 0.5)
FOR glow = 1 TO 3
  CANVAS.TEXT(canvas, "SPIROGRAPH", centerX - 2 + glow, 50 + glow)
  CANVAS.TEXT(canvas, "SPIROGRAPH", centerX - 2 - glow, 50 - glow)
NEXT glow

REM Draw main text
CANVAS.GLOBALPHA(canvas, 1)
CANVAS.COLOR(canvas, "#7bff78")
CANVAS.TEXT(canvas, "SPIROGRAPH", centerX - 2, 50)

REM Add parameters info
CANVAS.FONT(canvas, "14px monospace")
CANVAS.COLOR(canvas, "#7bff78")
CANVAS.TEXT(canvas, "Mathematical Beauty in BASIC", centerX - 2, height - 40)
CANVAS.TEXT(canvas, "R=" + STR$(R) + " r=variable d=variable", centerX - 2, height - 20)

REM Interactive message
PRINT
PRINT "Spirograph complete!"
PRINT "Try adjusting R, r, and d parameters for different patterns"
PRINT
PRINT "Mathematical formula:"
PRINT "x = (R-r)*cos(t) + d*cos((R-r)*t/r)"
PRINT "y = (R-r)*sin(t) - d*sin((R-r)*t/r)"