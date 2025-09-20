REM ========================================
REM BASIC9000 Modern Type System Demo
REM Showcases all new language features
REM ========================================

PRINT "╔══════════════════════════════════════╗"
PRINT "║  BASIC9000 Type System Demonstration ║"
PRINT "╚══════════════════════════════════════╝"
PRINT

REM ========================================
REM 1. TYPE Definitions & Record Literals
REM ========================================

PRINT "1. STRUCTURED TYPES"
PRINT "-------------------"

TYPE Vector2D
  x AS NUMBER
  y AS NUMBER
END TYPE

TYPE Player
  name AS STRING
  position AS Vector2D
  health AS NUMBER
  score AS NUMBER
END TYPE

' Create player with nested types
LET player1 = Player {
  name: "Hero",
  position: Vector2D { x: 10, y: 20 },
  health: 100,
  score: 0
}

PRINT "Created player: " + player1.name
PRINT "Position: (" + STR$(player1.position.x) + ", " + STR$(player1.position.y) + ")"
PRINT

REM ========================================
REM 2. Field Modification
REM ========================================

PRINT "2. FIELD MODIFICATION"
PRINT "---------------------"

' Direct field updates
player1.score = 500
player1.position.x = 15
player1.health = player1.health - 10

PRINT "After battle:"
PRINT "  Score: " + STR$(player1.score)
PRINT "  Health: " + STR$(player1.health)
PRINT "  New X: " + STR$(player1.position.x)
PRINT

REM ========================================
REM 3. PROPERTY Definitions
REM ========================================

PRINT "3. COMPUTED PROPERTIES"
PRINT "----------------------"

PROPERTY Player.IsAlive(self AS Player) AS BOOL GET
  RETURN self.health > 0
END PROPERTY

PROPERTY Vector2D.Magnitude(self AS Vector2D) AS NUMBER GET
  RETURN SQR(self.x * self.x + self.y * self.y)
END PROPERTY

PROPERTY Player.Status(self AS Player) AS STRING GET
  IF self.health > 75 THEN
    RETURN "Healthy"
  ELSE
    IF self.health > 25 THEN
      RETURN "Wounded"
    ELSE
      IF self.health > 0 THEN
        RETURN "Critical"
      ELSE
        RETURN "Dead"
      END IF
    END IF
  END IF
END PROPERTY

PRINT "Player alive? " + STR$(player1.IsAlive)
PRINT "Player status: " + player1.Status
PRINT "Position magnitude: " + STR$(player1.position.Magnitude)
PRINT

REM ========================================
REM 4. FUNCTIONS with Default Parameters
REM ========================================

PRINT "4. DEFAULT PARAMETERS"
PRINT "---------------------"

FUNCTION CreatePlayer(name AS STRING = "Anonymous", startHealth AS NUMBER = 100) AS Player
  RETURN Player {
    name: name,
    position: Vector2D { x: 0, y: 0 },
    health: startHealth,
    score: 0
  }
END FUNCTION

LET defaultPlayer = CreatePlayer()
LET customPlayer = CreatePlayer("Warrior", 150)

PRINT "Default player: " + defaultPlayer.name + " (HP: " + STR$(defaultPlayer.health) + ")"
PRINT "Custom player: " + customPlayer.name + " (HP: " + STR$(customPlayer.health) + ")"
PRINT

REM ========================================
REM 5. REF Parameters
REM ========================================

PRINT "5. PASS BY REFERENCE"
PRINT "--------------------"

SUB HealPlayer(REF p AS Player, amount AS NUMBER = 20)
  p.health = p.health + amount
  IF p.health > 100 THEN
    p.health = 100
  END IF
  PRINT "Healed " + p.name + " for " + STR$(amount) + " HP"
END SUB

SUB MovePlayer(REF pos AS Vector2D, dx AS NUMBER, dy AS NUMBER)
  pos.x = pos.x + dx
  pos.y = pos.y + dy
END SUB

PRINT "Before healing: " + STR$(player1.health) + " HP"
CALL HealPlayer(player1, 25)
PRINT "After healing: " + STR$(player1.health) + " HP"

