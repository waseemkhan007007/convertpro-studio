import io
import shutil
import subprocess
import tempfile
from io import BytesIO

import fitz
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw
from pypdf import PdfReader, PdfWriter

from app.main import app

client = TestClient(app)


def _image_bytes(width: int = 40, height: int = 30, color: str = "red") -> bytes:
    buffer = BytesIO()
    Image.new("RGB", (width, height), color=color).save(buffer, format="PNG")
    return buffer.getvalue()


def _watermarked_image_and_mask() -> tuple[bytes, bytes]:
    image = Image.new("RGBA", (64, 48), (120, 120, 120, 255))
    ImageDraw.Draw(image).rectangle((22, 16, 41, 31), fill=(255, 255, 255, 255))

    mask = Image.new("RGBA", image.size, (255, 255, 255, 0))
    ImageDraw.Draw(mask).rectangle((20, 14, 43, 33), fill=(255, 255, 255, 255))

    image_buffer = BytesIO()
    mask_buffer = BytesIO()
    image.save(image_buffer, format="PNG")
    mask.save(mask_buffer, format="PNG")
    return image_buffer.getvalue(), mask_buffer.getvalue()


def _pdf_bytes(page_count: int = 1) -> bytes:
    writer = PdfWriter()
    for _ in range(page_count):
        writer.add_blank_page(width=100, height=200)
    buffer = BytesIO()
    writer.write(buffer)
    return buffer.getvalue()


def _rendered_pdf_bytes(page_count: int = 2) -> bytes:
    doc = fitz.open()
    for _ in range(page_count):
        doc.new_page(width=200, height=200)
    buffer = io.BytesIO()
    doc.save(buffer)
    return buffer.getvalue()


def _ffmpeg_file(name: str, command: list[str]) -> bytes:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("FFmpeg is not installed for media conversion tests.")

    with tempfile.TemporaryDirectory() as tmp_dir:
        path = f"{tmp_dir}/{name}"
        subprocess.run(["ffmpeg", *command, path], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        with open(path, "rb") as handle:
            return handle.read()


def _audio_bytes() -> bytes:
    return _ffmpeg_file(
        "sample.wav",
        [
            "-y",
            "-f",
            "lavfi",
            "-i",
            "sine=frequency=1000:duration=0.2",
            "-ar",
            "44100",
            "-acodec",
            "pcm_s16le",
        ],
    )


def _video_bytes() -> bytes:
    return _ffmpeg_file(
        "sample.mp4",
        [
            "-y",
            "-f",
            "lavfi",
            "-i",
            "color=c=blue:s=64x64:d=0.25",
            "-vf",
            "format=yuv420p",
            "-frames:v",
            "1",
        ],
    )


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["app"] == "ConvertPro Studio"


def test_image_to_pdf_endpoint():
    response = client.post(
        "/api/tools/image-to-pdf",
        files=[
            ("files", ("first.png", _image_bytes(color="red"), "image/png")),
            ("files", ("second.png", _image_bytes(color="blue"), "image/png")),
        ],
        data={"page_size": "A4", "orientation": "portrait", "fit_to_page": "true"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")


def test_pdf_merger_endpoint():
    response = client.post(
        "/api/tools/pdf-merger",
        files=[
            ("files", ("first.pdf", _pdf_bytes(1), "application/pdf")),
            ("files", ("second.pdf", _pdf_bytes(2), "application/pdf")),
        ],
    )
    assert response.status_code == 200
    merged = PdfReader(BytesIO(response.content))
    assert len(merged.pages) == 3


def test_image_merger_endpoint():
    response = client.post(
        "/api/tools/image-merger",
        files=[
            ("files", ("top.png", _image_bytes(width=40, height=30, color="red"), "image/png")),
            ("files", ("bottom.png", _image_bytes(width=50, height=40, color="green"), "image/png")),
        ],
        data={"mode": "horizontal", "spacing": "8", "margin": "10", "background_color": "#ffffff", "output_format": "PNG"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/png")


def test_pdf_to_image_endpoint():
    response = client.post(
        "/api/tools/pdf-to-image",
        files=[("files", ("sample.pdf", _rendered_pdf_bytes(2), "application/pdf"))],
        data={"pages": "all", "output_format": "PNG", "resolution": "100"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/zip")


def test_watermark_remover_endpoint_inpaints_selected_area():
    image_bytes, mask_bytes = _watermarked_image_and_mask()
    response = client.post(
        "/api/tools/watermark-remover",
        files=[
            ("file", ("sample.png", image_bytes, "image/png")),
            ("mask_file", ("mask.png", mask_bytes, "image/png")),
        ],
        data={"radius": "5", "output_format": "PNG"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/png")
    with Image.open(BytesIO(response.content)) as cleaned:
        center_pixel = cleaned.convert("RGB").getpixel((32, 24))
    assert all(abs(channel - 120) < 20 for channel in center_pixel)


def test_watermark_remover_rejects_mask_with_different_dimensions():
    image_bytes = _image_bytes()
    mask_buffer = BytesIO()
    Image.new("RGBA", (10, 10), (255, 255, 255, 255)).save(mask_buffer, format="PNG")
    response = client.post(
        "/api/tools/watermark-remover",
        files=[
            ("file", ("sample.png", image_bytes, "image/png")),
            ("mask_file", ("mask.png", mask_buffer.getvalue(), "image/png")),
        ],
    )

    assert response.status_code == 400
    assert "match the image dimensions" in response.json()["detail"]


def test_watermark_remover_rejects_empty_selection():
    image_bytes = _image_bytes()
    mask_buffer = BytesIO()
    Image.new("RGBA", (40, 30), (255, 255, 255, 0)).save(mask_buffer, format="PNG")
    response = client.post(
        "/api/tools/watermark-remover",
        files=[
            ("file", ("sample.png", image_bytes, "image/png")),
            ("mask_file", ("mask.png", mask_buffer.getvalue(), "image/png")),
        ],
    )

    assert response.status_code == 400
    assert "Mark the watermark area" in response.json()["detail"]


def test_audio_to_mp3_endpoint():
    response = client.post(
        "/api/tools/audio-to-mp3",
        files=[("file", ("sample.wav", _audio_bytes(), "audio/wav"))],
        data={"bitrate": "128"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/mpeg")


def test_video_to_mp4_endpoint():
    response = client.post(
        "/api/tools/video-to-mp4",
        files=[("file", ("sample.mp4", _video_bytes(), "video/mp4"))],
        data={"resolution": "64:64", "quality": "medium", "extract_audio": "false"},
    )
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("video/mp4")


def test_rejects_unsupported_file_type():
    response = client.post(
        "/api/tools/image-to-pdf",
        files=[("files", ("note.txt", b"not an image", "text/plain"))],
    )
    assert response.status_code == 400
