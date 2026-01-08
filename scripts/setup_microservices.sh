#!/bin/bash
# ============================================================
# Setup Microservices Script
# ============================================================
# Este script prepara los servicios para ejecución independiente
# copiando los módulos y el core a cada servicio.
# ============================================================

set -e

BACKEND_DIR="/app/backend"
SERVICES_DIR="/app/services"

echo "🚀 Setting up microservices..."

# Function to copy module to service
copy_module() {
    local module=$1
    local service=$2
    
    echo "  📦 Copying $module module to $service service..."
    
    # Copy module
    rm -rf "$SERVICES_DIR/$service/app"
    cp -r "$BACKEND_DIR/modules/$module" "$SERVICES_DIR/$service/app"
    
    # Copy core
    rm -rf "$SERVICES_DIR/$service/core"
    cp -r "$BACKEND_DIR/core" "$SERVICES_DIR/$service/core"
    
    # Create .env from backend if not exists
    if [ ! -f "$SERVICES_DIR/$service/.env" ]; then
        cp "$BACKEND_DIR/.env" "$SERVICES_DIR/$service/.env" 2>/dev/null || true
    fi
    
    echo "  ✅ $service service ready"
}

# Setup each service
copy_module "auth" "auth"
copy_module "store" "store"
copy_module "pinpanclub" "pinpanclub"
copy_module "community" "community"

echo ""
echo "✅ All services set up successfully!"
echo ""
echo "📋 Service structure:"
for service in auth store pinpanclub community; do
    echo "  /app/services/$service/"
    echo "    ├── main.py"
    echo "    ├── Dockerfile"
    echo "    ├── requirements.txt"
    echo "    ├── app/           (module code)"
    echo "    └── core/          (shared core)"
    echo ""
done

echo "🐳 To run with Docker Compose:"
echo "   cd /app && docker-compose -f docker-compose.microservices.yml up -d"
echo ""
echo "🧪 To test individual service:"
echo "   cd /app/services/auth && python main.py"
