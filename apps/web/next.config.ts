import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Monorepo: the app is a workspace, not the repo root. Pin Turbopack's root
  // so it stops inferring it from the nearest lockfile, and compile the shared
  // contract package from source (it ships TypeScript, not build output).
  turbopack: {
    root: path.join(import.meta.dirname, "..", ".."),
  },
  transpilePackages: ["@climbkiddo/shared"],
};

export default nextConfig;
