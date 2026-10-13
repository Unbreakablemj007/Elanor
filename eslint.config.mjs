import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Product images are arbitrary URLs pasted by the owner; next/image would
      // need every host whitelisted, so plain <img> is used on purpose.
      "@next/next/no-img-element": "off",
    },
  },
  { ignores: ["node_modules/**", ".next/**", "next-env.d.ts"] },
];

export default eslintConfig;
