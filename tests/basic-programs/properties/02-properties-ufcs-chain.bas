REM TEST: Properties with UFCS Chaining
REM EXPECT: Properties work correctly in UFCS chains

TYPE Vector
  x AS NUMBER
  y AS NUMBER
END TYPE

TYPE Rectangle
  topLeft AS Vector
  width AS NUMBER
  height AS NUMBER
END TYPE

REM Properties for Vector
PROPERTY Vector.Length(self AS Vector) AS NUMBER GET
  RETURN SQR(self.x * self.x + self.y * self.y)
END PROPERTY

PROPERTY Vector.Normalized(self AS Vector) AS Vector GET
  LET len = self.Length
  IF len = 0 THEN
    RETURN Vector { x: 0, y: 0 }
  ELSE
    RETURN Vector { x: self.x / len, y: self.y / len }
  END IF
END PROPERTY

REM Properties for Rectangle
PROPERTY Rectangle.Area(self AS Rectangle) AS NUMBER GET
  RETURN self.width * self.height
END PROPERTY

PROPERTY Rectangle.Center(self AS Rectangle) AS Vector GET
  RETURN Vector {
    x: self.topLeft.x + self.width / 2,
    y: self.topLeft.y + self.height / 2
  }
END PROPERTY

PROPERTY Rectangle.BottomRight(self AS Rectangle) AS Vector GET
  RETURN Vector {
    x: self.topLeft.x + self.width,
    y: self.topLeft.y + self.height
  }
END PROPERTY

REM UFCS functions for Vector
FUNCTION Scale(v AS Vector, factor AS NUMBER) AS Vector
  RETURN Vector { x: v.x * factor, y: v.y * factor }
END FUNCTION

FUNCTION Translate(v AS Vector, dx AS NUMBER, dy AS NUMBER) AS Vector
  RETURN Vector { x: v.x + dx, y: v.y + dy }
END FUNCTION

FUNCTION DistanceTo(v1 AS Vector, v2 AS Vector) AS NUMBER
  LET dx = v2.x - v1.x
  LET dy = v2.y - v1.y
  RETURN SQR(dx * dx + dy * dy)
END FUNCTION

REM UFCS functions for Rectangle
FUNCTION Move(rect AS Rectangle, newX AS NUMBER, newY AS NUMBER) AS Rectangle
  RETURN Rectangle {
    topLeft: Vector { x: newX, y: newY },
    width: rect.width,
    height: rect.height
  }
END FUNCTION

FUNCTION Resize(rect AS Rectangle, newWidth AS NUMBER, newHeight AS NUMBER) AS Rectangle
  RETURN Rectangle {
    topLeft: rect.topLeft,
    width: newWidth,
    height: newHeight
  }
END FUNCTION

REM Test 1: Properties in UFCS chains
LET vec = Vector { x: 3, y: 4 }

REM Chain: get property -> use in UFCS method -> get property
LET len = vec.Length
LET scaled = vec.Scale(2)
LET newLen = scaled.Length

PRINT "Original length: " + STR$(len)
PRINT "Scaled length: " + STR$(newLen)

IF len = 5 AND newLen = 10 THEN
  PRINT "PASS: Properties work in basic UFCS chain"
ELSE
  PRINT "FAIL: Expected len=5, newLen=10, got " + STR$(len) + ", " + STR$(newLen)
END IF

REM Test 2: Complex property + UFCS chain
LET rect = Rectangle {
  topLeft: Vector { x: 10, y: 20 },
  width: 30,
  height: 40
}

REM Get center property, then chain UFCS operations on it
LET centerMoved = rect.Center.Translate(5, 5).Scale(0.5)

PRINT "Rectangle center moved and scaled: (" + STR$(centerMoved.x) + ", " + STR$(centerMoved.y) + ")"

REM Original center should be (25, 40), moved to (30, 45), scaled to (15, 22.5)
IF centerMoved.x = 15 AND centerMoved.y = 22.5 THEN
  PRINT "PASS: Complex property + UFCS chain"
ELSE
  PRINT "FAIL: Expected (15, 22.5), got (" + STR$(centerMoved.x) + ", " + STR$(centerMoved.y) + ")"
END IF

REM Test 3: Chaining rectangle operations with property access
LET resized = rect.Move(0, 0).Resize(50, 60)
LET resizedArea = resized.Area
LET resizedCenter = resized.Center

PRINT "Resized area: " + STR$(resizedArea)
PRINT "Resized center: (" + STR$(resizedCenter.x) + ", " + STR$(resizedCenter.y) + ")"

IF resizedArea = 3000 AND resizedCenter.x = 25 AND resizedCenter.y = 30 THEN
  PRINT "PASS: Rectangle chain with property access"
ELSE
  PRINT "FAIL: Rectangle chain properties incorrect"
END IF

REM Test 4: Properties returning objects that can be chained
LET normalizedScaled = vec.Normalized.Scale(10)
LET finalLength = normalizedScaled.Length

PRINT "Normalized then scaled length: " + STR$(finalLength)

REM Should be close to 10 (normalized vector has length 1, scaled by 10)
IF ABS(finalLength - 10) < 0.001 THEN
  PRINT "PASS: Property returning object for further chaining"
ELSE
  PRINT "FAIL: Expected ~10, got " + STR$(finalLength)
END IF

REM Test 5: Distance calculation using properties and chains
LET corner1 = rect.Center
LET corner2 = rect.BottomRight
LET distance = corner1.DistanceTo(corner2)

PRINT "Distance from center to bottom-right: " + STR$(distance)

REM Center is (25, 40), bottom-right is (40, 60), distance should be sqrt(15^2 + 20^2) = 25
IF ABS(distance - 25) < 0.001 THEN
  PRINT "PASS: Distance calculation with properties"
ELSE
  PRINT "FAIL: Expected ~25, got " + STR$(distance)
END IF

REM Test 6: Nested property access with UFCS
TYPE Game
  player AS Rectangle
  enemy AS Rectangle
END TYPE

PROPERTY Game.PlayerCenter(self AS Game) AS Vector GET
  RETURN self.player.Center
END PROPERTY

PROPERTY Game.EnemyCenter(self AS Game) AS Vector GET
  RETURN self.enemy.Center
END PROPERTY

FUNCTION CreateGame() AS Game
  RETURN Game {
    player: Rectangle {
      topLeft: Vector { x: 0, y: 0 },
      width: 20,
      height: 20
    },
    enemy: Rectangle {
      topLeft: Vector { x: 100, y: 100 },
      width: 15,
      height: 15
    }
  }
END FUNCTION

LET game = CreateGame()
LET playerPos = game.PlayerCenter
LET enemyPos = game.EnemyCenter
LET combatDistance = playerPos.DistanceTo(enemyPos)

PRINT "Combat distance: " + STR$(combatDistance)

REM Player center (10, 10), enemy center (107.5, 107.5), distance = sqrt(97.5^2 + 97.5^2) ≈ 137.89
IF combatDistance > 137 AND combatDistance < 138 THEN
  PRINT "PASS: Nested property access with UFCS chain"
ELSE
  PRINT "FAIL: Expected ~137.89, got " + STR$(combatDistance)
END IF

PRINT "All property + UFCS chaining tests completed"
END