# BASIC9000 Canvas API Specification

## Overview

The Canvas API provides 2D graphics capabilities for BASIC9000, allowing programs to draw graphics that overlay the terminal interface. Canvas objects are first-class variables that can be created, stored, passed to routines, and manipulated dynamically.

## Canvas Management

### Creating Canvases
```basic
LET canvas = CANVAS.CREATE(width, height)
LET overlay = CANVAS.CREATE(800, 600, "overlay")  ' Named canvas
LET buffer = CANVAS.CREATE(320, 240)              ' Off-screen buffer
```

### Canvas Properties
```basic
LET width = CANVAS.WIDTH(canvas)
LET height = CANVAS.HEIGHT(canvas)
LET visible = CANVAS.VISIBLE(canvas)
```

### Canvas Positioning & Visibility
```basic
CANVAS.POSITION canvas, x, y           ' Position on screen
CANVAS.SIZE canvas, width, height      ' Resize canvas
CANVAS.SHOW canvas                     ' Make visible
CANVAS.HIDE canvas                     ' Make invisible
CANVAS.LAYER canvas, z_index           ' Set stacking order (higher = front)
CANVAS.OPACITY canvas, 0.8             ' Set transparency (0.0-1.0)
```

### Canvas Lifecycle
```basic
CANVAS.CLEAR canvas                    ' Clear to transparent
CANVAS.CLEAR canvas, "black"           ' Clear to specific color
CANVAS.DESTROY canvas                  ' Remove from memory
```

## Drawing Context

### Current State
```basic
CANVAS.COLOR canvas, "red"             ' Set drawing color
CANVAS.COLOR canvas, RGB(255, 128, 0)  ' RGB color
CANVAS.COLOR canvas, RGBA(255, 0, 0, 128)  ' RGBA color
CANVAS.LINEWIDTH canvas, 3             ' Set line thickness
CANVAS.FONT canvas, "16px monospace"   ' Set text font
```

### Graphics State Stack
```basic
CANVAS.SAVE canvas                     ' Push current state
CANVAS.RESTORE canvas                  ' Pop previous state
```

## Basic Drawing Primitives

### Points and Lines
```basic
CANVAS.PIXEL canvas, x, y              ' Single pixel
CANVAS.PIXEL canvas, x, y, "blue"      ' Colored pixel

CANVAS.MOVETO canvas, x, y             ' Move drawing cursor
CANVAS.LINETO canvas, x, y             ' Draw line from cursor
CANVAS.LINE canvas, x1, y1, x2, y2     ' Direct line
```

### Shapes
```basic
CANVAS.RECT canvas, x, y, w, h         ' Rectangle outline
CANVAS.FILLRECT canvas, x, y, w, h     ' Filled rectangle
CANVAS.CIRCLE canvas, x, y, radius     ' Circle outline  
CANVAS.FILLCIRCLE canvas, x, y, radius ' Filled circle
CANVAS.ARC canvas, x, y, radius, start_angle, end_angle
```

### Complex Paths
```basic
CANVAS.BEGINPATH canvas                ' Start new path
CANVAS.MOVETO canvas, x, y             ' Move without drawing
CANVAS.LINETO canvas, x, y             ' Add line to path
CANVAS.CURVETO canvas, cp1x, cp1y, cp2x, cp2y, x, y  ' Bezier curve
CANVAS.CLOSEPATH canvas               ' Close current path
CANVAS.STROKE canvas                   ' Draw path outline
CANVAS.FILL canvas                     ' Fill path interior
```

## Transforms

### Translation and Rotation
```basic
CANVAS.TRANSLATE canvas, dx, dy        ' Move coordinate origin
CANVAS.ROTATE canvas, angle            ' Rotate (radians)
CANVAS.SCALE canvas, sx, sy            ' Scale coordinates
CANVAS.RESETMATRIX canvas              ' Reset to identity
```

### Matrix Operations
```basic
CANVAS.TRANSFORM canvas, a, b, c, d, e, f  ' Apply transformation matrix
CANVAS.SETMATRIX canvas, a, b, c, d, e, f  ' Set transformation matrix
```

## Text Rendering

### Text Drawing
```basic
CANVAS.TEXT canvas, "Hello", x, y      ' Draw text
CANVAS.FILLTEXT canvas, "World", x, y  ' Filled text
CANVAS.STROKETEXT canvas, "Outline", x, y  ' Outlined text
```

