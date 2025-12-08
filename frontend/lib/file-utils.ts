/**
 * Get the full URL for a file from backend
 * Converts relative /uploads/... paths to absolute backend URLs
 */
export function getFileUrl(url: string | undefined): string {
  if (!url) return '';
  
  // If already absolute URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // Convert relative path to absolute backend URL
  const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';
  
  // Remove leading slash if present to avoid double slashes
  const path = url.startsWith('/') ? url : `/${url}`;
  
  return `${backendUrl}${path}`;
}

/**
 * Get download URL for a file by ID
 */
export function getFileDownloadUrl(fileId: string): string {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5001';
  return `${backendUrl}/api/files/${fileId}/download`;
}
