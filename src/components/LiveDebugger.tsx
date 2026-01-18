"use client";

import React, { useState, useEffect, useRef } from 'react';

interface LiveDebuggerProps {
    onComplete: () => void;
    policyId: string;
    realLogs: string[];
    isAnalyzing?: boolean;
    analysisComplete?: boolean;
}

interface LogEntry {
    id: string;
    agent: string;
    action: string;
    result: string;
    status: 'PENDING' | 'SUCCESS' | 'WARNING' | 'ERROR';
    timestamp: number;
}

export const LiveDebugger: React.FC<LiveDebuggerProps> = ({
    onComplete,
    policyId,
    realLogs,
    isAnalyzing = true,
    analysisComplete = false
}) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Convert realLogs to LogEntry format whenever they change
    useEffect(() => {
        if (realLogs && realLogs.length > 0) {
            const formattedLogs: LogEntry[] = realLogs.map((log, index) => {
                // Parse "Agent: Message" or "Agent Agent: Message"
                let agentName = 'System';
                let message = log;

                if (log.includes(':')) {
                    const colonIndex = log.indexOf(':');
                    agentName = log.substring(0, colonIndex).trim();
                    message = log.substring(colonIndex + 1).trim();

                    // Clean up agent names
                    if (agentName.includes('Agent')) {
                        agentName = agentName.replace(' Agent', '');
                    }
                }

                // Determine status based on message content
                let status: 'PENDING' | 'SUCCESS' | 'WARNING' | 'ERROR' = 'SUCCESS';
                if (message.includes('Error') || message.includes('⚠')) {
                    status = 'ERROR';
                } else if (message.includes('Warning')) {
                    status = 'WARNING';
                }

                return {
                    id: index.toString(),
                    agent: agentName,
                    action: isAnalyzing ? 'Processing' : 'Complete',
                    result: message,
                    status,
                    timestamp: Date.now()
                };
            });
            setLogs(formattedLogs);
        }
    }, [realLogs, isAnalyzing]);

    // Auto-scroll to bottom when new logs appear
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    // Get current status message
    const getStatusMessage = () => {
        if (analysisComplete) return 'COMPLETE';
        if (!isAnalyzing && logs.length === 0) return 'INITIALIZING';
        if (logs.length > 0) {
            const lastLog = logs[logs.length - 1];
            if (lastLog.agent === 'Adjuster') return 'ADJUSTER WORKING';
            if (lastLog.agent === 'Social Worker') return 'SOCIAL WORKER';
            if (lastLog.agent === 'Coordinator') return 'COORDINATOR';
            if (lastLog.agent === 'Extractor') return 'EXTRACTING';
        }
        return 'RUNNING';
    };

    // Get current agent for animation
    const getCurrentAgent = () => {
        if (logs.length > 0) {
            const lastLog = logs[logs.length - 1];
            return lastLog.agent;
        }
        return 'System';
    };

    return (
        <div className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-sm">
            {/* LEFT SIDE: Animation Area */}
            <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
                {/* Animated Background Rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`absolute w-[400px] h-[400px] rounded-full border-2 opacity-20 animate-ping ${analysisComplete ? 'border-primary' : 'border-purple-500'}`} style={{ animationDuration: '3s' }}></div>
                    <div className={`absolute w-[300px] h-[300px] rounded-full border-2 opacity-30 animate-ping ${analysisComplete ? 'border-primary' : 'border-orange-500'}`} style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}></div>
                    <div className={`absolute w-[200px] h-[200px] rounded-full border-2 opacity-40 animate-ping ${analysisComplete ? 'border-primary' : 'border-cyan-500'}`} style={{ animationDuration: '2s', animationDelay: '1s' }}></div>
                </div>

                {/* Central Agent Icon */}
                <div className={`relative z-10 flex flex-col items-center gap-6 ${analysisComplete ? 'animate-bounce' : ''}`}>
                    {/* Spinning outer ring */}
                    <div className="relative">
                        <div className={`w-40 h-40 rounded-full border-4 ${analysisComplete ? 'border-primary' : 'border-t-purple-500 border-r-orange-500 border-b-cyan-500 border-l-primary animate-spin'}`} style={{ animationDuration: '3s' }}></div>

                        {/* Inner circle with icon */}
                        <div className={`absolute inset-4 rounded-full flex items-center justify-center ${analysisComplete ? 'bg-primary/20' : 'bg-[#16211b]'} border-2 ${analysisComplete ? 'border-primary' : 'border-[#28392e]'}`}>
                            <span className={`material-symbols-outlined text-5xl ${analysisComplete ? 'text-primary' :
                                    getCurrentAgent() === 'Adjuster' ? 'text-purple-400' :
                                        getCurrentAgent() === 'Social Worker' ? 'text-orange-400' :
                                            getCurrentAgent() === 'Coordinator' ? 'text-cyan-400' :
                                                'text-primary'
                                }`}>
                                {analysisComplete ? 'check_circle' :
                                    getCurrentAgent() === 'Adjuster' ? 'shield' :
                                        getCurrentAgent() === 'Social Worker' ? 'volunteer_activism' :
                                            getCurrentAgent() === 'Coordinator' ? 'hub' :
                                                'smart_toy'}
                            </span>
                        </div>
                    </div>

                    {/* Status Text */}
                    <div className="text-center space-y-2">
                        <h2 className={`text-2xl font-bold ${analysisComplete ? 'text-primary' : 'text-white'}`}>
                            {analysisComplete ? 'Analysis Complete!' : 'Analyzing Coverage'}
                        </h2>
                        <p className="text-slate-400 text-sm">
                            {analysisComplete
                                ? 'Your coverage breakdown is ready'
                                : `${getCurrentAgent()} is processing your claim...`}
                        </p>
                    </div>

                    {/* Processing Steps */}
                    <div className="flex gap-4 mt-4">
                        {['Extractor', 'Adjuster', 'Social Worker', 'Coordinator'].map((agent, i) => {
                            const agentIndex = logs.findIndex(l => l.agent === agent || l.agent === agent.replace(' ', ''));
                            const isComplete = agentIndex !== -1;
                            const isCurrent = getCurrentAgent() === agent || getCurrentAgent() === agent.split(' ')[0];

                            return (
                                <div key={agent} className="flex flex-col items-center gap-2">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${isComplete ? 'bg-primary/20 border-2 border-primary' :
                                            isCurrent ? 'bg-[#16211b] border-2 border-yellow-500 animate-pulse' :
                                                'bg-[#16211b] border-2 border-[#28392e]'
                                        }`}>
                                        <span className={`material-symbols-outlined text-lg ${isComplete ? 'text-primary' :
                                                isCurrent ? 'text-yellow-500' :
                                                    'text-slate-600'
                                            }`}>
                                            {isComplete ? 'check' : (i + 1).toString()}
                                        </span>
                                    </div>
                                    <span className={`text-xs ${isComplete ? 'text-primary' : isCurrent ? 'text-yellow-400' : 'text-slate-600'}`}>
                                        {agent.split(' ')[0]}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Floating particles */}
                {!analysisComplete && (
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {[...Array(20)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute w-2 h-2 rounded-full bg-primary/30 animate-float"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: `${Math.random() * 100}%`,
                                    animationDuration: `${3 + Math.random() * 4}s`,
                                    animationDelay: `${Math.random() * 2}s`
                                }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* RIGHT SIDE: Log Panel */}
            <div className="w-full max-w-xl h-full bg-[#0b120e] border-l border-[#28392e] shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#28392e] flex items-center justify-between bg-[#111813]">
                    <div className="flex items-center gap-3">
                        <div className={`size-2 rounded-full ${analysisComplete ? 'bg-primary' : 'bg-red-500 animate-pulse'}`}></div>
                        <h3 className="font-mono text-sm font-bold text-white uppercase tracking-widest">Agent Live View</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono">{new Date().toLocaleTimeString()}</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${analysisComplete
                                ? 'bg-primary/20 text-primary border-primary/30'
                                : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                            }`}>
                            {getStatusMessage()}
                        </span>
                    </div>
                </div>

                {/* Logs */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-4">
                    {logs.map((log) => (
                        <div key={log.id} className="flex gap-4 animate-fade-in border-l-2 border-[#28392e] pl-4 pb-2 relative">
                            <div className={`absolute -left-[9px] top-0 size-4 rounded-full border-2 border-[#0b120e] ${log.status === 'SUCCESS' ? 'bg-primary' :
                                    log.status === 'WARNING' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}></div>

                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className={`font-bold ${log.agent === 'Extractor' ? 'text-blue-400' :
                                            log.agent === 'Adjuster' ? 'text-purple-400' :
                                                log.agent === 'Social Worker' ? 'text-orange-400' :
                                                    log.agent === 'Coordinator' ? 'text-cyan-400' :
                                                        'text-slate-400'
                                        }`}>[{log.agent}]</span>
                                    <span className="text-slate-600">{log.action}</span>
                                </div>
                                <div className="bg-[#16211b] p-3 rounded border border-[#28392e] text-slate-300">
                                    {log.result}
                                </div>
                            </div>
                        </div>
                    ))}

                    {logs.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-40 text-slate-600 italic gap-2">
                            <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full"></div>
                            <span>Initializing agents...</span>
                        </div>
                    )}
                </div>

                {/* Footer with View Results button */}
                <div className="px-6 py-4 border-t border-[#28392e] bg-[#111813]">
                    {analysisComplete ? (
                        <button
                            onClick={onComplete}
                            className="w-full py-3 px-6 bg-primary text-[#0b120e] font-bold rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(19,236,91,0.3)] hover:shadow-[0_0_30px_rgba(19,236,91,0.5)]"
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">check_circle</span>
                                View Results
                            </span>
                        </button>
                    ) : (
                        <div className="flex items-center justify-center gap-3 text-slate-400">
                            <div className="animate-spin size-4 border-2 border-primary border-t-transparent rounded-full"></div>
                            <span className="text-sm">Processing... {logs.length} steps completed</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
