# BASIC9000 AI API Specification v2.0

## Overview

The AI API provides artificial intelligence capabilities for BASIC9000 using an instance-based design that abstracts remote and local AI services through a unified interface. AI instances are first-class variables that maintain conversation state and configuration, similar to Canvas objects.

## AI Instance Management

### Creating AI Instances
```basic
LET assistant = AI.CREATE("openai", "gpt-4")              ' OpenAI GPT-4
LET coder = AI.CREATE("anthropic", "claude-3-5-sonnet")   ' Anthropic Claude
LET translator = AI.CREATE("openai", "gpt-3.5-turbo")    ' OpenAI GPT-3.5
LET local_model = AI.CREATE("local", "llama-3.2-7b")     ' Local model (future)
LET network_ai = AI.CREATE("network", "server.local:8080") ' Distributed AI
LET auto_ai = AI.CREATE("auto", "text-generation")       ' Best available
```

### API Key Configuration
```basic
AI.KEY "openai", your_openai_api_key
AI.KEY "anthropic", your_anthropic_key
AI.KEY "google", your_google_api_key
AI.KEY "huggingface", your_hf_token

' Keys can also be set via environment variables or config files
```

### Instance Configuration
```basic
AI.TEMPERATURE assistant, 0.7          ' Creativity level (0.0-2.0)
AI.MAX_TOKENS assistant, 1000          ' Maximum response length
AI.TOP_P assistant, 0.9                ' Nucleus sampling
AI.FREQUENCY_PENALTY assistant, 0.1    ' Reduce repetition
AI.PRESENCE_PENALTY assistant, 0.1     ' Encourage topic diversity
```

### System Prompts
```basic
AI.SYSTEM assistant, "You are a helpful coding assistant specializing in BASIC"
AI.SYSTEM translator, "Translate text accurately while preserving meaning"
```

### Instance Information
```basic
LET model_name = AI.MODEL(assistant)    ' Get model identifier
LET provider = AI.PROVIDER(assistant)   ' Get service provider
LET status = AI.STATUS(assistant)       ' Check if instance is ready
LET cost = AI.COST(assistant)           ' Get usage cost (if available)
```

### Instance Lifecycle
```basic
AI.DESTROY assistant                    ' Clean up instance
AI.RESET assistant                      ' Clear conversation history
```

## Text Generation

### Basic Generation
```basic
LET response = AI.GENERATE(assistant, "Explain quantum computing")
LET story = AI.GENERATE(assistant, prompt, 500)    ' Limit to 500 tokens
LET completion = AI.COMPLETE(coder, "def fibonacci(") ' Code completion
```

### Conversation Management
```basic
AI.USER assistant, "What is machine learning?"     ' Add user message
LET reply = AI.ASSISTANT(assistant)                 ' Generate response
AI.USER assistant, "Can you give an example?"      ' Continue conversation
LET example = AI.ASSISTANT(assistant)              ' Context is maintained

' Get conversation history
LET history = AI.HISTORY(assistant)                ' Returns array of messages
LET last_exchange = AI.LAST(assistant, 2)          ' Get last 2 messages
```

### Streaming Generation
```basic
LET stream = AI.STREAM(assistant, "Tell me a long story")
WHILE AI.STREAMING(stream)
  LET token = AI.NEXT(stream)
  PRINT token;  ' Print without newline
  SYS.SLEEP(10)
WEND
PRINT  ' Final newline
```

### Prompt Templates
```basic
LET template = AI.TEMPLATE("Translate '{text}' from {from_lang} to {to_lang}")
LET result = AI.APPLY(template, "text", "Hello", "from_lang", "English", "to_lang", "Spanish")
```

## Specialized AI Tasks

### Text Analysis
```basic
LET sentiment = AI.SENTIMENT(assistant, "I love this program!")     ' -1 to 1
LET summary = AI.SUMMARIZE(assistant, long_text, 100)              ' 100 word summary
LET keywords = AI.EXTRACT(assistant, text, "keywords", 5)          ' 5 keywords
LET category = AI.CLASSIFY(assistant, text, ["tech", "art", "science"])
```

### Language Operations
```basic
LET spanish = AI.TRANSLATE(translator, "Hello world", "spanish")
LET corrected = AI.GRAMMAR(assistant, "Me are going to store")
LET formal = AI.TONE(assistant, casual_text, "formal")
```

### Code Operations
```basic
LET code = AI.CODE(coder, "Write a bubble sort in BASIC")
LET explained = AI.EXPLAIN(coder, code_snippet)
LET fixed = AI.DEBUG(coder, buggy_code, error_message)
LET optimized = AI.OPTIMIZE(coder, slow_code)
```

## Advanced Features

