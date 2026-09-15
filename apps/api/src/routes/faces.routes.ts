import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middlewares/auth';

const router = Router();

// Configure Multer storage to save directly to the agent's data directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { category } = req.body;
    let folder = 'friends';
    if (category === 'enemy') {
      folder = 'enemies';
    }
    
    // Path relative to the API root: ../../services/local-agent/data/<folder>
    const destPath = path.resolve(__dirname, '../../../../services/local-agent/data', folder);
    
    // Ensure the directory exists
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename to avoid overwrites
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

router.use(authenticateToken);

router.post('/upload', upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }
    
    const { category } = req.body;
    
    console.log(`[FaceManagement] New ${category} image uploaded: ${req.file.filename}`);
    
    res.status(201).json({
      success: true,
      message: 'Face uploaded successfully',
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Error uploading face:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
