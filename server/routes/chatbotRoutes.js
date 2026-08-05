import express from 'express';
import { 
  getDynamicQuestions, 
  processUserMessage, 
  saveMenuChatbotContext 
} from '../controllers/chatbotController.js';

const router = express.Router();

router.post('/questions', getDynamicQuestions);
router.post('/chat', processUserMessage);
router.post('/save-context', saveMenuChatbotContext);

export default router;