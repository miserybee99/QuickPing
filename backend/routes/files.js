import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';
import File from '../models/File.js';
import { authenticate } from '../middleware/auth.js';
import cloudinary, { 
  isCloudinaryConfigured, 
  deleteFromCloudinary 
} from '../config/cloudinary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists (for local fallback)
const uploadsDir = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// File size limit: 10MB (Cloudinary free tier allows up to 10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Videos
  'video/mp4', 'video/webm', 'video/quicktime',
  // Audio
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // Text/Code
  'text/plain',
  'text/csv',
  'application/json',
];

// Determine resource type for Cloudinary
function getResourceType(mimeType) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'raw'; // For documents, audio, archives, etc.
}

// Configure multer based on storage mode
const useCloudinary = isCloudinaryConfigured();

// Use memory storage for Cloudinary, disk storage for local
const storage = useCloudinary
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const sanitizedName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, uniqueSuffix + '-' + sanitizedName);
      }
    });

// File filter function
const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter
});

const router = express.Router();

// Log storage mode on startup
console.log(`📁 File storage mode: ${useCloudinary ? 'Cloudinary ☁️' : 'Local disk 💾'}`);

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File quá lớn. Tối đa 10MB',
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};

// Upload buffer to Cloudinary
async function uploadToCloudinaryFromBuffer(buffer, originalName, mimeType) {
  const resourceType = getResourceType(mimeType);
  const publicId = `quickping/${Date.now()}-${originalName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^/.]+$/, '')}`;
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        public_id: publicId,
        folder: '', // Already included in public_id
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary upload error:', error);
          reject(error);
        } else {
          resolve({
            public_id: result.public_id,
            url: result.secure_url,
            format: result.format,
            resource_type: result.resource_type,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            duration: result.duration
          });
        }
      }
    );
    
    // Convert buffer to stream and pipe to Cloudinary
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
}

