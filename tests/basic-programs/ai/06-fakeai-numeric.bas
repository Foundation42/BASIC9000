REM TEST: FakeAI numeric sentiment output
REM EXPECT: FakeAI returns 0 for sentiment range prompts

LET assistant = NEW AIAssistant("fake", "deterministic")
LET score = VAL(AI.SENTIMENT(assistant, "This is a test"))
IF score <> 0 THEN PRINT "FAIL: expected neutral sentiment" : END

PRINT "PASS: FakeAI numeric output"
PRINT score
END
