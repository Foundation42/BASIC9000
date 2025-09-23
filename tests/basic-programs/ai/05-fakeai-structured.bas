REM TEST: FakeAI structured JSON output
REM EXPECT: FakeAI returns predictable JSON payloads

LET assistant = NEW AIAssistant("fake", "deterministic")
LET raw$ = AI.GENERATE(assistant, "Return JSON: { summary, bullets } with at most 5 bullets.")
LET handle = JSON.PARSE(raw$)
LET summary$ = JSON.GET(handle, "summary")
LET bullets = JSON.GET(handle, "bullets")

IF summary$ <> "OK" THEN PRINT "FAIL: summary mismatch" : END
IF LEN(bullets) < 1 THEN PRINT "FAIL: missing bullets" : END
IF LEN(bullets) > 5 THEN PRINT "FAIL: too many bullets" : END

PRINT "PASS: FakeAI structured output"
PRINT summary$
END
