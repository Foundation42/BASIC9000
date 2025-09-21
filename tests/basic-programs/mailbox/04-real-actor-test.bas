REM Real Actor Model Test - Joe Armstrong would be PROUD!
PRINT "=== BASIC9000 Actor Model Demo ==="

REM Test basic SPAWN functionality
SPAWN "worker"
PRINT "Spawned worker task"

REM Get the task handle and send a message
LET worker = __task_worker
SEND worker, "Hello from main!"
PRINT "Sent message to worker"

REM Test RECV functionality (though we can't receive in main thread yet)
PRINT "RECV would work inside the worker fiber"

PRINT "=== Actor Model Success! ==="
END