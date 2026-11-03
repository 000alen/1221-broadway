"""Compatibility entry point. The Node builder is the canonical build."""
import pathlib
import subprocess

subprocess.run(['node', 'build.mjs'], cwd=pathlib.Path(__file__).resolve().parent, check=True)
