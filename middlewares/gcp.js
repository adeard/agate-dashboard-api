const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');

const config = {
  bucketName: process.env.BUCKET_NAME,
  projectId: process.env.PROJECT_ID,
};

const storage = new Storage({
  projectId: config.projectId,
  keyFilename: process.env.KEY_FILE_NAME,
});

// Set which bucket
const bucket = storage.bucket(config.bucketName);

// Helper to create absolute path to GCS
function getPublicUrl(filename) {
  return `https://storage.googleapis.com/${config.bucketName}/${filename}`;
}

// File filter for more robust validation
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  // Check file type
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images are allowed.'), false);
  }
};

// Multer upload configuration
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// Single file upload to Google Cloud Storage
const uploadToGCS = async (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file to upload'));
    }

    // Generate unique filename
    const gcsname = `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
    const fileRef = bucket.file(gcsname);

    // Create write stream
    const stream = fileRef.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
      resumable: false,
    });

    stream.on('error', (err) => {
      reject(err);
    });

    stream.on('finish', async () => {
      try {
        // Make the file public
        await fileRef.makePublic();

        // Resolve with file metadata
        resolve({
          originalname: file.originalname,
          mimetype: file.mimetype,
          filename: gcsname,
          url: getPublicUrl(gcsname),
        });
      } catch (err) {
        reject(err);
      }
    });

    // Write file buffer
    stream.end(file.buffer);
  });
};
const uploadSingleFile = async (req, res, next) => {
  try {
    // Detailed file logging
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({
        message: 'No file uploaded',
        details: {
          headers: req.headers,
          body: req.body,
        },
      });
    }

    const uploadedFile = await uploadToGCS(req.file);

    req.file = {
      ...req.file,
      ...uploadedFile,
    };

    next();
  } catch (error) {
    console.error('Comprehensive Upload Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    });

    res.status(500).json({
      message: 'File upload failed',
      error: {
        message: error.message,
        code: error.code,
        name: error.name,
      },
    });
  }
};

module.exports = {
  upload,
  uploadSingleFile,
  getPublicUrl,
};
