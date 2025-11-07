'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  if (!file) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderPreview = () => {
    if (file.type.startsWith('image/')) {
      return (
        <img
          src={file.url}
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
          src={file.url}
        />
      );
    }

    if (file.type === 'application/pdf') {
      return (
        <div className="bg-muted p-8 rounded-lg">
          <p className="text-center mb-4">PDF Preview</p>
          <Button onClick={() => window.open(file.url, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Mở trong tab mới
          </Button>
        </div>
      );
    }

    return (
      <div className="bg-muted p-8 rounded-lg text-center">
        <p className="text-muted-foreground">
          Không thể xem trước file này
        </p>
        <Button className="mt-4" onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Tải xuống
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
                {onDownload && (
                  <Button size="sm" variant="secondary" onClick={onDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Tải
                  </Button>
                )}
                {onDelete && (
                  <Button size="sm" variant="destructive" onClick={onDelete}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={onClose} className="text-white">
                  <X className="h-4 w-4" />
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

