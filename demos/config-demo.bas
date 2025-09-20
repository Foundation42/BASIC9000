REM ============================================
REM CONFIG Namespace Demo
REM Shows all config management features
REM Now with TYPE definitions and modern syntax
REM ============================================

' Define types for configuration management
TYPE ConfigInfo
  source AS STRING
  configId AS STRING
  exists AS BOOL
END TYPE

TYPE ConfigValue
  key AS STRING
  value AS STRING
  numValue AS NUMBER
END TYPE

PRINT "=== BASIC9000 Config Management Demo ==="
PRINT

REM 1. Check auto-loaded config
PRINT "1. AUTO-LOADED CONFIG"
PRINT "--------------------"
LET configInfo = ConfigInfo { source: CONFIG.SOURCE(), configId: "", exists: FALSE }

IF configInfo.source <> "" THEN
  configInfo.exists = TRUE
  PRINT "Config auto-loaded from: " + configInfo.source

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
LET user$ AS STRING = SYS.ENV("USER")
LET home$ AS STRING = SYS.ENV("HOME")
LET path$ AS STRING = SYS.ENV("PATH")
PRINT "Current user: " + user$
PRINT "Home directory: " + home$
PRINT "Path: " + STR.LEFT(path$, 50) + "..."

REM Set a custom env var
SYS.SETENV("BASIC9000_DEMO", "Hello from BASIC!")
PRINT "Set BASIC9000_DEMO = " + SYS.ENV("BASIC9000_DEMO")
PRINT

REM 3. Load additional config
PRINT "3. LOAD CUSTOM CONFIG"
PRINT "--------------------"
REM Create a temp config file for demo
LET demo_config$ AS STRING = "{"
demo_config$ = demo_config$ + CHR$(34) + "demo_setting" + CHR$(34) + ": " + CHR$(34) + "test_value" + CHR$(34) + ","
demo_config$ = demo_config$ + CHR$(34) + "number_value" + CHR$(34) + ": " + CHR$(34) + "42" + CHR$(34) + ","
demo_config$ = demo_config$ + CHR$(34) + "nested" + CHR$(34) + ": {"
demo_config$ = demo_config$ + CHR$(34) + "option" + CHR$(34) + ": " + CHR$(34) + "nested_value" + CHR$(34)
demo_config$ = demo_config$ + "}}"

FS.WRITE("demo-config.json", demo_config$)
PRINT "Created demo-config.json"

TRY
  configInfo.configId = CONFIG.LOAD("demo-config.json")
  PRINT "Loaded config: " + configInfo.configId
CATCH
  PRINT "Failed to load config"
END TRY
PRINT

REM 4. Access config values
PRINT "4. ACCESS CONFIG VALUES"
PRINT "----------------------"
LET demoValue = ConfigValue { key: "demo_setting", value: "", numValue: 0 }

IF CONFIG.EXISTS(demoValue.key, "demo-config") THEN
  demoValue.value = CONFIG.GET(demoValue.key, "demo-config")
  PRINT demoValue.key + " = " + demoValue.value
END IF

LET numValue = ConfigValue { key: "number_value", value: "", numValue: 0 }
IF CONFIG.EXISTS(numValue.key, "demo-config") THEN
  numValue.value = CONFIG.GET(numValue.key, "demo-config")
  numValue.numValue = VAL(numValue.value)
  PRINT numValue.key + " = " + STR$(numValue.numValue) + " (converted to number)"
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
  LET saved_path$ AS STRING = CONFIG.SAVE("demo-config-modified.json", "demo-config")
  PRINT "Saved modified config to: " + saved_path$

  REM Show the saved file
  PRINT
  PRINT "Contents of saved file:"
  PRINT "----------------------"
  LET content$ AS STRING = FS.READ("demo-config-modified.json")
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
LET found_in$ AS STRING = ""
IF CONFIG.EXISTS("openai_api_key") THEN
  found_in$ = "config file"
END IF
IF SYS.ENV("OPENAI_API_KEY") <> "" THEN
  IF found_in$ <> "" THEN
    found_in$ = found_in$ + " AND "
  END IF
  found_in$ = found_in$ + "environment"
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