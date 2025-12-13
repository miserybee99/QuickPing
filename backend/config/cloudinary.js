import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Check if Cloudinary is configured
export function isCloudinaryConfigured() {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

// Upload file to Cloudinary
export async function uploadToCloudinary(filePath, options = {}) {
  const defaultOptions = {
    folder: 'quickping',
    resource_type: 'auto', // auto-detect: image, video, raw
    ...options
  };

  try {
    const result = await cloudinary.uploader.upload(filePath, defaultOptions);
    return {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      resource_type: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      duration: result.duration // for videos
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

// Upload from buffer (for multer memory storage)
export async function uploadBufferToCloudinary(buffer, originalName, options = {}) {
  const defaultOptions = {
    folder: 'quickping',
    resource_type: 'auto',
    public_id: `${Date.now()}-${originalName.replace(/\.[^/.]+$/, '')}`, // Remove extension
    ...options
  };

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
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

// Delete file from Cloudinary
export async function deleteFromCloudinary(publicId, resourceType = 'image') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw error;
  }
}

// Get optimized URL with transformations
export function getOptimizedUrl(publicId, options = {}) {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    ...options
  });
}

// Get thumbnail URL for images/videos
export function getThumbnailUrl(publicId, width = 200, height = 200) {
  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    fetch_format: 'auto',
    quality: 'auto'
  });
}

export default cloudinary;

