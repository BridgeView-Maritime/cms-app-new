import express from 'express';
import multer from 'multer';
import { 
  checkEmail, 
  registerCrew, 
  parseResume, 
  updateProfile 
} from '../controllers/crewController.js';

const router = express.Router();

// Memory Storage Multer setup for PDF upload
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDF files are allowed'), false);
  }
});

router.post('/check-email', checkEmail);
router.post('/register', registerCrew);
router.post('/parse-resume', upload.single('resume'), parseResume);
router.put('/profile', updateProfile);

export default router;