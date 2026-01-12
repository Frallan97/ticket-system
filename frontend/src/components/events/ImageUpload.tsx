import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  eventId: number;
  currentImageUrl?: string | null;
  onUploadComplete: () => void;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  eventId,
  currentImageUrl,
  onUploadComplete,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/events/${eventId}/image`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('access_token')}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      onUploadComplete();
    } catch (err) {
      setError('Failed to upload image. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="image">Event Poster</Label>
        <Input
          id="image"
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="cursor-pointer"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Max file size: 5MB. Supported formats: JPEG, PNG, WebP
        </p>
      </div>

      {preview && (
        <div className="relative w-full aspect-video overflow-hidden rounded-lg border">
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {selectedFile && (
        <Button onClick={handleUpload} disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Image'}
        </Button>
      )}
    </div>
  );
};
