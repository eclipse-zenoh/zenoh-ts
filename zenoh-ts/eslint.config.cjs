const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['**/node_modules/**'],
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
  }
});
