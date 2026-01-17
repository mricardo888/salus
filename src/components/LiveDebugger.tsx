"use client";

import React, { useState, useEffect, useRef } from 'react';

interface LiveDebuggerProps {
    onComplete: () => void;
    policyId: string;
    realLogs: string[];
    isAnalyzing?: boolean;
}

interface LogEntry {
    id: string;
    agent: string;
    action: string;
    result: string;
    status: 'PENDING' | 'SUCCESS' | 'WARNING' | 'ERROR';
    timestamp: number;
}

export const LiveDebugger: React.FC<LiveDebuggerProps> = ({ onComplete, policyId, realLogs, isAnalyzing }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (realLogs && realLogs.length > 0) {
            const formattedLogs: LogEntry[] = realLogs.map((log, index) => {
                // Simple parsing "Agent: Message"
                const parts = log.split(':');
                const agentName = parts[0] || 'System';
                const message = parts.slice(1).join(':').trim() || log;

                return {
                    id: index.toString(),
                    agent: agentName,
                    action: 'Processing',
                    result: message,
                    status: 'SUCCESS',
                    timestamp: Date.now()
                };
            });
            setLogs(formattedLogs);

            // Auto-advance
            const timer = setTimeout(() => {
                onComplete();
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [realLogs, onComplete]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-xl h-full bg-[#0b120e] border-l border-[#28392e] shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="px-6 py-4 border-b border-[#28392e] flex items-center justify-between bg-[#111813]">
                    <div className="flex items-center gap-3">
                        <div className="size-2 rounded-full bg-red-500 animate-pulse"></div>
                        <h3 className="font-mono text-sm font-bold text-white uppercase tracking-widest">Actuary Agent Live View</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono">{new Date().toLocaleTimeString()}</span>
                        <span className="px-2 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold border border-primary/30">RUNNING</span>
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
                                            log.agent === 'Social Worker' ? 'text-orange-400' : 'text-primary'
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
                        <div className="flex items-center justify-center h-40 text-slate-600 italic">
                            Waiting for agent initialization...
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
