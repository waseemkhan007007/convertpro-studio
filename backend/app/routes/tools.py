import io

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from ..services.converters import (
    audio_to_mp3,
    image_files_to_pdf,
    merge_image_files,
    merge_pdf_files,
    pdf_to_images,
    remove_image_watermark,
    video_to_mp4,
)

router = APIRouter(prefix="/tools", tags=["tools"])


@router.post("/image-to-pdf")
async def image_to_pdf_endpoint(
    files: list[UploadFile] = File(...),
    page_size: str = Form("A4"),
    orientation: str = Form("portrait"),
    fit_to_page: bool = Form(True),
):
    try:
        payload = await image_files_to_pdf(
            files,
            page_size=page_size,
            orientation=orientation,
            fit_to_page=fit_to_page,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return StreamingResponse(
        io.BytesIO(payload),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="combined.pdf"'},
    )


@router.post("/pdf-merger")
async def pdf_merger_endpoint(files: list[UploadFile] = File(...)):
    try:
        payload = await merge_pdf_files(files)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return StreamingResponse(
        io.BytesIO(payload),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="merged.pdf"'},
    )


@router.post("/pdf-to-image")
async def pdf_to_image_endpoint(
    files: list[UploadFile] = File(...),
    pages: str = Form("all"),
    output_format: str = Form("PNG"),
    resolution: int = Form(150),
):
    if len(files) != 1:
        raise HTTPException(status_code=400, detail="Upload exactly one PDF file.")

    try:
        payload, filename, file_type = await pdf_to_images(
            files[0],
            pages=pages,
            output_format=output_format,
            resolution=resolution,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    media_type = "application/zip" if file_type == "zip" else "image/png" if file_type == "png" else "image/jpeg"
    return StreamingResponse(
        io.BytesIO(payload),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/watermark-remover")
async def watermark_remover_endpoint(
    file: UploadFile = File(...),
    mask_file: UploadFile = File(...),
    radius: int = Form(5),
    output_format: str = Form("PNG"),
):
    try:
        payload, filename, media_type = await remove_image_watermark(
            file,
            mask_file,
            radius=radius,
            output_format=output_format,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return StreamingResponse(
        io.BytesIO(payload),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/audio-to-mp3")
async def audio_to_mp3_endpoint(
    file: UploadFile = File(...),
    bitrate: str = Form("192"),
):
    try:
        payload = await audio_to_mp3(file, bitrate=bitrate)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    return StreamingResponse(
        io.BytesIO(payload),
        media_type="audio/mpeg",
        headers={"Content-Disposition": 'attachment; filename="converted.mp3"'},
    )


@router.post("/video-to-mp4")
async def video_to_mp4_endpoint(
    file: UploadFile = File(...),
    resolution: str = Form("1280:720"),
    quality: str = Form("medium"),
    extract_audio: bool = Form(False),
):
    try:
        payload = await video_to_mp4(
            file,
            resolution=resolution,
            quality=quality,
            extract_audio=extract_audio,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    media_type = "audio/mpeg" if extract_audio else "video/mp4"
    filename = "audio.mp3" if extract_audio else "converted.mp4"
    return StreamingResponse(
        io.BytesIO(payload),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/image-merger")
async def image_merger_endpoint(
    files: list[UploadFile] = File(...),
    mode: str = Form("horizontal"),
    spacing: int = Form(12),
    margin: int = Form(12),
    background_color: str = Form("#ffffff"),
    output_format: str = Form("PNG"),
):
    try:
        payload = await merge_image_files(
            files,
            mode=mode,
            spacing=spacing,
            margin=margin,
            background_color=background_color,
            output_format=output_format,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    extension = "jpg" if output_format.upper() in {"JPG", "JPEG"} else "png"
    return StreamingResponse(
        io.BytesIO(payload),
        media_type="image/png" if extension == "png" else "image/jpeg",
        headers={"Content-Disposition": f'attachment; filename="merged.{extension}"'},
    )
