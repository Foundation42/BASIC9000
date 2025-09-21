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

REM Create main canvas with UFCS method chaining
LET canvas = NEW CANVAS(800, 600)
canvas.POSITION(50, 50).SHOW()

REM Initialize theme
LET theme = RetroTheme { primaryColor: "#00ff00", secondaryColor: "#00aa00", backgroundColor: "black" }

REM Black background
canvas.CLEAR(theme.backgroundColor)

REM Draw retro title with UFCS chaining
canvas.COLOR(theme.primaryColor).FONT("32px monospace").TEXTALIGN("center").TEXT("BASIC9000", 400, 50)

REM Draw subtitle with UFCS chaining
canvas.FONT("16px monospace").COLOR(theme.secondaryColor).TEXT("Retro Computing with Modern Power", 400, 80)

REM Draw a retro computer monitor frame with UFCS chaining
LET monitor = Monitor { x: 150, y: 120, width: 500, height: 350, bezelColor: "#333333", screenColor: "#000000" }
canvas.COLOR(monitor.bezelColor).FILLRECT(monitor.x, monitor.y, monitor.width, monitor.height).COLOR(monitor.screenColor).FILLRECT(monitor.x + 20, monitor.y + 20, monitor.width - 40, monitor.height - 40)

REM Draw scan lines effect with UFCS
canvas.COLOR("rgba(0, 255, 0, 0.1)")
FOR y AS NUMBER = monitor.y + 20 TO monitor.y + monitor.height - 20 STEP 3
  canvas.LINE(monitor.x + 20, y, monitor.x + monitor.width - 20, y)
NEXT y

REM Draw some "code" on the screen with UFCS chaining
LET codeX AS NUMBER = monitor.x + 30
LET codeY AS NUMBER = monitor.y + 40
canvas.COLOR(theme.primaryColor).FONT("14px monospace").TEXTALIGN("left")
canvas.TEXT("10 PRINT " + CHR$(34) + "HELLO WORLD" + CHR$(34), codeX, codeY)
canvas.TEXT("20 FOR I = 1 TO 10", codeX, codeY + 20)
canvas.TEXT("30   PRINT I * I", codeX, codeY + 40)
canvas.TEXT("40 NEXT I", codeX, codeY + 60)
canvas.TEXT("50 END", codeX, codeY + 80)
canvas.TEXT("RUN", codeX, codeY + 100)
canvas.TEXT("_", codeX + 30, codeY + 100)

REM Draw a blinking cursor effect with UFCS
canvas.COLOR(theme.primaryColor).FILLRECT(codeX + 30, codeY + 100, 10, 2)

REM Draw some retro UI elements with UFCS
canvas.COLOR("#00ff00").LINEWIDTH(2)

REM Draw power button with UFCS chaining
LET powerBtn = Button { x: 400, y: 500, radius: 20, label: "PWR", baseColor: theme.secondaryColor, textColor: theme.primaryColor }
canvas.COLOR(theme.primaryColor).CIRCLE(powerBtn.x, powerBtn.y, powerBtn.radius).COLOR(powerBtn.baseColor).FILLCIRCLE(powerBtn.x, powerBtn.y, powerBtn.radius - 5).COLOR(powerBtn.textColor).FONT("12px monospace").TEXTALIGN("center").TEXT(powerBtn.label, powerBtn.x, powerBtn.y + 5)

REM Draw some status lights with UFCS chaining
LET redLight = StatusLight { x: 300, y: 500, radius: 8, color: "red", active: TRUE }
LET yellowLight = StatusLight { x: 330, y: 500, radius: 8, color: "yellow", active: TRUE }
LET greenLight = StatusLight { x: 360, y: 500, radius: 8, color: theme.primaryColor, active: TRUE }

canvas.COLOR(redLight.color).FILLCIRCLE(redLight.x, redLight.y, redLight.radius)
canvas.COLOR(yellowLight.color).FILLCIRCLE(yellowLight.x, yellowLight.y, yellowLight.radius)
canvas.COLOR(greenLight.color).FILLCIRCLE(greenLight.x, greenLight.y, greenLight.radius)

REM Draw decorative frame with UFCS chaining
canvas.COLOR(theme.primaryColor).LINEWIDTH(3).RECT(10, 10, 780, 580)

REM Corner decorations with UFCS
canvas.LINEWIDTH(2)
FOR i AS NUMBER = 0 TO 20 STEP 5
  canvas.LINE(10 + i, 10, 10, 10 + i)
  canvas.LINE(790 - i, 10, 790, 10 + i)
  canvas.LINE(10 + i, 590, 10, 590 - i)
  canvas.LINE(790 - i, 590, 790, 590 - i)
NEXT i

REM Add timestamp with UFCS chaining
canvas.COLOR(theme.secondaryColor).FONT("12px monospace").TEXTALIGN("right")
LET timestamp$ AS STRING = TIME.NOW()
canvas.TEXT(timestamp$, 780, 580)

PRINT "Demo complete!"
PRINT "Canvas ID: " + STR$(canvas)
PRINT
PRINT "Try these commands:"
PRINT "  canvas.CLEAR(" + CHR$(34) + "black" + CHR$(34) + ")"
PRINT "  canvas.COLOR(" + CHR$(34) + "green" + CHR$(34) + ")"
PRINT "  canvas.FILLCIRCLE(x, y, radius)"

END