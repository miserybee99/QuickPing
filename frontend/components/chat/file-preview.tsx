'use client';

import { X, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileTypeIcon, formatFileSize, getFileCategory } from './file-type-icon';
import { cn } from '@/lib/utils';

export interface SelectedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

interface FilePreviewProps {
  files: SelectedFile[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  disabled?: boolean;
}

export function FilePreview({ files, onRemove, onRetry, disabled }: FilePreviewProps) {
  if (files.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="px-4 py-3 border-b border-gray-200 bg-gray-50"
    >
      <div className="flex flex-wrap gap-2">
        <AnimatePresence mode="popLayout">
          {files.map((selectedFile) => (
            <FilePreviewItem
              key={selectedFile.id}
              selectedFile={selectedFile}
              onRemove={() => onRemove(selectedFile.id)}
              onRetry={onRetry ? () => onRetry(selectedFile.id) : undefined}
              disabled={disabled}
            />
          ))}
        </AnimatePresence>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        {files.length} file{files.length > 1 ? 's' : ''} selected • 
        {' '}{formatFileSize(files.reduce((acc, f) => acc + f.file.size, 0))} total
      </div>
    </motion.div>
  );
}

interface FilePreviewItemProps {
  selectedFile: SelectedFile;
  onRemove: () => void;
  onRetry?: () => void;
  disabled?: boolean;
}

function FilePreviewItem({ selectedFile, onRemove, onRetry, disabled }: FilePreviewItemProps) {
  const { file, preview, status, progress } = selectedFile;
  const category = getFileCategory(file.type);
  const isImage = category === 'image';
  const isVideo = category === 'video';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={cn(
        'relative group rounded-lg overflow-hidden border',
        isImage || isVideo ? 'w-20 h-20' : 'flex items-center gap-2 px-3 py-2 bg-white',
        status === 'error' ? 'border-red-300 bg-red-50' : 'border-gray-200',
        disabled && 'opacity-50'
      )}
    >
      {/* Image/Video Preview */}
      {(isImage || isVideo) && preview && (
        <div className="w-full h-full">
          {isImage ? (
            <img
              src={preview}
              alt={file.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              src={preview}
              className="w-full h-full object-cover"
              muted
            />
          )}
          
          {/* Overlay with file info */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1">
            <span className="text-[10px] text-white truncate w-full">{file.name}</span>
          </div>
        </div>
      )}

      {/* Document Preview */}
      {!isImage && !isVideo && (
        <>
          <FileTypeIcon mimeType={file.type} size="md" />
          <div className="flex-1 min-w-0 max-w-[120px]">
            <p className="text-xs font-medium truncate">{file.name}</p>
            <p className="text-[10px] text-gray-500">{formatFileSize(file.size)}</p>
          </div>
        </>
      )}

      {/* Upload Progress */}
      {status === 'uploading' && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-5 h-5 text-white animate-spin mx-auto" />
            <span className="text-[10px] text-white mt-1 block">{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && (
        <div className="absolute inset-0 bg-red-500/80 flex flex-col items-center justify-center gap-1">
          <AlertCircle className="w-4 h-4 text-white" />
          {onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRetry();
              }}
              className="text-[10px] text-white underline flex items-center gap-1"
              disabled={disabled}
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Remove Button */}
      {status !== 'uploading' && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          disabled={disabled}
          className={cn(
            'absolute top-1 right-1 p-0.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70',
            (isImage || isVideo) ? '' : 'relative top-0 right-0 ml-1 bg-gray-100 text-gray-600 opacity-100 hover:bg-gray-200'
          )}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}

// Constants for file validation
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_FILES = 10;

export const ACCEPTED_FILE_TYPES = {
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
  'video/*': ['.mp4', '.webm', '.mov'],
  'audio/*': ['.mp3', '.wav', '.ogg', '.m4a'],
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/zip': ['.zip'],
  'application/x-rar-compressed': ['.rar'],
  'application/x-7z-compressed': ['.7z'],
};

// Helper to validate file
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File too large. Maximum ${formatFileSize(MAX_FILE_SIZE)}` };
  }

  // Check file type
  const isAccepted = Object.keys(ACCEPTED_FILE_TYPES).some((type) => {
    if (type.endsWith('/*')) {
      const prefix = type.replace('/*', '/');
      return file.type.startsWith(prefix);
    }
    return file.type === type;
  });

  if (!isAccepted) {
    return { valid: false, error: 'File type not supported' };
  }

  return { valid: true };
}

// Helper to create file preview URL
export function createFilePreviewUrl(file: File): string | undefined {
  const category = getFileCategory(file.type);
  if (category === 'image' || category === 'video') {
    return URL.createObjectURL(file);
  }
  return undefined;
}

// Helper to create a SelectedFile object
export function createSelectedFile(file: File): SelectedFile {
  return {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    file,
    preview: createFilePreviewUrl(file),
    status: 'pending',
    progress: 0,
  };
}
