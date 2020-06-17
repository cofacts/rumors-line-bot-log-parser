module.exports = {
  parserOptions: {
    ecmaVersion: 8,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'prettier',
  ],
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': [
      'error',
      {
        trailingComma: 'es5',
        singleQuote: true,
      },
    ],
    'no-console': ['error', { allow: ['info', 'error'] }], // no console.log, but can use .info and .error.
  },
  env: {
    node: true,
    es6: true,
    jest: true,
  },
};
