module.exports = {
	"root": true,
	"parser": "@typescript-eslint/parser",
	"parserOptions": {
		"tsconfigRootDir": __dirname,
		"project": [
			"./tsconfig.json"
		]
	},
	"plugins": [
		"@typescript-eslint",
		"prettierx"
	],
	"extends": [
		"eslint:recommended",
		"plugin:@typescript-eslint/recommended",
		"plugin:@typescript-eslint/recommended-requiring-type-checking",
		"plugin:prettierx/default",
		"plugin:prettierx/@typescript-eslint"
	],
	"settings": {
		"prettierx": {
			"usePrettierrc": true
		}
	},
	"rules": {
		"curly": "error",
		"@typescript-eslint/naming-convention": [
			"error",
			{
				"selector": [
					"variable",
					"function"
				],
				"format": [
					"snake_case"
				]
			},
			{
				"selector": ["variable"],
				"modifiers": ["const"],
				"format": ["UPPER_CASE", "snake_case"]
			},
			{
				"selector": ["variable"],
				"format": null,
				"filter": {
					"regex": "^_",
					"match": true
				}
			}
		],
		"no-unused-vars": [
			"error",
			{
				"argsIgnorePattern": "^_",
				"varsIgnorePattern": "^_",
			}
		],
		"@typescript-eslint/no-unused-vars": [
			"error",
			{
				"argsIgnorePattern": "^_",
				"varsIgnorePattern": "^_",
			}
		]
	}
}