// Upload single file
router.post('/upload', authenticate, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { conversation_id, message_id } = req.body;
    let fileData;

    if (useCloudinary) {
      // Upload to Cloudinary
      try {
        const cloudinaryResult = await uploadToCloudinaryFromBuffer(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );

        fileData = {
          uploader_id: req.user._id,
          original_name: req.file.originalname,
          stored_name: cloudinaryResult.public_id,
          url: cloudinaryResult.url,
          mime_type: req.file.mimetype,
          size: cloudinaryResult.bytes || req.file.size,
          conversation_id,
          message_id,
          metadata: {
            storage: 'cloudinary',
            public_id: cloudinaryResult.public_id,
            resource_type: cloudinaryResult.resource_type,
            format: cloudinaryResult.format,
            width: cloudinaryResult.width,
            height: cloudinaryResult.height,
            duration: cloudinaryResult.duration
          }
        };
        
        console.log(`✅ File uploaded to Cloudinary: ${cloudinaryResult.public_id}`);
        console.log(`📎 URL: ${cloudinaryResult.url}`);
      } catch (cloudinaryError) {
        console.error('Cloudinary upload failed:', cloudinaryError);
        return res.status(500).json({ 
          error: 'Upload failed. Please try again.',
          code: 'CLOUDINARY_ERROR'
        });
      }
    } else {
      // Local storage fallback
      fileData = {
        uploader_id: req.user._id,
        original_name: req.file.originalname,
        stored_name: req.file.filename,
        url: `/uploads/${req.file.filename}`,
        mime_type: req.file.mimetype,
        size: req.file.size,
        conversation_id,
        message_id,
        metadata: {
          storage: 'local'
        }
      };
    }

    const file = new File(fileData);
    await file.save();

    res.status(201).json({ 
      file,
      storage: useCloudinary ? 'cloudinary' : 'local'
    });
  } catch (error) {
    console.error('Upload file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload multiple files
router.post('/upload-multiple', authenticate, (req, res, next) => {
  upload.array('files', 10)(req, res, (err) => {
    if (err) {
      return handleMulterError(err, req, res, next);
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { conversation_id, message_id } = req.body;
    const uploadedFiles = [];
    const errors = [];

    for (const uploadedFile of req.files) {
      try {
        let fileData;

        if (useCloudinary) {
          // Upload to Cloudinary
          const cloudinaryResult = await uploadToCloudinaryFromBuffer(
            uploadedFile.buffer,
            uploadedFile.originalname,
            uploadedFile.mimetype
          );

          fileData = {
            uploader_id: req.user._id,
            original_name: uploadedFile.originalname,
            stored_name: cloudinaryResult.public_id,
            url: cloudinaryResult.url,
            mime_type: uploadedFile.mimetype,
            size: cloudinaryResult.bytes || uploadedFile.size,
            conversation_id,
            message_id,
            metadata: {
              storage: 'cloudinary',
              public_id: cloudinaryResult.public_id,
              resource_type: cloudinaryResult.resource_type,
              format: cloudinaryResult.format,
              width: cloudinaryResult.width,
              height: cloudinaryResult.height,
              duration: cloudinaryResult.duration
            }
          };
          
          console.log(`✅ File uploaded to Cloudinary: ${cloudinaryResult.public_id}`);
          console.log(`📎 URL: ${cloudinaryResult.url}`);
        } else {
          // Local storage fallback
          fileData = {
            uploader_id: req.user._id,
            original_name: uploadedFile.originalname,
            stored_name: uploadedFile.filename,
            url: `/uploads/${uploadedFile.filename}`,
            mime_type: uploadedFile.mimetype,
            size: uploadedFile.size,
            conversation_id,
            message_id,
            metadata: {
              storage: 'local'
            }
          };
        }

        const file = new File(fileData);
        await file.save();
        uploadedFiles.push(file);
      } catch (uploadError) {
        console.error('Error uploading file:', uploadedFile.originalname, uploadError);
        errors.push({
          filename: uploadedFile.originalname,
          error: uploadError.message
        });
      }
    }

    res.status(201).json({ 
      files: uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
      storage: useCloudinary ? 'cloudinary' : 'local'
    });
  } catch (error) {
    console.error('Upload multiple files error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get file info
router.get('/:fileId', authenticate, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check access (user must be in conversation or be uploader)
    if (file.uploader_id.toString() !== req.user._id.toString()) {
      if (file.conversation_id) {
        const Conversation = (await import('../models/Conversation.js')).default;
        const conversation = await Conversation.findById(file.conversation_id);
        const isParticipant = conversation?.participants.some(
          p => p.user_id.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
    }

    res.json({ file });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Download file
router.get('/:fileId/download', authenticate, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check access
    if (file.uploader_id.toString() !== req.user._id.toString()) {
      if (file.conversation_id) {
        const Conversation = (await import('../models/Conversation.js')).default;
        const conversation = await Conversation.findById(file.conversation_id);
        const isParticipant = conversation?.participants.some(
          p => p.user_id.toString() === req.user._id.toString()
        );

        if (!isParticipant) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
    }

    const isCloudinaryFile = file.metadata?.get?.('storage') === 'cloudinary' || 
                             file.metadata?.storage === 'cloudinary';

    if (isCloudinaryFile) {
      // For Cloudinary files, redirect to the URL with download flag
      const downloadUrl = file.url.replace('/upload/', '/upload/fl_attachment/');
      return res.redirect(downloadUrl);
    } else {
      // Local file download
      const filePath = path.join(uploadsDir, file.stored_name);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found on disk' });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_name)}"`);
      res.setHeader('Content-Type', file.mime_type);
      res.setHeader('Content-Length', file.size);
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    }
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete file
router.delete('/:fileId', authenticate, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Only uploader can delete
    if (file.uploader_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the uploader can delete this file' });
    }

    const isCloudinaryFile = file.metadata?.get?.('storage') === 'cloudinary' || 
                             file.metadata?.storage === 'cloudinary';

    if (isCloudinaryFile) {
      // Delete from Cloudinary
      const publicId = file.metadata?.get?.('public_id') || file.metadata?.public_id || file.stored_name;
      const resourceType = file.metadata?.get?.('resource_type') || file.metadata?.resource_type || 'image';
      
      try {
        await deleteFromCloudinary(publicId, resourceType);
      } catch (cloudinaryError) {
        console.error('Cloudinary delete error:', cloudinaryError);
        // Continue with DB deletion even if Cloudinary fails
      }
    } else {
      // Delete local file
      const filePath = path.join(uploadsDir, file.stored_name);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await File.findByIdAndDelete(req.params.fileId);

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get storage info (admin/debug endpoint)
router.get('/storage/info', authenticate, async (req, res) => {
  res.json({
    mode: useCloudinary ? 'cloudinary' : 'local',
    cloudinary_configured: isCloudinaryConfigured(),
    max_file_size: MAX_FILE_SIZE,
    allowed_types: ALLOWED_MIME_TYPES
  });
});

export default router;
