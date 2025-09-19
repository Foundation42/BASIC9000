import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { createFunction, createNamespace } from './host.js';
import { requireStringArg } from './host-defaults.js';

// Store for loaded configuration
const configStore = new Map<string, any>();

// Default config file locations
const CONFIG_SEARCH_PATHS = [
  '.basic9000.json',
  '.basic9000.yaml',
  '.basic9000.yml',
  '.env.basic9000',
  path.join(os.homedir(), '.basic9000', 'config.json'),
  path.join(os.homedir(), '.basic9000', 'config.yaml'),
  path.join(os.homedir(), '.basic9000', 'secrets.json'),
  path.join(os.homedir(), '.config', 'basic9000', 'config.json')
];

function parseYAML(content: string): any {
  // Simple YAML parser for basic key-value pairs
  // For full YAML support, we'd need to add js-yaml as a dependency
  const result: any = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex > 0) {
        const key = trimmed.substring(0, colonIndex).trim();
        let value = trimmed.substring(colonIndex + 1).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        // Keep as string for now - we'll handle type conversion when retrieving
        // Parse booleans and numbers are kept as strings in the config

        result[key] = value;
      }
    }
  }

  return result;
}

function parseDotEnv(content: string): any {
  const result: any = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const equalIndex = trimmed.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();

        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }

        result[key] = value;
      }
    }
  }

  return result;
}

function loadConfigFile(filePath: string): any {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.json') {
      return JSON.parse(content);
    } else if (ext === '.yaml' || ext === '.yml') {
      return parseYAML(content);
    } else if (filePath.includes('.env')) {
      return parseDotEnv(content);
    } else {
      // Try to parse as JSON first, then as YAML/env
      try {
        return JSON.parse(content);
      } catch {
        if (content.includes('=')) {
          return parseDotEnv(content);
        } else {
          return parseYAML(content);
        }
      }
    }
  } catch (error) {
    return null;
  }
}

function findAndLoadConfig(): any {
  // Look for config files in standard locations
  for (const configPath of CONFIG_SEARCH_PATHS) {
    const fullPath = path.isAbsolute(configPath)
      ? configPath
      : path.join(process.cwd(), configPath);

    if (fs.existsSync(fullPath)) {
      const config = loadConfigFile(fullPath);
      if (config) {
        console.log(`Loaded config from ${fullPath}`);
        return { ...config, _source: fullPath };
      }
    }
  }

  return {};
}

// Auto-load config on startup
const autoConfig = findAndLoadConfig();
if (autoConfig && Object.keys(autoConfig).length > 0) {
  configStore.set('_auto', autoConfig);

  // Set environment variables from config
  for (const [key, value] of Object.entries(autoConfig)) {
    if (key !== '_source' && typeof value === 'string') {
      // Set as environment variable with BASIC9000_ prefix if not already set
      const envKey = key.toUpperCase().replace(/\./g, '_');
      if (!process.env[envKey]) {
        process.env[envKey] = value;
      }
      // Also set without prefix for common keys like API keys
      if (key.includes('api_key') || key.includes('api-key') || key.includes('apikey')) {
        const simpleKey = key.toUpperCase().replace(/[-\s]/g, '_');
        if (!process.env[simpleKey]) {
          process.env[simpleKey] = value;
        }
      }
    }
  }
}

