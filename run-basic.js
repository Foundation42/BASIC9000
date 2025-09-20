#!/usr/bin/env node
import { parseSource } from './dist/interpreter/parser.js';
import { executeProgram } from './dist/interpreter/evaluator.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import readline from 'readline';

// Get filename from command line arguments
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node run-basic.js <filename.bas> [--verbose]');
  console.log('Example: node run-basic.js tests/basic-programs/types/01-type-definition.bas');
  process.exit(1);
}

const filename = args[0];
const verbose = args.includes('--verbose');

// Resolve the path
const filepath = resolve(filename);

async function runBasicProgram(filepath) {
  try {
    // Read the file
    const source = readFileSync(filepath, 'utf-8');

    if (verbose) {
      console.log('=== SOURCE CODE ===');
      console.log(source);
      console.log('=== PARSING ===');
    }

    // Parse the source
    const parsed = parseSource(source);

    if (verbose) {
      console.log('Parsed successfully');
      console.log('=== EXECUTING ===');
    }

    // Create readline interface for input
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Create input handler
    const inputHandler = () => {
      return new Promise((resolve) => {
        rl.question('', (answer) => {
          resolve(answer);
        });
      });
    };

    // Execute the program with input handler
    const result = await executeProgram(parsed, { inputHandler });

    // Close readline interface
    rl.close();

    // Display outputs
    if (result.outputs.length > 0) {
      console.log('=== OUTPUT ===');
      result.outputs.forEach(line => console.log(line));
    }

    if (verbose) {
      console.log('\n=== VARIABLES ===');
      console.log(result.variables);

      if (result.types) {
        console.log('\n=== TYPES ===');
        console.log(result.types);
      }
    }

    // Check for test results
    const passes = result.outputs.filter(o => o.includes('PASS:')).length;
    const fails = result.outputs.filter(o => o.includes('FAIL:')).length;

    if (passes > 0 || fails > 0) {
      console.log('\n=== TEST RESULTS ===');
      console.log(`✓ Passed: ${passes}`);
      console.log(`✗ Failed: ${fails}`);

      if (fails > 0) {
        process.exit(1);
      }
    }

    if (result.halted) {
      console.log(`\nProgram halted: ${result.halted}`);
    }

  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error(error.message);

    if (error.line && error.column) {
      console.error(`Location: line ${error.line}, column ${error.column}`);
    }

    if (verbose && error.stack) {
      console.error('\n=== STACK TRACE ===');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run the program
runBasicProgram(filepath).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});