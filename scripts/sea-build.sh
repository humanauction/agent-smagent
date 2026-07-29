#!/usr/bin/env bash
set -e

node --experimental-sea-config sea-config.json
cp "$(which node)" smage
npx postject smage NODE_SEA_BLOB smage.blob --sentinel-fuse NODE_SEA_FUSE