PRINT "Before move: (" + STR$(player1.position.x) + ", " + STR$(player1.position.y) + ")"
CALL MovePlayer(player1.position, 5, -3)
PRINT "After move: (" + STR$(player1.position.x) + ", " + STR$(player1.position.y) + ")"
PRINT

REM ========================================
REM 6. UFCS - Method-like Syntax
REM ========================================

PRINT "6. UNIFORM FUNCTION CALL SYNTAX"
PRINT "--------------------------------"

FUNCTION Distance(p1 AS Player, p2 AS Player) AS NUMBER
  LET dx = p1.position.x - p2.position.x
  LET dy = p1.position.y - p2.position.y
  RETURN SQR(dx * dx + dy * dy)
END FUNCTION

FUNCTION Attack(attacker AS Player, target AS Player, damage AS NUMBER) AS BOOL
  IF attacker.IsAlive AND target.IsAlive THEN
    target.health = target.health - damage
    PRINT attacker.name + " attacks " + target.name + " for " + STR$(damage) + " damage!"
    RETURN TRUE
  END IF
  RETURN FALSE
END FUNCTION

LET player2 = CreatePlayer("Enemy", 50)
player2.position.x = 25
player2.position.y = 17

' UFCS allows method-like calls
LET dist = player1.Distance(player2)
PRINT "Distance between players: " + STR$(dist)

IF player1.Attack(player2, 30) THEN
  PRINT "Attack successful! Enemy health: " + STR$(player2.health)
END IF
PRINT

REM ========================================
REM 7. WITH Statement
REM ========================================

PRINT "7. WITH STATEMENT"
PRINT "-----------------"

WITH player1
  PRINT "Player Summary:"
  PRINT "  Name: " + .name
  PRINT "  Health: " + STR$(.health) + " (" + .Status + ")"
  PRINT "  Score: " + STR$(.score)
  WITH .position
    PRINT "  Location: (" + STR$(.x) + ", " + STR$(.y) + ")"
    PRINT "  Distance from origin: " + STR$(.Magnitude)
  END WITH
END WITH
PRINT

REM ========================================
REM 8. SELECT CASE
REM ========================================

PRINT "8. SELECT CASE"
PRINT "--------------"

FUNCTION GetRank(score AS NUMBER) AS STRING
  SELECT CASE score
    CASE 0
      RETURN "Novice"
    CASE 1, 2, 3, 4, 5
      RETURN "Beginner"
    CASE 6, 7, 8, 9, 10
      RETURN "Intermediate"
    CASE ELSE
      RETURN "Expert"
  END SELECT
END FUNCTION

FOR testScore = 0 TO 12 STEP 4
  PRINT "Score " + STR$(testScore) + " = " + GetRank(testScore)
NEXT testScore
PRINT

REM ========================================
REM 9. TRY/CATCH Error Handling
REM ========================================

PRINT "9. ERROR HANDLING"
PRINT "-----------------"

FUNCTION SafeDivide(a AS NUMBER, b AS NUMBER) AS NUMBER
  TRY
    IF b = 0 THEN
      ERROR "Cannot divide by zero!"
    END IF
    RETURN a / b
  CATCH e
    PRINT "Caught error: " + e.message
    RETURN 0
  FINALLY
    PRINT "Division operation complete"
  END TRY
END FUNCTION

PRINT "10 / 2 = " + STR$(SafeDivide(10, 2))
PRINT "10 / 0 = " + STR$(SafeDivide(10, 0))
PRINT

REM ========================================
REM 10. Type Annotations
REM ========================================

PRINT "10. TYPE ANNOTATIONS"
PRINT "--------------------"

' Variables can have explicit types
LET velocity AS Vector2D = Vector2D { x: 5, y: -3 }
LET playerName AS STRING = "Guardian"
LET hitPoints AS NUMBER = 75

PRINT "Velocity: (" + STR$(velocity.x) + ", " + STR$(velocity.y) + ")"
PRINT "Player: " + playerName + " with " + STR$(hitPoints) + " HP"
PRINT

PRINT "═══════════════════════════════════════"
PRINT "Type System Demo Complete!"
PRINT "BASIC9000 - Modern power, classic simplicity"
PRINT "═══════════════════════════════════════"

END