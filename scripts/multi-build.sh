#!/usr/bin/env bash
set -e

# SMAGE multi-platform build script
# Platforms:
#   - linux-arm64
#   - macos-arm64
#   - windows-x64

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

build_target() {
  local TARGET=$1
  local OUTPUT=$2

  echo "------------------------------------------------------------"
  echo "Building SMAGE for: $TARGET"
  echo "Output: $OUTPUT"
  echo "------------------------------------------------------------"

  npx nexe -i "$INPUT" \
    --python /usr/bin/python3 \
    --build \
    --bundle \
    --target "$TARGET" \
    --output "$OUTPUT" \
    $(printf -- '--resource %s ' "${RESOURCES[@]}")

  echo "✔ Finished building: $OUTPUT"
  echo
}

# Linux ARM64
build_target "linux-arm64-18.0.0" "smage-linux-arm64"

# macOS ARM64
build_target "macos-arm64-18.0.0" "smage-macos-arm64"

# Windows x64
build_target "windows-x64-18.0.0" "smage-windows-x64.exe"

echo "============================================================"
echo "All SMAGE binaries built successfully."
echo "============================================================"
