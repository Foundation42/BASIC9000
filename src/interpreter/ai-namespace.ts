import { createFunction, createNamespace } from './host.js';
import type { HostNamespaceValue } from './host.js';
import { requireStringArg, requireNumberArg } from './host-defaults.js';

// Store for API keys
const apiKeys = new Map<string, string>();

// Store for AI instances
const aiInstances = new Map<string, AIInstance>();
let nextInstanceId = 1;

// Default configuration
const defaultConfig = {
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 1000,
  timeout: 30000,
  retryCount: 3
};

interface AIConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  systemPrompt?: string;
  endpoint?: string; // For custom OpenAI-compatible endpoints
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class AIInstance {
  public readonly id: string;
  public readonly value: HostNamespaceValue;
  public config: AIConfig;
  private messages: Message[] = [];
  private totalTokens = 0;
  private requestCount = 0;
  private lastError?: string;
  private lastErrorCode?: number;

  constructor(provider: string, model: string) {
    this.id = `ai_${nextInstanceId++}`;
    this.config = {
      provider,
      model,
      temperature: defaultConfig.temperature,
      maxTokens: defaultConfig.maxTokens
    };

    // Set default endpoint based on provider
    if (provider === 'openai') {
      this.config.endpoint = 'https://api.openai.com/v1';
    } else if (provider === 'anthropic') {
      this.config.endpoint = 'https://api.anthropic.com/v1';
    } else if (provider === 'openai-compatible' || provider === 'generic') {
      // Endpoint must be set explicitly for generic providers
      this.config.endpoint = '';
    }

    // Create the instance namespace
    this.value = createNamespace(`AI.${this.id}`, {
      ID: this.id,
      PROVIDER: provider,
      MODEL: model
    });

    aiInstances.set(this.id, this);
  }

  setEndpoint(endpoint: string) {
    this.config.endpoint = endpoint;
  }

  setTemperature(temp: number) {
    this.config.temperature = Math.max(0, Math.min(2, temp));
  }

  setMaxTokens(tokens: number) {
    this.config.maxTokens = Math.max(1, tokens);
  }

  setSystemPrompt(prompt: string) {
    this.config.systemPrompt = prompt;
    // Add or update system message
    const systemIndex = this.messages.findIndex(m => m.role === 'system');
    if (systemIndex >= 0) {
      this.messages[systemIndex].content = prompt;
    } else {
      this.messages.unshift({ role: 'system', content: prompt });
    }
  }

  addUserMessage(content: string) {
    this.messages.push({ role: 'user', content });
  }

  addAssistantMessage(content: string) {
    this.messages.push({ role: 'assistant', content });
  }

  async generate(prompt: string, maxTokens?: number): Promise<string> {
    // Add user message temporarily if this is a one-off generation
    const tempMessage = { role: 'user' as const, content: prompt };
    const messages = [...this.messages, tempMessage];

    try {
      const response = await this.callAPI(messages, maxTokens);
      return response;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async assistant(): Promise<string> {
    // Generate response for current conversation
    try {
      const response = await this.callAPI(this.messages);
      this.addAssistantMessage(response);
      return response;
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  private async callAPI(messages: Message[], maxTokens?: number): Promise<string> {
    const provider = this.config.provider;

    if (provider === 'openai' || provider === 'openai-compatible' || provider === 'generic') {
      return this.callOpenAIAPI(messages, maxTokens);
    } else if (provider === 'anthropic') {
      return this.callAnthropicAPI(messages, maxTokens);
    } else {
      throw new Error(`Unsupported AI provider: ${provider}`);
    }
  }

  private async callOpenAIAPI(messages: Message[], maxTokens?: number): Promise<string> {
    const apiKey = apiKeys.get('openai') || process.env.OPENAI_API_KEY;
    if (!apiKey && this.config.provider === 'openai') {
      throw new Error('OpenAI API key not configured. Use AI.KEY "openai", your_key');
    }

    const endpoint = this.config.endpoint || 'https://api.openai.com/v1';
    const url = `${endpoint}/chat/completions`;

    const body = {
      model: this.config.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      temperature: this.config.temperature,
      max_tokens: maxTokens || this.config.maxTokens,
      ...(this.config.topP !== undefined && { top_p: this.config.topP }),
      ...(this.config.frequencyPenalty !== undefined && { frequency_penalty: this.config.frequencyPenalty }),
      ...(this.config.presencePenalty !== undefined && { presence_penalty: this.config.presencePenalty })
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // Only add auth header if we have an API key
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      this.lastErrorCode = response.status;
      throw new Error(`OpenAI API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    this.requestCount++;
    this.totalTokens += data.usage?.total_tokens || 0;

    return data.choices[0]?.message?.content || '';
  }

  private async callAnthropicAPI(messages: Message[], maxTokens?: number): Promise<string> {
    const apiKey = apiKeys.get('anthropic') || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Anthropic API key not configured. Use AI.KEY "anthropic", your_key');
    }

    const endpoint = this.config.endpoint || 'https://api.anthropic.com/v1';
    const url = `${endpoint}/messages`;

    // Convert messages to Anthropic format
    const systemPrompt = messages.find(m => m.role === 'system')?.content;
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const body = {
      model: this.config.model,
      messages: conversationMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      })),
      max_tokens: maxTokens || this.config.maxTokens,
      temperature: this.config.temperature,
      ...(systemPrompt && { system: systemPrompt }),
      ...(this.config.topP !== undefined && { top_p: this.config.topP })
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const error = await response.text();
      this.lastErrorCode = response.status;
      throw new Error(`Anthropic API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    this.requestCount++;
    this.totalTokens += data.usage?.input_tokens || 0;
    this.totalTokens += data.usage?.output_tokens || 0;

    return data.content[0]?.text || '';
  }

  reset() {
    this.messages = this.config.systemPrompt
      ? [{ role: 'system', content: this.config.systemPrompt }]
      : [];
    this.totalTokens = 0;
    this.requestCount = 0;
    this.lastError = undefined;
    this.lastErrorCode = undefined;
  }

  destroy() {
    aiInstances.delete(this.id);
  }

  getHistory(): Message[] {
    return [...this.messages];
  }

  getTokens(): number {
    return this.totalTokens;
  }

  getRequests(): number {
    return this.requestCount;
  }

  getError(): string | undefined {
    return this.lastError;
  }

  getErrorCode(): number | undefined {
    return this.lastErrorCode;
  }
}

export function createAINamespace() {
  return createNamespace('AI', {
    // Instance creation
    CREATE: createFunction('AI.CREATE', (args) => {
      const provider = requireStringArg('AI.CREATE', args, 0).toLowerCase();
      const model = requireStringArg('AI.CREATE', args, 1);

      // Support "generic" as an alias for "openai-compatible"
      const normalizedProvider = provider === 'generic' ? 'openai-compatible' : provider;

      const instance = new AIInstance(normalizedProvider, model);

      // If there's a third argument for generic/openai-compatible, it's the endpoint
      if ((normalizedProvider === 'openai-compatible') && args.length >= 3) {
        const endpoint = requireStringArg('AI.CREATE', args, 2);
        instance.setEndpoint(endpoint);
      }

      return instance.value;
    }),

    // API key management
    KEY: createFunction('AI.KEY', (args) => {
      const provider = requireStringArg('AI.KEY', args, 0).toLowerCase();
      const key = requireStringArg('AI.KEY', args, 1);
      apiKeys.set(provider, key);
      return 0;
    }),

    // Instance configuration
    TEMPERATURE: createFunction('AI.TEMPERATURE', (args) => {
      const instanceValue = args[0];
      const temp = requireNumberArg('AI.TEMPERATURE', args, 1);
      const instance = findInstance(instanceValue);
      instance.setTemperature(temp);
      return temp;
    }),

    MAX_TOKENS: createFunction('AI.MAX_TOKENS', (args) => {
      const instanceValue = args[0];
      const tokens = requireNumberArg('AI.MAX_TOKENS', args, 1);
      const instance = findInstance(instanceValue);
      instance.setMaxTokens(tokens);
      return tokens;
    }),

    SYSTEM: createFunction('AI.SYSTEM', (args) => {
      const instanceValue = args[0];
      const prompt = requireStringArg('AI.SYSTEM', args, 1);
      const instance = findInstance(instanceValue);
      instance.setSystemPrompt(prompt);
      return 0;
    }),

    ENDPOINT: createFunction('AI.ENDPOINT', (args) => {
      const instanceValue = args[0];
      const endpoint = requireStringArg('AI.ENDPOINT', args, 1);
      const instance = findInstance(instanceValue);
      instance.setEndpoint(endpoint);
      return 0;
    }),

    // Text generation
    GENERATE: createFunction('AI.GENERATE', async (args) => {
      const instanceValue = args[0];
      const prompt = requireStringArg('AI.GENERATE', args, 1);
      const maxTokens = args.length >= 3 ? requireNumberArg('AI.GENERATE', args, 2) : undefined;
      const instance = findInstance(instanceValue);
      return await instance.generate(prompt, maxTokens);
    }),

    // Conversation management
    USER: createFunction('AI.USER', (args) => {
      const instanceValue = args[0];
      const message = requireStringArg('AI.USER', args, 1);
      const instance = findInstance(instanceValue);
      instance.addUserMessage(message);
      return 0;
    }),

    ASSISTANT: createFunction('AI.ASSISTANT', async (args) => {
      const instanceValue = args[0];
      const instance = findInstance(instanceValue);
      return await instance.assistant();
    }),

    HISTORY: createFunction('AI.HISTORY', (args) => {
      const instanceValue = args[0];
      const instance = findInstance(instanceValue);
      const history = instance.getHistory();
      return history.map(m => `${m.role}: ${m.content}`);
    }),

    // Instance lifecycle
    RESET: createFunction('AI.RESET', (args) => {
      const instanceValue = args[0];
      const instance = findInstance(instanceValue);
      instance.reset();
      return 0;
    }),

    DESTROY: createFunction('AI.DESTROY', (args) => {
      const instanceValue = args[0];
      const instance = findInstance(instanceValue);
      instance.destroy();
      return 0;
    }),

    // Instance information
    MODEL: createFunction('AI.MODEL', (args) => {
      const instanceValue = args[0];
      const instance = findInstance(instanceValue);
      return instance.config?.model || '';
    }),

    PROVIDER: createFunction('AI.PROVIDER', (args) => {
      const instanceValue = args[0];
      const instance = findInstance(instanceValue);
      return instance.config?.provider || '';
    }),

    TOKENS: createFunction('AI.TOKENS', (args) => {
      const instanceValue = args[0];
      const instance = findInstance(instanceValue);
      return instance.getTokens();
    }),

    REQUESTS: createFunction('AI.REQUESTS', (args) => {
      const instanceValue = args[0];
      const instance = findInstance(instanceValue);
      return instance.getRequests();
    }),

    ERROR: createFunction('AI.ERROR', (args) => {
      const instanceValue = args[0];
      const instance = findInstance(instanceValue);
      return instance.getError() ? 1 : 0;
    }),

    ERRORMSG: createFunction('AI.ERRORMSG', (args) => {
      const instanceValue = args[0];
      const instance = findInstance(instanceValue);
      return instance.getError() || '';
    }),

    ERRORCODE: createFunction('AI.ERRORCODE', (args) => {
      const instanceValue = args[0];
      const instance = findInstance(instanceValue);
      return instance.getErrorCode() || 0;
    }),

    // Specialized operations
    TRANSLATE: createFunction('AI.TRANSLATE', async (args) => {
      const instanceValue = args[0];
      const text = requireStringArg('AI.TRANSLATE', args, 1);
      const targetLang = requireStringArg('AI.TRANSLATE', args, 2);
      const instance = findInstance(instanceValue);
      const prompt = `Translate the following text to ${targetLang}. Only provide the translation, no explanations:\n\n${text}`;
      return await instance.generate(prompt);
    }),

    SUMMARIZE: createFunction('AI.SUMMARIZE', async (args) => {
      const instanceValue = args[0];
      const text = requireStringArg('AI.SUMMARIZE', args, 1);
      const maxWords = args.length >= 3 ? requireNumberArg('AI.SUMMARIZE', args, 2) : 100;
      const instance = findInstance(instanceValue);
      const prompt = `Summarize the following text in approximately ${maxWords} words:\n\n${text}`;
      return await instance.generate(prompt);
    }),

    SENTIMENT: createFunction('AI.SENTIMENT', async (args) => {
      const instanceValue = args[0];
      const text = requireStringArg('AI.SENTIMENT', args, 1);
      const instance = findInstance(instanceValue);
      const prompt = `Analyze the sentiment of the following text and respond with ONLY a number between -1 (very negative) and 1 (very positive):\n\n${text}`;
      const result = await instance.generate(prompt);
      const score = parseFloat(result);
      return isNaN(score) ? 0 : Math.max(-1, Math.min(1, score));
    }),

    CODE: createFunction('AI.CODE', async (args) => {
      const instanceValue = args[0];
      const request = requireStringArg('AI.CODE', args, 1);
      const instance = findInstance(instanceValue);
      const prompt = `Write code for the following request. Provide ONLY the code without explanations:\n\n${request}`;
      return await instance.generate(prompt);
    }),

    EXPLAIN: createFunction('AI.EXPLAIN', async (args) => {
      const instanceValue = args[0];
      const code = requireStringArg('AI.EXPLAIN', args, 1);
      const instance = findInstance(instanceValue);
      const prompt = `Explain what this code does in simple terms:\n\n${code}`;
      return await instance.generate(prompt);
    }),

    // Global configuration
    DEFAULT_PROVIDER: createFunction('AI.DEFAULT_PROVIDER', (args) => {
      const provider = requireStringArg('AI.DEFAULT_PROVIDER', args, 0);
      defaultConfig.provider = provider;
      return 0;
    }),

    DEFAULT_MODEL: createFunction('AI.DEFAULT_MODEL', (args) => {
      const model = requireStringArg('AI.DEFAULT_MODEL', args, 0);
      defaultConfig.model = model;
      return 0;
    }),

    DEFAULT_TEMPERATURE: createFunction('AI.DEFAULT_TEMPERATURE', (args) => {
      const temp = requireNumberArg('AI.DEFAULT_TEMPERATURE', args, 0);
      defaultConfig.temperature = temp;
      return temp;
    }),

    TIMEOUT: createFunction('AI.TIMEOUT', (args) => {
      const timeout = requireNumberArg('AI.TIMEOUT', args, 0);
      defaultConfig.timeout = timeout * 1000; // Convert to ms
      return timeout;
    })
  });
}

// Helper function to find an AI instance from a value
function findInstance(value: any): AIInstance {
  // Check if it's a namespace with an ID property
  if (typeof value === 'object' && value !== null && 'ID' in value) {
    const id = value.ID;
    const instance = aiInstances.get(id);
    if (instance) {
      return instance;
    }
  }

  // Check all instances for a matching value
  for (const instance of aiInstances.values()) {
    if (instance.value === value) {
      return instance;
    }
  }

  throw new Error('Invalid AI instance handle');
}