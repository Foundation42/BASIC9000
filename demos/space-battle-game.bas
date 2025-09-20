REM ========================================
REM SPACE BATTLE - Type System Demo Game
REM Showcases modern BASIC9000 features
REM ========================================

' Define game types
TYPE Vector2D
  x AS NUMBER
  y AS NUMBER
END TYPE

TYPE Ship
  name AS STRING
  position AS Vector2D
  health AS NUMBER
  shields AS NUMBER
  weaponPower AS NUMBER
  team AS STRING
END TYPE

TYPE Battle
  player AS Ship
  enemy AS Ship
  round AS NUMBER
  isActive AS BOOL
END TYPE

' Define ship properties
PROPERTY Ship.IsAlive(self AS Ship) AS BOOL GET
  RETURN self.health > 0
END PROPERTY

PROPERTY Ship.TotalDefense(self AS Ship) AS NUMBER GET
  RETURN self.health + self.shields
END PROPERTY

PROPERTY Ship.Status(self AS Ship) AS STRING GET
  LET healthPercent = self.health / 100
  RETURN healthPercent > 0.7 ? "Optimal" : healthPercent > 0.3 ? "Damaged" : "Critical"
END PROPERTY

' Combat functions with default parameters
FUNCTION CreateShip(name AS STRING, team AS STRING = "Federation", startHealth AS NUMBER = 100) AS Ship
  RETURN Ship {
    name: name,
    position: Vector2D { x: RND() * 100, y: RND() * 100 },
    health: startHealth,
    shields: 50,
    weaponPower: 20,
    team: team
  }
END FUNCTION

FUNCTION CalculateDamage(attacker AS Ship, defender AS Ship, criticalHit AS BOOL = FALSE) AS NUMBER
  LET baseDamage = attacker.weaponPower
  LET damage = criticalHit ? baseDamage * 2 : baseDamage

  ' Apply shields first
  LET shieldDamage = damage > defender.shields ? defender.shields : damage
  RETURN damage - shieldDamage * 0.5
END FUNCTION

SUB ApplyDamage(REF target AS Ship, damage AS NUMBER)
  IF target.shields > 0 THEN
    LET shieldAbsorb = damage > target.shields ? target.shields : damage
    target.shields = target.shields - shieldAbsorb
    damage = damage - shieldAbsorb
  END IF

  IF damage > 0 THEN
    target.health = target.health - damage
    IF target.health < 0 THEN
      target.health = 0
    END IF
  END IF
END SUB

FUNCTION Distance(ship1 AS Ship, ship2 AS Ship) AS NUMBER
  LET dx = ship1.position.x - ship2.position.x
  LET dy = ship1.position.y - ship2.position.y
  RETURN SQR(dx * dx + dy * dy)
END FUNCTION

' UFCS-style combat action
FUNCTION Attack(attacker AS Ship, REF defender AS Ship) AS STRING
  IF NOT attacker.IsAlive THEN
    RETURN attacker.name + " is destroyed and cannot attack!"
  END IF

  IF NOT defender.IsAlive THEN
    RETURN defender.name + " is already destroyed!"
  END IF

  ' Calculate if it's a critical hit
  LET critChance = RND()
  LET isCritical = critChance < 0.2

  LET damage = CalculateDamage(attacker, defender, isCritical)
  CALL ApplyDamage(defender, damage)

  LET hitType$ = isCritical ? "CRITICAL HIT! " : ""
  RETURN hitType$ + attacker.name + " fires on " + defender.name + " for " + STR$(INT(damage)) + " damage!"
END FUNCTION

' Main game
PRINT "╔════════════════════════════════════════╗"
PRINT "║         SPACE BATTLE SIMULATOR         ║"
PRINT "╚════════════════════════════════════════╝"
PRINT

' Set player name (would normally use INPUT but simplified for demo)
LET playerName$ = "USS Enterprise"
PRINT "Your ship: " + playerName$

