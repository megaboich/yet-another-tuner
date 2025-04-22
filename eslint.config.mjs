import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tslint from 'typescript-eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import globals from 'globals';

export default tslint.config(
	{
		ignores: [
			'**/node_modules/*',
			'**/src/lib/*',
		],
	},
	js.configs.recommended,
	...tslint.configs.recommended,
	sonarjs.configs.recommended,
	stylistic.configs.customize({
		// the following options are the default values
		indent: 'tab',
		quotes: 'single',
		arrowParens: 'as-needed',
		semi: true,
		jsx: false, // use eslint-plugin-react for JSX
	}),

	{
		files: [
			'**/*.js',
			'**/*.ts',
			'**/*.mjs',
		],
		plugins: {
		},
		settings: {
		},
		languageOptions: {
			parserOptions: {
			},
			globals: {
				...globals.browser,
				...globals.node,
				...globals.mocha,
			},
		},

		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-empty-object-type': ['error', { allowWithName: '(Props|State)$' }],
			'@typescript-eslint/no-require-imports': 'off',

			'@stylistic/arrow-parens': 'off',
			'@stylistic/object-curly-spacing': ['error', 'always'],
			'@stylistic/brace-style': ['error', '1tbs'],
			'@stylistic/comma-dangle': ['error', 'only-multiline'],
			'@stylistic/indent': ['error', 'tab'],
			'@stylistic/quote-props': ['error', 'as-needed'],

			'sonarjs/no-commented-code': 'off',
			'sonarjs/pseudo-random': 'off',
			'sonarjs/todo-tag': 'off',
			'sonarjs/cognitive-complexity': ['error', 20],
			'sonarjs/no-empty-test-file': 'off',
		},
	}
);
