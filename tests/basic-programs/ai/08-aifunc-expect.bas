REM TEST: AIFUNC with EXPECT range validation
REM EXPECT: numeric response stays within range

AIFUNC assistant.Score(text AS STRING) AS NUMBER
  PROMPT "Return a real number in [-1,1] for ${text}"
  EXPECT RANGE [-1, 1]
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
LET value = assistant.Score("quality")
IF value < -1 OR value > 1 THEN PRINT "FAIL: score out of range" : END
PRINT "PASS: AIFUNC range expectation"
PRINT value
END
