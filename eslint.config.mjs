import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/useQueueProcessor"],
              message:
                "useQueueProcessor should only be imported in /app/dashboard/layout.tsx. " +
                "If you need queue functionality, use queue store selectors instead (e.g., useQueue, usePendingCount).",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
