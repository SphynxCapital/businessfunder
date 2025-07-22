import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { GENERATION_MODEL, ANALYSIS_TEMPERATURE, ANALYSIS_TOP_P, ANALYSIS_TOP_K } from '../constants';
import { BankStatementAnalysis, AnalysisResult, FundingAnalysis } from "../types";

const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        accountHolder: { type: Type.STRING, description: "The name of the business or account holder. If not found, return null." },
        statementPeriod: { type: Type.STRING, description: "The date range of the statement (e.g., 'MM/DD/YYYY - MM/DD/YYYY'). If not found, return null." },
        totalDeposits: { type: Type.NUMBER, description: "The total sum of all deposits or credits for the period." },
        depositCount: { type: Type.NUMBER, description: "The total number of deposit or credit transactions during the period." },
        averageBalance: { type: Type.NUMBER, description: "The average daily balance for the period. If not explicitly stated, estimate it based on starting and ending balances." },
        endingBalance: { type: Type.NUMBER, description: "The final or ending balance at the end of the statement period." },
        negativeDayCount: { type: Type.NUMBER, description: "The number of days the daily balance was negative. If not specified, assume 0." },
        summary: { type: Type.STRING, description: "A 2-3 sentence expert summary of the account's financial health, mentioning cash flow consistency, any large unusual deposits, and overall stability for a funding provider." }
    },
    required: ["totalDeposits", "depositCount", "averageBalance", "endingBalance", "negativeDayCount", "summary"]
};


const analyzeBankStatement = async (statementText: string): Promise<AnalysisResult> => {
    const systemInstruction = `You are an expert financial analyst specializing in underwriting for Merchant Cash Advances (MCAs). Your task is to analyze the provided bank statement text and extract key financial metrics.
    Focus on data relevant to assessing a business's cash flow and stability. Be precise in extracting numbers.
    Your analysis must be structured according to the provided JSON schema. Do not return any text outside of the JSON object.`;

    try {
        const response = await genAI.models.generateContent({
            model: GENERATION_MODEL,
            contents: [{ role: "user", parts: [{ text: `Analyze the following bank statement text:\n\n${statementText}` }] }],
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: analysisSchema,
                temperature: ANALYSIS_TEMPERATURE,
                topP: ANALYSIS_TOP_P,
                topK: ANALYSIS_TOP_K,
            },
        });
        
        const jsonText = response.text.trim();
        const analysis = JSON.parse(jsonText) as BankStatementAnalysis;

        // Basic validation
        if (typeof analysis.totalDeposits === 'undefined' || typeof analysis.averageBalance === 'undefined') {
            throw new Error("Analysis response from AI is malformed or missing key fields.");
        }

        return scoreAndCategorizeAnalysis(analysis);

    } catch (error: any) {
        console.error("Error analyzing bank statement with Gemini:", error);
        if (error.message?.includes("json")) {
           throw new Error(`The AI returned an invalid analysis format. Please try another document.`);
        }
        throw new Error(`Failed to get analysis from AI: ${error.message || "Unknown error occurred"}`);
    }
};

const scoreAndCategorizeAnalysis = (analysis: BankStatementAnalysis): AnalysisResult => {
    let score = 50; // Start with a baseline score

    // Score based on average balance
    if (analysis.averageBalance > 10000) score += 25;
    else if (analysis.averageBalance > 5000) score += 15;
    else if (analysis.averageBalance > 1000) score += 5;
    else score -= 10;

    // Score based on total deposits (as a proxy for revenue)
    if (analysis.totalDeposits > 50000) score += 20;
    else if (analysis.totalDeposits > 20000) score += 10;
    
    // Score based on stability (negative days)
    if (analysis.negativeDayCount === 0) score += 15;
    else if (analysis.negativeDayCount <= 2) score -= 5;
    else score -= 15;

    // Score based on deposit consistency
    if(analysis.depositCount > 15) score += 5;
    else if (analysis.depositCount < 5) score -= 5;

    // Normalize score to be between 10 and 99
    score = Math.max(10, Math.min(score, 99));

    let headline = "Analysis Complete";
    let dynamicCopy = "Your financial snapshot has been generated. See the details below.";
    let badgeColor = "bg-yellow-500";

    if (score >= 75) {
        headline = "Strong Candidate";
        dynamicCopy = "Your business demonstrates strong and consistent cash flow. You are in an excellent position for funding.";
        badgeColor = "bg-green-500";
    } else if (score >= 50) {
        headline = "Potential Candidate";
        dynamicCopy = "Your business shows promising financial activity. We encourage you to apply to explore your funding options.";
        badgeColor = "bg-sky-500";
    } else {
         headline = "Needs Review";
        dynamicCopy = "Based on this statement, there are areas to improve to strengthen your funding potential. Our team can provide guidance.";
        badgeColor = "bg-amber-500";
    }
    
    return { analysis, score, headline, dynamicCopy, badgeColor };
};

const generateAnswerStream = async function* (
    question: string,
    documentText: string,
    analysis: FundingAnalysis
): AsyncGenerator<GenerateContentResponse> {
    const systemInstruction = `You are a helpful AI assistant for business funding analysis. Your name is 'Analyst AI'.
    You will answer questions based on the provided business plan text and its initial fundability analysis.
    If the user's question cannot be answered from the provided context or is a general knowledge/market question, you can use Google Search to find relevant information.
    When you use web search, your response should be based on the search results.
    Always be concise, helpful, and professional. The user is a business owner looking for funding.
    
    Here is the initial fundability analysis summary:
    Overall Score: ${analysis.overallScore}/10
    Summary: ${analysis.overallSummary}
    `;
    
    const contextPrompt = `CONTEXT: The user has uploaded a business document. Here is the full text of the document:\n\n---\n\n${documentText}\n\n---`;
    const analysisPrompt = `PREVIOUS ANALYSIS: An initial analysis has been performed on the document with the following results:\n\n---\n\n${JSON.stringify(analysis, null, 2)}\n\n---`;
    
    const contents = [
        {
            role: "user",
            parts: [
                { text: contextPrompt },
                { text: analysisPrompt },
                { text: `USER QUESTION: ${question}` },
            ]
        }
    ];

    const stream = await genAI.models.generateContentStream({
        model: GENERATION_MODEL,
        contents: contents,
        config: {
            temperature: 0.5,
            topP: 1,
            topK: 32,
            tools: [{googleSearch: {}}],
        },
    });

    for await (const chunk of stream) {
        yield chunk;
    }
}

export const geminiService = {
    analyzeBankStatement,
    generateAnswerStream,
};
