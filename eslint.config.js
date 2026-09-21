const tsParser = require("@typescript-eslint/parser");
const tsPlugin = require("@typescript-eslint/eslint-plugin");

module.exports = [
  {
    // Restrict static analysis verification directly to your single-file service
    files: ["server.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "commonjs"
    },
    plugins: {
      "@typescript-eslint": tsPlugin
    },
    rules: {
      // Deactivate core unused variables rule to let TypeScript plugin handle it explicitly
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      
      // Enforce type-safe strict equality operators (=== and !==)
      "eqeqeq": "error",
      
      // Allow console reporting for backend lifecycle operational metrics
      "no-console": "off",
      
      // Enforce clean coding standards by preventing accidental reassignment of constants
      "no-const-assign": "error",
      
      // Flags implicit or dead returns inside promise setups
      "no-async-promise-executor": "error"
    }
  }
];
