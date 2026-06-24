/** @type {import('next').NextConfig} */

// When building for GitHub Pages we emit a fully static site under the
// repo subpath (https://<user>.github.io/<repo>/). Local dev/build stay at root.
const isPages = process.env.GITHUB_PAGES === "true";
const repoBase = "/literarything";

const nextConfig = {
  reactStrictMode: true,
  ...(isPages
    ? {
        output: "export",
        basePath: repoBase,
        assetPrefix: `${repoBase}/`,
        images: { unoptimized: true },
        trailingSlash: true,
      }
    : {}),
};

export default nextConfig;
