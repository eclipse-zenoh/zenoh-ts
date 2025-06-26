module.exports = {
  root: true,
  env: {
    browser: true,
    node: true,
  },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  extends: [
    '@nuxtjs/eslint-config-typescript',
    'plugin:vue/vue3-strict',
  ],
  plugins: [
    'vue',
    '@typescript-eslint',
  ],
  rules: {
    // Enforce that components should not accept unknown props
    'vue/no-unused-properties': ['error', {
      groups: ['props'],
      deepData: false,
      ignorePublicMembers: false,
    }],
    'vue/require-explicit-emits': 'error',
    // Custom rule to enforce inheritAttrs: false
    'vue/component-options-name-casing': 'off',
  },
  overrides: [
    {
      files: ['*.vue'],
      rules: {
        // Additional Vue-specific rules
        'vue/block-lang': ['error', {
          script: { lang: 'ts' },
        }],
      },
    },
  ],
}
