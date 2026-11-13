import { z } from 'zod';

export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message cannot exceed 2000 characters'),
  conversationId: z.string().uuid().optional(),
});

export const forecastQuerySchema = z.object({
  productId: z.string().uuid().optional(),
  horizonDays: z.coerce.number().int().refine((val) => val === 7 || val === 30, {
    message: 'Horizon must be 7 or 30 days',
  }).default(30),
});

export const restockQuerySchema = z.object({
  urgency: z.enum(['CRITICAL', 'WARNING', 'HEALTHY', 'ALL']).default('ALL'),
  supplierId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
export type ForecastQueryInput = z.infer<typeof forecastQuerySchema>;
export type RestockQueryInput = z.infer<typeof restockQuerySchema>;
