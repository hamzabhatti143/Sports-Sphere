"""Root entrypoint for Render.

The actual FastAPI app lives in `backend/`. This shim lets `uvicorn main:app`
run from the repository root, so no custom Root Directory is needed on the host.
It puts `backend/` on the import path, switches the working directory there, then
loads `backend/main.py` and re-exports its `app`.
"""
import importlib.util
import os
import sys

_BACKEND = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
sys.path.insert(0, _BACKEND)
os.chdir(_BACKEND)

_spec = importlib.util.spec_from_file_location("backend_main", os.path.join(_BACKEND, "main.py"))
_module = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_module)

app = _module.app