### Multi-Instance Coordination
```basic
LET researcher = AI.CREATE("openai", "gpt-4")
LET writer = AI.CREATE("anthropic", "claude-3-5-sonnet")
LET editor = AI.CREATE("openai", "gpt-3.5-turbo")

AI.SYSTEM researcher, "Research topics thoroughly and provide facts"
AI.SYSTEM writer, "Write engaging content based on research"
AI.SYSTEM editor, "Edit and improve written content"

' Collaborative workflow
LET facts = AI.GENERATE(researcher, "Research renewable energy trends")
LET article = AI.GENERATE(writer, "Write an article based on: " + facts)
LET final = AI.GENERATE(editor, "Edit this article: " + article)
```

### Function Calling / Tool Use
```basic
' Define tools for AI to use
AI.TOOL assistant, "calculator", CALC_FUNCTION
AI.TOOL assistant, "web_search", SEARCH_FUNCTION
AI.TOOL assistant, "get_weather", WEATHER_FUNCTION

' AI can now call these tools automatically
LET result = AI.SOLVE(assistant, "What's 15% of the current temperature in London?")
```

### Custom Instructions
```basic
AI.INSTRUCT assistant, "Always format code examples with syntax highlighting"
AI.INSTRUCT assistant, "When asked about BASIC, focus on BASIC9000 features"
AI.INSTRUCT assistant, "Be concise unless asked for detailed explanations"
```

## Error Handling and Monitoring

### Error Management
```basic
LET result = AI.GENERATE(assistant, prompt)
IF AI.ERROR(assistant) THEN
  PRINT "AI Error: " + AI.ERRORMSG(assistant)
  PRINT "Error Code: " + STR$(AI.ERRORCODE(assistant))
  PRINT "Suggestion: " + AI.ERRORFIX(assistant)
END IF
```

### Rate Limiting and Quotas
```basic
LET remaining = AI.QUOTA(assistant)        ' Requests remaining
LET reset_time = AI.RESET_TIME(assistant)  ' When quota resets
LET delay = AI.RATE_LIMIT(assistant)       ' Delay until next request
```

### Usage Monitoring
```basic
LET tokens_used = AI.TOKENS(assistant)     ' Total tokens consumed
LET requests = AI.REQUESTS(assistant)      ' Number of API calls made
LET cost_estimate = AI.COST(assistant)     ' Estimated cost in USD
```

## Integration Patterns

### Real-time AI Processing
```basic
ROUTINE live_translator
10  LET message = WS.RECEIVE(chat_socket)
20  LET translated = AI.TRANSLATE(translator, message, "spanish")
30  WS.SEND spanish_socket, translated
40  GOTO 10
END ROUTINE

LET translator = AI.CREATE("openai", "gpt-3.5-turbo")
AI.SYSTEM translator, "Translate text to Spanish accurately and naturally"
SPAWN live_translator
```

### AI-Enhanced Data Processing
```basic
LET analyzer = AI.CREATE("anthropic", "claude-3-5-sonnet")
LET data = HTTP.GET("api.company.com/feedback")
LET parsed = JSON.PARSE(data)

FOR i = 0 TO ARRAY.LENGTH(parsed) - 1
  LET feedback = JSON.GET(parsed[i], "comment")
  LET sentiment = AI.SENTIMENT(analyzer, feedback)
  LET summary = AI.SUMMARIZE(analyzer, feedback, 20)
  
  PRINT "Feedback " + STR$(i) + ": " + summary
  PRINT "Sentiment: " + STR$(sentiment)
  PRINT "---"
NEXT i
```

### Interactive AI Assistant
```basic
LET helper = AI.CREATE("openai", "gpt-4")
AI.SYSTEM helper, "You are a BASIC9000 programming assistant"

ROUTINE ai_chat
10  INPUT "You: ", user_input
20  IF user_input = "quit" THEN END
30  
40  AI.USER helper, user_input
50  LET response = AI.ASSISTANT(helper)
60  PRINT "AI: " + response
70  PRINT
80  GOTO 10
END ROUTINE

SPAWN ai_chat
```

### Code Generation Pipeline
```basic
LET architect = AI.CREATE("anthropic", "claude-3-5-sonnet")
LET implementer = AI.CREATE("openai", "gpt-4")
LET tester = AI.CREATE("openai", "gpt-3.5-turbo")

AI.SYSTEM architect, "Design software architecture and APIs"
AI.SYSTEM implementer, "Implement code based on architectural designs"
AI.SYSTEM tester, "Write tests for implemented code"

INPUT "What do you want to build? ", project_idea

LET design = AI.GENERATE(architect, "Design: " + project_idea)
LET code = AI.GENERATE(implementer, "Implement: " + design)
LET tests = AI.GENERATE(tester, "Test: " + code)

PRINT "=== DESIGN ==="
PRINT design
PRINT "=== CODE ==="
PRINT code
PRINT "=== TESTS ==="
PRINT tests
```

