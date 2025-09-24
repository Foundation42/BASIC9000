# AI as First-Class Citizen in BASIC9000 ## Design Document for Natural Language Programming Integration ### Overview This document outlines the roadmap for elevating AI from external service to first-class language citizen in BASIC9000. The goal is progressive sublimation of explicit code with natural language specifications while maintaining performance, debuggability, and user agency. --- ## Phase 1: Easy Wins (Immediate Implementation) ### 1.1 AI Assistant as Record Type **Current State:**
basic
LET assistant = AI.CREATE("openai", "gpt-4")
AI.TEMPERATURE(assistant, 0.7)
AI.SYSTEM(assistant, "You are helpful")
**Target State:**
basic
TYPE AIAssistant
  Temperature AS NUMBER
  MaxTokens AS NUMBER  
  SystemPrompt AS STRING
  CachePolicy AS STRING
  RetryCount AS NUMBER
  Timeout AS NUMBER
END TYPE

LET assistant = NEW AIAssistant("openai", "gpt-4")
assistant.Temperature = 0.7
assistant.SystemPrompt = "You are a MIDI expert"
assistant.CachePolicy = "aggressive"
**Benefits:** - Type safety and property discoverability - Consistent with BASIC9000's record system - UFCS method syntax via property access - Clear configuration model ### 1.2 Declarative AI Functions **Implementation:**
basic
ASYNC FUNCTION Summarize(self AS AIAssistant, text AS STRING) AS STRING
  ' Generated implementation calls AI backend
END FUNCTION

' Usage
LET summary$ = AWAIT assistant.Summarize("long document text")
**AIFUNC Syntax Sugar:**
basic
AIFUNC assistant.AnalyzeSentiment(text AS STRING) AS NUMBER
  Analyze the sentiment of the given text.
  Return a number from -1 (very negative) to 1 (very positive).
END AIFUNC
**Compiler Transformation:** - Parse declarative prompt in AIFUNC body - Generate appropriate ASYNC FUNCTION with AI.GENERATE calls - Handle type coercion and validation - Provide clear error messages for malformed responses ### 1.3 Built-in Error Handling **Robust Fallback Patterns:**
basic
' Automatic retry with exponential backoff
assistant.RetryCount = 3

' Graceful degradation
TRY
  LET result$ = AWAIT assistant.Summarize(document$)
CATCH AITimeout
  LET result$ = "Summary unavailable - service timeout"
CATCH AIRateLimit  
  LET result$ = "Summary unavailable - rate limited"
END TRY
**Error Types:** - AITimeout: Network or response timeout - AIRateLimit: API rate limiting - AIParseError: Response doesn't match expected type - AIRefusal: Model refuses to respond --- ## Phase 2: Future Vision (6-24 months) ### 2.1 Async String Interpolation **Concept:**
basic
' AI-powered string interpolation
LET weather_ai = NEW AIAssistant("local", "weather-model")
LET description$ = AWAIT ai"Describe this weather: ${raw_data} in casual terms"

' With fallback syntax
LET summary$ = AWAIT ai"Summarize: ${document}" ?? "Summary unavailable"
**Technical Challenges:** - Variable capture semantics (eager vs lazy evaluation) - Error handling within interpolation - Performance optimization for common patterns - Caching strategies for repeated interpolations ### 2.2 Compile-Time AI Expansion **Natural Language Code Generation:**
basic
YOLO FUNCTION ProcessData(items AS ARRAY) AS ARRAY
  Sort the items by their priority score and return the top 10 results.
  If two items have the same priority, sort by creation date.
END YOLO
**Compiler Behavior:** - Parse natural language specification - Generate optimized implementation at compile time - Cache generated code for identical specifications - Provide "show generated code" option for debugging - Warn about ambiguous specifications **Under-specification Handling:**
basic
YOLO FUNCTION SortStuff(data AS ARRAY) AS ARRAY
  Sort the data
END YOLO

