module.exports = {
    env: {
        browser: true,
        es2021: true
    },
    extends: ['eslint:recommended', 'plugin:prettier/recommended'],
    overrides: [
        {
            env: {
                node: true
            },
            files: ['.eslintrc.{js,cjs}'],
            parserOptions: {
                sourceType: 'script'
            }
        }
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    rules: {
        'no-undef': 0,
        'prettier/prettier': ['warn', { endOfLine: 'auto' }],
        'no-unused-vars': 'warn',
        'no-var': 'error',
        'prefer-const': 'warn'
    }
};

