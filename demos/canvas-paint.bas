REM ============================================
REM Canvas Paint Demo for BASIC9000
REM Interactive drawing with mouse
REM Now with modern BASIC9000 structure and UFCS
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

TYPE PaintState
  brush AS Brush
  running AS BOOL
  needsRedraw AS BOOL
END TYPE

PRINT "=== BASIC9000 Paint Program ==="
PRINT "Click and drag to draw!"
PRINT "Type 'CLEAR' to clear canvas, 'QUIT' to exit"
PRINT

REM Create drawing canvas with UFCS method chaining
LET paint_canvas = NEW CANVAS(800, 600)
paint_canvas.POSITION(50, 50).SHOW().CLEAR("white")

REM Initialize paint state
LET paintState = PaintState {
  brush: Brush { color: "black", width: 3, lastX: -1, lastY: -1 },
  running: TRUE,
  needsRedraw: TRUE
}

REM Function to draw the UI
FUNCTION drawUI() AS NUMBER
  REM Draw title bar with UFCS chaining
  paint_canvas.COLOR("darkblue").FILLRECT(0, 0, 800, 40).COLOR("white").FONT("20px monospace").TEXTALIGN("center").TEXT("BASIC9000 Paint - Click and Drag to Draw", 400, 25)

  REM Color palette with UFCS chaining
  paint_canvas.COLOR("red").FILLRECT(10, 50, 30, 30)
  paint_canvas.COLOR("green").FILLRECT(50, 50, 30, 30)
  paint_canvas.COLOR("blue").FILLRECT(90, 50, 30, 30)
  paint_canvas.COLOR("yellow").FILLRECT(130, 50, 30, 30)
  paint_canvas.COLOR("black").FILLRECT(170, 50, 30, 30)

  RETURN 0
END FUNCTION

REM Function to handle mouse input
FUNCTION handleMouse() AS NUMBER
  LET mouse = MouseState { x: paint_canvas.MOUSEX(), y: paint_canvas.MOUSEY(), clicked: paint_canvas.CLICKED() }

  REM Check color selection
  IF mouse.clicked AND mouse.y >= 50 AND mouse.y <= 80 THEN
    IF mouse.x >= 10 AND mouse.x <= 40 THEN paintState.brush.color = "red"
    IF mouse.x >= 50 AND mouse.x <= 80 THEN paintState.brush.color = "green"
    IF mouse.x >= 90 AND mouse.x <= 120 THEN paintState.brush.color = "blue"
    IF mouse.x >= 130 AND mouse.x <= 160 THEN paintState.brush.color = "yellow"
    IF mouse.x >= 170 AND mouse.x <= 200 THEN paintState.brush.color = "black"
  END IF

  REM Draw if clicking below palette area
  IF mouse.clicked AND mouse.y > 90 THEN
    paint_canvas.COLOR(paintState.brush.color)
    IF paintState.brush.lastX >= 0 AND paintState.brush.lastY >= 0 THEN
      paint_canvas.LINEWIDTH(paintState.brush.width).LINE(paintState.brush.lastX, paintState.brush.lastY, mouse.x, mouse.y)
    END IF
    paint_canvas.FILLCIRCLE(mouse.x, mouse.y, 2)
    paintState.brush.lastX = mouse.x
    paintState.brush.lastY = mouse.y
  ELSE
    paintState.brush.lastX = -1
    paintState.brush.lastY = -1
  END IF

  RETURN 0
END FUNCTION

REM Function to simulate commands for demo
FUNCTION simulateCommand(cmd$ AS STRING) AS NUMBER
  PRINT "Simulating command: " + cmd$

  IF cmd$ = "CLEAR" THEN
    paint_canvas.CLEAR("white")
    drawUI()
    PRINT "Canvas cleared!"
  END IF

  IF cmd$ = "QUIT" THEN
    paintState.running = FALSE
  END IF

  RETURN 0
END FUNCTION

REM Main paint program
FUNCTION runPaintProgram() AS NUMBER
  REM Draw initial UI
  drawUI()

  PRINT "Paint program is running!"
  PRINT "Mouse: Click and drag to draw"
  PRINT "This is a demo version - simulating interactions"
  PRINT

  REM Simulate some paint interactions
  PRINT "Simulating paint interactions..."
  FOR demo = 1 TO 3
    handleMouse()
    SYS.SLEEP(10)
  NEXT demo

  REM Simulate some commands
  PRINT "Simulating commands..."
  simulateCommand("CLEAR")
  SYS.SLEEP(100)
  simulateCommand("QUIT")

  paint_canvas.DESTROY()
  PRINT "Demo completed!"
  RETURN 0
END FUNCTION

REM Start the paint program
runPaintProgram()

END