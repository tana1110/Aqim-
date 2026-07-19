import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project (a stray lockfile in the parent
  // directory otherwise makes Turbopack infer the wrong root).
  turbopack: {
    root: path.join(__dirname),
  },
  // Allow the dev server to be opened from other devices on the LAN (e.g. your
  // phone at http://192.168.1.22:3000) without Next blocking dev requests.
  allowedDevOrigins: ["192.168.1.22", "localhost"],
};

export default nextConfig;
