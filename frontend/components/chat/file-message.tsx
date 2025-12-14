'use client';

import { useState } from 'react';
import { Download, Play, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { FileTypeIcon, formatFileSize, getFileCategory, isPreviewable } from './file-type-icon';
import { cn } from '@/lib/utils';
import { getFileUrl } from '@/lib/file-utils';

interface FileInfo {
  file_id: string;
  filename: string;
  mime_type: string;
  size: number;
  url?: string;
}

interface FileMessageProps {
  fileInfo: FileInfo;
  isOwnMessage: boolean;
  onPreview?: (file: FileInfo) => void;
}

// Download file with authentication
async function downloadFile(fileInfo: FileInfo): Promise<void> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace('/api', '');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  let downloadUrl: string;
  
  // Prioritize URL for download (works with both Cloudinary and local storage)
  if (fileInfo.url) {
    downloadUrl = `${baseUrl}/api/files/proxy-download?url=${encodeURIComponent(fileInfo.url)}&filename=${encodeURIComponent(fileInfo.filename)}`;
  } else if (fileInfo.file_id) {
    // Extract string ID if file_id is an object
    const fileId = typeof fileInfo.file_id === 'object' 
      ? (fileInfo.file_id as any)?._id || String(fileInfo.file_id)
      : fileInfo.file_id;
    downloadUrl = `${baseUrl}/api/files/${fileId}/download`;
  } else {
    console.error('No file_id or url available');
    return;
  }

  try {
    const response = await fetch(downloadUrl, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      // Try to get error message from response
      try {
        const errorData = await response.json();
        alert(errorData.error || `Download failed: ${response.status}`);
      } catch {
        alert(`Download failed: ${response.status}`);
      }
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileInfo.filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Download error:', error);
    alert('Không thể tải file. Vui lòng thử lại.');
  }
}

export function FileMessage({ fileInfo, isOwnMessage, onPreview }: FileMessageProps) {
  const category = getFileCategory(fileInfo.mime_type);
  const canPreview = isPreviewable(fileInfo.mime_type);
  // File URL used by child components
  void canPreview; // Mark as intentionally unused for now

  // Render based on file type
  switch (category) {
    case 'image':
      return (
        <ImageMessage
          fileInfo={fileInfo}
          isOwnMessage={isOwnMessage}
          onPreview={onPreview}
        />
      );
    case 'video':
      return (
        <VideoMessage
          fileInfo={fileInfo}
          isOwnMessage={isOwnMessage}
          onPreview={onPreview}
        />
      );
    case 'audio':
      return <AudioMessage fileInfo={fileInfo} isOwnMessage={isOwnMessage} />;
    default:
      return (
        <DocumentMessage
          fileInfo={fileInfo}
          isOwnMessage={isOwnMessage}
          canPreview={canPreview}
          onPreview={onPreview}
        />
      );
  }
}

// Image Message Component
function ImageMessage({
  fileInfo,
  isOwnMessage,
  onPreview,
}: {
  fileInfo: FileInfo;
  isOwnMessage: boolean;
  onPreview?: (file: FileInfo) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imageUrl = getFileUrl(fileInfo.url || `/api/files/${fileInfo.file_id}/download`);

  if (error) {
    return (
      <DocumentMessage
        fileInfo={fileInfo}
        isOwnMessage={isOwnMessage}
        canPreview={false}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative max-w-[280px] rounded-lg overflow-hidden cursor-pointer group"
      onClick={() => onPreview?.(fileInfo)}
    >
      {/* Loading placeholder */}
      {!loaded && (
        <div className="w-[280px] h-[200px] bg-gray-200 animate-pulse flex items-center justify-center">
          <FileTypeIcon mimeType={fileInfo.mime_type} size="lg" />
        </div>
      )}
      
      <img
        src={imageUrl}
        alt={fileInfo.filename}
        className={cn(
          'max-w-full max-h-[300px] object-contain rounded-lg',
          !loaded && 'hidden'
        )}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
      
      {/* Hover overlay with download button */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center gap-2">
        <ExternalLink 
          className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onPreview?.(fileInfo);
          }}
        />
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadFile(fileInfo);
          }}
          className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 inline-flex items-center justify-center"
          title="Download"
        >
          <Download className="w-8 h-8" />
        </button>
      </div>
      
      {/* File info */}
      <div className={cn(
        'absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent',
        'opacity-0 group-hover:opacity-100 transition-opacity'
      )}>
        <p className="text-[10px] text-white truncate">{fileInfo.filename}</p>
        <p className="text-[9px] text-white/70">{formatFileSize(fileInfo.size)}</p>
      </div>
    </motion.div>
  );
}

