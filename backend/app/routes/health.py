"""Health check: tells the frontend the backend is running and what it can use."""
import shutil
import subprocess

from fastapi import APIRouter

from ..config import get_settings

router = APIRouter(tags=["system"])


def _ffmpeg_info() -> dict:
    path = shutil.which("ffmpeg")
    if not path:
        return {"available": False, "version": None}
    try:
        # Fixed argument list, no shell: safe by construction.
        result = subprocess.run(
            [path, "-version"],
            capture_output=True,
            text=True,
            timeout=5,
            check=False,
        )
        first_line = result.stdout.splitlines()[0] if result.stdout else None
        return {"available": result.returncode == 0, "version": first_line}
    except (OSError, subprocess.SubprocessError):
        return {"available": False, "version": None}


@router.get("/health")
def health() -> dict:
    s = get_settings()
    return {
        "status": "ok",
        "app": s.app_name,
        "version": s.app_version,
        "environment": s.environment,
        "ffmpeg": _ffmpeg_info(),
        "limits": {
            "max_upload_mb": s.max_upload_mb,
            "max_video_upload_mb": s.max_video_upload_mb,
            "file_retention_minutes": s.file_retention_minutes,
        },
    }
