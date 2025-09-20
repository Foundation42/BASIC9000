REM TEST: Array indexing with bracket syntax
REM EXPECT: Successful array element access

LET numbers = [10, 20, 30, 40, 50]

REM Test basic indexing
LET first = numbers[0]
LET second = numbers[1]
LET last = numbers[4]

PRINT "First:", first
PRINT "Second:", second
IF first <> 10 THEN PRINT "ERROR: Expected first=10, got " + STR$(first) : END
IF second <> 20 THEN PRINT "ERROR: Expected second=20, got " + STR$(second) : END
IF last <> 50 THEN PRINT "ERROR: Expected last=50, got " + STR$(last) : END

REM Test with variable index
LET i = 2
LET third = numbers[i]
PRINT "Third:", third
IF third <> 30 THEN PRINT "ERROR: Expected third=30, got " + STR$(third) : END

REM Test nested arrays
LET matrix = [[1, 2], [3, 4], [5, 6]]
LET row = matrix[1]
LET element = row[0]
PRINT "Matrix element:", element
IF element <> 3 THEN PRINT "ERROR: Expected element=3, got " + STR$(element) : END

PRINT "PASS: Array indexing works correctly"
END