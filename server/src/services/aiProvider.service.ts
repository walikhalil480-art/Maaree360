export interface AiProviderStatus {
  configured: boolean;
  provider: 'gemini' | 'openai' | 'none';
  model: string | null;
}

export interface AiChatMessagePayload {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GenerateAiOptions {
  systemPrompt: string;
  userPrompt: string;
  conversationHistory?: AiChatMessagePayload[];
  maxTokens?: number;
  temperature?: number;
}

export class AiProviderService {
  /**
   * Check which provider is configured from environment variables.
   */
  public getStatus(): AiProviderStatus {
    const geminiKey = process.env.GEMINI_API_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (geminiKey && geminiKey.trim().length > 0) {
      return {
        configured: true,
        provider: 'gemini',
        model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      };
    }

    if (openAiKey && openAiKey.trim().length > 0) {
      return {
        configured: true,
        provider: 'openai',
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      };
    }

    return {
      configured: false,
      provider: 'none',
      model: null,
    };
  }

  /**
   * Generates response using the active AI provider or returns clear unconfigured message.
   */
  public async generateCompletion(options: GenerateAiOptions): Promise<{
    content: string;
    model: string | null;
    provider: 'gemini' | 'openai' | 'none';
    tokensUsed?: number;
  }> {
    const status = this.getStatus();

    if (!status.configured) {
      return {
        content:
          'AI Assistant API key is currently not configured on the server (GEMINI_API_KEY or OPENAI_API_KEY). All deterministic sales forecasting, smart restock recommendations, and business insights remain 100% operational using real verified store records.',
        model: null,
        provider: 'none',
      };
    }

    if (status.provider === 'gemini') {
      return this.callGemini(options, status.model || 'gemini-1.5-flash');
    }

    return this.callOpenAi(options, status.model || 'gpt-4o-mini');
  }

  private async callGemini(
    options: GenerateAiOptions,
    modelName: string
  ): Promise<{
    content: string;
    model: string;
    provider: 'gemini';
    tokensUsed?: number;
  }> {
    const apiKey = process.env.GEMINI_API_KEY!;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Gemini system instruction can be passed or prepended to conversation
    if (options.conversationHistory && options.conversationHistory.length > 0) {
      for (const msg of options.conversationHistory.slice(-6)) {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }],
        });
      }
    }

    // Final prompt with context
    contents.push({
      role: 'user',
      parts: [{ text: `${options.systemPrompt}\n\nUser Question:\n${options.userPrompt}` }],
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: options.temperature ?? 0.2,
          maxOutputTokens: options.maxTokens ?? 1024,
        },
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = (await response.json()) as any;
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts?.map((p: any) => p.text).join('') || '';

    return {
      content: text || 'No response generated.',
      model: modelName,
      provider: 'gemini',
      tokensUsed: data?.usageMetadata?.totalTokenCount,
    };
  }

  private async callOpenAi(
    options: GenerateAiOptions,
    modelName: string
  ): Promise<{
    content: string;
    model: string;
    provider: 'openai';
    tokensUsed?: number;
  }> {
    const apiKey = process.env.OPENAI_API_KEY!;
    const url = 'https://api.openai.com/v1/chat/completions';

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: options.systemPrompt },
    ];

    if (options.conversationHistory && options.conversationHistory.length > 0) {
      for (const msg of options.conversationHistory.slice(-6)) {
        if (msg.role === 'user' || msg.role === 'assistant') {
          messages.push({
            role: msg.role,
            content: msg.content,
          });
        }
      }
    }

    messages.push({
      role: 'user',
      content: options.userPrompt,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 1024,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errText.slice(0, 300)}`);
    }

    const data = (await response.json()) as any;
    const choice = data?.choices?.[0];
    const text = choice?.message?.content || '';

    return {
      content: text || 'No response generated.',
      model: modelName,
      provider: 'openai',
      tokensUsed: data?.usage?.total_tokens,
    };
  }
}

export const aiProviderService = new AiProviderService();
