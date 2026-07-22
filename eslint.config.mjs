import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".vercel/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Banned: the "AI sparkle" icon. It reads as an AI-generated-content marker
    // and is not wanted anywhere in the product.
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "lucide-react",
              importNames: ["Sparkles", "Sparkle"],
              message:
                "The sparkle icon is banned. Use a neutral icon (e.g. FileText, Newspaper, Megaphone) instead.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
