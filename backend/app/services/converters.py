from __future__ import annotations

import io
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path
from typing import Sequence

import cv2
import fitz
import numpy as np
from fastapi import UploadFile
from PIL import Image, ImageOps
from pypdf import PdfReader, PdfWriter

ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
ALLOWED_PDF_EXTENSIONS = {"pdf"}
ALLOWED_AUDIO_EXTENSIONS = {"wav", "mp3", "m4a", "aac", "flac", "ogg", "wma", "webm"}
ALLOWED_VIDEO_EXTENSIONS = {"mp4", "mov", "avi", "mkv", "webm", "flv", "wmv"}

PAGE_SIZES = {
    "A4": (210, 297),
    "letter": (216, 279),
    "legal": (216, 356),
    "tabloid": (279, 432),
}


def _normalize_extension(filename: str | None) -> str:
    if not filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def _validate_image_file(filename: str | None) -> None:
    if _normalize_extension(filename) not in ALLOWED_IMAGE_EXTENSIONS:
        raise ValueError("Unsupported image type. Upload JPG, JPEG, PNG or WebP files.")


def _validate_pdf_file(filename: str | None) -> None:
    if _normalize_extension(filename) not in ALLOWED_PDF_EXTENSIONS:
        raise ValueError("Unsupported PDF file. Upload a .pdf document.")


def _validate_audio_file(filename: str | None) -> None:
    ext = _normalize_extension(filename)
    if ext not in ALLOWED_AUDIO_EXTENSIONS:
        raise ValueError("Unsupported audio format. Upload a common audio file such as WAV, MP3, M4A, AAC, FLAC, OGG or WMA.")


def _validate_video_file(filename: str | None) -> None:
    ext = _normalize_extension(filename)
    if ext not in ALLOWED_VIDEO_EXTENSIONS:
        raise ValueError("Unsupported video format. Upload a common video file such as MP4, MOV, AVI, MKV, WebM, FLV or WMV.")


def _page_dimensions(page_size: str, orientation: str) -> tuple[int, int]:
    size = PAGE_SIZES.get(page_size.lower(), PAGE_SIZES["A4"])
    width_mm, height_mm = size
    if orientation.lower() == "landscape":
        width_mm, height_mm = height_mm, width_mm
    return width_mm, height_mm


def _fit_image_to_page(image: Image.Image, page_size: str, orientation: str) -> Image.Image:
    width_mm, height_mm = _page_dimensions(page_size, orientation)
    target_width_px = int(width_mm * 4.72)
    target_height_px = int(height_mm * 4.72)
    background = Image.new("RGB", (target_width_px, target_height_px), "white")

    image = image.convert("RGB")
    ratio = min(target_width_px / image.width, target_height_px / image.height)
    new_width = max(1, int(image.width * ratio))
    new_height = max(1, int(image.height * ratio))
    resized = image.resize((new_width, new_height), Image.Resampling.LANCZOS)

    left = (target_width_px - new_width) // 2
    top = (target_height_px - new_height) // 2
    background.paste(resized, (left, top))
    return background


async def image_files_to_pdf(
    files: Sequence[UploadFile],
    page_size: str = "A4",
    orientation: str = "portrait",
    fit_to_page: bool = True,
) -> bytes:
    if not files:
        raise ValueError("At least one image is required.")

    images: list[Image.Image] = []
    for file in files:
        _validate_image_file(file.filename)
        data = await file.read()
        try:
            image = Image.open(io.BytesIO(data))
            images.append(image.copy())
        except Exception as exc:  # pragma: no cover - validation fallback
            raise ValueError(f"Unable to read image: {file.filename}") from exc

    if not images:
        raise ValueError("No valid images were uploaded.")

    pdf_buffer = io.BytesIO()
    if fit_to_page:
        page_images = [_fit_image_to_page(img, page_size, orientation) for img in images]
    else:
        page_images = [img.convert("RGB") for img in images]

    page_images[0].save(pdf_buffer, format="PDF", save_all=True, append_images=page_images[1:])
    return pdf_buffer.getvalue()


