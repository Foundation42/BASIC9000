REM TEST: FakeAI deterministic string responses
REM EXPECT: repeated prompts yield identical answers

LET assistant = NEW AIAssistant("fake", "deterministic")
LET first$ = AI.GENERATE(assistant, "Give a concise title for this release")
LET second$ = AI.GENERATE(assistant, "Give a concise title for this release")

IF first$ <> second$ THEN PRINT "FAIL: FakeAI responses not deterministic" : END
IF LEFT$(first$, 6) <> "TITLE:" THEN PRINT "FAIL: FakeAI prefix missing" : END

PRINT "PASS: FakeAI deterministic"
PRINT first$
END
