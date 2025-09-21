REM ============================================
REM Canvas Animation Demo for BASIC9000
REM Shows animated graphics with modern fibers
REM Uses TYPE definitions and structured programming
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
  running AS BOOL
END TYPE

PRINT "=== BASIC9000 Canvas Animation Demo ==="
PRINT "Creating animated bouncing ball with fibers..."
PRINT "Press Ctrl+C to stop"
PRINT

REM Create animation canvas with UFCS method chaining
LET anim_canvas = NEW CANVAS(600, 400)
anim_canvas.POSITION(100, 100).SHOW()

REM Initialize animation state
LET animState = AnimationState {
  ball: Ball { x: 300, y: 50, radius: 20 },
  velocity: Velocity { x: 5, y: 0 },
  physics: Physics { gravity: 0.5, bounce: -0.8, friction: 0.9 },
  frameCount: 0,
  running: TRUE
}

REM Animation update function
FUNCTION updatePhysics(state AS AnimationState) AS AnimationState
  REM Update velocity with gravity
  state.velocity.y = state.velocity.y + state.physics.gravity

  REM Update position
  state.ball.x = state.ball.x + state.velocity.x
  state.ball.y = state.ball.y + state.velocity.y

  REM Bounce off walls
  IF state.ball.x - state.ball.radius < 0 THEN
    state.ball.x = state.ball.radius
    state.velocity.x = -state.velocity.x * state.physics.friction
  END IF

  IF state.ball.x + state.ball.radius > 600 THEN
    state.ball.x = 600 - state.ball.radius
    state.velocity.x = -state.velocity.x * state.physics.friction
  END IF

  REM Bounce off floor
  IF state.ball.y + state.ball.radius > 380 THEN
    state.ball.y = 380 - state.ball.radius
    state.velocity.y = state.velocity.y * state.physics.bounce
  END IF

  state.frameCount = state.frameCount + 1
  RETURN state
END FUNCTION

REM Rendering function
FUNCTION renderFrame(canvas AS NUMBER, state AS AnimationState) AS NUMBER
  REM Clear canvas with dark background
  canvas.CLEAR("rgb(0, 10, 0)")

  REM Draw title with UFCS chaining
  canvas.COLOR("green").FONT("20px monospace").TEXTALIGN("center").TEXT("Bouncing Ball Demo", 300, 30)

  REM Draw the ball with UFCS chaining
  canvas.COLOR("yellow").FILLCIRCLE(state.ball.x, state.ball.y, state.ball.radius)

  REM Draw ball outline
  canvas.COLOR("orange").LINEWIDTH(2).CIRCLE(state.ball.x, state.ball.y, state.ball.radius)

  REM Add trail effect (smaller circles) with UFCS
  canvas.COLOR("rgba(255, 255, 0, 0.3)")
  canvas.FILLCIRCLE(state.ball.x - state.velocity.x, state.ball.y - state.velocity.y, state.ball.radius * 0.8)
  canvas.FILLCIRCLE(state.ball.x - state.velocity.x * 2, state.ball.y - state.velocity.y * 2, state.ball.radius * 0.6)

  REM Draw floor with UFCS chaining
  canvas.COLOR("green").LINEWIDTH(3).LINE(0, 380, 600, 380)

  REM Frame counter
  canvas.COLOR("lime").FONT("12px monospace").TEXTALIGN("left").TEXT("Frame: " + STR$(state.frameCount), 10, 20)

  RETURN 0
END FUNCTION

REM Animation runner function
FUNCTION runAnimation() AS NUMBER
  PRINT "Animation is running!"
  PRINT "The ball has physics simulation with gravity and bounce"
  PRINT "Frame rate: ~60 FPS"
  PRINT

  REM Main animation loop using modern WHILE statement
  WHILE animState.running
    REM Update physics
    animState = updatePhysics(animState)

    REM Render frame
    renderFrame(anim_canvas, animState)

    REM Target ~60 FPS (16ms = ~60 FPS)
    SYS.SLEEP(16)

    REM Check for user input to stop (simplified)
    IF animState.frameCount MOD 60 = 0 THEN
      REM Every 60 frames (~1 second), check if we should stop
      REM In a real implementation, this could check for key presses
      IF animState.frameCount > 600 THEN
        animState.running = FALSE
      END IF
    END IF
  WEND

  PRINT "Animation stopped!"
  PRINT "Total frames rendered: " + STR$(animState.frameCount)
  RETURN 0
END FUNCTION

REM Start the animation
runAnimation()

END