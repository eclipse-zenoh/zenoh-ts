const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      '**/node_modules/**', 
      '**/dist/*.js', 
      '**/examples/**/dist/*.js',
      '**/*.d.ts'  // Ignore all declaration files which are often generated
    ],
  },
  // Main config for src files with TypeScript type checking
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Using a limited set of rules to avoid compatibility issues
      // Allow unused variables with underscore prefix
      '@typescript-eslint/no-unused-vars': ['warn', { 
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_'
      }],
      // Allow use before define, common in TypeScript for hoisted classes/functions
      '@typescript-eslint/no-use-before-define': ['warn', {
        'functions': false,
        'classes': false,
        'variables': false,
        'typedefs': false
      }]
    }
  },
  // Config for examples, tests, and dist with no type checking
  {
    files: [
      'dist/**/*.ts', 'dist/**/*.tsx', 
      'examples/**/*.ts', 'examples/**/*.tsx',
      'tests/**/*.ts', 'tests/**/*.tsx'
    ],
    ignores: ['**/node_modules/**'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parser: tseslint.parser,
      // No project reference for these files
    },
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // Disable the problematic rule for examples and tests
      '@typescript-eslint/no-use-before-define': 'off'
    }
  }
);
