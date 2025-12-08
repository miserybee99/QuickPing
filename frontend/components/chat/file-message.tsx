'use client';

import { useState } from 'react';
import { Download, Play, ExternalLink } from 'lucide-react';
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
  const imageUrl = fileInfo.url || `/api/files/${fileInfo.file_id}/download`;

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
      
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <ExternalLink className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
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
  const videoUrl = fileInfo.url || `/api/files/${fileInfo.file_id}/download`;

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
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={() => setIsPlaying(true)}
        >
          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors">
            <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
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
  const audioUrl = fileInfo.url || `/api/files/${fileInfo.file_id}/download`;

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
  const downloadUrl = fileInfo.url || `/api/files/${fileInfo.file_id}/download`;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(downloadUrl, '_blank');
  };

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
        onClick={handleDownload}
        className={cn(
          'p-2 rounded-full flex-shrink-0 transition-colors',
          isOwnMessage
            ? 'hover:bg-white/20 text-white'
            : 'hover:bg-gray-200 text-gray-600'
        )}
        title="Tải xuống"
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
