const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore ESLint errors during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
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

module.exports = nextConfig;
