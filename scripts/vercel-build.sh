#!/bin/bash

# Vercel build script for BodyMaster
echo "Starting Vercel build..."

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Warning: DATABASE_URL environment variable is not set"
  echo "This will cause 503 errors in production"
  exit 1
fi

# Run database migrations
echo "Running database migrations..."
npx prisma migrate deploy

# Build Next.js app
echo "Building Next.js application..."
npm run build

echo "Vercel build completed successfully!"
