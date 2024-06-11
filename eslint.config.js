import globals from "globals";
import pluginJs from "@eslint/eslint-plugin";

export default [
  {
    languageOptions: { globals: globals.browser },
  },
  pluginJs.configs.recommended,
  "eslint:recommended",
  "plugin:prettier/recommended",
];
