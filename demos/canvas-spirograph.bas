REM ================================
REM       SPIROGRAPH DEMO
REM   Parametric curve drawing
REM   Now with TYPE definitions
REM ================================

' Define types for mathematical curves
TYPE SpirographParams
  R AS NUMBER  ' Outer circle radius
  r AS NUMBER  ' Inner circle radius
  d AS NUMBER  ' Pen distance from inner circle center
  rotations AS NUMBER
END TYPE

TYPE DrawingState
  centerX AS NUMBER
  centerY AS NUMBER
  currentColor AS STRING
  lineWidth AS NUMBER
END TYPE

TYPE Point2D
  x AS NUMBER
  y AS NUMBER
END TYPE

PRINT "=== SPIROGRAPH GENERATOR ==="
PRINT "Creating mathematical art..."
PRINT

REM Create canvas
LET width AS NUMBER = 800
LET height AS NUMBER = 600
LET canvas = NEW CANVAS(width, height)
CANVAS.POSITION(canvas, 100, 50)
CANVAS.SHOW(canvas)

REM Clear with dark background
CANVAS.COLOR(canvas, "#000000")
REM CANVAS.FILLRECT(canvas, 0, 0, width, height)

REM Initialize drawing state
LET drawState = DrawingState { centerX: width / 2, centerY: height / 2, currentColor: "#00ff00", lineWidth: 1 }

REM Initialize base spirograph parameters
LET baseParams = SpirographParams { R: 180, r: 70, d: 90, rotations: 10 }

REM Set line style
CANVAS.LINEWIDTH(canvas, drawState.lineWidth)

REM Function to draw one spirograph
REM Color cycle for rainbow effect
LET colors$ AS STRING = "#ff0000,#ff7700,#ffdd00,#00ff00,#0099ff,#6633ff"

FOR colorIndex AS NUMBER = 1 TO 6
  REM Parse color from list
  LET colorStart AS NUMBER = (colorIndex - 1) * 8 + 1
  drawState.currentColor = MID$(colors$, colorStart, 7)

  REM Set drawing color
  CANVAS.COLOR(canvas, drawState.currentColor)

  REM Create layer-specific parameters
  LET layerParams = SpirographParams { R: baseParams.R, r: 60 + colorIndex * 10, d: 70 + colorIndex * 5, rotations: baseParams.rotations }

  REM Begin path
  CANVAS.BEGINPATH(canvas)

  REM Draw spirograph
  LET firstPoint AS BOOL = TRUE
  FOR t AS NUMBER = 0 TO 360 * layerParams.rotations STEP 2
    LET angle AS NUMBER = t * 3.14159 / 180

    REM Spirograph equations - create point
    LET curvePoint = Point2D { x: (layerParams.R - layerParams.r) * COS(angle) + layerParams.d * COS((layerParams.R - layerParams.r) * angle / layerParams.r), y: (layerParams.R - layerParams.r) * SIN(angle) - layerParams.d * SIN((layerParams.R - layerParams.r) * angle / layerParams.r) }

    REM Translate to canvas center
    LET screenPoint = Point2D { x: drawState.centerX + curvePoint.x, y: drawState.centerY + curvePoint.y }

    REM Draw line
    IF firstPoint THEN
      CANVAS.MOVETO(canvas, screenPoint.x, screenPoint.y)
      firstPoint = FALSE
    ELSE
      CANVAS.LINETO(canvas, screenPoint.x, screenPoint.y)
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
FOR glow AS NUMBER = 1 TO 3
  CANVAS.TEXT(canvas, "SPIROGRAPH", drawState.centerX - 2 + glow, 50 + glow)
  CANVAS.TEXT(canvas, "SPIROGRAPH", drawState.centerX - 2 - glow, 50 - glow)
NEXT glow

REM Draw main text
CANVAS.GLOBALPHA(canvas, 1)
CANVAS.COLOR(canvas, "#7bff78")
CANVAS.TEXT(canvas, "SPIROGRAPH", drawState.centerX - 2, 50)

REM Add parameters info
CANVAS.FONT(canvas, "14px monospace")
CANVAS.COLOR(canvas, "#7bff78")
CANVAS.TEXT(canvas, "Mathematical Beauty in BASIC", drawState.centerX - 2, height - 40)
CANVAS.TEXT(canvas, "R=" + STR$(baseParams.R) + " r=variable d=variable", drawState.centerX - 2, height - 20)

REM Interactive message
PRINT
PRINT "Spirograph complete!"
PRINT "Try adjusting R, r, and d parameters for different patterns"
PRINT
PRINT "Mathematical formula:"
PRINT "x = (R-r)*cos(t) + d*cos((R-r)*t/r)"
PRINT "y = (R-r)*sin(t) - d*sin((R-r)*t/r)"