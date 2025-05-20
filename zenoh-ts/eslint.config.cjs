const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    ignores: [
      '**/node_modules/**', 
      '**/dist/*.js', 
      '**/examples/**/dist/*.js',
      '**/*.d.ts',  // Ignore all declaration files which are often generated
      'src/remote_api/interface/**/*.ts'  // Ignore auto-generated TypeScript interface files
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
      '@typescript-eslint/no-use-before-define': 'off',
      // Enforce consistent naming convention (allowing both camelCase and snake_case)
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          'selector': 'default',
          'format': ['camelCase'],
          'leadingUnderscore': 'allow',
          'trailingUnderscore': 'allow'
        },
        {
          'selector': 'variable',
          'format': ['camelCase'],
          'leadingUnderscore': 'allow',
          'trailingUnderscore': 'allow'
        },
        {
          'selector': 'variable',
          'format': ['camelCase', 'UPPER_CASE'],
          'leadingUnderscore': 'allow',
          'trailingUnderscore': 'allow',
          'modifiers': ['const']
        },
        {
          'selector': 'parameter',
          'format': ['camelCase'],
          'leadingUnderscore': 'allow',
          'trailingUnderscore': 'allow'
        },
        {
          'selector': 'parameterProperty',
          'format': ['camelCase'],
          'leadingUnderscore': 'allow',
          'trailingUnderscore': 'allow'
        },
        {
          'selector': 'memberLike',
          'format': ['camelCase'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'typeLike',
          'format': ['PascalCase']
        },
        {
          'selector': 'interface',
          'format': ['PascalCase']
        },
        {
          'selector': 'property',
          'format': ['camelCase'],
          'trailingUnderscore': 'allow',
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'classProperty',
          'format': ['camelCase', 'UPPER_CASE'],
          'leadingUnderscore': 'allow',
          'trailingUnderscore': 'allow',
          'modifiers': ['static', 'readonly']
        },
        {
          'selector': 'objectLiteralProperty',
          'format': ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
          'trailingUnderscore': 'allow',
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'method',
          'format': ['camelCase'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'function',
          'format': ['camelCase', 'snake_case', 'PascalCase'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'enumMember',
          'format': ['PascalCase', 'UPPER_CASE', 'snake_case']
        }
      ]
    }
  },
  // Config for examples, tests, and dist with no type checking
  {
    files: [
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
      '@typescript-eslint/no-use-before-define': 'off',
      // Enforce consistent naming convention (allowing both camelCase and snake_case)
      '@typescript-eslint/naming-convention': [
        'warn',
        {
          'selector': 'default',
          'format': ['camelCase', 'snake_case'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'variable',
          'format': ['camelCase', 'PascalCase', 'snake_case'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'variable',
          'format': ['camelCase', 'UPPER_CASE', 'PascalCase', 'snake_case'],
          'leadingUnderscore': 'allow',
          'modifiers': ['const']
        },
        {
          'selector': 'parameter',
          'format': ['camelCase', 'snake_case'],
          'leadingUnderscore': 'allow',
          'trailingUnderscore': 'allow'
        },
        {
          'selector': 'parameterProperty',
          'format': ['camelCase', 'snake_case', 'PascalCase'],
          'leadingUnderscore': 'allow',
          'trailingUnderscore': 'allow'
        },
        {
          'selector': 'memberLike',
          'format': ['camelCase', 'snake_case', 'PascalCase'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'typeLike',
          'format': ['PascalCase']
        },
        {
          'selector': 'interface',
          'format': ['PascalCase']
        },
        {
          'selector': 'property',
          'format': ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'classProperty',
          'format': ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
          'leadingUnderscore': 'allow',
          'modifiers': ['static', 'readonly']
        },
        {
          'selector': 'objectLiteralProperty',
          'format': ['camelCase', 'PascalCase', 'UPPER_CASE', 'snake_case'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'method',
          'format': ['camelCase', 'snake_case'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'function',
          'format': ['camelCase', 'snake_case', 'PascalCase'],
          'leadingUnderscore': 'allow'
        },
        {
          'selector': 'enumMember',
          'format': ['PascalCase', 'UPPER_CASE', 'snake_case']
        }
      ]
    }
  }
);
