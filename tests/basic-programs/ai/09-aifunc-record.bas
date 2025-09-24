REM TEST: AIFUNC record coercion with EXPECT field constraint
REM EXPECT: record field array respects EXPECT length bounds

TYPE Summary
  summary AS STRING
  bullets AS ARRAY<STRING>
END TYPE

AIFUNC assistant.Summarize(text AS STRING) AS Summary
  PROMPT "Return JSON: { summary, bullets } with at most 5 bullets.\n${text}"
  EXPECT { summary: LENGTH 2..2, bullets: LENGTH 2..5 }
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
LET result = assistant.Summarize("BASIC9000 release highlights")
IF result.summary <> "OK" THEN PRINT "FAIL: summary field missing" : END
IF LEN(result.summary) <> 2 THEN PRINT "FAIL: summary length incorrect" : END
LET bulletCount = LEN(result.bullets)
IF bulletCount < 2 OR bulletCount > 5 THEN PRINT "FAIL: bullets count out of EXPECT range" : END
PRINT "PASS: AIFUNC record coercion"
PRINT result.summary
PRINT bulletCount
END
