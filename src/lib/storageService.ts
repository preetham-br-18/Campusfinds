import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface ProcessedImage {
  url: string;
  file?: File;
  base64Data?: string;
  mimeType: string;
}

/**
 * Validates image file type and size according to PRD section 45
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      isValid: false,
      error: 'Invalid file format. Please upload JPG, PNG, or WEBP images only.'
    };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      error: 'File size exceeds 5MB limit. Please select a smaller photo.'
    };
  }
  return { isValid: true };
}

/**
 * Compresses an image client-side before upload to preserve bandwidth and storage
 */
export async function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({ blob, dataUrl });
          } else {
            reject(new Error('Compression blob creation failed'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads an image to Firebase Storage with a fallback to optimized Data URL if storage bucket is restricted
 */
export async function uploadItemImage(file: File, pathPrefix = 'items'): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Invalid image');
  }

  const { blob, dataUrl } = await compressImage(file);

  try {
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const storageRef = ref(storage, `${pathPrefix}/${timestamp}_${cleanFileName}`);
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: 'image/jpeg'
    });
    return await getDownloadURL(snapshot.ref);
  } catch (storageError) {
    console.warn('Firebase Storage upload warning (using compressed embedded data URL fallback):', storageError);
    // If Firebase Storage bucket is not enabled or CORS blocked in free tier, gracefully use the compressed dataUrl
    return dataUrl;
  }
}

export const compressAndUploadImage = uploadItemImage;
