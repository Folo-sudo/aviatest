import type { NextConfig } from "next";
import WebpackObfuscator from "webpack-obfuscator";

const nextConfig: NextConfig = {
  // Next 16 defaults to Turbopack for `next dev`. Our webpack plugin is only
  // used for production builds (`npm run build --webpack`), so an empty
  // turbopack config is enough to silence the conflict in local dev.
  turbopack: {},
  webpack: (config, { isServer, dev }) => {
    // Only apply obfuscation in production client builds
    if (!dev && !isServer) {
      config.plugins.push(
        new WebpackObfuscator(
          {
            rotateStringArray: true,
            stringArray: true,
            stringArrayThreshold: 0.75,
            deadCodeInjection: true,
            deadCodeInjectionThreshold: 0.4,
            debugProtection: true,
            disableConsoleOutput: true,
            selfDefending: true,
          },
          [] // Exclude patterns (empty = obfuscate all)
        )
      );
    }
    return config;
  },
};

export default nextConfig;
