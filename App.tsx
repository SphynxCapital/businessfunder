import React, { useState, useCallback } from 'react';
import { parsePdf } from './services/pdfParserService';
import { geminiService } from './services/geminiService';
import { AppStep, FileStatus, AnalysisResult } from './types';

import FileUpload from './components/FileUpload';
import { IconAlertTriangle, IconLoader, IconSparkles, IconInfoCircle, IconCheckCircle, IconDollarSign, IconTrendingUp, IconTrendingDown, IconFileText, IconBarChart } from './components/Icons';

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('welcome');
  const [fileStatus, setFileStatus] = useState<FileStatus | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<{ title: string; message: string } | null>(null);

  const handleFileChange = useCallback(async (file: File | null) => {
    if (!file) {
      setFileStatus(null);
      return;
    }
    setError(null);
    setAnalysisResult(null);
    setStep('analyzing');
    setFileStatus({ file, status: 'parsing', message: 'Reading your document...' });

    try {
      const textContent = await parsePdf(file);
      if (!textContent.trim()) {
        throw new Error("No text could be extracted from the PDF. The file might be empty or image-based.");
      }
      setFileStatus({ file, status: 'analyzing', message: 'AI is analyzing your financial data...' });
      
      const result = await geminiService.analyzeBankStatement(textContent);
      setAnalysisResult(result);
      setFileStatus({ file, status: 'complete', message: 'Analysis complete.' });
      setStep('result');

    } catch (err: any) {
      console.error("Processing error:", err);
      const errorMessage = err.message || "An unknown error occurred during processing.";
      setError({ title: "Processing Failed", message: errorMessage });
      setStep('error');
      setFileStatus(prev => prev ? { ...prev, status: 'error', message: 'Failed' } : null);
    }
  }, []);

  const handleReset = () => {
    setStep('welcome');
    setFileStatus(null);
    setAnalysisResult(null);
    setError(null);
  };

  const renderContent = () => {
    switch (step) {
      case 'welcome':
        return <WelcomeScreen onGetStarted={() => setStep('upload')} />;
      case 'upload':
        return <FileUpload onFileChange={handleFileChange} disabled={false} />;
      case 'analyzing':
        return <AnalyzingScreen status={fileStatus} />;
      case 'result':
        return <ResultScreen result={analysisResult} onReset={handleReset} />;
      case 'error':
        return <ErrorScreen error={error} onReset={handleReset} />;
      default:
        return <WelcomeScreen onGetStarted={() => setStep('upload')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-gray-100 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-2xl mx-auto">
        <header className="text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <IconSparkles className="h-8 w-8 text-primary-400 mr-2" />
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              ChatMCA by Sphynx Capital
            </h1>
          </div>
          <p className="text-gray-400 text-md">
            Your AI partner for instant business funding analysis.
          </p>
        </header>
        
        <main className="bg-slate-800/80 shadow-2xl rounded-2xl p-6 md:p-8 border border-slate-700/50 transition-all duration-500 min-h-[400px] flex items-center justify-center">
          <div className="w-full">
            {renderContent()}
          </div>
        </main>

        <footer className="w-full mt-8 text-center text-gray-500 text-xs">
          <p>Powered by Gemini. AI analysis is for informational purposes and not a guarantee of funding.</p>
          <p>&copy; {new Date().getFullYear()} Sphynx Capital Holdings. All Rights Reserved.</p>
        </footer>
      </div>
    </div>
  );
};

const WelcomeScreen: React.FC<{ onGetStarted: () => void }> = ({ onGetStarted }) => (
  <div className="text-center animate-fadeIn">
    <IconInfoCircle className="h-16 w-16 text-purple-400 mx-auto mb-4" />
    <h2 className="text-2xl font-semibold text-gray-100 mb-2">Get Instant Financial Insights</h2>
    <p className="text-gray-400 mb-6 max-w-md mx-auto">
      Upload your latest bank statement (PDF) to receive a confidential, AI-powered analysis of your business's funding potential in seconds.
    </p>
    <button
      onClick={onGetStarted}
      className="px-8 py-3 font-semibold rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-all duration-150 ease-in-out transform hover:scale-105"
    >
      Get Started
    </button>
  </div>
);

const AnalyzingScreen: React.FC<{ status: FileStatus | null }> = ({ status }) => (
  <div className="text-center animate-fadeIn space-y-4">
    <IconLoader className="animate-spin h-16 w-16 text-purple-400 mx-auto" />
    <h2 className="text-2xl font-semibold text-gray-100">Analyzing...</h2>
    <p className="text-gray-400">{status?.message || 'Please wait while we process your document.'}</p>
    <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden mt-4">
      <div className="relative w-full h-full">
        <div className="absolute inset-0 bg-purple-500 w-full h-full animate-shimmer -translate-x-full"></div>
      </div>
    </div>
  </div>
);

const ResultScreen: React.FC<{ result: AnalysisResult | null; onReset: () => void }> = ({ result, onReset }) => {
  if (!result) return null;
  const { analysis, score, headline, dynamicCopy, badgeColor } = result;

  const Metric: React.FC<{ icon: React.ReactNode; label: string; value: string; }> = ({ icon, label, value }) => (
    <div className="bg-slate-800 p-4 rounded-lg text-center">
      <div className="text-purple-400 mb-1">{icon}</div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <div className="text-center mb-6">
        <span className={`px-3 py-1 text-sm font-semibold text-white rounded-full ${badgeColor} inline-block mb-3`}>
          {headline}
        </span>
        <h2 className="text-2xl font-bold text-gray-100">Financial Health Score: {score}/100</h2>
        <p className="text-gray-300 mt-2 max-w-xl mx-auto">{dynamicCopy}</p>
      </div>
      
      <div className="bg-slate-900/50 p-4 rounded-lg mb-6 border border-slate-700">
        <h3 className="font-semibold text-lg mb-3 flex items-center"><IconBarChart className="w-5 h-5 mr-2 text-purple-400"/>Key Metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Metric icon={<IconTrendingUp className="w-6 h-6 mx-auto"/>} label="Total Deposits" value={analysis.totalDeposits.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} />
            <Metric icon={<IconDollarSign className="w-6 h-6 mx-auto"/>} label="Average Balance" value={analysis.averageBalance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} />
            <Metric icon={<IconTrendingDown className="w-6 h-6 mx-auto"/>} label="Negative Days" value={String(analysis.negativeDayCount)} />
        </div>
      </div>

       <div className="bg-slate-900/50 p-4 rounded-lg mb-6 border border-slate-700">
         <h3 className="font-semibold text-lg mb-2 flex items-center"><IconFileText className="w-5 h-5 mr-2 text-purple-400"/>AI Summary</h3>
         <p className="text-sm text-gray-400">{analysis.summary}</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6">
        <button
          onClick={() => alert("Redirecting to Sphynx Capital application...")}
          className="w-full sm:w-auto px-8 py-3 font-semibold rounded-lg text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-500 transition-all duration-150 ease-in-out transform hover:scale-105"
        >
          Apply for Funding
        </button>
        <button
          onClick={onReset}
          className="w-full sm:w-auto px-6 py-2.5 font-medium rounded-lg text-gray-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-purple-500 transition-colors"
        >
          Analyze Another
        </button>
      </div>
    </div>
  );
};

const ErrorScreen: React.FC<{ error: { title: string, message: string } | null, onReset: () => void }> = ({ error, onReset }) => (
  <div className="text-center animate-fadeIn">
    <IconAlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
    <h2 className="text-2xl font-semibold text-red-300 mb-2">{error?.title || 'An Error Occurred'}</h2>
    <p className="text-gray-400 mb-6 max-w-md mx-auto">
      {error?.message || 'Something went wrong. Please try again with a different file.'}
    </p>
    <button
      onClick={onReset}
      className="px-8 py-3 font-semibold rounded-lg text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-all"
    >
      Try Again
    </button>
  </div>
);

export default App;
