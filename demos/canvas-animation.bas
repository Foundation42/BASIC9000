REM ============================================
REM Canvas Animation Demo for BASIC9000
REM Shows animated graphics capabilities
REM ============================================

PRINT "=== BASIC9000 Canvas Animation Demo ==="
PRINT "Creating animated bouncing ball..."
PRINT "Press Ctrl+C to stop"
PRINT

REM Create animation canvas
LET anim_canvas = CANVAS.CREATE(600, 400)
CANVAS.POSITION(anim_canvas, 100, 100)
CANVAS.SHOW(anim_canvas)

REM Animation variables
LET ball_x = 300
LET ball_y = 50
LET velocity_x = 5
LET velocity_y = 0
LET gravity = 0.5
LET bounce = -0.8
LET radius = 20

REM Animation loop
ROUTINE animate_ball
10  REM Clear canvas with dark background
20  CANVAS.CLEAR(anim_canvas, "rgb(0, 10, 0)")
30
40  REM Draw title
50  CANVAS.COLOR(anim_canvas, "green")
60  CANVAS.FONT(anim_canvas, "20px monospace")
70  CANVAS.TEXTALIGN(anim_canvas, "center")
80  CANVAS.TEXT(anim_canvas, "Bouncing Ball Demo", 300, 30)
90
100 REM Update physics
110 LET velocity_y = velocity_y + gravity
120 LET ball_x = ball_x + velocity_x
130 LET ball_y = ball_y + velocity_y
140
150 REM Bounce off walls
160 IF ball_x - radius < 0 THEN
170   LET ball_x = radius
180   LET velocity_x = -velocity_x * 0.9
190 END IF
200 IF ball_x + radius > 600 THEN
210   LET ball_x = 600 - radius
220   LET velocity_x = -velocity_x * 0.9
230 END IF
240
250 REM Bounce off floor
260 IF ball_y + radius > 380 THEN
270   LET ball_y = 380 - radius
280   LET velocity_y = velocity_y * bounce
290 END IF
300
310 REM Draw the ball
320 CANVAS.COLOR(anim_canvas, "yellow")
330 CANVAS.FILLCIRCLE(anim_canvas, ball_x, ball_y, radius)
340
350 REM Draw ball outline
360 CANVAS.COLOR(anim_canvas, "orange")
370 CANVAS.LINEWIDTH(anim_canvas, 2)
380 CANVAS.CIRCLE(anim_canvas, ball_x, ball_y, radius)
390
400 REM Add trail effect (smaller circles)
410 CANVAS.COLOR(anim_canvas, "rgba(255, 255, 0, 0.3)")
420 CANVAS.FILLCIRCLE(anim_canvas, ball_x - velocity_x, ball_y - velocity_y, radius * 0.8)
430 CANVAS.FILLCIRCLE(anim_canvas, ball_x - velocity_x * 2, ball_y - velocity_y * 2, radius * 0.6)
440
450 REM Draw floor
460 CANVAS.COLOR(anim_canvas, "green")
470 CANVAS.LINEWIDTH(anim_canvas, 3)
480 CANVAS.LINE(anim_canvas, 0, 380, 600, 380)
490
500 REM Small delay for ~60 FPS
510 SYS.SLEEP(16)
520
530 GOTO 10
END ROUTINE

REM Start the animation
SPAWN animate_ball

REM Main program continues
PRINT
PRINT "Animation is running!"
PRINT "The ball has physics simulation with gravity and bounce"
PRINT
PRINT "You can continue using the terminal while the animation runs"
PRINT
INPUT "Press ENTER to stop the animation: ", dummy$

REM Note: In a real implementation, we'd need a way to stop spawned routines
PRINT "Animation stopped (in theory - SPAWN control not yet implemented)"

END