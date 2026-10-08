#!/usr/bin/env bash
# exit on error
set -o errexit

python -m pip install --upgrade pip
# Install CPU-optimized PyTorch first for fast build
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
# Install remaining dependencies
pip install -r requirements.txt
