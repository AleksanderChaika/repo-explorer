export default {
  '*.{ts,tsx}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
    () => 'tsc -b',
  ],
  '*.js': ['eslint --fix --max-warnings 0', 'prettier --write'],
  '*.scss': ['stylelint --fix --max-warnings 0', 'prettier --write'],
  '*.{json,md,yml,yaml,html}': 'prettier --write',
};
