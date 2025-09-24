REM TEST: AIFUNC basic string handling
REM EXPECT: AIFUNCs generate deterministic FakeAI titles

AIFUNC assistant.MakeTitle(text AS STRING) AS STRING
  PROMPT "Make a release title for ${text}"
END AIFUNC

LET assistant = NEW AIAssistant("fake", "deterministic")
LET title$ = assistant.MakeTitle("Release Notes")
IF LEFT$(title$, 6) <> "TITLE:" THEN PRINT "FAIL: missing TITLE prefix" : END

PRINT "PASS: AIFUNC generated title"
PRINT title$
END