### Text Measurement
```basic
LET width = CANVAS.TEXTWIDTH(canvas, "Hello World")
LET metrics = CANVAS.TEXTMETRICS(canvas, "Text")
LET height = CANVAS.TEXTHEIGHT(canvas)
```

### Text Alignment
```basic
CANVAS.TEXTALIGN canvas, "left"        ' left, center, right
CANVAS.TEXTBASELINE canvas, "top"      ' top, middle, bottom, alphabetic
```

## Image Operations

### Loading and Drawing Images
```basic
LET sprite = CANVAS.LOADIMAGE("sprite.png")  ' Load image file
CANVAS.DRAWIMAGE canvas, sprite, x, y        ' Draw at position
CANVAS.DRAWIMAGE canvas, sprite, x, y, w, h  ' Draw scaled
CANVAS.DRAWIMAGE canvas, sprite, sx, sy, sw, sh, dx, dy, dw, dh  ' Clip and scale
```

### Canvas-to-Canvas Operations
```basic
CANVAS.COPY source_canvas, dest_canvas, x, y  ' Copy entire canvas
CANVAS.COPY source_canvas, dest_canvas, sx, sy, sw, sh, dx, dy, dw, dh  ' Partial copy
```

### Pixel Manipulation
```basic
LET imagedata = CANVAS.GETPIXELS(canvas, x, y, w, h)  ' Get pixel array
CANVAS.PUTPIXELS canvas, imagedata, x, y              ' Set pixel array
```

## Gradients and Patterns

### Linear Gradients
```basic
LET gradient = CANVAS.LINEARGRADIENT(x1, y1, x2, y2)
CANVAS.ADDCOLORSTOP gradient, 0.0, "red"
CANVAS.ADDCOLORSTOP gradient, 1.0, "blue"
CANVAS.FILLSTYLE canvas, gradient
```

### Radial Gradients
```basic
LET gradient = CANVAS.RADIALGRADIENT(x1, y1, r1, x2, y2, r2)
CANVAS.ADDCOLORSTOP gradient, 0.0, "yellow"
CANVAS.ADDCOLORSTOP gradient, 1.0, "orange"
```

### Patterns
```basic
LET pattern = CANVAS.PATTERN(image, "repeat")  ' repeat, repeat-x, repeat-y, no-repeat
CANVAS.FILLSTYLE canvas, pattern
```

## Animation and Effects

### Frame-based Animation
```basic
ROUTINE animate_sprite
10  CANVAS.CLEAR game_canvas
20  LET frame = (SYS.TICKS() / 100) MOD 4
30  CANVAS.DRAWIMAGE game_canvas, sprite_frames[frame], player_x, player_y
40  SYS.SLEEP(16)  ' ~60 FPS
50  GOTO 10
END ROUTINE
```

### Double Buffering
```basic
LET front_buffer = CANVAS.CREATE(800, 600)
LET back_buffer = CANVAS.CREATE(800, 600)

ROUTINE render_loop
10  CANVAS.CLEAR back_buffer
20  ' Draw to back_buffer...
30  CANVAS.COPY back_buffer, front_buffer, 0, 0
40  SYS.SLEEP(16)
50  GOTO 10
END ROUTINE
```

## Event Handling

### Mouse Events
```basic
LET mouse_x = CANVAS.MOUSEX(canvas)
LET mouse_y = CANVAS.MOUSEY(canvas)
LET clicked = CANVAS.CLICKED(canvas)      ' Boolean
LET button = CANVAS.MOUSEBUTTON(canvas)   ' 1=left, 2=middle, 3=right
```

### Canvas Hit Testing
```basic
LET hit = CANVAS.POINTINPATH(canvas, x, y)  ' Test if point is in current path
LET pixel_color = CANVAS.GETPIXEL(canvas, x, y)  ' Get color at pixel
```

## Utility Functions

### Color Utilities
```basic
LET color = RGB(255, 128, 0)              ' Create RGB color
LET color = RGBA(255, 0, 0, 128)          ' Create RGBA color
LET color = HSL(120, 50, 75)              ' Create HSL color
LET hex = COLOR.TOHEX(color)              ' Convert to hex string
LET components = COLOR.TORGB(color)       ' Get [r, g, b] array
```