' Compiler error: "Ambiguous specification. Sort by what criteria?"
' Suggestions: "Sort by value", "Sort alphabetically", "Sort by date"
### 2.3 Progressive Disclosure System **Abstraction Layers:** 1. **Natural Language** - Intent expressed in plain English 2. **Generated Code** - AI-produced implementation 3. **Optimized Assembly** - Final compiled output **Developer Control:**
basic
' Show what was generated
SHOW GENERATED ProcessData

' Override generated implementation
OVERRIDE FUNCTION ProcessData(items AS ARRAY) AS ARRAY
  ' Custom implementation here
END OVERRIDE

' Profile performance
PROFILE ProcessData WITH test_data
### 2.4 Context-Aware AI Integration **Domain-Specific Models:**
basic
' Different AI assistants for different domains
LET music_ai = NEW AIAssistant("local", "music-theory-model")
LET code_ai = NEW AIAssistant("local", "programming-model")  
LET math_ai = NEW AIAssistant("local", "mathematics-model")

' Context automatically selected based on function domain
AIFUNC GenerateChord(key AS STRING, mood AS STRING) AS STRING
  ' Automatically uses music_ai
END AIFUNC
**ESP32 Integration:**
basic
' Hardware-accelerated inference with latency guarantees
TYPE LocalAI EXTENDS AIAssistant
  MaxLatencyMs AS NUMBER
  PowerBudgetMw AS NUMBER
  ModelSize AS STRING  ' "tiny", "small", "medium"
END TYPE

LET embedded_ai = NEW LocalAI("hardware", "midi-model")
embedded_ai.MaxLatencyMs = 10  ' Real-time requirement
embedded_ai.ModelSize = "tiny"
--- ## Implementation Strategy ### Phase 1 Milestones 1. **Week 1-2**: Convert AI.CREATE to record type system 2. **Week 3**: Implement AIFUNC syntax and code generation 3. **Week 4**: Add comprehensive error handling and fallback patterns 4. **Week 5-6**: Testing and refinement with real applications ### Phase 2 Research Areas 1. **Natural Language Parsing**: Robust intent extraction from English 2. **Code Generation**: Reliable transformation from intent to implementation 3. **Ambiguity Resolution**: Interactive clarification systems 4. **Performance Optimization**: Caching and compilation strategies 5. **Hardware Integration**: ESP32 AI acceleration APIs ### Risk Mitigation **Technical Risks:** - AI response reliability - Mitigate with validation and fallbacks - Performance overhead - Address with compile-time generation and caching - Debugging complexity - Provide clear visibility into generated code **Adoption Risks:** - Community resistance - Address with progressive disclosure and opt-in features - Over-reliance on AI - Maintain ability to write explicit code - Vendor lock-in - Support multiple AI backends and local models --- ## Success Metrics ### Phase 1 Success Criteria - AI functions work reliably for common use cases (>95% success rate) - Error handling provides clear, actionable feedback - Performance acceptable for interactive use (<2s typical response) - Developer experience feels natural and discoverable ### Phase 2 Success Criteria - Natural language specifications compile to correct code (>80% accuracy) - Generated code performance within 2x of hand-written equivalent - Under-specification detection catches ambiguous requests (>90% precision) - Users can productively build applications without writing traditional code ### Long-term Vision - BASIC9000 becomes the preferred language for rapid AI-integrated prototyping - ESP32 deployment enables edge AI applications with real-time guarantees - Community develops shared library of natural language specifications - Programming becomes accessible to non-technical domain experts --- ## Conclusion The path to AI-first programming requires careful balance between power and simplicity. Phase 1 focuses on solid foundations using existing language features. Phase 2 pushes boundaries while maintaining escape hatches for when precision matters. The key insight is progressive disclosure - users can operate at their comfort level while having access to deeper control when needed. This approach respects both the accessibility goals of BASIC and the practical requirements of real applications.

# AIFUNC.md — AI as a First‑Class Citizen in BASIC9000 (v0.1)

