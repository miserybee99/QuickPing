'use client';

import { motion } from 'framer-motion';
import { X, FileText, Image, Film, File, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FileUploadItem {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

interface FileUploadProgressProps {
  files: FileUploadItem[];
  onCancel: (id: string) => void;
}

const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('video/')) return Film;
  if (type.includes('pdf') || type.includes('document')) return FileText;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export function FileUploadProgress({ files, onCancel }: FileUploadProgressProps) {
  if (files.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed bottom-4 right-4 w-96 bg-background border rounded-lg shadow-2xl z-50"
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Đang tải lên {files.length} file</h3>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {files.map((file) => {
            const FileIcon = getFileIcon(file.type);
            
            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg"
              >
                <div className={`p-2 rounded ${
                  file.status === 'completed' ? 'bg-green-500/20' :
                  file.status === 'error' ? 'bg-red-500/20' :
                  'bg-blue-500/20'
                }`}>
                  {file.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <FileIcon className="h-5 w-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                  
                  {file.status === 'uploading' && (
                    <div className="mt-2">
                      <Progress value={file.progress} className="h-1" />
                      <p className="text-xs text-muted-foreground mt-1">{file.progress}%</p>
                    </div>
                  )}
                  
                  {file.status === 'completed' && (
                    <p className="text-xs text-green-600 mt-1">✓ Hoàn thành</p>
                  )}
                  
                  {file.status === 'error' && (
                    <p className="text-xs text-red-600 mt-1">✗ Lỗi tải lên</p>
                  )}
                </div>

                {file.status === 'uploading' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => onCancel(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

