REM TEST: AIAssistant default construction
REM EXPECT: AIAssistant created via NEW has expected defaults

LET assistant = NEW AIAssistant("fake", "deterministic")

IF assistant.Provider <> "fake" THEN PRINT "FAIL: wrong provider" : END
IF assistant.Model <> "deterministic" THEN PRINT "FAIL: wrong model" : END
IF ABS(assistant.Temperature - 0.7) > 0.0001 THEN PRINT "FAIL: wrong temperature" : END
IF assistant.MaxTokens <> 1000 THEN PRINT "FAIL: wrong max tokens" : END
IF assistant.SystemPrompt <> "" THEN PRINT "FAIL: wrong system prompt" : END
IF assistant.CachePolicy <> "none" THEN PRINT "FAIL: wrong cache policy" : END
IF assistant.RetryCount <> 3 THEN PRINT "FAIL: wrong retry count" : END
IF assistant.Timeout <> 30000 THEN PRINT "FAIL: wrong timeout" : END
IF assistant.CostBudget <> 0 THEN PRINT "FAIL: wrong cost budget" : END

PRINT "PASS: AIAssistant defaults"
END