**Status:** Draft spec for Phase 1 (ship‑able).
**Scope:** Assistant record type, `AIFUNC` syntax, desugaring, validation, caching, errors, tracing, and a FakeAI backend for tests.
**Design goals:** Native feel, strong defaults, predictable overrides, type‑driven validation, tiny runtime surface.

---

## 0) TL;DR

* **Assistant defaults:** `assistant.SystemPrompt` holds the default system prompt.
* **Overrides:** Call‑site overrides > AIFUNC `SYSTEM` > assistant default.
* **Return type = schema:** The **AIFUNC return type** defines the response schema. `EXPECT` is optional and only **refines** (adds constraints).
* **AIFUNC desugars** to an `ASYNC FUNCTION` that calls `AI.GENERATE(assistant, system, prompt, schema, attrs)`, then validates/coerces.
* **Caching/tracing/costs** are built‑in and tuple‑native.

---

## 1) Assistant Record

```basic
TYPE AIAssistant
  Provider     AS STRING   ' "openai", "anthropic", "local", "fake"
  Model        AS STRING   ' "gpt-4o-mini", etc.
  Temperature  AS NUMBER   ' 0..2 (provider dependent)
  MaxTokens    AS NUMBER   ' output cap
  SystemPrompt AS STRING   ' default system prompt
  CachePolicy  AS STRING   ' "none" | "ttl:300" | "aggressive"
  RetryCount   AS NUMBER   ' default 0..3
  Timeout      AS NUMBER   ' ms
  CostBudget   AS NUMBER   ' USD cap per call
END TYPE
```

### 1.1 Helper: non‑mutating overrides

```basic
FUNCTION With(self AS AIAssistant, attrs AS RECORD) AS AIAssistant
  ' returns shallow copy of self with provided fields
END FUNCTION
```

Usage:

```basic
LET fast = assistant.With({ Temperature:0.2, Model:"gpt-4o-mini" })
```

---

## 2) `AIFUNC` Syntax

**Purpose:** Declare an AI‑backed function with a **typed** result and an explicit prompt.

```basic
AIFUNC assistant.Func(params…) AS ReturnType [USING { overrides… }]
  [SYSTEM  "system‑prompt override"]
  PROMPT  "templated prompt with ${captures}"
  [EXPECT  <constraints>]    ' optional refinement; must be compatible with ReturnType
END AIFUNC
```

### 2.1 Precedence (system prompt)

```
call‑site overrides  >  AIFUNC SYSTEM  >  assistant.SystemPrompt
```

### 2.2 Return‑type‑driven schema

* The **declared return type** is the schema used to coerce/validate model output.
* Supported shapes: `STRING`, `NUMBER`, `BOOL`, `ARRAY<T>`, `RECORD { field:Type, … }`.
* `ANY` is allowed but **discouraged**; validator only ensures valid JSON.

### 2.3 Optional `EXPECT` refinement

`EXPECT` adds constraints that **narrow** the return type (a subschema). Examples:

* Numbers: `RANGE [-1,1]`
* Strings: `LENGTH 0..120`, `MATCH /regex/`
* Arrays: `LENGTH 3..5`, element constraints via `OF <constraint>`
* Records: partial constraint map, e.g. `EXPECT { bullets: LENGTH 0..5 }`

**If an EXPECT conflicts with the return type → compile‑time error.**

### 2.4 Prompt interpolation

* `${expr}` is evaluated **left‑to‑right once**, result stringified.
* Escape `${` as `\${`.

---

## 3) Desugaring

Given:

```basic
TYPE Summary
  summary AS STRING
  bullets AS ARRAY<STRING>
END TYPE

AIFUNC assistant.Summarize(text AS STRING) AS Summary
  SYSTEM "You write crisp technical summaries."
  PROMPT "Summarize in <= 3 bullets and one sentence.\n\n${text}"
  EXPECT { bullets: LENGTH 0..3 }
END AIFUNC
```

**Desugars to:**

