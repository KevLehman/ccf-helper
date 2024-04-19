import globals from 'globals'

import { FlatCompat } from '@eslint/eslintrc'
import pluginJs from '@eslint/js'
import { fileURLToPath } from 'url'
import path from 'path'
import babelParser from '@babel/eslint-parser'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: pluginJs.configs.recommended,
})

export default [
    {
        files: ['**/*.js'],
        languageOptions: {
            sourceType: 'commonjs',
            parserOptions: { requireConfigFile: false, sourceType: 'module' },
        },
    },
    {
        files: ['**/*.mjs'],
        languageOptions: {
            parserOptions: { requireConfigFile: false, sourceType: 'module' },
        },
    },
    ...compat.extends('plugin:prettier/recommended'),
    { languageOptions: { globals: globals.node, parser: babelParser } },
    eslintPluginPrettierRecommended,
]
