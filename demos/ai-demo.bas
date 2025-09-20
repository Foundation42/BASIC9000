REM ==========================================
REM BASIC9000 AI Demo - Showcasing AI features
REM Now with TYPE definitions and modern syntax
REM ==========================================

' Define types for better structure
TYPE AIConfig
  temperature AS NUMBER
  maxTokens AS NUMBER
  systemPrompt AS STRING
END TYPE

TYPE AIStats
  provider AS STRING
  model AS STRING
  totalTokens AS NUMBER
  requestCount AS NUMBER
END TYPE

PRINT "=== BASIC9000 AI Demo ==="
PRINT

REM Create AI instances with different providers
PRINT "Creating AI instances..."

REM For OpenAI (requires API key)
REM AI.KEY("openai", "your-api-key-here")
REM LET gpt = AI.CREATE("openai", "gpt-3.5-turbo")

REM For local Ollama server (OpenAI-compatible)
REM LET ollama = AI.CREATE("generic", "llama2", "http://localhost:11434/v1")

REM For Together AI (OpenAI-compatible)
REM AI.KEY("openai", "your-together-api-key")
REM LET together = AI.CREATE("generic", "meta-llama/Llama-2-70b-chat-hf", "https://api.together.xyz/v1")

REM Demo with a mock endpoint for testing
LET demo = AI.CREATE("generic", "demo-model", "http://localhost:8080/v1")
AI.ENDPOINT(demo, "http://localhost:8080/v1")
PRINT "Created demo AI instance"
PRINT

REM Configure the AI using a config object
LET config = AIConfig { temperature: 0.7, maxTokens: 150, systemPrompt: "You are a helpful BASIC9000 programming assistant" }
AI.TEMPERATURE(demo, config.temperature)
AI.MAX_TOKENS(demo, config.maxTokens)
AI.SYSTEM(demo, config.systemPrompt)
PRINT "Configured AI with temperature " + STR$(config.temperature) + " and max tokens " + STR$(config.maxTokens)
PRINT

REM Simple generation
PRINT "=== Simple Generation ==="
LET question$ AS STRING
INPUT "Ask the AI something: ", question$
TRY
  LET response$ AS STRING = AI.GENERATE(demo, question$)
  PRINT "AI Response: " + response$
CATCH
  PRINT "Error: AI service not available. Start a local AI server or configure API keys."
END TRY
PRINT

REM Conversation example
PRINT "=== Interactive Conversation ==="
PRINT "Type 'quit' to exit the conversation"
PRINT

LET user_input$ AS STRING
10 INPUT "You: ", user_input$
20 IF user_input$ = "quit" THEN GOTO 100

30 AI.USER(demo, user_input$)
40 TRY
50   LET ai_response$ AS STRING = AI.ASSISTANT(demo)
60   PRINT "AI: " + ai_response$
70 CATCH
80   PRINT "AI Error: Service unavailable"
90 END TRY

95 PRINT
96 GOTO 10

100 PRINT
110 PRINT "=== Conversation History ==="
120 LET history = AI.HISTORY(demo)
130 FOR i AS NUMBER = 0 TO ARRAY.LENGTH(history) - 1
140   PRINT history[i]
150 NEXT i

160 PRINT
170 PRINT "=== AI Instance Info ==="
' Create stats object from current AI state
175 LET stats = AIStats { provider: AI.PROVIDER(demo), model: AI.MODEL(demo), totalTokens: AI.TOKENS(demo), requestCount: AI.REQUESTS(demo) }
180 PRINT "Provider: " + stats.provider
190 PRINT "Model: " + stats.model
200 PRINT "Total tokens used: " + STR$(stats.totalTokens)
210 PRINT "API requests made: " + STR$(stats.requestCount)

220 PRINT
230 PRINT "=== Specialized Operations (if API available) ==="
240 TRY
250   LET sentiment AS NUMBER = AI.SENTIMENT(demo, "I love programming in BASIC9000!")
260   PRINT "Sentiment score: " + STR$(sentiment)
270 CATCH
280   PRINT "Sentiment analysis unavailable"
290 END TRY

300 TRY
310   LET translation$ AS STRING = AI.TRANSLATE(demo, "Hello world", "Spanish")
320   PRINT "Translation to Spanish: " + translation$
330 CATCH
340   PRINT "Translation unavailable"
350 END TRY

360 PRINT
370 PRINT "=== Demo Complete ==="
380 PRINT "To use real AI:"
390 PRINT "1. Set API key: AI.KEY(""openai"", ""your-key-here"")"
400 PRINT "2. Create instance: LET ai = AI.CREATE(""openai"", ""gpt-3.5-turbo"")"
410 PRINT "3. Or use local server: LET ai = AI.CREATE(""generic"", ""model"", ""http://localhost:8080/v1"")"

420 REM Clean up
430 AI.DESTROY(demo)
440 END