```basic
ASYNC FUNCTION Summarize(self AS AIAssistant, text AS STRING) AS Summary
  LET system$ = EFFECTIVE_SYSTEM(self, "You write crisp technical summaries.")
  LET prompt$ = TEMPLATE("Summarize in <= 3 bullets and one sentence.\n\n${text}", { text })
  LET schema  = SCHEMA.Record({ summary: STRING, bullets: ARRAY(STRING, LENGTH 0..3) })
  LET raw     = AWAIT AI.GENERATE(self, system$, prompt$, schema, NULL)
  RETURN AI.COERCE(raw, schema)   ' may throw AIParseError
END FUNCTION
```

---

## 4) Runtime API (minimal surface)

```basic
' Provider shim
ASYNC FUNCTION AI.GENERATE(a AS AIAssistant, system AS STRING, prompt AS STRING, schema AS ANY, attrs AS ANY) AS STRING

' Validation/coercion (deterministic)
FUNCTION AI.COERCE(raw AS STRING, schema AS ANY) AS ANY   ' throws AIParseError
FUNCTION AI.MATCH_JSON(raw AS STRING, schema AS ANY) AS BOOL

' Trace & cost
SUB      AI.SHOW_TRACE(a AS AIAssistant, on AS BOOL)
FUNCTION AI.LAST_COST(a AS AIAssistant) AS RECORD { input:NUMBER, output:NUMBER, dollars:NUMBER }
```

### 4.1 Tuple‑native call + caching

Every call is a tuple frame (see `TUPLE.md`):

```
("B9v1","AICALL", a_tuple, system$, prompt$, schema_tuple, span, cap?)
```

**Cache key hash** includes: `Provider, Model, Temperature, MaxTokens, system$, prompt$, schema_hash` + call overrides.
`CachePolicy`: `none | ttl:N | aggressive`.

### 4.2 Error taxonomy

* `AITimeout`, `AIRateLimit`, `AIQuotaExceeded`, `AIUnavailable`
* `AIParseError` (schema mismatch), `AIRefusal` (safety/policy refusal)
* `AISafetyBlock` (host policy veto), `AICostExceeded` (exceeded `CostBudget`)

---

## 5) Validation rules (schema → checks)

**Primitives**

* `STRING`: any JSON string; with constraints: `LENGTH`, `MATCH`.
* `NUMBER`: JSON number; constraints: `RANGE [min,max]`.
* `BOOL`: JSON boolean.

**Arrays**

* `ARRAY<T>`: JSON array; each element validated against `T`.
* Constraints: `LENGTH n` or `LENGTH a..b`; element constraints via `OF`.

**Records**

* Exact field set unless `ALLOW_EXTRA` is specified in EXPECT.
* Missing field → error; type mismatch → error.
* Partial constraints apply only to listed fields.
* `LENGTH` inside records works for string or array fields; other types raise `AIParseError`.
* Add `ALLOW_EXTRA` inside `EXPECT { ... }` to permit provider-supplied fields beyond the declared record shape.

**ANY**

* Must be valid JSON; no further checks unless `EXPECT` refines.

---

## 6) Examples

### 6.1 Simple string

```basic
AIFUNC assistant.MakeTitle(text AS STRING) AS STRING
  PROMPT "Give a concise title for:\n${text}"
END AIFUNC
```

### 6.2 Numeric with range

```basic
AIFUNC assistant.Sentiment(text AS STRING) AS NUMBER
  PROMPT "Return a real number in [-1,1] for:\n${text}"
  EXPECT RANGE [-1, 1]
END AIFUNC
```

### 6.3 Record with array constraint

```basic
TYPE Summary
  summary AS STRING
  bullets AS ARRAY<STRING>
END TYPE

AIFUNC assistant.Summarize(text AS STRING) AS Summary
  PROMPT "Return JSON: { summary, bullets } with at most 5 bullets.\n\n${text}"
  EXPECT { summary: LENGTH 1..160, bullets: LENGTH 0..5 }
END AIFUNC
```

