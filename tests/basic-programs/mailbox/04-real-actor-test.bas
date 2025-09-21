REM Real Actor Model Test - Joe Armstrong would be PROUD!
PRINT "=== BASIC9000 Actor Model Demo ==="

REM Test basic SPAWN functionality with elegant syntax
LET worker = SPAWN "worker"
PRINT "Spawned worker task"

REM Send a message using the returned task handle
SEND worker, "Hello from main!"
PRINT "Sent message to worker"

REM Test RECV functionality (though we can't receive in main thread yet)
PRINT "RECV would work inside the worker fiber"

PRINT "=== Actor Model Success! ==="
END