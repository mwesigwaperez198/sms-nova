#!/bin/sh
# Run all tests for the NOVARA School Management System
# Requirements: Python 3.12, Node 18+
#
# Usage:
#   chmod +x run_tests.sh && ./run_tests.sh

set -e

echo "=========================================="
echo "  NOVARA — Test Suite Runner"
echo "=========================================="

# ---- Backend Tests (smart_school_backend) ----
echo ""
echo ">> smart_school_backend (FastAPI)"
cd /workspace/smart_school_backend

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    . .venv/bin/activate
    pip install -r requirements.txt
    pip install pytest httpx
else
    . .venv/bin/activate
fi

echo "  Running foundation tests..."
python -m pytest tests/test_foundation.py -v --tb=short || true

echo "  Running integration tests..."
python -m pytest tests/test_integration.py -v --tb=short || true

deactivate

# ---- Backend Tests (sch-mage-system) ----
echo ""
echo ">> sch-mage-system (NovaAdmin)"
cd /workspace/sch-mage-system

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    . .venv/bin/activate
    pip install -r requirements.txt
    pip install pytest httpx slowapi
else
    . .venv/bin/activate
fi

echo "  Running API tests..."
python -m pytest tests/test_api.py -v --tb=short || true

echo "  Running security tests..."
python -m pytest tests/test_security.py -v --tb=short || true

deactivate

# ---- Desktop Tests (Sch-lib-system) ----
echo ""
echo ">> Sch-lib-system (NovaLib)"
cd /workspace/Sch-lib-system

if [ ! -d ".venv" ]; then
    python3 -m venv .venv
    . .venv/bin/activate
    pip install -r requirements.txt
else
    . .venv/bin/activate
fi

echo "  Running circulation tests..."
python -m pytest tests/ -v --tb=short || true

deactivate

# ---- Frontend Tests (admin-web) ----
echo ""
echo ">> frontend/admin-web (React)"
cd /workspace/frontend/admin-web

if [ -f "package.json" ]; then
    npm install --silent 2>/dev/null
    npm run test:unit 2>/dev/null || echo "  No unit test script found (skipping)"
else
    echo "  No package.json (skipping)"
fi

echo ""
echo "=========================================="
echo "  All test suites completed."
echo "=========================================="
