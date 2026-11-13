import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../api/client';
import {
  Sparkles,
  TrendingUp,
  PackageCheck,
  Lightbulb,
  CheckCircle2,
  Info,
} from 'lucide-react';
import AiChatSection from '../components/ai/AiChatSection';
import SalesForecastSection from '../components/ai/SalesForecastSection';
import RestockRecommendationSection from '../components/ai/RestockRecommendationSection';
import BusinessInsightsSection from '../components/ai/BusinessInsightsSection';
import type { AiProviderStatus } from '../types/ai';

type ActiveTab = 'chat' | 'forecast' | 'restock' | 'insights';

export default function AiAssistantPage() {
  const { activeBusiness } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [providerStatus, setProviderStatus] = useState<AiProviderStatus | null>(null);

  const currency = activeBusiness?.currency || 'KES';

  useEffect(() => {
    if (!activeBusiness) return;

    async function loadStatus() {
      try {
        const json = await apiFetch<{ success: boolean; data: AiProviderStatus }>(
          `/api/v1/businesses/${activeBusiness?.id}/ai/status`
        );
        if (json.success && json.data) {
          setProviderStatus(json.data);
        }
      } catch (err) {
        console.error('Failed to load AI status', err);
      }
    }

    loadStatus();
  }, [activeBusiness]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">AI Business Assistant</h1>
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Intelligence
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Data-driven sales forecasting, reorder point calculations, actionable insights, and conversational business advice.
          </p>
        </div>

        {/* Provider Status Pill */}
        <div className="flex items-center gap-2">
          {providerStatus?.configured ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Provider: {providerStatus.provider.toUpperCase()} ({providerStatus.model})</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-600">
              <Info className="w-3.5 h-3.5 text-slate-400" />
              <span>Deterministic Intelligence Engine</span>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-xs transition whitespace-nowrap ${
              activeTab === 'chat'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            AI Chat Advisor
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-xs transition whitespace-nowrap ${
              activeTab === 'forecast'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Sales Demand Forecasting
          </button>

          <button
            onClick={() => setActiveTab('restock')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-xs transition whitespace-nowrap ${
              activeTab === 'restock'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            Smart Restocking (ROP)
          </button>

          <button
            onClick={() => setActiveTab('insights')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-xs transition whitespace-nowrap ${
              activeTab === 'insights'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Lightbulb className="w-4 h-4" />
            Business Insights
          </button>
        </nav>
      </div>

      {/* Tab Content Panels */}
      <div>
        {activeTab === 'chat' && (
          <AiChatSection providerStatus={providerStatus} currency={currency} />
        )}
        {activeTab === 'forecast' && <SalesForecastSection currency={currency} />}
        {activeTab === 'restock' && <RestockRecommendationSection currency={currency} />}
        {activeTab === 'insights' && <BusinessInsightsSection currency={currency} />}
      </div>
    </div>
  );
}
