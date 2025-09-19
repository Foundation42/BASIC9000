# BASIC9000 Secrets Management

This guide explains how to safely manage API keys and other sensitive data in BASIC9000 programs.

## Quick Start

1. Copy the example config file:
```bash
cp .basic9000.example.json .basic9000.json
# or for YAML
cp .basic9000.example.yaml .basic9000.yaml
```

2. Edit the file and add your API keys:
```json
{
  "openai_api_key": "sk-proj-YOUR_REAL_KEY_HERE",
  "anthropic_api_key": "sk-ant-YOUR_REAL_KEY_HERE"
}
```

3. The config file is automatically loaded when BASIC9000 starts
4. Your API keys are now available to AI functions automatically!

## Available Methods

### 1. Configuration Files (Recommended)

BASIC9000 automatically looks for config files in these locations:
- `.basic9000.json` (current directory)
- `.basic9000.yaml` or `.basic9000.yml`
- `.env.basic9000`
- `~/.basic9000/config.json` (home directory)
- `~/.basic9000/secrets.json`
- `~/.config/basic9000/config.json` (XDG config)

**Example .basic9000.json:**
```json
{
  "openai_api_key": "sk-proj-xxx",
  "anthropic_api_key": "sk-ant-xxx",
  "custom_endpoint": "http://localhost:11434/v1"
}
```

**Example .basic9000.yaml:**
```yaml
openai_api_key: "sk-proj-xxx"
anthropic_api_key: "sk-ant-xxx"
custom_endpoint: "http://localhost:11434/v1"
```

### 2. Environment Variables

Set environment variables before running BASIC9000:

```bash
export OPENAI_API_KEY="sk-proj-xxx"
export ANTHROPIC_API_KEY="sk-ant-xxx"
npm start
```

Or use a `.env` file:
```env
OPENAI_API_KEY=sk-proj-xxx
ANTHROPIC_API_KEY=sk-ant-xxx
```

### 3. CONFIG Namespace

Load and manage configs programmatically:

```basic
REM Load a specific config file
LET config_id = CONFIG.LOAD("myconfig.json")

REM Get a value from config
LET api_key$ = CONFIG.GET("openai_api_key")
LET nested$ = CONFIG.GET("database.host")

REM Check if config exists
IF CONFIG.EXISTS("openai_api_key") THEN
  PRINT "API key is configured"
END IF

REM Set a config value
CONFIG.SET("custom_setting", "value")

REM Save config to file
CONFIG.SAVE("myconfig.json")

REM List loaded configs
LET configs = CONFIG.LIST()
```

### 4. SYS.ENV Functions

Access environment variables directly:

```basic
REM Get environment variable
LET api_key$ = SYS.ENV("OPENAI_API_KEY")

REM Set environment variable
SYS.SETENV("MY_VAR", "my_value")

REM Use with fallback
LET key$ = SYS.ENV("API_KEY")
IF key$ = "" THEN
  INPUT "Enter API key: ", key$
  SYS.SETENV("API_KEY", key$)
END IF
```

## AI Integration

The AI namespace automatically checks for API keys in this order:
1. Keys set with `AI.KEY()`
2. Environment variables (multiple variations checked)
3. Config files (auto-loaded on startup)

```basic
REM Method 1: Explicit (not recommended for production)
AI.KEY("openai", "sk-proj-xxx")

REM Method 2: From environment (automatic)
REM Just create the AI instance, it finds the key
LET assistant = AI.CREATE("openai", "gpt-3.5-turbo")

REM Method 3: From config file (automatic)
REM Place key in .basic9000.json and it just works
LET ai = AI.CREATE("openai", "gpt-4")
```

## Security Best Practices

### DO:
- ✅ Use config files or environment variables for API keys
- ✅ Add config files to `.gitignore`
- ✅ Use example files (`.basic9000.example.json`) in repositories
- ✅ Load secrets from secure locations (`~/.basic9000/`)
- ✅ Use different API keys for development and production
- ✅ Rotate API keys regularly

### DON'T:
- ❌ Hard-code API keys in your BASIC programs
- ❌ Commit config files with real keys to version control
- ❌ Share API keys in documentation or examples
- ❌ Use the same API key across multiple projects
- ❌ Log or print API keys in your programs

## Example: Secure AI Program

**Step 1: Create config file `.basic9000.json`:**
```json
{
  "openai_api_key": "sk-proj-YOUR_KEY",
  "default_model": "gpt-3.5-turbo",
  "max_tokens": 150
}
```

**Step 2: Write your BASIC program:**
```basic
REM Config is auto-loaded, keys are available

REM Create AI without explicit key
LET assistant = AI.CREATE("openai", CONFIG.GET("default_model"))

REM Configure from config
LET max_tokens = VAL(CONFIG.GET("max_tokens"))
AI.MAX_TOKENS(assistant, max_tokens)

REM Use the AI
LET response$ = AI.GENERATE(assistant, "Hello!")
PRINT response$
```

**Step 3: Add to .gitignore:**
```
.basic9000.json
.basic9000.yaml
.env
```

## Config File Priority

When multiple config sources exist, BASIC9000 uses this priority:
1. Explicit `AI.KEY()` calls in code
2. Environment variables
3. Config files (first found wins):
   - `.basic9000.json` (current dir)
   - `.basic9000.yaml`
   - `.env.basic9000`
   - `~/.basic9000/config.json`
   - `~/.basic9000/secrets.json`
   - `~/.config/basic9000/config.json`

## Troubleshooting

### Config not loading?
```basic
REM Check if config was loaded
LET source$ = CONFIG.SOURCE()
IF source$ = "" THEN
  PRINT "No config file found"
ELSE
  PRINT "Config loaded from: " + source$
END IF
```

### API key not found?
```basic
REM Debug API key sources
PRINT "From CONFIG: " + CONFIG.GET("openai_api_key")
PRINT "From ENV: " + SYS.ENV("OPENAI_API_KEY")
```

### Wrong config value?
```basic
REM List all loaded configs
LET configs = CONFIG.LIST()
FOR i = 0 TO ARRAY.LENGTH(configs) - 1
  PRINT "Config: " + configs[i]
NEXT i
```

## Advanced: Multiple Configurations

```basic
REM Load different configs for different environments
LET dev_config = CONFIG.LOAD("config.dev.json")
LET prod_config = CONFIG.LOAD("config.prod.json")

REM Use specific config
LET dev_key$ = CONFIG.GET("api_key", dev_config)
LET prod_key$ = CONFIG.GET("api_key", prod_config)

REM Switch based on environment
LET env$ = SYS.ENV("ENVIRONMENT")
IF env$ = "production" THEN
  LET api_key$ = CONFIG.GET("api_key", prod_config)
ELSE
  LET api_key$ = CONFIG.GET("api_key", dev_config)
END IF
```

---

By following these practices, you can keep your API keys and sensitive data secure while making your BASIC9000 programs easy to configure and deploy!