#!/bin/bash

# ErrandRun Quick Start Script
# This script automates the setup process

set -e

echo "🚀 ErrandRun - Quick Start Setup"
echo "=================================="
echo ""

# Check prerequisites
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install it first."
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command node
check_command npm
check_command git
echo "✅ Prerequisites found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm ci
echo "✅ Dependencies installed"
echo ""

# Setup environment
if [ ! -f .env.local ]; then
    echo "⚙️  Setting up environment variables..."
    cp .env.example .env.local
    echo "⚠️  Please edit .env.local with your credentials"
    echo ""
    echo "Required credentials:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  - SUPABASE_SERVICE_ROLE_KEY"
    echo "  - NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"
    echo "  - PAYSTACK_SECRET_KEY"
    echo ""
    read -p "Press enter when .env.local is configured..."
fi
echo "✅ Environment configured"
echo ""

# Initialize Supabase (optional)
if command -v supabase &> /dev/null; then
    echo "🗄️  Starting Supabase local stack (optional)..."
    echo "Run: supabase start"
    echo "Then set NEXT_PUBLIC_SUPABASE_URL to http://localhost:54321"
fi
echo ""

echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your Supabase and Paystack keys"
echo "2. Start Supabase: supabase start (optional, for local dev)"
echo "3. Run dev server: npm run dev"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "📚 Documentation:"
echo "  - README.md - Project overview"
echo "  - SETUP.md - Detailed setup instructions"
echo "  - IMPLEMENTATION_ROADMAP.md - Feature roadmap"
echo ""
