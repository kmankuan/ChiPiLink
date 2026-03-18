/**
 * AvatarUpload — Reusable avatar/photo upload with:
 * - Camera capture on mobile (front + rear)
 * - Gallery/file picker
 * - Drag & drop support
 * - Crop & resize with circular preview
 * - Base64 output (ready for API)
 * - Loading + error states
 */
import { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Camera, Upload, Image, RotateCcw, ZoomIn, ZoomOut, Loader2, X, Smartphone } from 'lucide-react';

/**
 * Get cropped image as base64 from canvas
 */
async function getCroppedImg(imageSrc, crop, outputSize = 400) {
  const img = new window.Image();
  img.crossOrigin = 'anonymous';
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    img,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, outputSize, outputSize
  );

  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function AvatarUpload({
  currentPhoto,      // current base64 or URL
  currentInitial,    // fallback initial letter
  onUpload,          // async (base64) => void — called with cropped base64
  size = 'md',       // 'sm' | 'md' | 'lg'
  disabled = false,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [rawImage, setRawImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedArea, setCroppedArea] = useState(null);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fileRef = useRef(null);
  const cameraRef = useRef(null);

  const sizes = {
    sm: { container: 'w-12 h-12', text: 'text-lg', icon: 14 },
    md: { container: 'w-16 h-16', text: 'text-2xl', icon: 18 },
    lg: { container: 'w-24 h-24', text: 'text-4xl', icon: 24 },
  };
  const s = sizes[size] || sizes.md;

  // Handle file selection (from picker or camera)
  const handleFile = useCallback((file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setRawImage(e.target.result);
      setShowPicker(false);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
    };
    reader.readAsDataURL(file);
  }, []);

  // Drag & drop handlers
  const onDragOver = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  };

  // Crop complete callback
  const onCropComplete = useCallback((_, area) => {
    setCroppedArea(area);
  }, []);

  // Save cropped photo
  const handleSave = async () => {
    if (!rawImage || !croppedArea) return;
    setSaving(true);
    try {
      const base64 = await getCroppedImg(rawImage, croppedArea, 400);
      await onUpload(base64);
      setShowCropper(false);
      setRawImage(null);
      toast.success('Photo updated!');
    } catch (err) {
      toast.error('Failed to save photo');
    }
    setSaving(false);
  };

  return (
    <>
      {/* Avatar display + click to open picker */}
      <div
        className={`relative group cursor-pointer ${disabled ? 'pointer-events-none opacity-60' : ''}`}
        onClick={() => !disabled && setShowPicker(true)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        data-testid="avatar-upload"
      >
        {currentPhoto ? (
          <img src={currentPhoto} alt="Avatar"
            className={`${s.container} rounded-full object-cover border-2 border-white/20 shadow-lg`} />
        ) : (
          <div className={`${s.container} rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white ${s.text} font-bold shadow-lg`}>
            {currentInitial || '?'}
          </div>
        )}

        {/* Hover overlay */}
        <div className={`absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${dragOver ? 'opacity-100 ring-2 ring-primary' : ''}`}>
          <Camera className="text-white" size={s.icon} />
        </div>
      </div>

      {/* Hidden file inputs */}
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic"
        className="hidden" onChange={e => handleFile(e.target.files?.[0])} />
      <input ref={cameraRef} type="file" accept="image/*" capture="environment"
        className="hidden" onChange={e => handleFile(e.target.files?.[0])} />

      {/* Source picker dialog */}
      <Dialog open={showPicker} onOpenChange={setShowPicker}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-sm">Upload Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Button variant="outline" className="w-full justify-start gap-3 h-12" data-testid="photo-camera"
              onClick={() => { cameraRef.current?.click(); }}>
              <Camera className="h-5 w-5 text-blue-600" />
              <div className="text-left">
                <p className="text-sm font-medium">Take Photo</p>
                <p className="text-[10px] text-muted-foreground">Use camera</p>
              </div>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3 h-12" data-testid="photo-gallery"
              onClick={() => { fileRef.current?.click(); }}>
              <Image className="h-5 w-5 text-green-600" />
              <div className="text-left">
                <p className="text-sm font-medium">Choose from Gallery</p>
                <p className="text-[10px] text-muted-foreground">JPEG, PNG, WebP</p>
              </div>
            </Button>
            {currentPhoto && (
              <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-red-600" data-testid="photo-remove"
                onClick={async () => {
                  try {
                    await onUpload('');
                    setShowPicker(false);
                    toast.success('Photo removed');
                  } catch {}
                }}>
                <X className="h-4 w-4" />
                <span className="text-sm">Remove Photo</span>
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Crop dialog */}
      <Dialog open={showCropper} onOpenChange={v => { if (!v && !saving) { setShowCropper(false); setRawImage(null); } }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle className="text-sm">Crop & Resize Photo</DialogTitle>
          </DialogHeader>

          {/* Crop area */}
          <div className="relative w-full h-72 bg-black">
            {rawImage && (
              <Cropper
                image={rawImage}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          {/* Controls */}
          <div className="px-4 py-3 space-y-3">
            {/* Zoom */}
            <div className="flex items-center gap-3">
              <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
              <input type="range" min="1" max="3" step="0.05" value={zoom}
                onChange={e => setZoom(parseFloat(e.target.value))}
                className="flex-1 h-1.5 accent-primary" />
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>

            {/* Rotation */}
            <div className="flex items-center gap-3">
              <RotateCcw className="h-4 w-4 text-muted-foreground shrink-0" />
              <input type="range" min="0" max="360" step="1" value={rotation}
                onChange={e => setRotation(parseInt(e.target.value))}
                className="flex-1 h-1.5 accent-primary" />
              <span className="text-xs text-muted-foreground w-8 text-right">{rotation}°</span>
            </div>
          </div>

          <DialogFooter className="p-4 pt-0 gap-2">
            <Button variant="ghost" size="sm" onClick={() => { setShowCropper(false); setRawImage(null); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1" data-testid="photo-save">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {saving ? 'Saving...' : 'Save Photo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
