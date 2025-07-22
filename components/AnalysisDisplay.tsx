import React from 'react';
import { FundingAnalysis, RiskTier } from '../types';
import { IconClipboardList } from './Icons';

const ScoreBar: React.FC<{ score: number }> = ({ score }) => {
    const percentage = score * 10;
    let bgColor = 'bg-red-500';
    if (percentage >= 70) {
        bgColor = 'bg-green-500';
    } else if (percentage >= 40) {
        bgColor = 'bg-yellow-500';
    }
    return (
        <div className="w-full bg-slate-600 rounded-full h-2.5">
            <div
                className={`${bgColor} h-2.5 rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${percentage}%` }}
            ></div>
        </div>
    );
};

const TierCard: React.FC<{ tier: RiskTier }> = ({ tier }) => {
    return (
        <div className="bg-slate-700/50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-md font-semibold text-gray-200">{tier.tierName}</h4>
                <span className="font-bold text-lg text-gray-100">{tier.score}/10</span>
            </div>
            <ScoreBar score={tier.score} />
            <p className="text-sm text-gray-400 mt-3 mb-3">{tier.summary}</p>
            <ul className="text-xs text-gray-300 space-y-1.5 list-disc list-inside">
                {tier.details.map((detail, index) => (
                    <li key={index}>{detail}</li>
                ))}
            </ul>
        </div>
    );
};

const AnalysisDisplay: React.FC<{ analysis: FundingAnalysis }> = ({ analysis }) => {
    return (
        <section id="analysis-display" className="mb-8 animate-fadeIn">
            <h2 className="text-2xl font-semibold text-gray-200 mb-4 flex items-center">
                <IconClipboardList className="h-7 w-7 mr-2.5 text-purple-400" />
                2. Fundability Scorecard
            </h2>
            <div className="bg-slate-900/40 rounded-xl p-6 border border-slate-700">
                <div className="text-center mb-6">
                    <h3 className="text-lg font-medium text-gray-400">Overall Fundability Score</h3>
                    <p className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-400 to-indigo-400 my-2">
                        {analysis.overallScore.toFixed(1)}<span className="text-3xl text-gray-400">/10</span>
                    </p>
                     <div className="max-w-md mx-auto">
                        <ScoreBar score={analysis.overallScore} />
                     </div>
                    <p className="text-gray-300 mt-4 max-w-2xl mx-auto">{analysis.overallSummary}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...analysis.riskTiers].reverse().map((tier) => (
                        <TierCard key={tier.tierName} tier={tier} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default AnalysisDisplay;