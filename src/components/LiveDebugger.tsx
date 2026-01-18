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
            // Show a shortened version of current activity
            if (lastLog.agent === 'Adjuster') return 'ADJUSTER WORKING';
            if (lastLog.agent === 'Social Worker') return 'SOCIAL WORKER';
            if (lastLog.agent === 'Coordinator') return 'COORDINATOR';
            if (lastLog.agent === 'Extractor') return 'EXTRACTING';
        }
        return 'RUNNING';
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-xl h-full bg-[#0b120e] border-l border-[#28392e] shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#28392e] flex items-center justify-between bg-[#111813]">
                    <div className="flex items-center gap-3">
                        <div className={`size-2 rounded-full ${analysisComplete ? 'bg-primary' : 'bg-red-500 animate-pulse'}`}></div>
                        <h3 className="font-mono text-sm font-bold text-white uppercase tracking-widest">Actuary Agent Live View</h3>
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
                            <span className="text-sm">Analyzing coverage... {logs.length} steps completed</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
