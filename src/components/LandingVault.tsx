"use client";

import React, { useState } from 'react';

interface LandingVaultProps {
    onUnlock: () => void;
}

export const LandingVault: React.FC<LandingVaultProps> = ({ onUnlock }) => {
    const [isClassified, setIsClassified] = useState(false);

    const handleUnlock = async () => {
        // Simulate 1Password Passkey Auth
        console.log("Initiating 1Password Passkey Flow...");
        setIsClassified(true);

        // Simulate FaceID delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log("Vault Decrypted locally.");
        onUnlock();
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden">
            {/* Top Navigation Bar */}
            <header className="w-full flex items-center justify-between px-6 py-6 md:px-12 z-10 transition-opacity duration-300">
                <div className="flex items-center gap-3">
                    <div className="size-8 text-primary">
                        <span className="material-symbols-outlined text-[32px]">health_and_safety</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Salus</h2>
                </div>

                {/* Region Switcher */}
                <div className="flex h-10 items-center justify-center rounded-full bg-gray-200 dark:bg-surface-dark p-1 shadow-inner">
                    <label className="group flex cursor-pointer h-full items-center justify-center overflow-hidden rounded-full px-4 transition-all has-[:checked]:bg-white dark:has-[:checked]:bg-background-dark has-[:checked]:shadow-sm">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-has-[:checked]:text-slate-900 dark:group-has-[:checked]:text-white transition-colors">Ontario</span>
                        <input type="radio" name="region" value="Ontario" defaultChecked className="invisible w-0 absolute" />
                    </label>
                    <label className="group flex cursor-pointer h-full items-center justify-center overflow-hidden rounded-full px-4 transition-all has-[:checked]:bg-white dark:has-[:checked]:bg-background-dark has-[:checked]:shadow-sm">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-has-[:checked]:text-slate-900 dark:group-has-[:checked]:text-white transition-colors">New York</span>
                        <input type="radio" name="region" value="New York" className="invisible w-0 absolute" />
                    </label>
                </div>
            </header>

            {/* Main Content (Vault) */}
            <main className="flex-1 flex flex-col items-center justify-center w-full px-4 relative z-0">
                <div className="flex flex-col items-center max-w-[480px] w-full gap-8 animate-zoom-in">

                    {/* Status Icon */}
                    <div className="relative flex flex-col items-center justify-center">
                        <div className={`text-red-500 opacity-90 drop-shadow-2xl transition-all duration-700 ${isClassified ? 'text-primary scale-110' : ''}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '140px', fontVariationSettings: "'wght' 200" }}>
                                {isClassified ? 'lock_open' : 'shield_lock'}
                            </span>
                        </div>
                    </div>

                    {/* Headline */}
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 dark:text-white transition-all">
                            {isClassified ? 'Identity Verified' : 'Vault Locked'}
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isClassified ? 'Decryption key released from local enclave' : 'Identity verification required'}
                        </p>
                    </div>

                    {/* Action Button */}
                    <div className="w-full flex justify-center pt-4">
                        <button
                            onClick={handleUnlock}
                            disabled={isClassified}
                            className={`group relative flex w-full max-w-[320px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-8 bg-primary text-background-dark gap-3 text-lg font-bold leading-normal tracking-wide transition-all transform hover:scale-[1.02] active:scale-[0.98] animate-pulse-glow hover:shadow-[0_0_40px_rgba(19,236,91,0.5)] ${isClassified ? 'opacity-80 cursor-wait' : ''}`}
                        >
                            {isClassified ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    <span>Decrypting...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform duration-300">fingerprint</span>
                                    <span className="truncate">Unlock with Passkey</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-8 text-center px-6">
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-md mx-auto leading-relaxed">
                    <span className="material-symbols-outlined align-middle mr-1 text-[16px]">lock</span>
                    Your data is decrypted locally. No PII is sent to the cloud.
                </p>
            </footer>

            {/* Background Atmosphere */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none z-[-1] transition-colors duration-1000 ${isClassified ? 'bg-primary/10' : 'bg-red-500/5'}`}></div>
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-background dark:from-background-dark to-transparent pointer-events-none z-[-1]"></div>
        </div>
    );
};
