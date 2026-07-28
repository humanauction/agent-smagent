#!/usr/bin/env bash
set -e

# SMAGE Windows x64 build script
# This build works on macOS ARM because nexe uses prebuilt Node binaries.

INPUT="./dist/smage/smage.js"
RESOURCES=(
  "./dist/ha_mcp/**/*"
  "./dist/ha_core/**/*"
  "./dist/ha_wrap/**/*"
  "./dist/ha_cli/**/*"
  "./dist/ha_proxy/**/*"
  "./dist/ha_learn/**/*"
  "./dist/smage/**/*"
)

echo "------------------------------------------------------------"
echo "Building SMAGE for: windows-x64-18.0.0"
echo "Output: smage-windows-x64.exe"
echo "------------------------------------------------------------"

npx nexe -i "$INPUT" \
  --python /usr/bin/python3 \
  --build \
  --bundle \
  --target windows-x64-18.0.0 \
  --output smage-windows-x64.exe \
  $(printf -- '--resource %s ' "${RESOURCES[@]}")

echo "============================================================"
echo "✔ SMAGE Windows binary built successfully."
echo "✔ Output: smage-windows-x64.exe"
echo "============================================================"
