"use client";

import React, { useEffect, useState } from 'react';
import { API_URL } from '@/config/api';

interface BillRecord {
    bill_data: {
        total?: number;
        service?: string;
        provider?: string;
        date?: string;
    };
    analysis_result: {
        bill_total: number;
        private_coverage: number;
        public_coverage: number;
        final_cost: number;
    };
    created_at: string;
}

interface ClaimsDashboardProps {
    passkeyUserId: string | null;
    onNewBill: () => void;
}

export const ClaimsDashboard: React.FC<ClaimsDashboardProps> = ({
    passkeyUserId,
    onNewBill
}) => {
    const [bills, setBills] = useState<BillRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (passkeyUserId) {
            fetch(`${API_URL}/api/bills?passkey_id=${encodeURIComponent(passkeyUserId)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.bills) {
                        setBills(data.bills);
                    }
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [passkeyUserId]);

    // Calculate total savings
    const totalSavings = bills.reduce((acc, bill) => {
        const savings = (bill.analysis_result?.private_coverage || 0) +
            (bill.analysis_result?.public_coverage || 0);
        return acc + savings;
    }, 0);

    const totalBilled = bills.reduce((acc, bill) => {
        return acc + (bill.analysis_result?.bill_total || 0);
    }, 0);

    const formatDate = (isoString: string) => {
        try {
            return new Date(isoString).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        } catch {
            return 'Unknown date';
        }
    };

    return (
        <div className="flex flex-col min-h-screen w-full bg-[#0b120e] text-white p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold">Your Claims</h1>
                    <p className="text-slate-400 mt-1">Track your medical bills and savings</p>
                </div>
                <button
                    onClick={onNewBill}
                    className="px-6 py-3 rounded-full bg-primary text-[#0b120e] font-bold shadow-lg hover:shadow-primary/50 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">add</span>
                    New Bill
                </button>
            </div>

            {/* Savings Summary Card */}
            <div className="bg-gradient-to-br from-[#16211b] to-[#1a2820] border border-[#28392e] rounded-2xl p-6 mb-8">
                <div className="flex items-center gap-8">
                    <div className="flex-1">
                        <p className="text-slate-400 text-sm mb-1">Total Saved</p>
                        <p className="text-4xl font-bold text-primary font-mono">
                            ${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="h-16 w-px bg-[#28392e]"></div>
                    <div className="flex-1">
                        <p className="text-slate-400 text-sm mb-1">Total Billed</p>
                        <p className="text-2xl font-bold text-slate-300 font-mono">
                            ${totalBilled.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="h-16 w-px bg-[#28392e]"></div>
                    <div className="flex-1">
                        <p className="text-slate-400 text-sm mb-1">Claims Processed</p>
                        <p className="text-2xl font-bold text-slate-300 font-mono">
                            {bills.length}
                        </p>
                    </div>
                </div>
            </div>

            {/* Claims List */}
            <div className="flex-1">
                <h2 className="text-xl font-bold mb-4 text-slate-300">Claim History</h2>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : bills.length === 0 ? (
                    <div className="bg-[#16211b] border border-[#28392e] rounded-2xl p-12 text-center">
                        <span className="material-symbols-outlined text-5xl text-slate-600 mb-4">receipt_long</span>
                        <p className="text-slate-400 mb-4">No claims yet</p>
                        <button
                            onClick={onNewBill}
                            className="px-5 py-2.5 rounded-full bg-[#28392e] hover:bg-[#3b5443] transition-colors text-white font-medium"
                        >
                            Upload your first bill
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {bills.map((bill, index) => {
                            const savings = (bill.analysis_result?.private_coverage || 0) +
                                (bill.analysis_result?.public_coverage || 0);
                            return (
                                <div
                                    key={index}
                                    className="bg-[#16211b] border border-[#28392e] rounded-xl p-4 hover:border-[#3b5443] transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="size-12 rounded-xl bg-[#28392e] flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary">receipt</span>
                                            </div>
                                            <div>
                                                <p className="font-medium">
                                                    {bill.bill_data?.service || bill.bill_data?.provider || 'Medical Bill'}
                                                </p>
                                                <p className="text-sm text-slate-400">
                                                    {formatDate(bill.created_at)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-8">
                                            <div className="text-right">
                                                <p className="text-sm text-slate-400">Original</p>
                                                <p className="font-mono text-slate-300">
                                                    ${(bill.analysis_result?.bill_total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm text-slate-400">Saved</p>
                                                <p className="font-mono text-green-400">
                                                    -${savings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                            <div className="text-right min-w-[100px]">
                                                <p className="text-sm text-slate-400">You Paid</p>
                                                <p className={`font-mono font-bold ${bill.analysis_result?.final_cost === 0 ? 'text-primary' : 'text-yellow-400'}`}>
                                                    ${(bill.analysis_result?.final_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
