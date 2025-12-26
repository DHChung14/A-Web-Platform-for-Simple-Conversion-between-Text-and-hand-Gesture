/**
 * Video URL utility functions
 * Handles YouTube, Vimeo, and direct video URLs
 */

export interface VideoInfo {
  type: 'youtube' | 'vimeo' | 'file' | 'unknown';
  embedUrl?: string;
  id?: string;
}

/**
 * Extract YouTube video ID from various YouTube URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 */
export function extractYouTubeId(url: string): string | null {
  try {
    // Try standard watch URL
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (watchMatch && watchMatch[1]) {
      return watchMatch[1];
    }

    // Try embed URL
    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch && embedMatch[1]) {
      return embedMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extract Vimeo video ID from various Vimeo URL formats
 * Supports:
 * - https://vimeo.com/123456789
 * - https://player.vimeo.com/video/123456789
 */
export function extractVimeoId(url: string): string | null {
  try {
    // Try standard vimeo URL
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch && vimeoMatch[1]) {
      return vimeoMatch[1];
    }

    // Try player vimeo URL
    const playerMatch = url.match(/player\.vimeo\.com\/video\/(\d+)/);
    if (playerMatch && playerMatch[1]) {
      return playerMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Detect video type and return embed information
 */
export function getVideoInfo(url: string): VideoInfo {
  if (!url || !url.trim()) {
    return { type: 'unknown' };
  }

  // Check YouTube
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      type: 'youtube',
      id: youtubeId,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`
    };
  }

  // Check Vimeo
  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      type: 'vimeo',
      id: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`
    };
  }

  // Check if it's a direct video file URL
  if (url.match(/\.(mp4|webm|ogg|mov|avi)(\?|#|$)/i)) {
    return {
      type: 'file',
      embedUrl: url
    };
  }

  // Unknown type
  return {
    type: 'unknown',
    embedUrl: url
  };
}

/**
 * Check if URL is a valid video URL
 */
export function isValidVideoUrl(url: string): boolean {
  const info = getVideoInfo(url);
  return info.type !== 'unknown';
}
