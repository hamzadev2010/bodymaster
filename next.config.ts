import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Ensure Next.js treats this workspace as the root to avoid lockfile mis-detection
  outputFileTracingRoot: path.join(__dirname),
  
  // Experimental features to fix CSS/webpack issues
  experimental: {
    // esmExternals: 'loose', // Removed as it's not recommended
  },
  
  // Webpack configuration to handle CSS properly
  webpack: (config, { isServer }) => {
    // Fix for CSS modules and PostCSS
    config.module.rules.push({
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader',
        'postcss-loader'
      ]
    });
    
    return config;
  },
};

export default nextConfig;
