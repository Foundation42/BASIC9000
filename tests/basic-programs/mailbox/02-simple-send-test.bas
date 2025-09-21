REM Simple SEND test
PRINT "Testing SEND parsing"

SPAWN "worker1"
PRINT "Spawned worker1"

SEND worker1, "hello"
PRINT "Sent message"

END