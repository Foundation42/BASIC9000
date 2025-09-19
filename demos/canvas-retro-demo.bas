REM ============================================
REM BASIC9000 Retro Graphics Demo
REM ============================================

PRINT "=== BASIC9000 Canvas Demo ==="
PRINT "Creating retro graphics..."
PRINT

REM Create main canvas
LET canvas = CANVAS.CREATE(800, 600)
CANVAS.POSITION(canvas, 50, 50)
CANVAS.SHOW(canvas)

REM Black background
CANVAS.CLEAR(canvas, "black")

REM Draw retro title
CANVAS.COLOR(canvas, "#00ff00")
CANVAS.FONT(canvas, "32px monospace")
CANVAS.TEXTALIGN(canvas, "center")
CANVAS.TEXT(canvas, "BASIC9000", 400, 50)

REM Draw subtitle
CANVAS.FONT(canvas, "16px monospace")
CANVAS.COLOR(canvas, "#00aa00")
CANVAS.TEXT(canvas, "Retro Computing with Modern Power", 400, 80)

REM Draw a retro computer monitor frame
CANVAS.COLOR(canvas, "#333333")
CANVAS.FILLRECT(canvas, 150, 120, 500, 350)
CANVAS.COLOR(canvas, "#000000")
CANVAS.FILLRECT(canvas, 170, 140, 460, 310)

REM Draw scan lines effect
CANVAS.COLOR(canvas, "rgba(0, 255, 0, 0.1)")
FOR y = 140 TO 450 STEP 3
  CANVAS.LINE(canvas, 170, y, 630, y)
NEXT y

REM Draw some "code" on the screen
CANVAS.COLOR(canvas, "#00ff00")
CANVAS.FONT(canvas, "14px monospace")
CANVAS.TEXTALIGN(canvas, "left")
CANVAS.TEXT(canvas, "10 PRINT " + CHR$(34) + "HELLO WORLD" + CHR$(34), 180, 160)
CANVAS.TEXT(canvas, "20 FOR I = 1 TO 10", 180, 180)
CANVAS.TEXT(canvas, "30   PRINT I * I", 180, 200)
CANVAS.TEXT(canvas, "40 NEXT I", 180, 220)
CANVAS.TEXT(canvas, "50 END", 180, 240)
CANVAS.TEXT(canvas, "RUN", 180, 260)
CANVAS.TEXT(canvas, "_", 210, 260)

REM Draw a blinking cursor effect
CANVAS.COLOR(canvas, "#00ff00")
CANVAS.FILLRECT(canvas, 210, 260, 10, 2)

REM Draw some retro UI elements
CANVAS.COLOR(canvas, "#00ff00")
CANVAS.LINEWIDTH(canvas, 2)

REM Draw power button
CANVAS.CIRCLE(canvas, 400, 500, 20)
CANVAS.COLOR(canvas, "#00aa00")
CANVAS.FILLCIRCLE(canvas, 400, 500, 15)
CANVAS.COLOR(canvas, "#00ff00")
CANVAS.FONT(canvas, "12px monospace")
CANVAS.TEXTALIGN(canvas, "center")
CANVAS.TEXT(canvas, "PWR", 400, 505)

REM Draw some status lights
CANVAS.COLOR(canvas, "red")
CANVAS.FILLCIRCLE(canvas, 300, 500, 8)
CANVAS.COLOR(canvas, "yellow")
CANVAS.FILLCIRCLE(canvas, 330, 500, 8)
CANVAS.COLOR(canvas, "#00ff00")
CANVAS.FILLCIRCLE(canvas, 360, 500, 8)

REM Draw decorative frame
CANVAS.COLOR(canvas, "#00ff00")
CANVAS.LINEWIDTH(canvas, 3)
CANVAS.RECT(canvas, 10, 10, 780, 580)

REM Corner decorations
CANVAS.LINEWIDTH(canvas, 2)
FOR i = 0 TO 20 STEP 5
  CANVAS.LINE(canvas, 10 + i, 10, 10, 10 + i)
  CANVAS.LINE(canvas, 790 - i, 10, 790, 10 + i)
  CANVAS.LINE(canvas, 10 + i, 590, 10, 590 - i)
  CANVAS.LINE(canvas, 790 - i, 590, 790, 590 - i)
NEXT i

REM Add timestamp
CANVAS.COLOR(canvas, "#00aa00")
CANVAS.FONT(canvas, "12px monospace")
CANVAS.TEXTALIGN(canvas, "right")
CANVAS.TEXT(canvas, TIME.NOW(), 780, 580)

PRINT "Demo complete!"
PRINT "Canvas ID: " + STR$(canvas)
PRINT
PRINT "Try these commands:"
PRINT "  CANVAS.CLEAR(canvas, " + CHR$(34) + "black" + CHR$(34) + ")"
PRINT "  CANVAS.COLOR(canvas, " + CHR$(34) + "green" + CHR$(34) + ")"
PRINT "  CANVAS.FILLCIRCLE(canvas, x, y, radius)"

END