Add `ALLOW_EXTRA` inside the record constraint when providers tack on metadata fields you want to tolerate:

```basic
  EXPECT { ALLOW_EXTRA, summary: LENGTH 1..160, bullets: LENGTH 0..5 }
```

### 6.4 Per‑call overrides without mutation

```basic
LET fast = assistant.With({ Temperature:0.2, CachePolicy:"ttl:300" })
PRINT AWAIT fast.MakeTitle(doc$)
```

### 6.5 Robust fallback

```basic
TRY
  PRINT AWAIT assistant.Sentiment(tweet$)
CATCH AIParseError
  PRINT 0
CATCH AIRateLimit
  PRINT "(rate limited)"
END TRY
```

---

## 7) FakeAI backend (for tests)

**Goal:** deterministic, offline conformance.

Rules (suggested):

* If schema is `STRING` → return `"TITLE:" + HASH(prompt$)%10000`.
* If `NUMBER RANGE [-1,1]` → return `0` (or a hash‑derived float within range).
* If `RECORD { summary: STRING, bullets: ARRAY<STRING> }` with `bullets LENGTH 0..N` → return `{"summary":"OK","bullets":["A","B"]}` truncated to the max.
* If constraints violated → provider returns malformed JSON to trigger `AIParseError` tests.

**Provider id:** `Provider:"fake"`, `Model:"deterministic"`.

Conformance tests should cover: string/number/record success, parse failure, caching hit/miss (same inputs), cost ceiling.

---

## 8) Security, privacy, and cost

* **Sanitization:** provide `AI.SANITIZE(text, policy)`; default policy strips secrets/URLs if configured.
* **Capability tokens:** assistant may carry a capability for servers; do **not** include in cache keys.
* **Cost ceilings:** reject when estimated cost > `CostBudget` → `AICostExceeded`.
* **Tracing:** enable with `AI.SHOW_TRACE(a, TRUE)`; emit a transcript tuple per call:

```
("b9","ai","trace", span, ("system",s$), ("prompt",p$), ("schema",schema_hash), ("usage",in,out,$))
```

---

## 9) Grammar (EBNF excerpt)

```
AIFuncDecl := "AIFUNC" Identifier '.' Identifier '(' [ ParamList ] ')' 'AS' Type [ 'USING' RecordLit ]\n               [ 'SYSTEM' StringLit ]\n               'PROMPT' StringLit\n               [ 'EXPECT' ExpectClause ]\n               'END' 'AIFUNC'

ExpectClause := NumberRange | LengthRange | Regex | RecordConstraint
NumberRange  := 'RANGE' '[' Number ',' Number ']'
LengthRange  := 'LENGTH' (Number | Number '..' Number)
Regex        := 'MATCH' '/' <regex> '/'
RecordConstraint := '{' RecordFieldConstraint { ',' RecordFieldConstraint } '}'
RecordFieldConstraint := 'ALLOW_EXTRA' | Identifier ':' (LengthRange | Regex | NumberRange)
```

---

## 10) Implementation checklist

**Parser/AST**

* Parse `AIFUNC` with optional `USING`, `SYSTEM`, `EXPECT`.
* Capture prompt template with `${}` capture sites.

**Binder/Emitter**

* Compute effective system prompt at call.
* Build schema from return type + EXPECT refinements.
* Emit desugared `ASYNC FUNCTION` body.

**Runtime**

* Provider shims: `openai`, `anthropic`, `local`, `fake`.
* Tuple frames + caching keyed by canonical tuple.
* Validation/coercion library for schemas.
* Tracing + cost accounting.

**Tests**

* FakeAI: success paths for each type shape; parse failure; retries; cache policy; cost ceiling; tracing enabled.

---

## 11) Migration notes

* Existing `AI.CREATE/AI.SYSTEM/...` continue to work.
* New work should prefer `AIAssistant` + `AIFUNC`.
* Add README examples mirroring **6.x** above.

---

*End of AIFUNC.md v0.1*
