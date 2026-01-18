"use client";

import React from 'react';
import { UserProfile } from '@/types';

interface ReliefResultsProps {
    policyId: string;
    billTotal: number;
    privateCoverage: number;
    publicCoverage: number;
    finalCost: number;
    userProfile?: UserProfile | null;
    insurancePlan?: string;
    governmentProgram?: string;
    onGoToDashboard: () => void;
}

export const ReliefResults: React.FC<ReliefResultsProps> = ({
    policyId,
    billTotal,
    privateCoverage,
    publicCoverage,
    finalCost,
    userProfile,
    insurancePlan,
    governmentProgram,
    onGoToDashboard
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

    // Determine eligibility details based on user profile
    const getEligibilityDetails = () => {
        if (!userProfile) return null;

        const details: string[] = [];

        // Age-based eligibility
        if (userProfile.age >= 65) {
            if (userProfile.region === 'Ontario') {
                details.push('✓ Eligible for Ontario Drug Benefit (seniors 65+)');
            } else {
                details.push('✓ Eligible for NY EPIC (seniors 65+)');
            }
        } else if (userProfile.age < 25 && !userProfile.hasPrivateInsurance) {
            // OHIP+ only for those WITHOUT private insurance
            if (userProfile.region === 'Ontario') {
                details.push('✓ Eligible for OHIP+ (under 25, no private insurance)');
            }
        }

        // Show insurance provider if they have one
        if (userProfile.hasPrivateInsurance && userProfile.insuranceProvider) {
            const providerNames: Record<string, string> = {
                'sun_life': 'Sun Life Financial',
                'manulife': 'Manulife',
                'great_west': 'Great-West Life',
                'blue_cross': 'Blue Cross',
                'desjardins': 'Desjardins Insurance',
                'canada_life': 'Canada Life',
                'cigna': 'Cigna',
                'aetna': 'Aetna',
                'united_health': 'UnitedHealthcare',
                'other': 'Private Insurance'
            };
            details.push(`✓ Private insurance: ${providerNames[userProfile.insuranceProvider] || userProfile.insuranceProvider}`);
        }

        return details;
    };

    const eligibilityDetails = getEligibilityDetails();

    return (
        <div className="flex min-h-screen w-full bg-[#0b120e] text-white">
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
            <div className="w-1/2 flex flex-col items-center justify-start p-8 overflow-y-auto">
                <div className="flex flex-col items-center gap-6 max-w-md w-full">
                    {/* Success Icon */}
                    <div className="size-16 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary text-primary shadow-[0_0_40px_rgba(19,236,91,0.4)]">
                        <span className="material-symbols-outlined text-3xl">check_circle</span>
                    </div>

                    <h1 className="text-2xl font-bold">Coverage Secured</h1>

                    {/* Detailed amounts */}
                    <div className="w-full bg-[#16211b] border border-[#28392e] rounded-2xl p-5 space-y-3">
                        <div className="flex justify-between items-center pb-3 border-b border-[#28392e]">
                            <span className="text-slate-400">Original Bill</span>
                            <span className="text-lg font-mono">${billTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                        </div>

                        {privateCoverage > 0 && (
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                        <span className="text-slate-300">Private Insurance</span>
                                    </div>
                                    <span className="font-mono text-green-400">-${privateCoverage.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                {insurancePlan && (
                                    <p className="text-xs text-purple-400 pl-5">{insurancePlan}</p>
                                )}
                            </div>
                        )}

                        {publicCoverage > 0 && (
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                        <span className="text-slate-300">Government Aid</span>
                                    </div>
                                    <span className="font-mono text-green-400">-${publicCoverage.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                </div>
                                {governmentProgram && (
                                    <p className="text-xs text-orange-400 pl-5">{governmentProgram}</p>
                                )}
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-3 border-t border-[#28392e]">
                            <span className="text-lg font-bold">You Pay</span>
                            <span className={`text-2xl font-mono font-bold ${finalCost === 0 ? 'text-primary' : 'text-yellow-400'}`}>
                                ${finalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {/* Coverage Details */}
                    <div className="w-full bg-[#16211b] border border-[#28392e] rounded-2xl p-5 space-y-4">
                        <h3 className="font-bold text-slate-300 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">info</span>
                            Coverage Details
                        </h3>

                        {/* Private Insurance Details */}
                        {privateCoverage > 0 && userProfile?.hasPrivateInsurance && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-purple-400">Private Insurance</h4>
                                <div className="bg-[#0b120e] rounded-xl p-3 text-sm text-slate-400 space-y-1">
                                    <p>• Coverage Rate: 80%</p>
                                    <p>• Provider: {(() => {
                                        const providerNames: Record<string, string> = {
                                            'sun_life': 'Sun Life Financial',
                                            'manulife': 'Manulife',
                                            'great_west': 'Great-West Life',
                                            'blue_cross': 'Blue Cross',
                                            'desjardins': 'Desjardins Insurance',
                                            'canada_life': 'Canada Life',
                                            'cigna': 'Cigna',
                                            'aetna': 'Aetna',
                                            'united_health': 'UnitedHealthcare',
                                            'other': 'Private Insurer'
                                        };
                                        return providerNames[userProfile?.insuranceProvider || ''] || insurancePlan || 'Private Insurance';
                                    })()}</p>
                                    <p>• Policy: {userProfile?.policyNumber || 'On file'}</p>
                                </div>
                            </div>
                        )}

                        {/* Government Aid Details */}
                        {publicCoverage > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-orange-400">Government Program</h4>
                                <div className="bg-[#0b120e] rounded-xl p-3 text-sm text-slate-400 space-y-1">
                                    <p>• Program: {governmentProgram || (userProfile?.region === 'Ontario' ? 'Ontario Drug Benefit' : 'NY Medicaid')}</p>
                                    <p>• Coverage: 100% of remaining balance</p>
                                    <p>• Region: {userProfile?.region || 'Ontario'}</p>
                                </div>
                            </div>
                        )}

                        {/* Eligibility Notes */}
                        {eligibilityDetails && eligibilityDetails.length > 0 && (
                            <div className="space-y-2">
                                <h4 className="text-sm font-medium text-primary">Your Eligibility</h4>
                                <div className="bg-[#0b120e] rounded-xl p-3 text-sm text-slate-400 space-y-1">
                                    {eligibilityDetails.map((detail, i) => (
                                        <p key={i}>{detail}</p>
                                    ))}
                                    {userProfile && (
                                        <p className="text-xs text-slate-500 mt-2">
                                            Based on: Age {userProfile.age}, {userProfile.region}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4 mt-2">
                        <button className="px-5 py-2.5 rounded-full bg-[#16211b] border border-[#3b5443] hover:border-primary transition-colors text-white font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">download</span>
                            Download
                        </button>
                        <button
                            onClick={onGoToDashboard}
                            className="px-5 py-2.5 rounded-full bg-primary text-[#0b120e] font-bold shadow-lg hover:shadow-primary/50 transition-all flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">dashboard</span>
                            View All Claims
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
