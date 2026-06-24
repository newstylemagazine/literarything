import next from "eslint-config-next/core-web-vitals";

const config = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "old-site/**",
      "next-env.d.ts",
    ],
  },
  ...next,
];

export default config;
