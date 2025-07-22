export type AppStep = 'welcome' | 'upload' | 'analyzing' | 'result' | 'error';

export type FileStatus = {
  file: File | null;
  status: 'pending' | 'parsing' | 'analyzing' | 'complete' | 'error';
  message: string;
};

export interface BankStatementAnalysis {
  accountHolder?: string;
  statementPeriod?: string;
  totalDeposits: number;
  depositCount: number;
  averageBalance: number;
  endingBalance: number;
  negativeDayCount: number;
  summary: string;
}

export interface AnalysisResult {
  analysis: BankStatementAnalysis;
  score: number;
  headline: string;
  dynamicCopy: string;
  badgeColor: string;
}

// Types for unused components to resolve compilation errors
export interface GroundingChunkWeb {
  uri: string;
  title?: string;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  isLoading?: boolean;
  isStreaming?: boolean;
  error?: string;
  groundingChunksWeb?: GroundingChunkWeb[];
}

export interface RiskTier {
  tierName: string;
  score: number;
  summary: string;
  details: string[];
}

export interface FundingAnalysis {
  overallScore: number;
  overallSummary: string;
  riskTiers: RiskTier[];
}
