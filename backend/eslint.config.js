import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['node_modules/', 'dist/', 'scripts/', '**/*.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      complexity: ['error', { max: 15 }],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      'max-lines': ['warn', { max: 400, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', { max: 4 }],
      'max-params': ['warn', { max: 5 }],
    },
  },
  {
    files: ['**/*.test.ts', '**/repositories/*.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
    },
  },
  {
    files: ['**/controllers/**/*.ts'],
    ignores: ['**/controllers/**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/repositories/*'],
              message: 'Controller は composition 経由で repository を受け取ること',
            },
            { group: ['**/prisma-*'], message: '実装に直接依存せず、composition 経由にすること' },
            { group: ['**/bcrypt-*'], message: '実装に直接依存せず、composition 経由にすること' },
            { group: ['**/jwt-*'], message: '実装に直接依存せず、composition 経由にすること' },
          ],
        },
      ],
    },
  }
);
