import { defineConfig } from "oxlint";

export default defineConfig({
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": [
    "typescript",
    "unicorn",
    "oxc",
    "nextjs",
    "import",
    "react"
  ],
  "categories": {
    "correctness": "error"
  },
  "rules": {},
  "env": {
    "builtin": true
  }
})