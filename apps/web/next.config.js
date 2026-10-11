/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile internal workspace packages that ship untranspiled TS,
  // per the monorepo structure in Architecture Foundation §2.3.
  transpilePackages: [
    "@talentswap/types",
    "@talentswap/validation",
    "@talentswap/utils",
    "@talentswap/ui-tokens",
  ],
  images: {
    // Populated per-module as remote asset hosts (Cloudflare R2 custom
    // domain) are provisioned — Arch §14 "Image Optimisation".
    remotePatterns: [],
  },
  eslint: {
    dirs: ["app", "components", "hooks", "lib", "store", "types"],
  },
};

module.exports = nextConfig;
