export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 72],
    "scope-enum": [
      2,
      "always",
      ["core", "infra", "ci", "docs", "deps", "release"],
    ],
  },
};
