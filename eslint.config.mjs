import jsEslint from '@eslint/js';
import tsEslint from 'typescript-eslint';
import mochaEslint from 'eslint-plugin-mocha';
import prettierEslint from 'eslint-config-prettier';

export default tsEslint.config(
    {
        ignores: ['dist/**'],
    },
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        plugins: {
            '@typescript-eslint': tsEslint.plugin,
        },
    },
    jsEslint.configs.recommended,
    ...tsEslint.configs.strictTypeChecked,
    {
        files: ['test/**/*.spec.ts'],
        ...mochaEslint.configs.flat.recommended,
    },
    prettierEslint,
);
