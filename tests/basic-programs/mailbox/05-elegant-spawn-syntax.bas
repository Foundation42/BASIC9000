REM ELEGANT SPAWN SYNTAX - Joe Armstrong's Dream!
PRINT "=== ELEGANT Actor Model Syntax ==="

REM The BEAUTIFUL new syntax - SPAWN returns task handle directly!
LET worker = SPAWN "worker"
LET processor = SPAWN "processor"
LET calculator = SPAWN "calculator"

PRINT "Spawned three workers elegantly!"

REM Send messages to our workers - SO CLEAN!
SEND worker, "Hello worker!"
SEND processor, "Process this data"
SEND calculator, "ADD 10 20"

PRINT "Messages sent to all workers!"

REM This is SOFTWARE ENGINEERING PERFECTION!
PRINT "SPAWN syntax is now ELEGANT and PERFECT!"

END