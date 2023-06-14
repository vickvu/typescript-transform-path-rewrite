module.exports = {
    parser: '@typescript-eslint/parser',
    parserOptions: {
        project: './tsconfig.json',
    },
    plugins: ['@typescript-eslint', 'mocha', 'import'],
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:@typescript-eslint/recommended-requiring-type-checking',
        'plugin:mocha/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
        'prettier',
    ],
    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
            typescript: true,
            node: true,
        },
    },
    overrides: [
        {
            files: ['test/**/*.ts'],
            env: {
                mocha: true,
            },
        },
    ],
};
