#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "Building awc..."
cargo build --release

echo "Installing to ~/.local/bin/awc..."
mkdir -p ~/.local/bin
cp target/release/awc ~/.local/bin/awc

echo "Done!"
echo ""
echo "Make sure ~/.local/bin is in your PATH:"
echo '  export PATH="$HOME/.local/bin:$PATH"'
