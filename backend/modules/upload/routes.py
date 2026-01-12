"""
Upload Module - File upload endpoints for images and documents
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional
import uuid
import os
import base64
from datetime import datetime, timezone
import logging

from core.auth import get_current_user, get_admin_user
from core.database import db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/upload", tags=["Upload"])

# Configure upload directory
UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Allowed file extensions
ALLOWED_IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'}
ALLOWED_DOC_EXTENSIONS = {'.pdf', '.doc', '.docx', '.xls', '.xlsx'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


def get_file_extension(filename: str) -> str:
    """Get lowercase file extension"""
    return os.path.splitext(filename)[1].lower()


def validate_image(file: UploadFile) -> bool:
    """Validate image file"""
    ext = get_file_extension(file.filename)
    return ext in ALLOWED_IMAGE_EXTENSIONS


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    folder: str = Form("general"),
    user: dict = Depends(get_current_user)
):
    """
    Upload an image file
    Returns the URL of the uploaded image
    """
    try:
        # Validate file type
        if not validate_image(file):
            raise HTTPException(
                status_code=400,
                detail=f"Tipo de archivo no permitido. Extensiones válidas: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}"
            )
        
        # Read file content
        content = await file.read()
        
        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"El archivo excede el límite de {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Generate unique filename
        ext = get_file_extension(file.filename)
        unique_id = uuid.uuid4().hex[:12]
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        new_filename = f"{timestamp}_{unique_id}{ext}"
        
        # Create folder path
        folder_path = os.path.join(UPLOAD_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Save file
        file_path = os.path.join(folder_path, new_filename)
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Generate URL (relative path that will be served by nginx or similar)
        file_url = f"/uploads/{folder}/{new_filename}"
        
        # Store metadata in database
        await db.uploaded_files.insert_one({
            "file_id": unique_id,
            "original_name": file.filename,
            "stored_name": new_filename,
            "folder": folder,
            "path": file_path,
            "url": file_url,
            "size": len(content),
            "content_type": file.content_type,
            "uploaded_by": user.get("cliente_id"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"File uploaded: {file_url} by user {user.get('cliente_id')}")
        
        return {
            "success": True,
            "url": file_url,
            "filename": new_filename,
            "size": len(content)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al subir el archivo")


@router.post("/image/base64")
async def upload_image_base64(
    data: dict,
    user: dict = Depends(get_current_user)
):
    """
    Upload an image from base64 data
    Expects: { "image": "data:image/png;base64,...", "folder": "general" }
    """
    try:
        image_data = data.get("image", "")
        folder = data.get("folder", "general")
        
        if not image_data:
            raise HTTPException(status_code=400, detail="No image data provided")
        
        # Parse base64 data
        if "," in image_data:
            header, encoded = image_data.split(",", 1)
            # Extract mime type
            if "image/png" in header:
                ext = ".png"
            elif "image/jpeg" in header or "image/jpg" in header:
                ext = ".jpg"
            elif "image/gif" in header:
                ext = ".gif"
            elif "image/webp" in header:
                ext = ".webp"
            else:
                ext = ".png"
        else:
            encoded = image_data
            ext = ".png"
        
        # Decode base64
        try:
            content = base64.b64decode(encoded)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid base64 data")
        
        # Check file size
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"El archivo excede el límite de {MAX_FILE_SIZE // (1024*1024)}MB"
            )
        
        # Generate unique filename
        unique_id = uuid.uuid4().hex[:12]
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        new_filename = f"{timestamp}_{unique_id}{ext}"
        
        # Create folder path
        folder_path = os.path.join(UPLOAD_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # Save file
        file_path = os.path.join(folder_path, new_filename)
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Generate URL
        file_url = f"/uploads/{folder}/{new_filename}"
        
        # Store metadata
        await db.uploaded_files.insert_one({
            "file_id": unique_id,
            "original_name": f"base64_upload{ext}",
            "stored_name": new_filename,
            "folder": folder,
            "path": file_path,
            "url": file_url,
            "size": len(content),
            "content_type": f"image/{ext[1:]}",
            "uploaded_by": user.get("cliente_id"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": True,
            "url": file_url,
            "filename": new_filename,
            "size": len(content)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading base64 image: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al subir la imagen")


@router.delete("/image/{file_id}")
async def delete_image(
    file_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Delete an uploaded image (admin only)"""
    try:
        file_doc = await db.uploaded_files.find_one({"file_id": file_id})
        if not file_doc:
            raise HTTPException(status_code=404, detail="Archivo no encontrado")
        
        # Delete physical file
        if os.path.exists(file_doc["path"]):
            os.remove(file_doc["path"])
        
        # Delete from database
        await db.uploaded_files.delete_one({"file_id": file_id})
        
        return {"success": True, "message": "Archivo eliminado"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al eliminar el archivo")


@router.get("/list")
async def list_uploads(
    folder: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """List uploaded files (admin only)"""
    try:
        query = {}
        if folder:
            query["folder"] = folder
        
        files = await db.uploaded_files.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(100).to_list(100)
        
        return {"files": files}
        
    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(status_code=500, detail="Error al listar archivos")
