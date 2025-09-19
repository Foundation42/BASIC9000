REM ============================================
REM Canvas Paint Demo for BASIC9000
REM Interactive drawing with mouse
REM ============================================

PRINT "=== BASIC9000 Paint Program ==="
PRINT "Click and drag to draw!"
PRINT

REM Create drawing canvas
LET paint_canvas = CANVAS.CREATE(800, 600)
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

REM Drawing variables
LET drawing_color$ = "black"
LET last_x = -1
LET last_y = -1

REM Main drawing loop
ROUTINE paint_loop
10  LET mx = CANVAS.MOUSEX(paint_canvas)
20  LET my = CANVAS.MOUSEY(paint_canvas)
30  LET clicked = CANVAS.CLICKED(paint_canvas)
40
50  REM Check color selection
60  IF clicked AND my >= 50 AND my <= 80 THEN
70    IF mx >= 10 AND mx <= 40 THEN LET drawing_color$ = "red"
80    IF mx >= 50 AND mx <= 80 THEN LET drawing_color$ = "green"
90    IF mx >= 90 AND mx <= 120 THEN LET drawing_color$ = "blue"
100   IF mx >= 130 AND mx <= 160 THEN LET drawing_color$ = "yellow"
110   IF mx >= 170 AND mx <= 200 THEN LET drawing_color$ = "black"
120 END IF
130
140 REM Draw if clicking below palette area
150 IF clicked AND my > 90 THEN
160   CANVAS.COLOR(paint_canvas, drawing_color$)
170   IF last_x >= 0 AND last_y >= 0 THEN
180     CANVAS.LINEWIDTH(paint_canvas, 3)
190     CANVAS.LINE(paint_canvas, last_x, last_y, mx, my)
200   END IF
210   CANVAS.FILLCIRCLE(paint_canvas, mx, my, 2)
220   LET last_x = mx
230   LET last_y = my
240 ELSE
250   LET last_x = -1
260   LET last_y = -1
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