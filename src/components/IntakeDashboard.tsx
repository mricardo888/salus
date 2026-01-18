"use client";

import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { useElevenLabs } from '../hooks/useElevenLabs';
import { API_URL } from '@/config/api';

interface IntakeDashboardProps {
    onAnalyze: () => void;
    policyId: string;
    passkeyUserId: string | null;  // Passkey credential ID for user data isolation
}

interface BillHistoryItem {
    bill_data: {
        service?: string;
        services?: string[];
        date?: string;
    };
    analysis_result: {
        final_cost: number;
    };
    created_at: string;
}

export const IntakeDashboard: React.FC<IntakeDashboardProps> = ({ onAnalyze, policyId, passkeyUserId }) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]); // Start empty
    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasConfirmed, setHasConfirmed] = useState(false);
    const [showAnalysisButton, setShowAnalysisButton] = useState(false);
    const [recentLogs, setRecentLogs] = useState<string[]>([]);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [hasBillUploaded, setHasBillUploaded] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [billHistory, setBillHistory] = useState<BillHistoryItem[]>([]);  // Real bill history from MongoDB
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { speak } = useElevenLabs();

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Load bill history when component mounts or passkeyUserId changes
    useEffect(() => {
        if (passkeyUserId) {
            fetch(`${API_URL}/api/bills?passkey_id=${encodeURIComponent(passkeyUserId)}`)
                .then(res => res.json())
                .then(data => {
                    if (data.bills) {
                        setBillHistory(data.bills);
                    }
                })
                .catch(err => console.error('Failed to load bill history:', err));
        }
    }, [passkeyUserId]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);

        const formData = new FormData();
        formData.append("file", file);
        // Include passkey_id in upload for user-specific storage
        if (passkeyUserId) {
            formData.append("passkey_id", passkeyUserId);
        }

        try {
            // First upload the file and get extracted data
            const uploadRes = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });

            if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                const billData = uploadData.bill_data || {};

                // Build a message that includes the extracted data
                let extractedInfo = `I just uploaded a document called ${file.name}.`;
                if (billData.total && billData.total > 0) {
                    extractedInfo += ` I can see it shows a total of $${billData.total.toFixed(2)}.`;
                }
                if (billData.services && billData.services.length > 0) {
                    extractedInfo += ` The services listed are: ${billData.services.join(', ')}.`;
                }
                if (billData.date && billData.date !== 'Unknown') {
                    extractedInfo += ` The date of service is ${billData.date}.`;
                }
                if (billData.provider && billData.provider !== 'Unknown') {
                    extractedInfo += ` The provider is ${billData.provider}.`;
                }
                extractedInfo += ` Please summarize these details and ask me to confirm if they are correct.`;

                // Now ask Gemini to respond about the extracted data
                const chatRes = await fetch(`${API_URL}/api/chat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        policy_id: policyId,
                        message: extractedInfo,
                        history: [],
                        passkey_id: passkeyUserId  // Include passkey for user context
                    })
                });

                const data = await chatRes.json();

                const uploadMsg: ChatMessage = {
                    id: Date.now().toString(),
                    role: 'model',
                    text: data.response,
                    timestamp: Date.now()
                };
                setMessages([uploadMsg]);
                setHasBillUploaded(true);
                speak(data.response);
            } else {
                console.error("Upload failed");
            }
        } catch (error) {
            console.error("Error uploading file:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSend = async () => {
        if (!inputText.trim() || isProcessing) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: inputText,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsProcessing(true);

        if (inputText.toLowerCase().includes('yes') || inputText.toLowerCase().includes('confirm') || inputText.toLowerCase().includes('correct')) {
            setHasConfirmed(true);
        }

        try {
            // Build conversation history for context
            const history = messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.text
            }));

            // Call Python Backend with history
            const res = await fetch(`${API_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    policy_id: policyId,
                    message: inputText,
                    history: history,
                    passkey_id: passkeyUserId  // Include passkey for user context
                })
            });

            const data = await res.json();
            const responseText = data.response;

            if (data.logs) {
                setRecentLogs(data.logs);
            }

            const modelMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText,
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, modelMsg]);

            // Check if AI indicates user is ready for analysis
            // Look for keywords that suggest readiness OR check conditions
            const lowerResponse = responseText.toLowerCase();
            const readyKeywords = ['ready', 'analyze', 'proceed', 'calculate', 'let\'s', 'sounds good', 'perfect', 'great', 'understood', 'got it', 'correct', 'confirmed', 'yes'];
            const aiIndicatesReady = readyKeywords.some(keyword => lowerResponse.includes(keyword));

            // Show button if: AI response suggests readiness, OR bill uploaded and user confirmed
            if (aiIndicatesReady || (hasBillUploaded && hasConfirmed)) {
                setShowAnalysisButton(true);
            }

            // Speak response
            speak(responseText);

        } catch (e) {
            console.error(e);
            const fallbackMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "I am having trouble reaching the Actuary Node. Please check if the Python backend is running.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, fallbackMsg]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSend();
    };

    const handleVoiceInput = () => {
        if (!hasBillUploaded) return;

        // Check for browser support (using any for Web Speech API compatibility)
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (!SpeechRecognition) {
            alert('Voice input is not supported in this browser. Please use Chrome or Edge.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInputText(transcript);
            setIsListening(false);
            // Auto-send after voice input
            setTimeout(() => {
                if (transcript.trim()) {
                    handleSend();
                }
            }, 500);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    return (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-background dark:bg-background-dark">
            {/* Top Navigation */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#28392e] px-8 py-4 bg-[#111813] z-20 shrink-0">
                <div className="flex items-center gap-4 text-white">
                    <div className="size-8 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-3xl">health_and_safety</span>
                    </div>
                    <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">Salus</h2>
                </div>
                <div className="flex items-center gap-8">
                    <nav className="hidden md:flex items-center gap-9">
                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="text-white text-sm font-medium leading-normal hover:text-primary transition-colors"
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => setShowHistoryModal(true)}
                            className="text-white text-sm font-medium leading-normal hover:text-primary transition-colors"
                        >
                            History
                        </button>
                        <button
                            onClick={() => setShowSettingsModal(true)}
                            className="text-white text-sm font-medium leading-normal hover:text-primary transition-colors"
                        >
                            Settings
                        </button>
                    </nav>
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-[#28392e] bg-gray-700 hover:border-primary transition-colors cursor-pointer"
                        >
                            <span className="flex h-full w-full items-center justify-center text-xs text-white">JD</span>
                        </button>
                        {showProfileMenu && (
                            <div className="absolute right-0 top-12 w-48 bg-[#16211b] border border-[#28392e] rounded-xl shadow-xl z-50 overflow-hidden">
                                <div className="p-4 border-b border-[#28392e]">
                                    <p className="font-medium text-white">John Doe</p>
                                    <p className="text-xs text-slate-400">john.doe@email.com</p>
                                </div>
                                <div className="py-2">
                                    <button className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#28392e] hover:text-white flex items-center gap-2">
                                        <span className="material-symbols-outlined text-lg">person</span>
                                        Profile
                                    </button>
                                    <button
                                        onClick={() => { setShowSettingsModal(true); setShowProfileMenu(false); }}
                                        className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-[#28392e] hover:text-white flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-lg">settings</span>
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => window.location.reload()}
                                        className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-[#28392e] flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-lg">logout</span>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Settings Modal */}
            {showSettingsModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowSettingsModal(false)}>
                    <div className="bg-[#16211b] border border-[#28392e] rounded-2xl w-full max-w-md m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-[#28392e]">
                            <h3 className="text-lg font-bold text-white">Settings</h3>
                            <button onClick={() => setShowSettingsModal(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300">Dark Mode</span>
                                <div className="w-12 h-6 bg-primary rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300">Voice Assistant</span>
                                <div className="w-12 h-6 bg-primary rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-white rounded-full ml-auto"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-300">Notifications</span>
                                <div className="w-12 h-6 bg-[#28392e] rounded-full flex items-center px-1">
                                    <div className="w-4 h-4 bg-slate-400 rounded-full"></div>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-[#28392e]">
                                <p className="text-xs text-slate-400">Region: Ontario, Canada</p>
                                <p className="text-xs text-slate-400">Policy ID: {policyId}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowHistoryModal(false)}>
                    <div className="bg-[#16211b] border border-[#28392e] rounded-2xl w-full max-w-lg m-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between p-4 border-b border-[#28392e]">
                            <h3 className="text-lg font-bold text-white">Claim History</h3>
                            <button onClick={() => setShowHistoryModal(false)} className="text-slate-400 hover:text-white">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                            {billHistory.length > 0 ? (
                                billHistory.map((bill, index) => {
                                    const serviceName = bill.bill_data?.services?.[0] || bill.bill_data?.service || 'Medical Service';
                                    const dateStr = bill.created_at ? new Date(bill.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';
                                    const finalCost = bill.analysis_result?.final_cost || 0;
                                    return (
                                        <div key={index} className="p-3 bg-[#0b120e] rounded-xl border border-[#28392e]">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium text-white">{serviceName}</p>
                                                    <p className="text-xs text-slate-400">{dateStr}</p>
                                                </div>
                                                <span className={`font-mono text-sm ${finalCost === 0 ? 'text-primary' : 'text-yellow-400'}`}>
                                                    ${finalCost.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center text-slate-500 py-8">
                                    <span className="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                                    <p>No bill history yet</p>
                                    <p className="text-xs mt-1">Upload and analyze a bill to see it here</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Split Layout */}
            <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
                {/* LEFT COLUMN: Evidence Collection */}
                <section className="hidden lg:flex lg:col-span-5 flex-col border-r border-[#28392e] bg-[#111813] overflow-y-auto no-scrollbar relative">
                    <div className="p-8 pb-32 flex flex-col gap-8 max-w-xl mx-auto w-full">
                        <div>
                            <h2 className="text-2xl font-bold leading-tight tracking-tight text-white mb-2">Evidence Collection</h2>
                            <p className="text-slate-400 text-sm">Verify your coverage details and upload documents.</p>
                        </div>

                        {/* Hidden File Input */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,.pdf,.heic,.heif"
                        />

                        {/* Upload Zone */}
                        <div
                            onClick={hasBillUploaded ? undefined : handleUploadClick}
                            className={`group relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed p-10 transition-all ${hasBillUploaded
                                ? 'border-[#28392e] bg-[#0f1610] cursor-not-allowed opacity-50'
                                : 'border-[#3b5443] bg-[#16211b] hover:border-primary hover:bg-[#1a2820] cursor-pointer'
                                }`}
                        >
                            <div className={`rounded-full p-4 transition-colors ${hasBillUploaded
                                ? 'bg-[#1a2420] text-slate-500'
                                : 'bg-[#28392e] text-primary group-hover:bg-primary group-hover:text-[#102216]'
                                }`}>
                                <span className="material-symbols-outlined text-3xl">
                                    {hasBillUploaded ? 'check_circle' : 'upload_file'}
                                </span>
                            </div>
                            <div className="text-center">
                                <p className={`text-lg font-bold mb-1 ${hasBillUploaded ? 'text-slate-500' : 'text-white'}`}>
                                    {hasBillUploaded ? 'Document Uploaded ✓' : 'Upload Medical Bill'}
                                </p>
                                <p className="text-slate-500 text-sm">
                                    {hasBillUploaded ? 'Document received and analyzed' : 'Prescriptions, hospital bills, receipts'}
                                </p>
                            </div>
                        </div>

                        {/* Privacy Badge */}
                        <div className="flex items-center justify-center gap-2 rounded-full bg-[#16211b] py-2 px-4 w-fit mx-auto border border-[#28392e]">
                            <span className="material-symbols-outlined text-[#9db9a6] text-sm">lock</span>
                            <span className="text-[#9db9a6] text-xs font-medium tracking-wide">End-to-End Encrypted | HIPAA Compliant</span>
                        </div>

                        <div className="h-px bg-[#28392e] w-full"></div>

                        {/* Insurance Card */}
                        <div className="flex flex-col gap-6">
                            <h3 className="text-lg font-bold text-white">Insurance Details</h3>
                            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e3a29] to-[#111813] p-6 border border-[#28392e] shadow-xl">
                                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl"></div>
                                <div className="relative z-10 flex flex-col gap-5">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-primary/80 ml-1">Provider</label>
                                        <div className="relative">
                                            <select className="w-full appearance-none rounded-xl border-0 bg-[#0b120e]/50 py-3 pl-4 pr-10 text-white placeholder-slate-400 ring-1 ring-[#3b5443] focus:ring-2 focus:ring-primary text-sm font-medium outline-none">
                                                <option>Sun Life Financial</option>
                                                <option>Manulife</option>
                                                <option>Blue Cross</option>
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                                <span className="material-symbols-outlined">expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-primary/80 ml-1">Policy ID</label>
                                        <div className="relative">
                                            <input
                                                className="w-full rounded-xl border-0 bg-[#0b120e]/30 py-3 pl-4 pr-12 text-white/50 placeholder-slate-400 ring-1 ring-[#3b5443] focus:ring-2 focus:ring-primary text-sm font-medium tracking-widest outline-none cursor-not-allowed"
                                                type="password"
                                                value={policyId}
                                                readOnly
                                                title="Policy ID retrieved from secure vault"
                                            />
                                            <button className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 hover:text-white transition-colors">
                                                <span className="material-symbols-outlined text-lg">lock</span>
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between opacity-50">
                                        <div className="h-8 w-12 rounded bg-white/20"></div>
                                        <span className="text-xs text-white">Salus Wallet</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* RIGHT COLUMN: The Guide */}
                <section className="col-span-1 lg:col-span-7 relative flex flex-col bg-background-dark overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#162b1e] via-[#102216] to-[#0b120e] opacity-80 pointer-events-none"></div>

                    {/* Header */}
                    <div className="relative z-10 flex items-center justify-between px-8 py-6">
                        <div className="flex items-center gap-3">
                            <div className="relative flex h-3 w-3">
                                <span className="animate-pulse absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                            </div>
                            <span className="text-sm font-medium text-white tracking-wide uppercase opacity-80">Salus Guide Active</span>
                        </div>
                        <button className="p-2 text-slate-400 hover:text-white">
                            <span className="material-symbols-outlined">more_horiz</span>
                        </button>
                    </div>

                    {/* Chat Stream & Orb */}
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 pb-40 w-full max-w-4xl mx-auto overflow-y-auto no-scrollbar">

                        {/* The Orb */}
                        <div className="mb-8 relative flex items-center justify-center shrink-0">
                            <div className={`absolute size-64 bg-primary/5 rounded-full blur-3xl transition-all duration-700 ${isProcessing ? 'scale-110 opacity-100' : 'scale-100 opacity-50'}`}></div>
                            <div className="absolute size-48 bg-primary/10 rounded-full blur-2xl"></div>
                            <div className="relative size-24 bg-gradient-to-b from-primary to-[#0da841] rounded-full orb-glow flex items-center justify-center shadow-[0_0_40px_rgba(19,236,91,0.4)]">
                                <div className="flex items-center gap-1 h-8">
                                    <div className={`w-1 bg-[#102216] rounded-full transition-all duration-300 ${isProcessing ? 'h-5 animate-bounce' : 'h-3'}`}></div>
                                    <div className={`w-1 bg-[#102216] rounded-full transition-all duration-300 ${isProcessing ? 'h-8 animate-bounce delay-75' : 'h-6'}`}></div>
                                    <div className={`w-1 bg-[#102216] rounded-full transition-all duration-300 ${isProcessing ? 'h-6 animate-bounce delay-150' : 'h-4'}`}></div>
                                    <div className={`w-1 bg-[#102216] rounded-full transition-all duration-300 ${isProcessing ? 'h-8 animate-bounce delay-200' : 'h-7'}`}></div>
                                    <div className={`w-1 bg-[#102216] rounded-full transition-all duration-300 ${isProcessing ? 'h-4 animate-bounce delay-300' : 'h-4'}`}></div>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="w-full flex flex-col gap-6 px-4 md:px-12 flex-1">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`max-w-[80%] md:max-w-[70%] animate-fade-in-up ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                                    {msg.role === 'model' ? (
                                        <div className="flex items-end gap-3">
                                            <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border border-primary/30 text-primary">
                                                <span className="material-symbols-outlined text-sm">smart_toy</span>
                                            </div>
                                            <div className="bg-[#1e2e24] p-5 rounded-2xl rounded-bl-none border border-[#28392e] text-white shadow-lg">
                                                <p className="leading-relaxed">{msg.text}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-row-reverse items-end gap-3">
                                            <div className="size-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 text-white bg-gray-600">
                                                <span className="text-xs">JD</span>
                                            </div>
                                            <div className="bg-primary p-5 rounded-2xl rounded-br-none text-[#0b120e] shadow-lg shadow-primary/10">
                                                <p className="leading-relaxed font-medium">{msg.text}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {isProcessing && (
                                <div className="self-start max-w-[80%] mt-2">
                                    <div className="flex items-center gap-2 text-slate-400 text-sm ml-12">
                                        <span className="material-symbols-outlined text-lg animate-spin">sync</span>
                                        <span>Analyzing coverage...</span>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {showAnalysisButton && (
                            <div className="sticky bottom-0 mt-8 animate-fade-in-up">
                                <button
                                    onClick={() => onAnalyze()}
                                    className="flex items-center gap-3 bg-gradient-to-r from-primary to-green-500 text-[#0b120e] px-8 py-3 rounded-full font-bold shadow-[0_0_30px_rgba(19,236,91,0.4)] hover:shadow-[0_0_50px_rgba(19,236,91,0.6)] transform hover:scale-105 transition-all"
                                >
                                    <span className="material-symbols-outlined">play_circle</span>
                                    Run Actuary Engine
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="absolute bottom-8 left-0 right-0 z-30 flex justify-center items-end px-4 gap-4">
                        <div className="relative group w-full max-w-xl">
                            <div className="absolute inset-0 bg-primary/5 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                            <div className={`flex items-center rounded-full px-2 shadow-xl transition-all ${hasBillUploaded
                                ? 'bg-[#16211b] border border-[#3b5443] focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50'
                                : 'bg-[#0f1610] border border-[#1a2420] opacity-50 cursor-not-allowed'
                                }`}>
                                <input
                                    type="text"
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyPress}
                                    placeholder={hasBillUploaded ? "Type your response or tap mic..." : "Upload a bill first to start chatting..."}
                                    disabled={!hasBillUploaded}
                                    className="flex-1 bg-transparent border-none text-white placeholder-slate-500 focus:ring-0 px-4 py-4 outline-none disabled:cursor-not-allowed"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!hasBillUploaded}
                                    className={`p-2 rounded-full transition-colors ${hasBillUploaded
                                        ? 'bg-[#28392e] text-white hover:bg-primary hover:text-black cursor-pointer'
                                        : 'bg-[#1a2420] text-slate-600 cursor-not-allowed'
                                        }`}
                                >
                                    <span className="material-symbols-outlined">send</span>
                                </button>
                            </div>
                        </div>

                        <div className="relative group shrink-0">
                            <button
                                onClick={handleVoiceInput}
                                disabled={!hasBillUploaded}
                                className={`relative flex items-center justify-center size-14 rounded-full transition-all duration-300 ${!hasBillUploaded
                                    ? 'bg-[#1a2420] text-slate-600 cursor-not-allowed opacity-50'
                                    : isListening
                                        ? 'bg-red-500 text-white shadow-[0_0_30px_rgba(239,68,68,0.5)] animate-pulse'
                                        : 'bg-primary text-[#0b120e] shadow-[0_0_30px_rgba(19,236,91,0.3)] hover:shadow-[0_0_50px_rgba(19,236,91,0.5)] hover:scale-105'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-2xl">
                                    {isListening ? 'hearing' : 'mic'}
                                </span>
                            </button>
                            {isListening && (
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-full whitespace-nowrap">
                                    Listening...
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};
