#!/bin/bash

echo "🚀 Deploying Gemini Firebase Agent..."

# Build TypeScript
echo "📦 Building TypeScript..."
npm run build

# Deploy to Firebase
echo "☁️  Deploying to Firebase..."
firebase deploy --only functions

echo "✅ Deployment complete!"