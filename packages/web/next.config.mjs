// For a GitHub Pages *project* site the app is served under /<repo>, so the
// deploy workflow sets PAGES_BASE_PATH=/<repo>. Left empty for root-served hosts
// (Cloudflare Pages) and local builds, so neither is affected.
const basePath = process.env.PAGES_BASE_PATH || "";

/** @type {import('next').NextConfig} */
export default {
  output: "export",
  basePath,
  assetPrefix: basePath || undefined,
  // Emit each route as <route>/index.html (so /protocol/aave/ resolves on static
  // hosts) rather than flat <route>.html.
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ["@dra/core"], // compile the workspace TS dep through Next
  // Linting is run separately via the workspace's flat ESLint config (`pnpm lint`),
  // so skip Next's own build-time ESLint step (which would require eslint-config-next).
  eslint: { ignoreDuringBuilds: true },
  webpack: (config) => {
    // @dra/core's `main` points at TS source whose imports use NodeNext-style ".js"
    // specifiers (e.g. `./schema.js`). Teach webpack to resolve those ".js" imports
    // to the actual ".ts" sources so the transpiled workspace package builds.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      ".js": [".ts", ".tsx", ".js", ".jsx"],
    };
    return config;
  },
};