' Create ships
LET player = CreateShip(playerName$, "Federation", 120)
LET enemy = CreateShip("Klingon Warbird", "Klingon", 100)

' Create battle
LET battle = Battle {
  player: player,
  enemy: enemy,
  round: 1,
  isActive: TRUE
}

PRINT
PRINT "Battle begins between " + battle.player.name + " and " + battle.enemy.name + "!"
PRINT "Distance: " + STR$(INT(Distance(battle.player, battle.enemy))) + " units"
PRINT

' Main battle loop
100 IF NOT battle.isActive THEN GOTO 900
  PRINT "=== Round " + STR$(battle.round) + " ==="
  PRINT

  ' Display status using WITH statement
  WITH battle.player
    PRINT .name + ":"
    PRINT "  Health: " + STR$(.health) + "/120 (" + .Status + ")"
    PRINT "  Shields: " + STR$(.shields) + "/50"
    PRINT "  Defense: " + STR$(.TotalDefense)
  END WITH
  PRINT

  WITH battle.enemy
    PRINT .name + ":"
    PRINT "  Health: " + STR$(.health) + "/100 (" + .Status + ")"
    PRINT "  Shields: " + STR$(.shields) + "/50"
  END WITH
  PRINT

  ' Player turn (simplified for demo - always attacks)
  IF battle.player.IsAlive THEN
    PRINT "Your action:"
    PRINT "1. Attack"
    PRINT "2. Boost Shields (+10)"
    PRINT "3. Overcharge Weapons (+5 damage)"
    PRINT "4. Retreat"

    ' Simulate player choice (alternates between attack and shield boost)
    LET choice = battle.round MOD 3 = 0 ? 2 : 1
    PRINT "Choice: " + STR$(choice)
    PRINT

    SELECT CASE choice
      CASE 1
        PRINT battle.player.Attack(battle.enemy)
      CASE 2
        battle.player.shields = battle.player.shields + 10
        PRINT "Shields boosted to " + STR$(battle.player.shields) + "!"
      CASE 3
        battle.player.weaponPower = battle.player.weaponPower + 5
        PRINT "Weapons overcharged! Power: " + STR$(battle.player.weaponPower)
      CASE 4
        PRINT "You retreat from battle!"
        battle.isActive = FALSE
      CASE ELSE
        PRINT "Invalid choice - skipping turn!"
    END SELECT
    PRINT
  END IF

  ' Enemy turn (AI)
  IF battle.enemy.IsAlive AND battle.isActive THEN
    LET aiDecision = battle.enemy.health < 30 ? 2 : 1

    SELECT CASE aiDecision
      CASE 1
        PRINT battle.enemy.Attack(battle.player)
      CASE 2
        battle.enemy.shields = battle.enemy.shields + 10
        PRINT battle.enemy.name + " boosts shields!"
    END SELECT
    PRINT
  END IF

  ' Check victory conditions
  IF NOT battle.player.IsAlive THEN
    PRINT "═══════════════════════════════════"
    PRINT "DEFEAT! Your ship has been destroyed!"
    PRINT "═══════════════════════════════════"
    battle.isActive = FALSE
  END IF

  IF NOT battle.enemy.IsAlive THEN
    PRINT "═══════════════════════════════════"
    PRINT "VICTORY! Enemy ship destroyed!"
    PRINT "Final Health: " + STR$(battle.player.health)
    PRINT "Rounds: " + STR$(battle.round)
    LET rating$ = battle.round < 5 ? "Elite Commander!" : battle.round < 10 ? "Skilled Captain" : "Survivor"
    PRINT "Rating: " + rating$
    PRINT "═══════════════════════════════════"
    battle.isActive = FALSE
  END IF

  battle.round = battle.round + 1

  ' Add space between rounds
  IF battle.isActive THEN
    PRINT "---"
    PRINT
  END IF

  ' Continue loop
  GOTO 100

900 REM End of battle loop

PRINT
PRINT "Thanks for playing SPACE BATTLE!"
PRINT "Showcasing BASIC9000's modern type system"
END