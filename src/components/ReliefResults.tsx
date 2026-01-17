"use client";

import React from 'react';

interface ReliefResultsProps {
    policyId: string;
    billTotal: number;
    privateCoverage: number;
    publicCoverage: number;
    finalCost: number;
}

export const ReliefResults: React.FC<ReliefResultsProps> = ({
    policyId,
    billTotal,
    privateCoverage,
    publicCoverage,
    finalCost
}) => {
    // Calculate percentages for pie chart
    const total = billTotal || 1; // Avoid division by zero
    const privatePercent = (privateCoverage / total) * 100;
    const publicPercent = (publicCoverage / total) * 100;
    const patientPercent = (finalCost / total) * 100;

    // SVG Pie Chart calculations
    const radius = 100;
    const circumference = 2 * Math.PI * radius;

    // Calculate stroke dash offsets for each segment
    const privateOffset = 0;
    const publicOffset = (privatePercent / 100) * circumference;
    const patientOffset = ((privatePercent + publicPercent) / 100) * circumference;

    return (
        <div className="flex h-screen w-full bg-[#0b120e] text-white">
            {/* LEFT SIDE: Pie Chart */}
            <div className="w-1/2 flex flex-col items-center justify-center p-8 border-r border-[#28392e]">
                <h2 className="text-2xl font-bold mb-8 text-slate-300">Coverage Breakdown</h2>

                {/* Pie Chart SVG */}
                <div className="relative">
                    <svg width="280" height="280" viewBox="0 0 280 280" className="transform -rotate-90">
                        {/* Background circle */}
                        <circle
                            cx="140"
                            cy="140"
                            r={radius}
                            fill="none"
                            stroke="#1a2420"
                            strokeWidth="40"
                        />

                        {/* Private Insurance segment (Purple) */}
                        {privatePercent > 0 && (
                            <circle
                                cx="140"
                                cy="140"
                                r={radius}
                                fill="none"
                                stroke="#a855f7"
                                strokeWidth="40"
                                strokeDasharray={`${(privatePercent / 100) * circumference} ${circumference}`}
                                strokeDashoffset={-privateOffset}
                                className="transition-all duration-1000 ease-out"
                            />
                        )}

                        {/* Government Aid segment (Orange) */}
                        {publicPercent > 0 && (
                            <circle
                                cx="140"
                                cy="140"
                                r={radius}
                                fill="none"
                                stroke="#f97316"
                                strokeWidth="40"
                                strokeDasharray={`${(publicPercent / 100) * circumference} ${circumference}`}
                                strokeDashoffset={-publicOffset}
                                className="transition-all duration-1000 ease-out delay-300"
                            />
                        )}

                        {/* Patient Responsibility segment (Green/Primary) */}
                        {patientPercent > 0 && (
                            <circle
                                cx="140"
                                cy="140"
                                r={radius}
                                fill="none"
                                stroke="#13ec5b"
                                strokeWidth="40"
                                strokeDasharray={`${(patientPercent / 100) * circumference} ${circumference}`}
                                strokeDashoffset={-patientOffset}
                                className="transition-all duration-1000 ease-out delay-500"
                            />
                        )}
                    </svg>

                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-sm text-slate-400">Total Bill</span>
                        <span className="text-2xl font-bold font-mono">${billTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-8 space-y-3 w-full max-w-xs">
                    <div className="flex items-center justify-between p-3 bg-[#16211b] rounded-xl border border-[#28392e]">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-purple-500"></div>
                            <span className="text-slate-300">Private Insurance</span>
                        </div>
                        <span className="font-mono text-purple-400">{privatePercent.toFixed(0)}%</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#16211b] rounded-xl border border-[#28392e]">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                            <span className="text-slate-300">Government Aid</span>
                        </div>
                        <span className="font-mono text-orange-400">{publicPercent.toFixed(0)}%</span>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-[#16211b] rounded-xl border border-[#28392e]">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full bg-primary"></div>
                            <span className="text-slate-300">You Pay</span>
                        </div>
                        <span className="font-mono text-primary">{patientPercent.toFixed(0)}%</span>
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: Detailed Breakdown */}
            <div className="w-1/2 flex flex-col items-center justify-center p-8">
                <div className="flex flex-col items-center gap-6 max-w-md w-full">
                    {/* Success Icon */}
                    <div className="size-20 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary text-primary shadow-[0_0_40px_rgba(19,236,91,0.4)]">
                        <span className="material-symbols-outlined text-4xl">check_circle</span>
                    </div>

                    <h1 className="text-3xl font-bold">Coverage Secured</h1>

                    {/* Detailed amounts */}
                    <div className="w-full bg-[#16211b] border border-[#28392e] rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center pb-4 border-b border-[#28392e]">
                            <span className="text-slate-400">Original Bill</span>
                            <span className="text-xl font-mono">${billTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>

                        {privateCoverage > 0 && (
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                    <span className="text-slate-300">Private Insurance</span>
                                </div>
                                <span className="font-mono text-green-400">-${privateCoverage.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        {publicCoverage > 0 && (
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                    <span className="text-slate-300">Government Aid</span>
                                </div>
                                <span className="font-mono text-green-400">-${publicCoverage.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-4 border-t border-[#28392e]">
                            <span className="text-lg font-bold">You Pay</span>
                            <span className={`text-3xl font-mono font-bold ${finalCost === 0 ? 'text-primary' : 'text-yellow-400'}`}>
                                ${finalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 mt-4">
                        <button className="px-5 py-2.5 rounded-full bg-[#16211b] border border-[#3b5443] hover:border-primary transition-colors text-white font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">download</span>
                            Download
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-5 py-2.5 rounded-full bg-primary text-[#0b120e] font-bold shadow-lg hover:shadow-primary/50 transition-all"
                        >
                            New Session
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
