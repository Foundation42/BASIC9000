REM Simple SEND test
PRINT "Testing SEND parsing"

LET worker1 = SPAWN "worker1"
PRINT "Spawned worker1"

SEND worker1, "hello"
PRINT "Sent message"

END