export function createConfigNamespace() {
  return createNamespace('CONFIG', {
    // Load a specific config file
    LOAD: createFunction('CONFIG.LOAD', (args) => {
      const filePath = requireStringArg('CONFIG.LOAD', args, 0);
      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Config file not found: ${fullPath}`);
      }

      const config = loadConfigFile(fullPath);
      if (!config) {
        throw new Error(`Failed to parse config file: ${fullPath}`);
      }

      const configId = path.basename(filePath, path.extname(filePath));
      configStore.set(configId, config);

      // Apply to environment
      for (const [key, value] of Object.entries(config)) {
        if (typeof value === 'string') {
          const envKey = key.toUpperCase().replace(/[-\s.]/g, '_');
          process.env[envKey] = value;
        }
      }

      return configId;
    }),

    // Get a value from loaded config
    GET: createFunction('CONFIG.GET', (args) => {
      const key = requireStringArg('CONFIG.GET', args, 0);
      const configId = args.length >= 2 ? requireStringArg('CONFIG.GET', args, 1) : '_auto';

      const config = configStore.get(configId);
      if (!config) {
        return '';
      }

      // Support nested keys with dot notation
      const keys = key.split('.');
      let value: any = config;
      for (const k of keys) {
        if (value && typeof value === 'object') {
          value = value[k];
        } else {
          return '';
        }
      }

      return value !== undefined ? String(value) : '';
    }),

    // Set a config value
    SET: createFunction('CONFIG.SET', (args) => {
      const key = requireStringArg('CONFIG.SET', args, 0);
      const value = requireStringArg('CONFIG.SET', args, 1);
      const configId = args.length >= 3 ? requireStringArg('CONFIG.SET', args, 2) : '_auto';

      let config = configStore.get(configId);
      if (!config) {
        config = {};
        configStore.set(configId, config);
      }

      // Support nested keys with dot notation
      const keys = key.split('.');
      let current = config;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!current[k] || typeof current[k] !== 'object') {
          current[k] = {};
        }
        current = current[k];
      }
      current[keys[keys.length - 1]] = value;

      // Also update environment variable
      const envKey = key.toUpperCase().replace(/[-\s.]/g, '_');
      process.env[envKey] = value;

      return 0;
    }),

    // Save config to file
    SAVE: createFunction('CONFIG.SAVE', (args) => {
      const filePath = requireStringArg('CONFIG.SAVE', args, 0);
      const configId = args.length >= 2 ? requireStringArg('CONFIG.SAVE', args, 1) : '_auto';

      const config = configStore.get(configId);
      if (!config) {
        throw new Error(`No config found with id: ${configId}`);
      }

      const fullPath = path.isAbsolute(filePath)
        ? filePath
        : path.join(process.cwd(), filePath);

      // Create directory if it doesn't exist
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const ext = path.extname(filePath).toLowerCase();
      let content: string;

      if (ext === '.json') {
        content = JSON.stringify(config, null, 2);
      } else if (ext === '.yaml' || ext === '.yml') {
        // Simple YAML output
        const lines: string[] = [];
        for (const [key, value] of Object.entries(config)) {
          if (key !== '_source') {
            if (typeof value === 'string') {
              lines.push(`${key}: "${value}"`);
            } else {
              lines.push(`${key}: ${value}`);
            }
          }
        }
        content = lines.join('\n');
      } else {
        // Default to .env format
        const lines: string[] = [];
        for (const [key, value] of Object.entries(config)) {
          if (key !== '_source') {
            const envKey = key.toUpperCase().replace(/[-\s.]/g, '_');
            lines.push(`${envKey}="${value}"`);
          }
        }
        content = lines.join('\n');
      }

      fs.writeFileSync(fullPath, content, 'utf8');
      return fullPath;
    }),

    // List all loaded configs
    LIST: createFunction('CONFIG.LIST', () => {
      return Array.from(configStore.keys());
    }),

    // Check if a config exists
    EXISTS: createFunction('CONFIG.EXISTS', (args) => {
      const key = requireStringArg('CONFIG.EXISTS', args, 0);
      const configId = args.length >= 2 ? requireStringArg('CONFIG.EXISTS', args, 1) : '_auto';

      const config = configStore.get(configId);
      if (!config) {
        return 0;
      }

      // Support nested keys with dot notation
      const keys = key.split('.');
      let value: any = config;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return 0;
        }
      }

      return 1;
    }),

    // Get the source file of auto-loaded config
    SOURCE: createFunction('CONFIG.SOURCE', () => {
      const auto = configStore.get('_auto');
      return auto?._source || '';
    })
  });
}