async def remove_image_watermark(
    file: UploadFile,
    mask_file: UploadFile,
    radius: int = 5,
    output_format: str = "PNG",
) -> tuple[bytes, str, str]:
    _validate_image_file(file.filename)
    if not 1 <= radius <= 20:
        raise ValueError("Inpainting radius must be between 1 and 20.")

    fmt = output_format.upper()
    if fmt not in {"PNG", "JPG", "JPEG"}:
        raise ValueError("Unsupported output format. Choose PNG or JPG.")

    image_bytes = await file.read()
    mask_bytes = await mask_file.read()
    try:
        with Image.open(io.BytesIO(image_bytes)) as opened_image:
            if opened_image.width * opened_image.height > 40_000_000:
                raise ValueError("Image dimensions are too large to process. Use an image under 40 megapixels.")
            image = ImageOps.exif_transpose(opened_image).convert("RGBA")
        with Image.open(io.BytesIO(mask_bytes)) as opened_mask:
            if opened_mask.size != image.size:
                raise ValueError("The selection mask must match the image dimensions.")
            mask_image = opened_mask.convert("RGBA")
    except OSError as exc:
        raise ValueError("Unable to read the uploaded image or selection mask.") from exc

    mask_alpha = np.asarray(mask_image.getchannel("A"))
    inpaint_mask = np.where(mask_alpha > 0, 255, 0).astype(np.uint8)
    if not np.any(inpaint_mask):
        raise ValueError("Mark the watermark area with the brush before processing.")

    rgb_image = np.asarray(image.convert("RGB"))
    try:
        cleaned_rgb = cv2.inpaint(
            cv2.cvtColor(rgb_image, cv2.COLOR_RGB2BGR),
            inpaint_mask,
            float(radius),
            cv2.INPAINT_TELEA,
        )
    except cv2.error as exc:
        raise ValueError("The selected area could not be cleaned. Try a smaller brush or selection.") from exc

    cleaned = Image.fromarray(cv2.cvtColor(cleaned_rgb, cv2.COLOR_BGR2RGB))
    cleaned.putalpha(image.getchannel("A"))
    output = io.BytesIO()
    if fmt in {"JPG", "JPEG"}:
        flattened = Image.new("RGB", cleaned.size, "white")
        flattened.paste(cleaned, mask=cleaned.getchannel("A"))
        flattened.save(output, format="JPEG", quality=95)
        return output.getvalue(), "cleaned.jpg", "image/jpeg"

    cleaned.save(output, format="PNG")
    return output.getvalue(), "cleaned.png", "image/png"


async def merge_pdf_files(files: Sequence[UploadFile]) -> bytes:
    if not files:
        raise ValueError("At least one PDF file is required.")

    writer = PdfWriter()
    for file in files:
        _validate_pdf_file(file.filename)
        pdf_bytes = await file.read()
        try:
            reader = PdfReader(io.BytesIO(pdf_bytes))
        except Exception as exc:  # pragma: no cover - validation fallback
            raise ValueError(f"Unable to read PDF: {file.filename}") from exc

        if reader.is_encrypted:
            raise ValueError(f"Password-protected PDFs are not supported: {file.filename}")

        for page in reader.pages:
            writer.add_page(page)

    output = io.BytesIO()
    writer.write(output)
    return output.getvalue()


def _parse_page_selection(page_count: int, pages: str) -> list[int]:
    raw = (pages or "all").strip()
    if not raw or raw.lower() == "all":
        return list(range(page_count))

    values: list[int] = []
    for entry in raw.split(","):
        item = entry.strip()
        if not item:
            continue
        if "-" in item:
            start_text, end_text = item.split("-", 1)
            try:
                start = int(start_text)
                end = int(end_text)
            except ValueError as exc:  # pragma: no cover - validation branch
                raise ValueError(f"Invalid page range: {item}") from exc
            if start > end:
                start, end = end, start
            values.extend(range(start - 1, end))
        else:
            try:
                values.append(int(item) - 1)
            except ValueError as exc:  # pragma: no cover - validation branch
                raise ValueError(f"Invalid page selection: {item}") from exc

    unique_values: list[int] = []
    seen: set[int] = set()
    for value in values:
        if 0 <= value < page_count and value not in seen:
            unique_values.append(value)
            seen.add(value)

    if not unique_values:
        raise ValueError("No valid pages were selected from the PDF.")
    return unique_values


