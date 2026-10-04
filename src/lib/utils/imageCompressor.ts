/**
 * Client-Side Image Resizer & Compressor for SnapLift
 * Resizes long edge to max 1600px and compresses with quality 0.8 JPEG.
 */

export interface ProcessedImage {
  id: string;
  dataUrl: string;
  base64Data: string;
  mimeType: string;
  originalName: string;
  originalSize: number;
  compressedSize: number;
}

export async function compressImage(
  file: File,
  maxDimension: number = 1600,
  quality: number = 0.8
): Promise<ProcessedImage> {
  return new Promise((resolve, reject) => {
    // Generate temporary object URL for reading
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down if exceeds maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context could not be created'));
        return;
      }

      // Draw with white background for transparency fallback
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      // Export as JPEG with quality
      const mimeType = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, quality);
      const base64Data = dataUrl.split(',')[1] || '';

      // Calculate approximate compressed size in bytes
      const compressedSize = Math.round((base64Data.length * 3) / 4);

      resolve({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        dataUrl,
        base64Data,
        mimeType,
        originalName: file.name,
        originalSize: file.size,
        compressedSize,
      });
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Impossibile elaborare l\'immagine. Formato non supportato o file danneggiato.'));
    };

    img.src = objectUrl;
  });
}

export async function processImagesList(
  files: File[],
  maxCount: number = 5
): Promise<{ processed: ProcessedImage[]; errors: string[] }> {
  const allowedFiles = files.slice(0, maxCount);
  const processed: ProcessedImage[] = [];
  const errors: string[] = [];

  for (const file of allowedFiles) {
    try {
      // Validate file type
      if (!file.type.startsWith('image/') && !file.name.match(/\.(jpg|jpeg|png|webp|heic)$/i)) {
        errors.push(`${file.name}: formato non supportato. Usa JPG, PNG, WebP o HEIC.`);
        continue;
      }

      const item = await compressImage(file);
      processed.push(item);
    } catch (err: any) {
      errors.push(`${file.name}: ${err.message || 'Errore di compressione'}`);
    }
  }

  return { processed, errors };
}
