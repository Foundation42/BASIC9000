REM ============================================
REM CONFIG Namespace Demo
REM Shows all config management features
REM ============================================

PRINT "=== BASIC9000 Config Management Demo ==="
PRINT

REM 1. Check auto-loaded config
PRINT "1. AUTO-LOADED CONFIG"
PRINT "--------------------"
LET source$ = CONFIG.SOURCE()
IF source$ <> "" THEN
  PRINT "Config auto-loaded from: " + source$

  REM List all loaded configs
  LET configs = CONFIG.LIST()
  PRINT "Loaded configs: " + ARRAY.JOIN(configs, ", ")
ELSE
  PRINT "No config auto-loaded"
  PRINT "BASIC9000 looks in:"
  PRINT "  .basic9000.json (current dir)"
  PRINT "  .basic9000.yaml"
  PRINT "  ~/.basic9000/config.json"
  PRINT "  ~/.config/basic9000/config.json"
END IF
PRINT

REM 2. Environment variables
PRINT "2. ENVIRONMENT VARIABLES"
PRINT "------------------------"
PRINT "Current user: " + SYS.ENV("USER")
PRINT "Home directory: " + SYS.ENV("HOME")
PRINT "Path: " + STR.LEFT(SYS.ENV("PATH"), 50) + "..."

REM Set a custom env var
SYS.SETENV("BASIC9000_DEMO", "Hello from BASIC!")
PRINT "Set BASIC9000_DEMO = " + SYS.ENV("BASIC9000_DEMO")
PRINT

REM 3. Load additional config
PRINT "3. LOAD CUSTOM CONFIG"
PRINT "--------------------"
REM Create a temp config file for demo
LET demo_config$ = "{"
LET demo_config$ = demo_config$ + CHR$(34) + "demo_setting" + CHR$(34) + ": " + CHR$(34) + "test_value" + CHR$(34) + ","
LET demo_config$ = demo_config$ + CHR$(34) + "number_value" + CHR$(34) + ": " + CHR$(34) + "42" + CHR$(34) + ","
LET demo_config$ = demo_config$ + CHR$(34) + "nested" + CHR$(34) + ": {"
LET demo_config$ = demo_config$ + CHR$(34) + "option" + CHR$(34) + ": " + CHR$(34) + "nested_value" + CHR$(34)
LET demo_config$ = demo_config$ + "}}"

FS.WRITE("demo-config.json", demo_config$)
PRINT "Created demo-config.json"

TRY
  LET config_id = CONFIG.LOAD("demo-config.json")
  PRINT "Loaded config: " + config_id
CATCH
  PRINT "Failed to load config"
END TRY
PRINT

REM 4. Access config values
PRINT "4. ACCESS CONFIG VALUES"
PRINT "----------------------"
IF CONFIG.EXISTS("demo_setting", "demo-config") THEN
  PRINT "demo_setting = " + CONFIG.GET("demo_setting", "demo-config")
END IF

IF CONFIG.EXISTS("number_value", "demo-config") THEN
  LET num = VAL(CONFIG.GET("number_value", "demo-config"))
  PRINT "number_value = " + STR$(num) + " (converted to number)"
END IF

IF CONFIG.EXISTS("nested.option", "demo-config") THEN
  PRINT "nested.option = " + CONFIG.GET("nested.option", "demo-config")
END IF
PRINT

REM 5. Modify and save config
PRINT "5. MODIFY & SAVE CONFIG"
PRINT "----------------------"
CONFIG.SET("new_setting", "added_by_basic", "demo-config")
CONFIG.SET("timestamp", TIME.NOW(), "demo-config")
PRINT "Added new settings to config"

TRY
  LET saved_path$ = CONFIG.SAVE("demo-config-modified.json", "demo-config")
  PRINT "Saved modified config to: " + saved_path$

  REM Show the saved file
  PRINT
  PRINT "Contents of saved file:"
  PRINT "----------------------"
  LET content$ = FS.READ("demo-config-modified.json")
  PRINT content$
CATCH
  PRINT "Failed to save config"
END TRY
PRINT

REM 6. Config priority demonstration
PRINT "6. CONFIG PRIORITY"
PRINT "-----------------"
PRINT "BASIC9000 checks for values in this order:"
PRINT "1. Explicit function calls (AI.KEY, etc.)"
PRINT "2. Environment variables (OPENAI_API_KEY, etc.)"
PRINT "3. Config files (first found wins)"
PRINT
PRINT "Example for OpenAI key:"

REM Check all possible sources
LET found_in$ = ""
IF CONFIG.EXISTS("openai_api_key") THEN
  LET found_in$ = "config file"
END IF
IF SYS.ENV("OPENAI_API_KEY") <> "" THEN
  IF found_in$ <> "" THEN
    LET found_in$ = found_in$ + " AND "
  END IF
  LET found_in$ = found_in$ + "environment"
END IF

IF found_in$ <> "" THEN
  PRINT "  ✓ API key found in: " + found_in$
ELSE
  PRINT "  ✗ No API key configured"
END IF
PRINT

REM 7. Security tips
PRINT "7. SECURITY TIPS"
PRINT "---------------"
PRINT "• Keep .basic9000.json in .gitignore"
PRINT "• Use example files for documentation"
PRINT "• Store production keys in ~/.basic9000/"
PRINT "• Use environment variables in CI/CD"
PRINT "• Never log or print actual API keys"
PRINT

REM Clean up demo files
FS.DELETE("demo-config.json")
FS.DELETE("demo-config-modified.json")
PRINT "Demo files cleaned up"
PRINT

PRINT "=== Demo Complete ==="
PRINT "You now know how to:"
PRINT "✓ Use auto-loaded configs"
PRINT "✓ Access environment variables"
PRINT "✓ Load custom config files"
PRINT "✓ Get/set config values"
PRINT "✓ Save modified configs"
PRINT "✓ Keep secrets secure!"

END