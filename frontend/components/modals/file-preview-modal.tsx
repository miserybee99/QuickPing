'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getFileUrl } from '@/lib/file-utils';

// Download file with authentication
async function downloadFileWithAuth(url: string, filename: string): Promise<void> {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001').replace('/api', '');
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const downloadUrl = `${baseUrl}/api/files/proxy-download?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}`;

  const response = await fetch(downloadUrl, {
    headers: token ? { 'Authorization': `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(blobUrl);
  document.body.removeChild(a);
}

interface FilePreviewModalProps {
  file: {
    name: string;
    url: string;
    type: string;
    size: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

export function FilePreviewModal({
  file,
  isOpen,
  onClose,
  onDownload,
  onDelete,
}: FilePreviewModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!file) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadFileWithAuth(file.url, file.name);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      window.open(getFileUrl(file.url), '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  const renderPreview = () => {
    if (file.type.startsWith('image/')) {
      return (
        <img
          src={getFileUrl(file.url)}
          alt={file.name}
          className="max-h-[70vh] max-w-full object-contain rounded-lg"
        />
      );
    }

    if (file.type.startsWith('video/')) {
      return (
        <video
          controls
          className="max-h-[70vh] max-w-full rounded-lg"
          src={getFileUrl(file.url)}
        />
      );
    }

    if (file.type === 'application/pdf') {
      return (
        <div className="bg-muted p-8 rounded-lg">
          <p className="text-center mb-4">PDF Preview</p>
          <Button onClick={() => window.open(getFileUrl(file.url), '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in new tab
          </Button>
        </div>
      );
    }

    return (
      <div className="bg-muted p-8 rounded-lg text-center">
        <p className="text-muted-foreground">
          Cannot preview this file
        </p>
        <Button className="mt-4" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/90 z-50"
          />

          {/* Modal */}
          <div className="fixed inset-0 flex flex-col z-50 p-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-4 bg-background/10 backdrop-blur rounded-lg mb-4"
            >
              <div className="flex-1 min-w-0 mr-4">
                <p className="font-semibold text-white truncate">{file.name}</p>
                <p className="text-sm text-white/70">{formatFileSize(file.size)}</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium h-9 px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  {isDownloading ? 'Downloading...' : 'Download'}
                </button>
                {onDelete && (
                  <Button size="sm" variant="destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={onClose} className="text-white hover:bg-white/20">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </motion.div>

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex-1 flex items-center justify-center"
            >
              {renderPreview()}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

