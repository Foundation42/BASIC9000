REM TEST: AIAssistant.With override
REM EXPECT: assistant.WITH returns shallow copy without mutating original

LET assistant = NEW AIAssistant("fake", "deterministic")
LET tuned = assistant.WITH({ Temperature:0.2, CachePolicy:"ttl:60" })

IF ABS(assistant.Temperature - 0.7) > 0.0001 THEN PRINT "FAIL: original temperature changed" : END
IF assistant.CachePolicy <> "none" THEN PRINT "FAIL: original cache policy changed" : END

IF ABS(tuned.Temperature - 0.2) > 0.0001 THEN PRINT "FAIL: tuned temperature mismatch" : END
IF tuned.CachePolicy <> "ttl:60" THEN PRINT "FAIL: tuned cache policy mismatch" : END
IF tuned.Provider <> assistant.Provider THEN PRINT "FAIL: tuned provider mismatch" : END
IF tuned.Model <> assistant.Model THEN PRINT "FAIL: tuned model mismatch" : END

PRINT "PASS: assistant.WITH overrides without mutation"
END