### Background AI Processing
```basic
LET processor = AI.CREATE("openai", "gpt-3.5-turbo")
LET queue = []

ROUTINE ai_worker
10  IF ARRAY.LENGTH(queue) > 0 THEN
20    LET task = queue[0]
30    LET result = AI.GENERATE(processor, task)
40    PRINT "Completed: " + result
50    queue = ARRAY.SLICE(queue, 1)  ' Remove first item
60  END IF
70  SYS.SLEEP(1000)
80  GOTO 10
END ROUTINE

' Add tasks to queue
ARRAY.PUSH queue, "Summarize the latest tech news"
ARRAY.PUSH queue, "Write a haiku about programming"
ARRAY.PUSH queue, "Explain quantum computing simply"

SPAWN ai_worker
```

## Provider-Specific Features

### OpenAI Integration
```basic
LET gpt = AI.CREATE("openai", "gpt-4")
AI.SEED gpt, 12345                     ' Set seed for reproducible output
AI.RESPONSE_FORMAT gpt, "json"         ' Request JSON response format
LET usage = AI.USAGE(gpt)              ' Get detailed token usage
```

### Anthropic Integration
```basic
LET claude = AI.CREATE("anthropic", "claude-3-5-sonnet")
AI.PREFILL claude, "I'll help you with" ' Start response with specific text
LET safety = AI.SAFETY_RATING(claude)   ' Get content safety assessment
```

### Google AI Integration
```basic
LET gemini = AI.CREATE("google", "gemini-pro")
AI.SAFETY_SETTINGS gemini, "medium"    ' Content filtering level
LET candidates = AI.CANDIDATES(gemini) ' Get multiple response options
```

## Network and Distributed AI

### Remote AI Instances
```basic
' Connect to AI running on another BASIC9000 instance
LET remote_ai = AI.CREATE("network", "192.168.1.100:8080/llama")
LET result = AI.GENERATE(remote_ai, "Hello from remote!")

' Load balancing across multiple AI nodes
LET cluster = AI.CREATE("cluster", ["node1:8080", "node2:8080", "node3:8080"])
```

### AI Sharing Between Routines
```basic
' Global AI instance accessible to all routines
GLOBAL shared_ai = AI.CREATE("openai", "gpt-3.5-turbo")

ROUTINE routine_a
10  LET result_a = AI.GENERATE(shared_ai, "Task A")
20  SYS.SLEEP(5000)
30  GOTO 10
END ROUTINE

ROUTINE routine_b  
10  LET result_b = AI.GENERATE(shared_ai, "Task B")
20  SYS.SLEEP(7000)
30  GOTO 10
END ROUTINE

SPAWN routine_a
SPAWN routine_b
```

## Configuration and Defaults

### Global AI Settings
```basic
AI.DEFAULT_PROVIDER "openai"           ' Set default provider
AI.DEFAULT_MODEL "gpt-3.5-turbo"      ' Set default model
AI.DEFAULT_TEMPERATURE 0.7            ' Set default creativity
AI.TIMEOUT 30                         ' Request timeout in seconds
AI.RETRY_COUNT 3                      ' Number of retry attempts
```

### Environment Configuration
```basic
' Load configuration from environment or file
AI.LOAD_CONFIG "ai-config.json"       ' Load from JSON file
AI.LOAD_ENV_KEYS()                    ' Load API keys from environment

' Save current configuration
AI.SAVE_CONFIG "my-ai-setup.json"
```

## Implementation Notes

### Performance Considerations
- AI instances maintain connection pools for efficient API usage
- Streaming responses provide better user experience for long generations
- Local caching can reduce API calls for repeated requests
- Background processing prevents UI blocking during generation

### Cost Management
- Monitor token usage and API costs across all instances
- Implement usage quotas and warnings for budget control
- Cache frequently requested information to reduce API calls
- Use appropriate models for each task (don't use GPT-4 for simple tasks)

### Security and Privacy
- API keys should be stored securely and not logged
- Implement request/response logging for debugging (without sensitive data)
- Validate all inputs before sending to AI services
- Consider data residency requirements for sensitive information

### Error Recovery
- Automatic retry with exponential backoff for transient failures
- Graceful degradation when AI services are unavailable
- Clear error messages that help users understand and resolve issues
- Fallback to alternative providers when primary service fails

### Future Extensibility
- Plugin architecture allows adding new AI providers
- Instance abstraction enables seamless local/remote switching
- Configuration system supports provider-specific features
- Tool calling framework enables AI access to BASIC9000 capabilities

This AI API specification provides comprehensive artificial intelligence capabilities through a clean, instance-based interface that abstracts implementation details while maintaining the power and simplicity that defines BASIC9000.