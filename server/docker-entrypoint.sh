#!/bin/sh
set -e

echo "=== MAAREE 360 Backend Container Starting ==="
echo "Node Environment: ${NODE_ENV:-production}"
echo "Server Port: ${PORT:-5001}"

# Run Prisma migrations if database is configured
if [ -n "$DATABASE_URL" ]; then
  echo "Applying pending database migrations with Prisma..."
  npx prisma migrate deploy || {
    echo "WARNING: prisma migrate deploy encountered an issue, proceeding to application boot."
  }
fi

echo "Starting MAAREE 360 API server..."
exec node dist/index.js
