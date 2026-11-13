import { Request, Response, NextFunction } from 'express';
import { aiAssistantService, SUGGESTED_BUSINESS_QUESTIONS } from '../services/aiAssistant.service.js';
import { aiProviderService } from '../services/aiProvider.service.js';
import { forecastingService } from '../services/forecasting.service.js';
import { restockService } from '../services/restock.service.js';
import { insightsService } from '../services/insights.service.js';
import { ChatMessageInput, ForecastQueryInput, RestockQueryInput } from '../schemas/ai.schemas.js';

export class AiController {
  /**
   * Post a question to the AI Business Assistant.
   */
  public async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params;
      const { message, conversationId } = req.body as ChatMessageInput;
      const userId = req.user!.id;
      const userRole = (req as any).membership.role;

      const response = await aiAssistantService.handleChat({
        businessId,
        userId,
        userRole,
        message,
        conversationId,
      });

      res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get conversations for authenticated user.
   */
  public async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params;
      const userId = req.user!.id;

      const conversations = await aiAssistantService.getConversations(businessId, userId);

      res.status(200).json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get messages of a specific conversation.
   */
  public async getConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId, conversationId } = req.params;

      const conversation = await aiAssistantService.getConversationMessages(businessId, conversationId);

      res.status(200).json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sales forecast (7 or 30 days).
   */
  public async getForecast(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params;
      const query = (req.query || {}) as unknown as ForecastQueryInput;
      const horizonDays = query.horizonDays ?? 30;
      const targetProductId = query.productId;

      const forecast = await forecastingService.getForecast(businessId, horizonDays, targetProductId);

      res.status(200).json({
        success: true,
        data: forecast,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get smart restocking recommendations.
   */
  public async getRestockRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params;
      const query = (req.query || {}) as unknown as RestockQueryInput;

      const recommendations = await restockService.getRecommendations(businessId, {
        urgency: query.urgency,
        supplierId: query.supplierId,
        categoryId: query.categoryId,
      });

      res.status(200).json({
        success: true,
        data: recommendations,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get actionable business insights.
   */
  public async getInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { businessId } = req.params;

      const insights = await insightsService.getInsights(businessId);

      res.status(200).json({
        success: true,
        data: insights,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider status and suggested questions.
   */
  public async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = aiProviderService.getStatus();

      res.status(200).json({
        success: true,
        data: {
          ...status,
          suggestedQuestions: SUGGESTED_BUSINESS_QUESTIONS,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const aiController = new AiController();
