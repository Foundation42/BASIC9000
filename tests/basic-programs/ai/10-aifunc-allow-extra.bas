REM TEST: AIFUNC EXPECT ALLOW_EXTRA permits provider-defined fields
REM EXPECT: extra JSON fields do not trigger AIParseError when ALLOW_EXTRA is set

TYPE Summary
  summary AS STRING
  bullets AS ARRAY<STRING>
END TYPE

AIFUNC assistant.LooseSummary(text AS STRING) AS Summary
  PROMPT "Return JSON: { summary, bullets } with at most 5 bullets. EXTRA_FIELD\n${text}"
  EXPECT { ALLOW_EXTRA, bullets: LENGTH 1..5 }
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
LET result = assistant.LooseSummary("ALLOW EXTRA FIELDS")
IF result.summary <> "OK" THEN PRINT "FAIL: wrong summary" : END
LET bulletCount = LEN(result.bullets)
IF bulletCount < 1 OR bulletCount > 5 THEN PRINT "FAIL: bullets length out of range" : END
PRINT "PASS: ALLOW_EXTRA accepts provider fields"
PRINT result.summary
PRINT bulletCount
END
