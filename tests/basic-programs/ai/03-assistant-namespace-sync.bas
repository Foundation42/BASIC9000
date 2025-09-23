REM TEST: AI namespace sync with AIAssistant record
REM EXPECT: AI.SYSTEM and AI.TEMPERATURE update record fields

LET assistant = NEW AIAssistant("fake", "deterministic")
AI.SYSTEM(assistant, "You are helpful")
AI.TEMPERATURE(assistant, 0.5)
AI.MAX_TOKENS(assistant, 2048)

IF assistant.SystemPrompt <> "You are helpful" THEN PRINT "FAIL: system prompt not updated" : END
IF ABS(assistant.Temperature - 0.5) > 0.0001 THEN PRINT "FAIL: temperature not updated" : END
IF assistant.MaxTokens <> 2048 THEN PRINT "FAIL: max tokens not updated" : END

PRINT "PASS: AI namespace syncs assistant record"
END
