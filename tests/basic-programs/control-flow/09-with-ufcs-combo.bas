REM TEST: WITH Blocks Combined with UFCS
REM EXPECT: WITH and UFCS work together for complex object manipulation

TYPE GameEntity
  name AS STRING
  x AS NUMBER
  y AS NUMBER
  health AS NUMBER
  active AS BOOLEAN
END TYPE

TYPE GameRenderer
  canvas AS NUMBER
  color AS STRING
END TYPE

REM Functions that work with GameEntity
FUNCTION MoveTo(entity AS GameEntity, newX AS NUMBER, newY AS NUMBER) AS GameEntity
  RETURN GameEntity {
    name: entity.name,
    x: newX,
    y: newY,
    health: entity.health,
    active: entity.active
  }
END FUNCTION

FUNCTION TakeDamage(entity AS GameEntity, damage AS NUMBER) AS GameEntity
  LET newHealth = entity.health - damage
  RETURN GameEntity {
    name: entity.name,
    x: entity.x,
    y: entity.y,
    health: newHealth,
    active: newHealth > 0
  }
END FUNCTION

FUNCTION Heal(entity AS GameEntity, amount AS NUMBER) AS GameEntity
  LET newHealth = entity.health + amount
  RETURN GameEntity {
    name: entity.name,
    x: entity.x,
    y: entity.y,
    health: newHealth,
    active: TRUE
  }
END FUNCTION

REM Functions that work with GameRenderer
FUNCTION SetColor(renderer AS GameRenderer, newColor AS STRING) AS GameRenderer
  RETURN GameRenderer { canvas: renderer.canvas, color: newColor }
END FUNCTION

FUNCTION DrawEntity(renderer AS GameRenderer, entity AS GameEntity) AS GameRenderer
  PRINT "Drawing " + entity.name + " at (" + STR$(entity.x) + "," + STR$(entity.y) + ") in " + renderer.color
  RETURN renderer
END FUNCTION

REM Test 1: Basic WITH + UFCS combination
LET player = GameEntity { name: "Player", x: 10, y: 20, health: 100, active: TRUE }

WITH player
  PRINT "Initial state: " + .name + " at (" + STR$(.x) + "," + STR$(.y) + ") health=" + STR$(.health)

  REM Use UFCS within WITH block (should work on the WITH target)
  LET moved = .MoveTo(50, 60)

  IF moved.x = 50 AND moved.y = 60 THEN
    PRINT "PASS: UFCS works within WITH block"
  ELSE
    PRINT "FAIL: UFCS in WITH failed"
  END IF
END WITH

REM Test 2: Chaining operations within WITH
LET enemy = GameEntity { name: "Enemy", x: 100, y: 200, health: 50, active: TRUE }
LET renderer = GameRenderer { canvas: 1, color: "#ff0000" }

WITH enemy
  PRINT "Processing enemy: " + .name

  REM Chain multiple operations within WITH
  LET processed = .MoveTo(80, 180).TakeDamage(20).MoveTo(90, 190)

  IF processed.x = 90 AND processed.y = 190 AND processed.health = 30 THEN
    PRINT "PASS: UFCS chaining works within WITH"
  ELSE
    PRINT "FAIL: Expected x=90, y=190, health=30"
    PRINT "      Got x=" + STR$(processed.x) + ", y=" + STR$(processed.y) + ", health=" + STR$(processed.health)
  END IF

  REM Test field access within WITH after chaining
  .x = processed.x
  .y = processed.y
  .health = processed.health
  .active = processed.active
END WITH

REM Test 3: WITH on result of UFCS chain
LET healedPlayer = player.TakeDamage(30).Heal(20).MoveTo(0, 0)

WITH healedPlayer
  PRINT "Healed player status:"
  PRINT "  Position: (" + STR$(.x) + "," + STR$(.y) + ")"
  PRINT "  Health: " + STR$(.health)
  PRINT "  Active: " + STR$(.active)

  IF .x = 0 AND .y = 0 AND .health = 90 THEN
    PRINT "PASS: WITH works on UFCS chain result"
  ELSE
    PRINT "FAIL: Unexpected state after chain+WITH"
  END IF
END WITH

REM Test 4: Complex nested WITH and UFCS
WITH renderer
  PRINT "Setting up renderer with color: " + .color

  REM Chain operations on renderer within WITH
  LET redRenderer = .SetColor("#ff0000")
  LET blueRenderer = .SetColor("#0000ff")

  WITH redRenderer
    PRINT "Red renderer ready"
    LET drawn1 = .DrawEntity(player)

    WITH blueRenderer
      PRINT "Blue renderer ready"
      LET drawn2 = .DrawEntity(enemy)

      IF drawn2.color = "#0000ff" THEN
        PRINT "PASS: Nested WITH with UFCS works"
      ELSE
        PRINT "FAIL: Nested WITH failed"
      END IF
    END WITH
  END WITH
END WITH

REM Test 5: WITH and UFCS with property-like access pattern
TYPE Container
  items AS STRING
  count AS NUMBER
END TYPE

FUNCTION AddItem(container AS Container, item AS STRING) AS Container
  LET newItems$ = container.items + item + ";"
  LET newCount = container.count + 1
  RETURN Container { items: newItems$, count: newCount }
END FUNCTION

FUNCTION RemoveItem(container AS Container) AS Container
  LET newCount = container.count - 1
  RETURN Container { items: container.items, count: newCount }
END FUNCTION

LET inventory = Container { items: "", count: 0 }

WITH inventory
  PRINT "Initial inventory: " + STR$(.count) + " items"

  REM Use dot notation within WITH (should reference the WITH target)
  LET step1 = .AddItem("sword")
  LET step2 = step1.AddItem("shield")
  LET updated = step2.AddItem("potion")

  WITH updated
    PRINT "Updated inventory: " + STR$(.count) + " items"
    PRINT "Items: " + .items

    IF .count = 3 AND INSTR(.items, "sword") > 0 THEN
      PRINT "PASS: Complex WITH+UFCS inventory test"
    ELSE
      PRINT "FAIL: Inventory test failed"
    END IF
  END WITH
END WITH

PRINT "All WITH+UFCS combination tests completed"
END