async def pdf_to_images(
    file: UploadFile,
    pages: str = "all",
    output_format: str = "PNG",
    resolution: int = 150,
) -> tuple[bytes, str, str]:
    if not file.filename or _normalize_extension(file.filename) != "pdf":
        raise ValueError("Unsupported PDF file. Upload a .pdf document.")

    payload = await file.read()
    try:
        doc = fitz.open(stream=payload, filetype="pdf")
    except Exception as exc:  # pragma: no cover - validation fallback
        raise ValueError(f"Unable to read PDF: {file.filename}") from exc

    if doc.is_encrypted:
        raise ValueError(f"Password-protected PDFs are not supported: {file.filename}")

    page_numbers = _parse_page_selection(doc.page_count, pages)
    fmt = output_format.upper()
    ext = "PNG" if fmt == "PNG" else "JPG"
    if len(page_numbers) == 1:
        page = doc.load_page(page_numbers[0])
        matrix = fitz.Matrix(resolution / 72, resolution / 72)
        pix = page.get_pixmap(matrix=matrix, alpha=False)
        image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        buffer = io.BytesIO()
        image.save(buffer, format=ext, quality=95)
        return buffer.getvalue(), f"page-{page_numbers[0] + 1}.{ext.lower()}", ext.lower()

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, mode="w", compression=zipfile.ZIP_DEFLATED) as archive:
        for page_number in page_numbers:
            page = doc.load_page(page_number)
            matrix = fitz.Matrix(resolution / 72, resolution / 72)
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            image = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
            page_buffer = io.BytesIO()
            image.save(page_buffer, format=ext, quality=95)
            archive.writestr(f"page-{page_number + 1}.{ext.lower()}", page_buffer.getvalue())

    return zip_buffer.getvalue(), "pdf-pages.zip", "zip"


def _run_ffmpeg(command: list[str], timeout_seconds: int = 300) -> tuple[bytes, bytes]:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise ValueError("FFmpeg is not installed or not available in PATH.")

    run_args = [ffmpeg, *command]
    result = subprocess.run(
        run_args,
        capture_output=True,
        timeout=timeout_seconds,
        check=False,
    )
    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace").strip()
        stdout = result.stdout.decode("utf-8", errors="replace").strip()
        detail = stderr or stdout or "FFmpeg conversion failed."
        raise ValueError(detail)
    return result.stdout, result.stderr


async def audio_to_mp3(file: UploadFile, bitrate: str = "192") -> bytes:
    _validate_audio_file(file.filename)
    audio_bytes = await file.read()
    input_extension = _normalize_extension(file.filename)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        input_path = tmp_path / f"input.{input_extension}"
        output_path = tmp_path / "output.mp3"
        input_path.write_bytes(audio_bytes)

        _run_ffmpeg([
            "-y",
            "-i",
            str(input_path),
            "-vn",
            "-ar",
            "44100",
            "-acodec",
            "libmp3lame",
            "-b:a",
            f"{bitrate}k",
            str(output_path),
        ])

        if not output_path.exists():
            raise ValueError("Audio conversion completed without creating the MP3 file.")
        return output_path.read_bytes()


async def video_to_mp4(file: UploadFile, resolution: str = "1280:720", quality: str = "medium", extract_audio: bool = False) -> bytes:
    _validate_video_file(file.filename)
    video_bytes = await file.read()
    input_extension = _normalize_extension(file.filename)

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        input_path = tmp_path / f"input.{input_extension}"
        output_path = tmp_path / ("audio.mp3" if extract_audio else "output.mp4")
        input_path.write_bytes(video_bytes)

        if extract_audio:
            _run_ffmpeg([
                "-y",
                "-i",
                str(input_path),
                "-vn",
                "-acodec",
                "libmp3lame",
                "-q:a",
                "2",
                str(output_path),
            ])
        else:
            quality_map = {"low": "28", "medium": "23", "high": "18"}
            crf = quality_map.get((quality or "medium").lower(), "23")
            vf = f"scale={resolution}:force_original_aspect_ratio=decrease,pad={resolution}:(ow-iw)/2:(oh-ih)/2"
            _run_ffmpeg([
                "-y",
                "-i",
                str(input_path),
                "-vf",
                vf,
                "-c:v",
                "libx264",
                "-preset",
                "medium",
                "-crf",
                crf,
                "-c:a",
                "aac",
                "-movflags",
                "+faststart",
                str(output_path),
            ])

        if not output_path.exists():
            raise ValueError("Video conversion completed without creating the output file.")
        return output_path.read_bytes()


