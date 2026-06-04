/** @type {import('next').NextConfig} */
export default {
  output: "export",
  images: { unoptimized: true },
  reactStrictMode: true,
  transpilePackages: ["@dra/core"], // compile the workspace TS dep through Next
};
