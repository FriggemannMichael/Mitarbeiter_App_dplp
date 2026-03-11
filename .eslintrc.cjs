module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ["@typescript-eslint", "react-hooks"],
  extends: ["eslint:recommended"],
  ignorePatterns: ["dist/", "dev-dist/", "node_modules/", "backend/"],
  rules: {
    "no-undef": "off",
    "no-console": "off",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/static-components": "off",
    "react-hooks/set-state-in-effect": "off",
    "react-hooks/purity": "off",
    "no-empty": "off",
    "no-constant-condition": "off",
    "no-case-declarations": "off",
  },
};
