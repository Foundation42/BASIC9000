REM Debug SEND keyword
PRINT "Before SEND"
REM Just test a simple SEND with variables
LET task1 = "test"
LET msg1 = "hello"
SEND task1, msg1
PRINT "After SEND"
END