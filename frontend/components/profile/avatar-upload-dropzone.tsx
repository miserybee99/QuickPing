'use client';

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, X, Check, Loader2, ImageIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

interface AvatarUploadDropzoneProps {
  currentAvatarUrl?: string;
  username: string;
  onAvatarChange: (newUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function AvatarUploadDropzone({
  currentAvatarUrl,
  username,
  onAvatarChange,
  size = 'lg',
}: AvatarUploadDropzoneProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Only image files accepted (JPG, PNG, GIF, WEBP)';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'File size must not exceed 5MB';
    }
    return null;
  };

  const handleFileSelect = useCallback((file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Upload file - don't pass conversation_id for avatar uploads
      const response = await apiClient.files.upload(
        selectedFile,
        undefined, // No conversation_id for avatar uploads
        (progress) => setUploadProgress(progress)
      );

      const uploadedFile = (response as any).data?.file || (response as any).file;
      const newAvatarUrl = uploadedFile.url;

      // Notify parent (parent will handle profile update)
      onAvatarChange(newAvatarUrl);

      // Close modal
      setIsModalOpen(false);
      resetState();
    } catch (err: any) {
      console.error('Avatar upload error:', err);
      setError(err?.response?.data?.error || 'Could not upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenModal = () => {
    resetState();
    setIsModalOpen(true);
  };

  return (
    <>
      {/* Avatar Display with Change Button */}
      <div className="relative group">
        <Avatar className={cn(sizeClasses[size], 'ring-4 ring-background shadow-lg')}>
          <AvatarImage src={currentAvatarUrl} />
          <AvatarFallback className="text-4xl bg-gradient-to-br from-[#615EF0] to-[#8B5CF6] text-white">
            {username?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        {/* Overlay on hover */}
        <button
          onClick={handleOpenModal}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
        >
          <Camera className="w-8 h-8 text-white" />
        </button>
      </div>

      {/* Change Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleOpenModal}
        className="mt-4"
      >
        <Camera className="h-4 w-4 mr-2" />
        Change Avatar
      </Button>

      {/* Upload Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Change Avatar</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Dropzone */}
            {!previewUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all',
                  isDragOver
                    ? 'border-[#615EF0] bg-[#615EF0]/5'
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleInputChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">
                      Drag and drop image here
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      or click to select file
                    </p>
                  </div>
                  <p className="text-xs text-gray-400">
                    JPG, PNG, GIF or WEBP. Max 5MB.
                  </p>
                </div>
              </div>
            ) : (
              /* Preview Section with 1:1 aspect ratio */
              <div className="space-y-4">
                <div className="relative aspect-square w-48 mx-auto overflow-hidden rounded-full border-4 border-[#615EF0]">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <ImageIcon className="w-4 h-4" />
                  <span>{selectedFile?.name}</span>
                  <span className="text-gray-400">
                    ({((selectedFile?.size || 0) / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetState}
                  className="w-full"
                >
                  <X className="w-4 h-4 mr-2" />
                  Choose another image
                </Button>
              </div>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Uploading...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-[#615EF0]"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsModalOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-[#615EF0] hover:bg-[#5048D9]"
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