// Video Message Component
function VideoMessage({
  fileInfo,
  isOwnMessage,
  onPreview,
}: {
  fileInfo: FileInfo;
  isOwnMessage: boolean;
  onPreview?: (file: FileInfo) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoUrl = getFileUrl(fileInfo.url || `/api/files/${fileInfo.file_id}/download`);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="relative max-w-[320px] rounded-lg overflow-hidden group"
    >
      <video
        src={videoUrl}
        className="max-w-full max-h-[240px] object-contain rounded-lg"
        controls={isPlaying}
        onClick={() => !isPlaying && onPreview?.(fileInfo)}
      />
      
      {/* Play button overlay */}
      {!isPlaying && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer group/video"
          onClick={() => setIsPlaying(true)}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors">
              <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadFile(fileInfo);
              }}
              className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors opacity-0 group-hover/video:opacity-100"
              title="Download video"
            >
              <Download className="w-5 h-5 text-gray-900" />
            </button>
          </div>
        </div>
      )}
      
      {/* File info */}
      <div className="mt-1 flex items-center gap-2 text-xs">
        <FileTypeIcon mimeType={fileInfo.mime_type} size="sm" />
        <span className={cn(
          'truncate flex-1',
          isOwnMessage ? 'text-white/80' : 'text-gray-600'
        )}>
          {fileInfo.filename}
        </span>
        <span className={cn(
          isOwnMessage ? 'text-white/60' : 'text-gray-400'
        )}>
          {formatFileSize(fileInfo.size)}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            downloadFile(fileInfo);
          }}
          className={cn(
            'p-1 rounded transition-colors inline-flex items-center',
            isOwnMessage
              ? 'hover:bg-white/10 text-white/80'
              : 'hover:bg-gray-200 text-gray-600'
          )}
          title="Download"
        >
          <Download className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}

// Audio Message Component
function AudioMessage({
  fileInfo,
  isOwnMessage,
}: {
  fileInfo: FileInfo;
  isOwnMessage: boolean;
}) {
  const audioUrl = getFileUrl(fileInfo.url || `/api/files/${fileInfo.file_id}/download`);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-[280px]"
    >
      <audio
        src={audioUrl}
        controls
        className="w-full h-10"
      />
      
      <div className="mt-1 flex items-center gap-2 text-xs">
        <FileTypeIcon mimeType={fileInfo.mime_type} size="sm" />
        <span className={cn(
          'truncate flex-1',
          isOwnMessage ? 'text-white/80' : 'text-gray-600'
        )}>
          {fileInfo.filename}
        </span>
        <span className={cn(
          isOwnMessage ? 'text-white/60' : 'text-gray-400'
        )}>
          {formatFileSize(fileInfo.size)}
        </span>
      </div>
    </motion.div>
  );
}

// Document Message Component
function DocumentMessage({
  fileInfo,
  isOwnMessage,
  canPreview,
  onPreview,
}: {
  fileInfo: FileInfo;
  isOwnMessage: boolean;
  canPreview?: boolean;
  onPreview?: (file: FileInfo) => void;
}) {
  const downloadUrl = getFileUrl(fileInfo.url || `/api/files/${fileInfo.file_id}/download`);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg min-w-[200px] max-w-[280px]',
        isOwnMessage ? 'bg-white/10' : 'bg-gray-100',
        (canPreview && onPreview) && 'cursor-pointer hover:bg-opacity-80 transition-colors'
      )}
      onClick={() => canPreview && onPreview?.(fileInfo)}
    >
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
        isOwnMessage ? 'bg-white/20' : 'bg-gray-200'
      )}>
        <FileTypeIcon mimeType={fileInfo.mime_type} size="md" />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isOwnMessage ? 'text-white' : 'text-gray-900'
        )}>
          {fileInfo.filename}
        </p>
        <p className={cn(
          'text-xs',
          isOwnMessage ? 'text-white/60' : 'text-gray-500'
        )}>
          {formatFileSize(fileInfo.size)}
        </p>
      </div>
      
      <button
        onClick={(e) => {
          e.stopPropagation();
          downloadFile(fileInfo);
        }}
        className={cn(
          'p-2 rounded-full flex-shrink-0 transition-colors inline-flex items-center justify-center',
          isOwnMessage
            ? 'hover:bg-white/20 text-white'
            : 'hover:bg-gray-200 text-gray-600'
        )}
        title="Download"
      >
        <Download className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// Multiple files grid
interface FileMessageGridProps {
  files: FileInfo[];
  isOwnMessage: boolean;
  onPreview?: (file: FileInfo) => void;
}

export function FileMessageGrid({ files, isOwnMessage, onPreview }: FileMessageGridProps) {
  if (files.length === 1) {
    return (
      <FileMessage
        fileInfo={files[0]}
        isOwnMessage={isOwnMessage}
        onPreview={onPreview}
      />
    );
  }

  // Grid layout for multiple files
  const imageFiles = files.filter(f => getFileCategory(f.mime_type) === 'image');
  const otherFiles = files.filter(f => getFileCategory(f.mime_type) !== 'image');

  return (
    <div className="space-y-2">
      {/* Image grid */}
      {imageFiles.length > 0 && (
        <div className={cn(
          'grid gap-1',
          imageFiles.length === 2 && 'grid-cols-2',
          imageFiles.length >= 3 && 'grid-cols-3'
        )}>
          {imageFiles.slice(0, 9).map((file, index) => (
            <div
              key={file.file_id}
              className={cn(
                'relative aspect-square rounded-lg overflow-hidden cursor-pointer group',
                imageFiles.length === 1 && 'col-span-3 aspect-auto max-h-[300px]'
              )}
              onClick={() => onPreview?.(file)}
            >
              <img
                src={getFileUrl(file.url)}
                alt={file.filename}
                className="w-full h-full object-cover"
              />
              
              {/* More images indicator */}
              {index === 8 && imageFiles.length > 9 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">
                    +{imageFiles.length - 9}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Other files */}
      {otherFiles.length > 0 && (
        <div className="space-y-1">
          {otherFiles.map((file) => (
            <FileMessage
              key={file.file_id}
              fileInfo={file}
              isOwnMessage={isOwnMessage}
              onPreview={onPreview}
            />
          ))}
        </div>
      )}
    </div>
  );
}
