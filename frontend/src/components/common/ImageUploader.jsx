/**
 * ImageUploader - Componente para subir y seleccionar imágenes
 * Soporta: drag & drop, preview, múltiples formatos
 */
import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import axios from 'axios';
import {
  Upload,
  X,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Check,
  AlertCircle
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function ImageUploader({
  value,
  onChange,
  label = 'Imagen',
  aspectRatio = '16/9',
  maxSize = 5, // MB
  accept = 'image/*',
  showUrlInput = true,
  placeholder = 'Arrastra una imagen o haz clic para seleccionar'
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [urlMode, setUrlMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const fileInputRef = useRef(null);

  const uploadFile = async (file) => {
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`El archivo excede el límite de ${maxSize}MB`);
      return null;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'landing');

      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_URL}/api/upload/image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percent);
          }
        }
      );

      if (response.data?.url) {
        onChange(response.data.url);
        toast.success('Imagen subida correctamente');
        return response.data.url;
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir la imagen');
      return null;
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadFile(file);
    }
  };

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setUrlInput('');
      setUrlMode(false);
      toast.success('URL de imagen actualizada');
    }
  };

  const handleRemove = () => {
    onChange('');
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      {value ? (
        // Preview mode
        <div className="relative group">
          <div 
            className="relative overflow-hidden rounded-lg border bg-muted"
            style={{ aspectRatio }}
          >
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-1" />
                Cambiar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4 mr-1" />
                Eliminar
              </Button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      ) : (
        // Upload mode
        <div className="space-y-3">
          {!urlMode ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                transition-colors
                ${isDragging 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
              style={{ aspectRatio }}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Subiendo imagen...</p>
                  <Progress value={progress} className="w-48" />
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 rounded-full bg-muted">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{placeholder}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, GIF hasta {maxSize}MB
                    </p>
                  </div>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                />
                <Button type="button" onClick={handleUrlSubmit}>
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
          
          {showUrlInput && (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setUrlMode(!urlMode)}
              >
                {urlMode ? (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Subir archivo
                  </>
                ) : (
                  <>
                    <LinkIcon className="h-4 w-4 mr-2" />
                    Usar URL
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Utility hook for image uploads that returns a function
export function useImageUpload() {
  const uploadImage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'editor');

      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_URL}/api/upload/image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (response.data?.url) {
        return response.data.url;
      }
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Error al subir la imagen');
      return null;
    }
  };

  return uploadImage;
}
