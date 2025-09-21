REM ============================================
REM Canvas Paint Demo for BASIC9000
REM Interactive drawing with mouse
REM Now with TYPE definitions for paint state
REM ============================================

' Define types for paint program
TYPE ColorPalette
  x AS NUMBER
  y AS NUMBER
  width AS NUMBER
  height AS NUMBER
  color AS STRING
END TYPE

TYPE Brush
  color AS STRING
  width AS NUMBER
  lastX AS NUMBER
  lastY AS NUMBER
END TYPE

TYPE MouseState
  x AS NUMBER
  y AS NUMBER
  clicked AS BOOL
END TYPE

PRINT "=== BASIC9000 Paint Program ==="
PRINT "Click and drag to draw!"
PRINT

REM Create drawing canvas
LET paint_canvas = NEW CANVAS(800, 600)
CANVAS.POSITION(paint_canvas, 50, 50)
CANVAS.SHOW(paint_canvas)

REM Clear with white background
CANVAS.CLEAR(paint_canvas, "white")

REM Draw title bar
CANVAS.COLOR(paint_canvas, "darkblue")
CANVAS.FILLRECT(paint_canvas, 0, 0, 800, 40)
CANVAS.COLOR(paint_canvas, "white")
CANVAS.FONT(paint_canvas, "20px monospace")
CANVAS.TEXTALIGN(paint_canvas, "center")
CANVAS.TEXT(paint_canvas, "BASIC9000 Paint - Click and Drag to Draw", 400, 25)

REM Color palette
CANVAS.COLOR(paint_canvas, "red")
CANVAS.FILLRECT(paint_canvas, 10, 50, 30, 30)

CANVAS.COLOR(paint_canvas, "green")
CANVAS.FILLRECT(paint_canvas, 50, 50, 30, 30)

CANVAS.COLOR(paint_canvas, "blue")
CANVAS.FILLRECT(paint_canvas, 90, 50, 30, 30)

CANVAS.COLOR(paint_canvas, "yellow")
CANVAS.FILLRECT(paint_canvas, 130, 50, 30, 30)

CANVAS.COLOR(paint_canvas, "black")
CANVAS.FILLRECT(paint_canvas, 170, 50, 30, 30)

REM Initialize brush state
LET brush = Brush { color: "black", width: 3, lastX: -1, lastY: -1 }

REM Main drawing loop
ROUTINE paint_loop
10  LET mouse = MouseState { x: CANVAS.MOUSEX(paint_canvas), y: CANVAS.MOUSEY(paint_canvas), clicked: CANVAS.CLICKED(paint_canvas) }
40
50  REM Check color selection
60  IF mouse.clicked AND mouse.y >= 50 AND mouse.y <= 80 THEN
70    IF mouse.x >= 10 AND mouse.x <= 40 THEN brush.color = "red"
80    IF mouse.x >= 50 AND mouse.x <= 80 THEN brush.color = "green"
90    IF mouse.x >= 90 AND mouse.x <= 120 THEN brush.color = "blue"
100   IF mouse.x >= 130 AND mouse.x <= 160 THEN brush.color = "yellow"
110   IF mouse.x >= 170 AND mouse.x <= 200 THEN brush.color = "black"
120 END IF
130
140 REM Draw if clicking below palette area
150 IF mouse.clicked AND mouse.y > 90 THEN
160   CANVAS.COLOR(paint_canvas, brush.color)
170   IF brush.lastX >= 0 AND brush.lastY >= 0 THEN
180     CANVAS.LINEWIDTH(paint_canvas, brush.width)
190     CANVAS.LINE(paint_canvas, brush.lastX, brush.lastY, mouse.x, mouse.y)
200   END IF
210   CANVAS.FILLCIRCLE(paint_canvas, mouse.x, mouse.y, 2)
220   brush.lastX = mouse.x
230   brush.lastY = mouse.y
240 ELSE
250   brush.lastX = -1
260   brush.lastY = -1
270 END IF
280
290 SYS.SLEEP(10)
300 GOTO 10
END ROUTINE

REM Start paint loop
SPAWN paint_loop

PRINT "Paint program is running!"
PRINT
PRINT "Color Palette:"
PRINT "- Click on colored squares to change brush color"
PRINT "- Click and drag below to draw"
PRINT
PRINT "Commands:"
PRINT "  CLEAR - Clear the canvas"
PRINT "  QUIT - Exit the program"
PRINT

REM Command loop
LET cmd$ AS STRING
100 INPUT "> ", cmd$
110 IF cmd$ = "CLEAR" THEN
120   CANVAS.CLEAR(paint_canvas, "white")
130   REM Redraw UI
140   CANVAS.COLOR(paint_canvas, "darkblue")
150   CANVAS.FILLRECT(paint_canvas, 0, 0, 800, 40)
160   CANVAS.COLOR(paint_canvas, "white")
170   CANVAS.FONT(paint_canvas, "20px monospace")
180   CANVAS.TEXTALIGN(paint_canvas, "center")
190   CANVAS.TEXT(paint_canvas, "BASIC9000 Paint - Click and Drag to Draw", 400, 25)
200   REM Redraw palette
210   CANVAS.COLOR(paint_canvas, "red")
220   CANVAS.FILLRECT(paint_canvas, 10, 50, 30, 30)
230   CANVAS.COLOR(paint_canvas, "green")
240   CANVAS.FILLRECT(paint_canvas, 50, 50, 30, 30)
250   CANVAS.COLOR(paint_canvas, "blue")
260   CANVAS.FILLRECT(paint_canvas, 90, 50, 30, 30)
270   CANVAS.COLOR(paint_canvas, "yellow")
280   CANVAS.FILLRECT(paint_canvas, 130, 50, 30, 30)
290   CANVAS.COLOR(paint_canvas, "black")
300   CANVAS.FILLRECT(paint_canvas, 170, 50, 30, 30)
310   PRINT "Canvas cleared!"
320 END IF
330 IF cmd$ = "QUIT" THEN GOTO 500
340 GOTO 100

500 CANVAS.DESTROY(paint_canvas)
510 PRINT "Goodbye!"

END