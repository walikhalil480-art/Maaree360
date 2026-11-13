import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { chatMessageSchema, forecastQuerySchema, restockQuerySchema } from '../schemas/ai.schemas.js';
import { requireAuth, requireBusinessMember } from '../middleware/auth.js';

const router = Router({ mergeParams: true });

// Ensure user is authenticated and is an active member of this business
router.use(requireAuth);
router.use(requireBusinessMember());

// Chat with assistant
router.post('/chat', validateRequest({ body: chatMessageSchema }), aiController.chat);

// List user's conversations
router.get('/conversations', aiController.getConversations);

// Get messages for a specific conversation
router.get('/conversations/:conversationId', aiController.getConversation);

// Sales forecasting (7 or 30 days)
router.get('/forecast', validateRequest({ query: forecastQuerySchema }), aiController.getForecast);

// Restocking recommendations
router.get('/restock', validateRequest({ query: restockQuerySchema }), aiController.getRestockRecommendations);

// Actionable business insights
router.get('/insights', aiController.getInsights);

// Provider status & suggested questions
router.get('/status', aiController.getStatus);

export default router;