### Mathematical Helpers
```basic
LET radians = MATH.TORADIANS(degrees)
LET degrees = MATH.TODEGREES(radians)
LET distance = MATH.DISTANCE(x1, y1, x2, y2)
LET angle = MATH.ANGLE(x1, y1, x2, y2)
```

## Complete Examples

### Simple Drawing
```basic
LET canvas = CANVAS.CREATE(400, 300)
CANVAS.POSITION canvas, 100, 100
CANVAS.SHOW canvas

CANVAS.COLOR canvas, "blue"
CANVAS.FILLRECT canvas, 50, 50, 100, 75
CANVAS.COLOR canvas, "red"
CANVAS.CIRCLE canvas, 200, 150, 40
CANVAS.COLOR canvas, "white"
CANVAS.TEXT canvas, "Hello Canvas!", 150, 200
```

### Animated Graphics
```basic
LET animation_canvas = CANVAS.CREATE(600, 400)
CANVAS.POSITION animation_canvas, 0, 0
CANVAS.SHOW animation_canvas

ROUTINE bouncing_ball
10  LET t = SYS.TICKS() / 1000
20  LET x = 300 + 200 * MATH.SIN(t)
30  LET y = 200 + 100 * MATH.COS(t * 2)
40  
50  CANVAS.CLEAR animation_canvas
60  CANVAS.COLOR animation_canvas, "red"
70  CANVAS.FILLCIRCLE animation_canvas, x, y, 20
80  
90  SYS.SLEEP(16)
100 GOTO 10
END ROUTINE

SPAWN bouncing_ball
```

### Interactive Drawing
```basic
LET drawing_canvas = CANVAS.CREATE(800, 600)
CANVAS.POSITION drawing_canvas, 0, 0
CANVAS.SHOW drawing_canvas

ROUTINE paint_program
10  LET mx = CANVAS.MOUSEX(drawing_canvas)
20  LET my = CANVAS.MOUSEY(drawing_canvas)
30  LET clicked = CANVAS.CLICKED(drawing_canvas)
40  
50  IF clicked THEN CANVAS.FILLCIRCLE drawing_canvas, mx, my, 5
60  
70  SYS.SLEEP(10)
80  GOTO 10
END ROUTINE

SPAWN paint_program
```

### Multi-Layer Interface
```basic
LET background = CANVAS.CREATE(800, 600)
LET game_layer = CANVAS.CREATE(800, 600)
LET ui_layer = CANVAS.CREATE(800, 600)

CANVAS.POSITION background, 0, 0
CANVAS.POSITION game_layer, 0, 0  
CANVAS.POSITION ui_layer, 0, 0

CANVAS.LAYER background, 1
CANVAS.LAYER game_layer, 2
CANVAS.LAYER ui_layer, 3

CANVAS.SHOW background
CANVAS.SHOW game_layer
CANVAS.SHOW ui_layer

' Background stars
CANVAS.COLOR background, "black"
CANVAS.FILLRECT background, 0, 0, 800, 600
FOR i = 1 TO 100
  LET x = RANDOM.INT(0, 800)
  LET y = RANDOM.INT(0, 600)
  CANVAS.PIXEL background, x, y, "white"
NEXT i

' Game objects on game_layer
' UI elements on ui_layer
```

## Implementation Notes

### Performance Considerations
- Use off-screen canvases for complex drawings that don't change frequently
- Minimize CANVAS.CLEAR operations - only clear what needs updating
- Batch drawing operations when possible
- Use appropriate canvas sizes - larger canvases consume more memory

### Memory Management
- CANVAS.DESTROY should be called when canvases are no longer needed
- Canvas objects should participate in BASIC9000's garbage collection
- Large image operations may require memory management consideration

### Browser Integration
- Canvas objects map to HTML5 Canvas elements
- Positioning coordinates are relative to the terminal container
- Canvas layering uses CSS z-index for stacking order
- Mouse coordinates are automatically translated to canvas space

### Thread Safety
- Canvas operations from concurrent routines should be serialized
- Consider using message passing to a dedicated graphics routine for complex animations
- Canvas state is isolated per canvas object

This specification provides a comprehensive 2D graphics system that maintains BASIC's simplicity while offering modern graphics capabilities. The canvas-as-variable approach enables powerful composition and reuse patterns while keeping the syntax approachable for both beginners and experienced programmers.