import path from "node:path";
import type { NextConfig } from "next";
import { securityHeaders } from "./src/config/security-headers";

const nextConfig: NextConfig = {
  // Monorepo: the app is a workspace, not the repo root. Pin Turbopack's root
  // so it stops inferring it from the nearest lockfile, and compile the shared
  // contract package from source (it ships TypeScript, not build output).
  turbopack: {
    root: path.join(import.meta.dirname, "..", ".."),
  },
  transpilePackages: ["@climbkiddo/shared"],

  // Every response, including /api and static assets: a policy with holes in
  // it is a policy an attacker picks the hole in. What is in the set and why
  // is in src/config/security-headers.ts.
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders() }];
  },
};

export default nextConfig;
