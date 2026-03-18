"""
Sport Module — Server-side image processing
Auto-resizes uploaded photos to multiple sizes for efficient storage and display.
"""
import base64
import io
import logging
from PIL import Image

logger = logging.getLogger("sport.image")

# Size presets
SIZES = {
    "thumb": (80, 80),      # For lists, live session badges (~3-5KB)
    "medium": (300, 300),    # For profile pages, player cards (~20-40KB)
}

JPEG_QUALITY = {
    "thumb": 70,
    "medium": 80,
}


def _decode_base64_image(b64_string: str) -> Image.Image:
    """Decode a base64 string (with or without data URI prefix) into a PIL Image."""
    # Strip data URI prefix if present
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    
    img_bytes = base64.b64decode(b64_string)
    img = Image.open(io.BytesIO(img_bytes))
    
    # Convert to RGB if needed (handles RGBA, palette, etc.)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    
    return img


def _crop_center_square(img: Image.Image) -> Image.Image:
    """Crop to center square (for avatar-style photos)."""
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def _resize_and_encode(img: Image.Image, size: tuple, quality: int) -> str:
    """Resize image and encode as base64 JPEG data URI."""
    resized = img.resize(size, Image.LANCZOS)
    buf = io.BytesIO()
    resized.save(buf, format="JPEG", quality=quality, optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"


def process_player_photo(b64_input: str) -> dict:
    """
    Process an uploaded photo into multiple sizes.
    
    Input: base64 string (with or without data URI prefix)
    Output: {"thumb": "data:image/jpeg;base64,...", "medium": "data:image/jpeg;base64,..."}
    
    All outputs are center-cropped squares, JPEG compressed.
    Thumb: 80x80 (~3-5KB) — for live sessions, lists
    Medium: 300x300 (~20-40KB) — for profile pages
    """
    try:
        img = _decode_base64_image(b64_input)
        img = _crop_center_square(img)
        
        result = {}
        for name, dimensions in SIZES.items():
            quality = JPEG_QUALITY.get(name, 80)
            result[name] = _resize_and_encode(img, dimensions, quality)
            logger.info(f"Photo {name}: {dimensions[0]}x{dimensions[1]}, {len(result[name])//1024}KB")
        
        return result
    except Exception as e:
        logger.error(f"Photo processing failed: {e}")
        # Fallback: return the input as-is for both sizes
        return {"thumb": b64_input, "medium": b64_input}
