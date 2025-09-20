REM ========================================
REM TEXT ADVENTURE - Type System Demo
REM A simpler game showcasing types & ternary
REM ========================================

' Define game types
TYPE Room
  name AS STRING
  description AS STRING
  hasKey AS BOOL
  hasTreasure AS BOOL
  visited AS BOOL
END TYPE

TYPE Player
  name AS STRING
  currentRoom AS NUMBER
  hasKey AS BOOL
  score AS NUMBER
  moves AS NUMBER
END TYPE

' Create rooms
LET room1 = Room {
  name: "Entrance Hall",
  description: "A grand entrance with marble floors",
  hasKey: FALSE,
  hasTreasure: FALSE,
  visited: FALSE
}

LET room2 = Room {
  name: "Library",
  description: "Dusty books line the walls. Something glints on a shelf",
  hasKey: TRUE,
  hasTreasure: FALSE,
  visited: FALSE
}

LET room3 = Room {
  name: "Treasure Room",
  description: "A locked vault filled with gold!",
  hasKey: FALSE,
  hasTreasure: TRUE,
  visited: FALSE
}

' Create player
LET player = Player {
  name: "Adventurer",
  currentRoom: 1,
  hasKey: FALSE,
  score: 0,
  moves: 0
}

' Game title
PRINT "╔════════════════════════════════════════╗"
PRINT "║      TREASURE HUNT ADVENTURE           ║"
PRINT "║   A BASIC9000 Type System Demo         ║"
PRINT "╚════════════════════════════════════════╝"
PRINT
PRINT "You are " + player.name + ", seeking the legendary treasure!"
PRINT "Explore the rooms and find the key to unlock the treasure vault."
PRINT

' Main game loop
FOR turn = 1 TO 10
  PRINT "═════════════════════════════════════"
  PRINT "Turn " + STR$(turn) + " of 10"

  ' Get current room
  LET currentRoom = player.currentRoom = 1 ? room1 : player.currentRoom = 2 ? room2 : room3

  ' Update visited status
  IF player.currentRoom = 1 THEN
    room1.visited = TRUE
  END IF
  IF player.currentRoom = 2 THEN
    room2.visited = TRUE
  END IF
  IF player.currentRoom = 3 THEN
    room3.visited = TRUE
  END IF

  ' Display room info
  PRINT
  PRINT "Location: " + currentRoom.name
  PRINT currentRoom.description

  ' Check for key
  IF currentRoom.hasKey AND NOT player.hasKey THEN
    PRINT
    PRINT "★ You found a golden key!"
    player.hasKey = TRUE
    player.score = player.score + 50

    ' Remove key from room
    IF player.currentRoom = 2 THEN
      room2.hasKey = FALSE
    END IF
  END IF

  ' Check for treasure
  IF currentRoom.hasTreasure THEN
    IF player.hasKey THEN
      PRINT
      PRINT "🏆 YOU FOUND THE TREASURE!"
      PRINT "The vault opens with your key!"
      player.score = player.score + 100
      PRINT
      PRINT "Final Score: " + STR$(player.score)
      PRINT "Moves Made: " + STR$(player.moves)

      ' Calculate rating
      LET rating$ = player.moves < 5 ? "Master Explorer!" : player.moves < 8 ? "Skilled Adventurer" : "Treasure Hunter"
      PRINT "Rating: " + rating$
      PRINT
      PRINT "CONGRATULATIONS - YOU WIN!"
      GOTO 999
    ELSE
      PRINT
      PRINT "🔒 The treasure vault is locked! You need a key."
    END IF
  END IF

  ' Show status
  PRINT
  PRINT "Status: " + (player.hasKey ? "You have a key" : "No key")
  PRINT "Score: " + STR$(player.score)

  ' Simple AI movement
  PRINT
  PRINT "Choose action:"
  PRINT "1. Go to Entrance Hall"
  PRINT "2. Go to Library"
  PRINT "3. Go to Treasure Room"

  ' Simulate choice (for demo, follows optimal path)
  LET choice = turn < 3 ? 2 : 3

  ' Special case: if no key yet, go to library
  IF NOT player.hasKey THEN
    choice = 2
  END IF

  PRINT "Your choice: " + STR$(choice)

  ' Move player
  player.currentRoom = choice
  player.moves = player.moves + 1

  PRINT
NEXT turn

PRINT
PRINT "═════════════════════════════════════"
PRINT "Time's up! You ran out of turns."
PRINT "Final Score: " + STR$(player.score)
PRINT
PRINT "Thanks for playing TREASURE HUNT!"
PRINT "This demo showcased:"
PRINT " • TYPE definitions for structured data"
PRINT " • Record literals with Type { field: value } syntax"
PRINT " • Ternary operator (? :) for conditionals"
PRINT " • Direct field access and modification"

999 END