async def merge_image_files(
    files: Sequence[UploadFile],
    mode: str = "horizontal",
    spacing: int = 12,
    margin: int = 12,
    background_color: str = "#ffffff",
    output_format: str = "PNG",
) -> bytes:
    if not files:
        raise ValueError("At least one image is required.")

    if len(files) < 2:
        raise ValueError("Select at least two images to merge.")

    images: list[Image.Image] = []
    for file in files:
        _validate_image_file(file.filename)
        data = await file.read()
        try:
            image = Image.open(io.BytesIO(data)).convert("RGBA")
        except Exception as exc:  # pragma: no cover - validation fallback
            raise ValueError(f"Unable to read image: {file.filename}") from exc
        images.append(image)

    mode_name = (mode or "horizontal").lower()
    bg = ImageColorParser.from_hex(background_color) if background_color else (255, 255, 255, 255)
    if mode_name == "grid":
        cols = max(2, int(len(images) ** 0.5))
        rows = (len(images) + cols - 1) // cols
    else:
        cols = len(images)
        rows = 1 if mode_name == "horizontal" else 1

    if mode_name == "vertical":
        rows = len(images)
        cols = 1

    widths = [img.width for img in images]
    heights = [img.height for img in images]
    if mode_name == "grid":
        cell_width = max(widths)
        cell_height = max(heights)
    elif mode_name == "horizontal":
        cell_width = max(widths)
        cell_height = max(heights)
    else:
        cell_width = max(widths)
        cell_height = max(heights)

    if mode_name == "horizontal":
        final_width = sum(cell_width for _ in images) + spacing * (len(images) - 1) + margin * 2
        final_height = cell_height + margin * 2
        canvas = Image.new("RGBA", (final_width, final_height), bg)
        cursor_x = margin
        cursor_y = margin
        for image in images:
            resized = image.resize((cell_width, cell_height), Image.Resampling.LANCZOS)
            canvas.paste(resized, (cursor_x, cursor_y), resized)
            cursor_x += cell_width + spacing
    elif mode_name == "vertical":
        final_width = cell_width + margin * 2
        final_height = sum(cell_height for _ in images) + spacing * (len(images) - 1) + margin * 2
        canvas = Image.new("RGBA", (final_width, final_height), bg)
        cursor_x = margin
        cursor_y = margin
        for image in images:
            resized = image.resize((cell_width, cell_height), Image.Resampling.LANCZOS)
            canvas.paste(resized, (cursor_x, cursor_y), resized)
            cursor_y += cell_height + spacing
    else:
        cell_width = max(widths)
        cell_height = max(heights)
        final_width = (cell_width * cols) + spacing * (cols - 1) + margin * 2
        final_height = (cell_height * rows) + spacing * (rows - 1) + margin * 2
        canvas = Image.new("RGBA", (final_width, final_height), bg)
        x_index = 0
        y_index = 0
        for image in images:
            resized = image.resize((cell_width, cell_height), Image.Resampling.LANCZOS)
            x = margin + x_index * (cell_width + spacing)
            y = margin + y_index * (cell_height + spacing)
            canvas.paste(resized, (x, y), resized)
            x_index += 1
            if x_index >= cols:
                x_index = 0
                y_index += 1

    output_buffer = io.BytesIO()
    file_format = output_format.upper() if output_format.upper() in {"PNG", "JPG", "JPEG"} else "PNG"
    if file_format == "JPG":
        rgb_image = canvas.convert("RGB")
        rgb_image.save(output_buffer, format="JPEG", quality=95)
    else:
        canvas.convert("RGBA").save(output_buffer, format="PNG")
    return output_buffer.getvalue()


class ImageColorParser:
    @staticmethod
    def from_hex(color: str):
        value = color.strip().lstrip("#")
        if len(value) == 3:
            value = "".join(ch * 2 for ch in value)
        if len(value) != 6:
            raise ValueError("Background color must be a valid hex value like #ffffff.")
        try:
            return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4)) + (255,)
        except ValueError as exc:  # pragma: no cover
            raise ValueError("Background color must be a valid hex value like #ffffff.") from exc
