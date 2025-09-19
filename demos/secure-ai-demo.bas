REM ============================================
REM Secure AI Demo - Using Config Files
REM ============================================
REM
REM This demo shows the SECURE way to use AI APIs
REM No API keys in code!
REM ============================================

PRINT "=== BASIC9000 Secure AI Demo ==="
PRINT

REM Check if config is loaded
LET config_source$ = CONFIG.SOURCE()
IF config_source$ = "" THEN
  PRINT "⚠️  No config file found!"
  PRINT
  PRINT "To use this demo:"
  PRINT "1. Copy .basic9000.example.json to .basic9000.json"
  PRINT "2. Add your OpenAI API key to the file"
  PRINT "3. Run this demo again"
  PRINT
  PRINT "Or set environment variable:"
  PRINT "  export OPENAI_API_KEY='your-key-here'"
  PRINT
  END
ELSE
  PRINT "✓ Config loaded from: " + config_source$
END IF

REM Check for API key in various places
LET has_key = 0

REM Method 1: Check config file
IF CONFIG.EXISTS("openai_api_key") THEN
  PRINT "✓ Found API key in config file"
  LET has_key = 1
END IF

REM Method 2: Check environment variables
IF SYS.ENV("OPENAI_API_KEY") <> "" THEN
  PRINT "✓ Found API key in environment"
  LET has_key = 1
END IF

IF has_key = 0 THEN
  PRINT "⚠️  No OpenAI API key found!"
  PRINT
  PRINT "Add to .basic9000.json:"
  PRINT '  "openai_api_key": "sk-proj-YOUR_KEY"'
  END
END IF

PRINT
PRINT "=== Creating Secure AI Instance ==="

REM The API key is found automatically!
REM No need to put it in code
TRY
  LET ai = AI.CREATE("openai", "gpt-3.5-turbo")
  PRINT "✓ AI instance created successfully"
CATCH
  PRINT "✗ Failed to create AI instance"
  PRINT "  Please check your API key"
  END
END TRY

REM Configure from config file if available
IF CONFIG.EXISTS("default_temperature") THEN
  LET temp = VAL(CONFIG.GET("default_temperature"))
  AI.TEMPERATURE(ai, temp)
  PRINT "✓ Temperature set from config: " + STR$(temp)
END IF

IF CONFIG.EXISTS("max_tokens") THEN
  LET max_tokens = VAL(CONFIG.GET("max_tokens"))
  AI.MAX_TOKENS(ai, max_tokens)
  PRINT "✓ Max tokens set from config: " + STR$(max_tokens)
END IF

PRINT
PRINT "=== Testing AI ==="
PRINT "Asking AI to write a haiku about security..."
PRINT

TRY
  LET haiku$ = AI.GENERATE(ai, "Write a haiku about keeping API keys secure")
  PRINT haiku$
  PRINT
  PRINT "✓ Success! Your AI is working securely!"
CATCH
  PRINT "✗ AI request failed"
  PRINT "  Check your API key and internet connection"
END TRY

PRINT
PRINT "=== Security Best Practices Demonstrated ==="
PRINT "✓ No API keys in source code"
PRINT "✓ Config file is in .gitignore"
PRINT "✓ Keys loaded from secure locations"
PRINT "✓ Error handling for missing config"
PRINT
PRINT "Your API keys are safe! 🔒"

REM Show other config options
PRINT
PRINT "=== Other Config Values ==="
PRINT "You can store any settings in config:"

REM List some config values (but not sensitive ones!)
IF CONFIG.EXISTS("default_model") THEN
  PRINT "Default model: " + CONFIG.GET("default_model")
END IF

IF CONFIG.EXISTS("debug_mode") THEN
  PRINT "Debug mode: " + CONFIG.GET("debug_mode")
END IF

REM Clean up
AI.DESTROY(ai)

PRINT
PRINT "=== Demo Complete ==="
PRINT "Remember: NEVER commit your .basic9000.json with real keys!"
PRINT "Always use .basic9000.example.json for examples"

END