#!/bin/bash

# JMeter Load Test Runner Script
# Usage: ./run-load-test.sh [duration_in_seconds] [threads]

set -e

# Default values
DURATION=${1:-300}  # Default: 5 minutes
THREADS=${2:-10}       # Default: 10 threads
BASE_URL=${BASE_URL:-http://localhost:8081}

echo "🚀 Starting JMeter Load Test"
echo "   Duration: ${DURATION}s"
echo "   Threads: ${THREADS}"
echo "   Target: ${BASE_URL}"
echo ""

# Check if backend is running
if ! curl -s "${BASE_URL}/actuator/health" > /dev/null; then
    echo "❌ Error: Backend is not running at ${BASE_URL}"
    echo "   Please start backend first: docker compose up -d backend"
    exit 1
fi

# Check if JMeter is available
if command -v jmeter &> /dev/null; then
    echo "✅ Using local JMeter installation"
    JMETER_CMD="jmeter"
elif docker ps &> /dev/null; then
    echo "✅ Using Docker JMeter"
    JMETER_CMD="docker run --rm --network vsl-platform-backend_vsl-network -v $(pwd):/tests justb4/jmeter:latest"
else
    echo "❌ Error: JMeter not found. Please install JMeter or Docker"
    exit 1
fi

# Create results directory
mkdir -p jmeter/results
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RESULTS_FILE="jmeter/results/results_${TIMESTAMP}.jtl"
REPORT_DIR="jmeter/results/report_${TIMESTAMP}"

echo "📊 Running test..."
echo "   Results: ${RESULTS_FILE}"
echo "   Report: ${REPORT_DIR}"
echo ""

# Run JMeter in non-GUI mode
if [[ "$JMETER_CMD" == "jmeter" ]]; then
    # Local JMeter
    jmeter -n \
        -t jmeter/load-test-200-users.jmx \
        -l "${RESULTS_FILE}" \
        -e -o "${REPORT_DIR}" \
        -J BASE_URL="${BASE_URL}" \
        -J DURATION="${DURATION}" \
        -J THREADS="${THREADS}"
else
    # Docker JMeter
    docker run --rm \
        --network vsl-platform-backend_vsl-network \
        -v "$(pwd)/jmeter:/tests" \
        justb4/jmeter:latest \
        -n \
        -t /tests/load-test-200-users.jmx \
        -l /tests/results/results_${TIMESTAMP}.jtl \
        -e -o /tests/results/report_${TIMESTAMP} \
        -J BASE_URL="${BASE_URL}" \
        -J DURATION="${DURATION}" \
        -J THREADS="${THREADS}"
fi

echo ""
echo "✅ Test completed!"
echo "   📊 View HTML report: file://$(pwd)/${REPORT_DIR}/index.html"
echo "   📈 Check Grafana: http://localhost:3001"
echo ""
