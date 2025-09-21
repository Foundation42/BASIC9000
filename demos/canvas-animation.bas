REM ============================================
REM Canvas Animation Demo for BASIC9000
REM Shows animated graphics capabilities
REM Now with TYPE definitions for physics simulation
REM ============================================

' Define types for animation and physics
TYPE Ball
  x AS NUMBER
  y AS NUMBER
  radius AS NUMBER
END TYPE

TYPE Velocity
  x AS NUMBER
  y AS NUMBER
END TYPE

TYPE Physics
  gravity AS NUMBER
  bounce AS NUMBER
  friction AS NUMBER
END TYPE

TYPE AnimationState
  ball AS Ball
  velocity AS Velocity
  physics AS Physics
  frameCount AS NUMBER
END TYPE

PRINT "=== BASIC9000 Canvas Animation Demo ==="
PRINT "Creating animated bouncing ball..."
PRINT "Press Ctrl+C to stop"
PRINT

REM Create animation canvas
LET anim_canvas = NEW CANVAS(600, 400)
CANVAS.POSITION(anim_canvas, 100, 100)
CANVAS.SHOW(anim_canvas)

REM Initialize animation state
LET animState = AnimationState { ball: Ball { x: 300, y: 50, radius: 20 }, velocity: Velocity { x: 5, y: 0 }, physics: Physics { gravity: 0.5, bounce: -0.8, friction: 0.9 }, frameCount: 0 }

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
110 animState.velocity.y = animState.velocity.y + animState.physics.gravity
120 animState.ball.x = animState.ball.x + animState.velocity.x
130 animState.ball.y = animState.ball.y + animState.velocity.y
140
150 REM Bounce off walls
160 IF animState.ball.x - animState.ball.radius < 0 THEN
170   animState.ball.x = animState.ball.radius
180   animState.velocity.x = -animState.velocity.x * animState.physics.friction
190 END IF
200 IF animState.ball.x + animState.ball.radius > 600 THEN
210   animState.ball.x = 600 - animState.ball.radius
220   animState.velocity.x = -animState.velocity.x * animState.physics.friction
230 END IF
240
250 REM Bounce off floor
260 IF animState.ball.y + animState.ball.radius > 380 THEN
270   animState.ball.y = 380 - animState.ball.radius
280   animState.velocity.y = animState.velocity.y * animState.physics.bounce
290 END IF
300
310 REM Draw the ball
320 CANVAS.COLOR(anim_canvas, "yellow")
330 CANVAS.FILLCIRCLE(anim_canvas, animState.ball.x, animState.ball.y, animState.ball.radius)
340
350 REM Draw ball outline
360 CANVAS.COLOR(anim_canvas, "orange")
370 CANVAS.LINEWIDTH(anim_canvas, 2)
380 CANVAS.CIRCLE(anim_canvas, animState.ball.x, animState.ball.y, animState.ball.radius)
390
400 REM Add trail effect (smaller circles)
410 CANVAS.COLOR(anim_canvas, "rgba(255, 255, 0, 0.3)")
420 CANVAS.FILLCIRCLE(anim_canvas, animState.ball.x - animState.velocity.x, animState.ball.y - animState.velocity.y, animState.ball.radius * 0.8)
430 CANVAS.FILLCIRCLE(anim_canvas, animState.ball.x - animState.velocity.x * 2, animState.ball.y - animState.velocity.y * 2, animState.ball.radius * 0.6)
440
450 REM Draw floor
460 CANVAS.COLOR(anim_canvas, "green")
470 CANVAS.LINEWIDTH(anim_canvas, 3)
480 CANVAS.LINE(anim_canvas, 0, 380, 600, 380)
490
500 REM Small delay for ~60 FPS
510 SYS.SLEEP(16)
515 animState.frameCount = animState.frameCount + 1
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
LET dummy$ AS STRING
INPUT "Press ENTER to stop the animation: ", dummy$

REM Note: In a real implementation, we'd need a way to stop spawned routines
PRINT "Animation stopped (in theory - SPAWN control not yet implemented)"

END