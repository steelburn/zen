// @ts-check
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  eslintConfigPrettier,
  {
    plugins: { import: importPlugin },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/prefer-readonly": "error",
      "import/order": [
        "error",
        {
          alphabetize: { order: "asc", caseInsensitive: true },
          "newlines-between": "always",
        },
      ],
      eqeqeq: ["error", "always"],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/*.test.ts", "**/*.spec.ts", "**/vitest*.ts"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "no-console": "off",
    },
  },
);
