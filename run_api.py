#!/usr/bin/env python3
"""
Development runner for the md2any API server
"""

import subprocess
import sys
from pathlib import Path

def check_uv():
    """Check if uv is installed"""
    try:
        subprocess.run(["uv", "--version"], check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def install_dependencies():
    """Install dependencies using uv"""
    print("Installing dependencies with uv...")
    subprocess.run(["uv", "sync"], check=True)

def run_server():
    """Run the API server"""
    print("Starting API server...")
    subprocess.run(["uv", "run", "python", "api.py"], check=True)

def main():
    """Main runner"""
    if not check_uv():
        print("Error: uv is not installed. Please install uv first:")
        print("curl -LsSf https://astral.sh/uv/install.sh | sh")
        sys.exit(1)
    
    # Check if pyproject.toml exists
    if not Path("pyproject.toml").exists():
        print("Error: pyproject.toml not found")
        sys.exit(1)
    
    try:
        install_dependencies()
        run_server()
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nServer stopped by user")
        sys.exit(0)

if __name__ == "__main__":
    main()