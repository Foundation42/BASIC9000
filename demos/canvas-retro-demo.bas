REM ============================================
REM BASIC9000 Retro Graphics Demo
REM Now with TYPE definitions for retro UI elements
REM ============================================

' Define types for retro UI components
TYPE Monitor
  x AS NUMBER
  y AS NUMBER
  width AS NUMBER
  height AS NUMBER
  bezelColor AS STRING
  screenColor AS STRING
END TYPE

TYPE StatusLight
  x AS NUMBER
  y AS NUMBER
  radius AS NUMBER
  color AS STRING
  active AS BOOL
END TYPE

TYPE Button
  x AS NUMBER
  y AS NUMBER
  radius AS NUMBER
  label AS STRING
  baseColor AS STRING
  textColor AS STRING
END TYPE

TYPE RetroTheme
  primaryColor AS STRING
  secondaryColor AS STRING
  backgroundColor AS STRING
END TYPE

PRINT "=== BASIC9000 Canvas Demo ==="
PRINT "Creating retro graphics..."
PRINT

REM Create main canvas
LET canvas = CANVAS.CREATE(800, 600)
CANVAS.POSITION(canvas, 50, 50)
CANVAS.SHOW(canvas)

REM Initialize theme
LET theme = RetroTheme { primaryColor: "#00ff00", secondaryColor: "#00aa00", backgroundColor: "black" }

REM Black background
CANVAS.CLEAR(canvas, theme.backgroundColor)

REM Draw retro title
CANVAS.COLOR(canvas, theme.primaryColor)
CANVAS.FONT(canvas, "32px monospace")
CANVAS.TEXTALIGN(canvas, "center")
CANVAS.TEXT(canvas, "BASIC9000", 400, 50)

REM Draw subtitle
CANVAS.FONT(canvas, "16px monospace")
CANVAS.COLOR(canvas, theme.secondaryColor)
CANVAS.TEXT(canvas, "Retro Computing with Modern Power", 400, 80)

REM Draw a retro computer monitor frame
LET monitor = Monitor { x: 150, y: 120, width: 500, height: 350, bezelColor: "#333333", screenColor: "#000000" }
CANVAS.COLOR(canvas, monitor.bezelColor)
CANVAS.FILLRECT(canvas, monitor.x, monitor.y, monitor.width, monitor.height)
CANVAS.COLOR(canvas, monitor.screenColor)
CANVAS.FILLRECT(canvas, monitor.x + 20, monitor.y + 20, monitor.width - 40, monitor.height - 40)

REM Draw scan lines effect
CANVAS.COLOR(canvas, "rgba(0, 255, 0, 0.1)")
FOR y AS NUMBER = monitor.y + 20 TO monitor.y + monitor.height - 20 STEP 3
  CANVAS.LINE(canvas, monitor.x + 20, y, monitor.x + monitor.width - 20, y)
NEXT y

REM Draw some "code" on the screen
LET codeX AS NUMBER = monitor.x + 30
LET codeY AS NUMBER = monitor.y + 40
CANVAS.COLOR(canvas, theme.primaryColor)
CANVAS.FONT(canvas, "14px monospace")
CANVAS.TEXTALIGN(canvas, "left")
CANVAS.TEXT(canvas, "10 PRINT " + CHR$(34) + "HELLO WORLD" + CHR$(34), codeX, codeY)
CANVAS.TEXT(canvas, "20 FOR I = 1 TO 10", codeX, codeY + 20)
CANVAS.TEXT(canvas, "30   PRINT I * I", codeX, codeY + 40)
CANVAS.TEXT(canvas, "40 NEXT I", codeX, codeY + 60)
CANVAS.TEXT(canvas, "50 END", codeX, codeY + 80)
CANVAS.TEXT(canvas, "RUN", codeX, codeY + 100)
CANVAS.TEXT(canvas, "_", codeX + 30, codeY + 100)

REM Draw a blinking cursor effect
CANVAS.COLOR(canvas, theme.primaryColor)
CANVAS.FILLRECT(canvas, codeX + 30, codeY + 100, 10, 2)

REM Draw some retro UI elements
CANVAS.COLOR(canvas, "#00ff00")
CANVAS.LINEWIDTH(canvas, 2)

REM Draw power button
LET powerBtn = Button { x: 400, y: 500, radius: 20, label: "PWR", baseColor: theme.secondaryColor, textColor: theme.primaryColor }
CANVAS.COLOR(canvas, theme.primaryColor)
CANVAS.CIRCLE(canvas, powerBtn.x, powerBtn.y, powerBtn.radius)
CANVAS.COLOR(canvas, powerBtn.baseColor)
CANVAS.FILLCIRCLE(canvas, powerBtn.x, powerBtn.y, powerBtn.radius - 5)
CANVAS.COLOR(canvas, powerBtn.textColor)
CANVAS.FONT(canvas, "12px monospace")
CANVAS.TEXTALIGN(canvas, "center")
CANVAS.TEXT(canvas, powerBtn.label, powerBtn.x, powerBtn.y + 5)

REM Draw some status lights
LET redLight = StatusLight { x: 300, y: 500, radius: 8, color: "red", active: TRUE }
LET yellowLight = StatusLight { x: 330, y: 500, radius: 8, color: "yellow", active: TRUE }
LET greenLight = StatusLight { x: 360, y: 500, radius: 8, color: theme.primaryColor, active: TRUE }

CANVAS.COLOR(canvas, redLight.color)
CANVAS.FILLCIRCLE(canvas, redLight.x, redLight.y, redLight.radius)
CANVAS.COLOR(canvas, yellowLight.color)
CANVAS.FILLCIRCLE(canvas, yellowLight.x, yellowLight.y, yellowLight.radius)
CANVAS.COLOR(canvas, greenLight.color)
CANVAS.FILLCIRCLE(canvas, greenLight.x, greenLight.y, greenLight.radius)

REM Draw decorative frame
CANVAS.COLOR(canvas, theme.primaryColor)
CANVAS.LINEWIDTH(canvas, 3)
CANVAS.RECT(canvas, 10, 10, 780, 580)

REM Corner decorations
CANVAS.LINEWIDTH(canvas, 2)
FOR i AS NUMBER = 0 TO 20 STEP 5
  CANVAS.LINE(canvas, 10 + i, 10, 10, 10 + i)
  CANVAS.LINE(canvas, 790 - i, 10, 790, 10 + i)
  CANVAS.LINE(canvas, 10 + i, 590, 10, 590 - i)
  CANVAS.LINE(canvas, 790 - i, 590, 790, 590 - i)
NEXT i

REM Add timestamp
CANVAS.COLOR(canvas, theme.secondaryColor)
CANVAS.FONT(canvas, "12px monospace")
CANVAS.TEXTALIGN(canvas, "right")
LET timestamp$ AS STRING = TIME.NOW()
CANVAS.TEXT(canvas, timestamp$, 780, 580)

PRINT "Demo complete!"
PRINT "Canvas ID: " + STR$(canvas)
PRINT
PRINT "Try these commands:"
PRINT "  CANVAS.CLEAR(canvas, " + CHR$(34) + "black" + CHR$(34) + ")"
PRINT "  CANVAS.COLOR(canvas, " + CHR$(34) + "green" + CHR$(34) + ")"
PRINT "  CANVAS.FILLCIRCLE(canvas, x, y, radius)"

END