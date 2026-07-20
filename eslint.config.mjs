import typescriptEslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import prettierConfig from 'eslint-config-prettier'

export default [
    {
        files: ['**/*.ts'],
    },
    {
        plugins: {
            '@typescript-eslint': typescriptEslint.plugin,
            prettier,
        },

        languageOptions: {
            parser: typescriptEslint.parser,
            ecmaVersion: 2022,
            sourceType: 'module',
        },

        rules: {
            '@typescript-eslint/naming-convention': [
                'warn',
                {
                    selector: 'import',
                    format: ['camelCase', 'PascalCase'],
                },
            ],
            'prettier/prettier': 'error',
        },
    },
]
