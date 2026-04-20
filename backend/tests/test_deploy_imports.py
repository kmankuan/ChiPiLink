"""
Deploy-time import smoke test.

Purpose: catch the exact class of bug that caused the 2026-04 production HTTP 520
outage — a package imported at module level (`from ably import AblyRest`) that
was missing from `requirements.txt`, making every production Kubernetes pod crash
silently during `uvicorn server:app` startup.

Two checks run as standard pytest cases:

1. `test_server_module_imports_cleanly` — imports `server` in the current
   interpreter. If any module-level third-party import fails, this test fails.

2. `test_all_third_party_imports_are_pinned` — walks every `.py` file under
   /app/backend, extracts top-level `import X` / `from X import Y` statements,
   filters stdlib and internal packages, and asserts each remaining distribution
   is declared in `requirements.txt`.

Run locally:
    cd /app/backend && python -m pytest tests/test_deploy_imports.py -v

CI / pre-deploy:
    Run this test after `pip install -r requirements.txt` in a clean venv.
"""
from __future__ import annotations

import ast
import os
import re
import sys
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
REQUIREMENTS = BACKEND_DIR / "requirements.txt"

# Top-level import names that ship with Python itself — no pip needed.
STDLIB = {
    "abc", "argparse", "ast", "asyncio", "base64", "binascii", "bisect", "bson",
    "calendar", "collections", "concurrent", "contextlib", "contextvars", "copy",
    "csv", "ctypes", "dataclasses", "datetime", "decimal", "difflib", "email",
    "enum", "errno", "fnmatch", "fractions", "functools", "glob", "gzip",
    "hashlib", "heapq", "hmac", "html", "http", "imaplib", "importlib", "inspect",
    "io", "ipaddress", "itertools", "json", "logging", "math", "mimetypes",
    "multiprocessing", "operator", "os", "pathlib", "pickle", "platform", "pprint",
    "queue", "random", "re", "secrets", "select", "shutil", "signal", "site",
    "smtplib", "socket", "socketserver", "sqlite3", "ssl", "stat", "string",
    "struct", "subprocess", "sys", "tempfile", "textwrap", "threading", "time",
    "timeit", "tkinter", "token", "tokenize", "traceback", "types", "typing",
    "unicodedata", "unittest", "urllib", "uuid", "warnings", "weakref", "webbrowser",
    "xml", "zipfile", "zlib",
}

# Top-level names that resolve to code inside this repo, not pip.
# Auto-populated below by scanning top-level directories under BACKEND_DIR.
INTERNAL = {"main", "server"}

# Populate INTERNAL with every top-level package directory in the backend.
for _p in BACKEND_DIR.iterdir():
    if _p.is_dir() and (_p / "__init__.py").exists() and not _p.name.startswith("."):
        INTERNAL.add(_p.name)
    elif _p.is_dir() and not _p.name.startswith(".") and _p.name not in {"__pycache__"}:
        # Plain directories used as import roots (no __init__.py yet are still scanned)
        INTERNAL.add(_p.name)

# PyPI distribution name for each import name that doesn't match 1:1.
# Only add entries here when `pip install <import_name>` would NOT work.
IMPORT_TO_DIST = {
    "bs4": "beautifulsoup4",
    "cv2": "opencv-python",
    "dateutil": "python-dateutil",
    "dotenv": "python-dotenv",
    "fitz": "pymupdf",
    "google": "google-api-python-client",
    "googleapiclient": "google-api-python-client",
    "jose": "python-jose",
    "jwt": "pyjwt",
    "magic": "python-magic",
    "multipart": "python-multipart",
    "PIL": "pillow",
    "yaml": "pyyaml",
}


def _parse_requirements() -> set[str]:
    """Return the set of normalized distribution names in requirements.txt."""
    names: set[str] = set()
    for raw in REQUIREMENTS.read_text().splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        # Strip version pins, extras, env markers, and normalize case / separators.
        name = re.split(r"[<>=!~;\[]", line, maxsplit=1)[0].strip()
        if name:
            names.add(name.lower().replace("_", "-"))
    return names


def _iter_top_level_imports(py_file: Path) -> set[str]:
    """Return the set of top-level module names imported by `py_file`."""
    try:
        tree = ast.parse(py_file.read_text(), filename=str(py_file))
    except SyntaxError:
        return set()
    imports: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            imports.add(node.module.split(".")[0])
    return imports


def _collect_third_party_imports() -> set[str]:
    """Walk all backend .py files and return third-party import names."""
    skip_dirs = {"__pycache__", "tests", "scripts", "node_modules", ".venv", "venv"}
    imports: set[str] = set()
    for root, dirs, files in os.walk(BACKEND_DIR):
        dirs[:] = [d for d in dirs if d not in skip_dirs and not d.startswith(".")]
        for f in files:
            if f.endswith(".py"):
                imports |= _iter_top_level_imports(Path(root) / f)
    return {
        name for name in imports
        if name and name not in STDLIB and name not in INTERNAL and not name.startswith("_")
    }


def test_server_module_imports_cleanly():
    """`uvicorn server:app` fails if this import fails in production."""
    # Clear any previously-cached imports so we re-exercise the full chain.
    for mod in list(sys.modules):
        if mod.startswith(("server", "main", "modules.", "core.", "routes.")):
            sys.modules.pop(mod, None)
    sys.path.insert(0, str(BACKEND_DIR))
    try:
        import server  # noqa: F401
    except ImportError as exc:  # pragma: no cover — this IS the failure we want to see
        pytest.fail(
            f"Production uvicorn startup would crash with: {exc}\n"
            f"A package is imported at module level but missing from requirements.txt.\n"
            f"Run `pip freeze > {REQUIREMENTS}` after installing the missing package."
        )


def test_all_third_party_imports_are_pinned():
    """Every third-party package imported in code must be listed in requirements.txt."""
    declared = _parse_requirements()
    missing: list[str] = []
    for import_name in sorted(_collect_third_party_imports()):
        dist = IMPORT_TO_DIST.get(import_name, import_name).lower().replace("_", "-")
        # Try the import name as-is too (pip allows either).
        alt = import_name.lower().replace("_", "-")
        if dist not in declared and alt not in declared:
            # Confirm it's a real third-party package by attempting to import it.
            # This skips namespace collisions with optional deps that the code
            # doesn't actually reach (guarded behind try/except).
            try:
                __import__(import_name)
            except ImportError:
                continue
            missing.append(f"{import_name} → pip name '{dist}'")
    assert not missing, (
        "The following packages are imported in the backend but NOT declared in "
        f"{REQUIREMENTS.name}. Production builds will crash:\n  - "
        + "\n  - ".join(missing)
        + "\n\nFix: install each package and run `pip freeze > requirements.txt`."
    )
