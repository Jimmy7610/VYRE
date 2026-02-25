module.exports = {
  env: { browser: true, es2020: true },
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  plugins: ['@typescript-eslint', 'import'],
  rules: {
    // Keep it minimal
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off', // Too much noise for quick wins
    '@typescript-eslint/no-explicit-any': 'off',
  },
  ignorePatterns: ['dist', '.eslintrc.cjs', 'vite.config.ts'],
};
