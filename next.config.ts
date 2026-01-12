import type { NextConfig } from "next";
import WebpackObfuscator from "webpack-obfuscator";

const nextConfig: NextConfig = {
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
