import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

// Linter del frontend (npm run lint): errores comunes de JavaScript y las reglas de los
// hooks de React (dependencias de useEffect, hooks dentro de condiciones, etc.).
export default [
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-refresh': reactRefresh },
    rules: {
      // Variables sin usar: error, salvo las que empiezan con mayúscula (componentes en JSX)
      // o con guion bajo
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]', argsIgnorePattern: '^_' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Las pantallas cargan datos en useEffect y marcan «cargando» al empezar: es el patrón
      // del proyecto (sin librería de datos), no un error. La regla del React Compiler lo prohíbe.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    files: ['**/*.test.{js,jsx}', 'eslint.config.js', 'vite.config.js'],
    languageOptions: { globals: { ...globals.node } },
  },
];
