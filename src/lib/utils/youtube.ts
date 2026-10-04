/**
 * YouTube URL Parser and Validator
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://youtube.com/embed/VIDEO_ID
 */

export interface YouTubeValidationResult {
  isValid: boolean;
  videoId?: string;
  embedUrl?: string;
  errorMessage?: string;
}

export function parseYouTubeUrl(url: string | null | undefined): YouTubeValidationResult {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return {
      isValid: false,
      errorMessage: 'Nessun link inserito',
    };
  }

  const cleanUrl = url.trim();

  // Try standard RegExp for YouTube video extraction
  // Handles:
  // 1. youtube.com/watch?v=ID
  // 2. youtu.be/ID
  // 3. youtube.com/shorts/ID
  // 4. youtube.com/embed/ID
  // 5. youtube.com/v/ID
  const regExp = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&][\w=&%-]*)?/;

  const match = cleanUrl.match(regExp);

  if (match && match[1]) {
    const videoId = match[1];
    return {
      isValid: true,
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`,
    };
  }

  return {
    isValid: false,
    errorMessage: 'Link YouTube non valido. Inserisci un link tipo youtube.com/watch?v=..., youtu.be/... o uno Shorts.',
  };
}
