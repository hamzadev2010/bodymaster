/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable App Router
  experimental: {
    appDir: true,
  },
  
  // Ignore ESLint errors during builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Optimize for Vercel deployment
  output: 'standalone',
  
  // Handle API routes properly
  async rewrites() {
    return [];
  },
  
  // Webpack configuration to handle CSS and Prisma properly
  webpack: (config, { isServer, webpack }) => {
    // Handle CSS modules and PostCSS
    config.module.rules.push({
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader',
        'postcss-loader'
      ]
    });
    
    // Optimize Prisma for Vercel
    if (isServer) {
      config.externals.push('@prisma/client', '.prisma/client');
    }
    
    // Ignore Prisma generate warnings during build
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^\.\/prisma\/client$/,
      })
    );
    
    return config;
  },
  
  // Environment variables for build
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
};

module.exports = nextConfig;
