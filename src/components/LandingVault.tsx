"use client";

import React, { useState, useEffect } from 'react';

interface LandingVaultProps {
    onUnlock: () => void;
}

// Check if WebAuthn is supported
const isWebAuthnSupported = () => {
    return window.PublicKeyCredential !== undefined;
};

// Check if platform authenticator (Touch ID, Face ID, Windows Hello) is available
const isPlatformAuthenticatorAvailable = async (): Promise<boolean> => {
    if (!isWebAuthnSupported()) return false;
    try {
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
        return false;
    }
};

// Generate a random challenge
const generateChallenge = (): BufferSource => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return array.buffer;
};

// Convert ArrayBuffer to Base64
const bufferToBase64 = (buffer: ArrayBuffer): string => {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

export const LandingVault: React.FC<LandingVaultProps> = ({ onUnlock }) => {
    const [isClassified, setIsClassified] = useState(false);
    const [hasPlatformAuth, setHasPlatformAuth] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);

    useEffect(() => {
        // Check for platform authenticator on mount
        isPlatformAuthenticatorAvailable().then(available => {
            setHasPlatformAuth(available);
        });

        // Check if user has already registered a passkey
        const storedCredential = localStorage.getItem('salus_passkey_credential');
        if (storedCredential) {
            setIsRegistered(true);
        }
    }, []);

    const handleRegisterPasskey = async () => {
        if (!isWebAuthnSupported()) {
            setError("WebAuthn is not supported in this browser");
            return;
        }

        setIsClassified(true);
        setError(null);

        try {
            // Create credential options for registration
            const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
                challenge: generateChallenge(),
                rp: {
                    name: "Salus Health Vault",
                    id: window.location.hostname,
                },
                user: {
                    id: new TextEncoder().encode("salus-user-001").buffer,
                    name: "patient@salus.health",
                    displayName: "Salus Patient",
                },
                pubKeyCredParams: [
                    { alg: -7, type: "public-key" },   // ES256
                    { alg: -257, type: "public-key" }, // RS256
                ],
                authenticatorSelection: {
                    authenticatorAttachment: "platform", // Use built-in (Touch ID, Face ID)
                    userVerification: "required",
                    residentKey: "preferred",
                },
                timeout: 60000,
                attestation: "none",
            };

            // Create the credential (this triggers Touch ID / Face ID / Windows Hello)
            const credential = await navigator.credentials.create({
                publicKey: publicKeyCredentialCreationOptions,
            }) as PublicKeyCredential;

            if (credential) {
                // Store credential ID for future authentication
                const credentialId = bufferToBase64(credential.rawId);
                localStorage.setItem('salus_passkey_credential', credentialId);
                setIsRegistered(true);

                console.log("✅ Passkey registered successfully!");
                console.log("Credential ID:", credentialId);

                // Proceed to unlock
                onUnlock();
            }
        } catch (err: any) {
            console.error("Passkey registration error:", err);
            if (err.name === 'NotAllowedError') {
                setError("Authentication was cancelled or denied");
            } else if (err.name === 'SecurityError') {
                setError("Security error - try using HTTPS");
            } else {
                setError(err.message || "Failed to register passkey");
            }
            setIsClassified(false);
        }
    };

    const handleAuthenticatePasskey = async () => {
        if (!isWebAuthnSupported()) {
            setError("WebAuthn is not supported in this browser");
            return;
        }

        setIsClassified(true);
        setError(null);

        try {
            const storedCredentialId = localStorage.getItem('salus_passkey_credential');

            // Create credential options for authentication
            const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
                challenge: generateChallenge(),
                timeout: 60000,
                rpId: window.location.hostname,
                userVerification: "required",
                allowCredentials: storedCredentialId ? [{
                    id: Uint8Array.from(atob(storedCredentialId), c => c.charCodeAt(0)),
                    type: "public-key",
                    transports: ["internal"],
                }] : [],
            };

            // Get the credential (this triggers Touch ID / Face ID / Windows Hello)
            const assertion = await navigator.credentials.get({
                publicKey: publicKeyCredentialRequestOptions,
            }) as PublicKeyCredential;

            if (assertion) {
                console.log("✅ Passkey authentication successful!");
                console.log("Credential ID:", bufferToBase64(assertion.rawId));

                // Proceed to unlock
                onUnlock();
            }
        } catch (err: any) {
            console.error("Passkey authentication error:", err);
            if (err.name === 'NotAllowedError') {
                setError("Authentication was cancelled or denied");
            } else {
                setError(err.message || "Failed to authenticate");
            }
            setIsClassified(false);
        }
    };

    const handleUnlock = async () => {
        if (isRegistered) {
            await handleAuthenticatePasskey();
        } else {
            await handleRegisterPasskey();
        }
    };

    // Fallback for browsers without WebAuthn
    const handleFallbackUnlock = async () => {
        setIsClassified(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
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
                            {isClassified
                                ? 'Decryption key released from local enclave'
                                : isRegistered
                                    ? 'Authenticate with your passkey'
                                    : 'Register a passkey to secure your vault'}
                        </p>
                        {hasPlatformAuth && !isClassified && (
                            <p className="text-xs text-primary">
                                ✓ {isRegistered ? 'Touch ID / Face ID ready' : 'Biometric authentication available'}
                            </p>
                        )}
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="w-full max-w-[320px] p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Action Button */}
                    <div className="w-full flex flex-col items-center gap-3 pt-4">
                        <button
                            onClick={hasPlatformAuth ? handleUnlock : handleFallbackUnlock}
                            disabled={isClassified}
                            className={`group relative flex w-full max-w-[320px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-14 px-8 bg-primary text-background-dark gap-3 text-lg font-bold leading-normal tracking-wide transition-all transform hover:scale-[1.02] active:scale-[0.98] animate-pulse-glow hover:shadow-[0_0_40px_rgba(19,236,91,0.5)] ${isClassified ? 'opacity-80 cursor-wait' : ''}`}
                        >
                            {isClassified ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin">sync</span>
                                    <span>Authenticating...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined group-hover:rotate-12 transition-transform duration-300">
                                        {hasPlatformAuth ? 'fingerprint' : 'lock_open'}
                                    </span>
                                    <span className="truncate">
                                        {hasPlatformAuth
                                            ? (isRegistered ? 'Unlock with Passkey' : 'Create Passkey')
                                            : 'Continue to Vault'}
                                    </span>
                                </>
                            )}
                        </button>

                        {!hasPlatformAuth && !isClassified && (
                            <p className="text-xs text-gray-400">
                                Passkeys not available - using demo mode
                            </p>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-8 text-center px-6">
                <p className="text-xs text-gray-400 dark:text-gray-500 max-w-md mx-auto leading-relaxed">
                    <span className="material-symbols-outlined align-middle mr-1 text-[16px]">lock</span>
                    {hasPlatformAuth
                        ? 'Secured with WebAuthn passkeys. Your biometrics never leave this device.'
                        : 'Your data is decrypted locally. No PII is sent to the cloud.'}
                </p>
            </footer>

            {/* Background Atmosphere */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none z-[-1] transition-colors duration-1000 ${isClassified ? 'bg-primary/10' : 'bg-red-500/5'}`}></div>
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-background dark:from-background-dark to-transparent pointer-events-none z-[-1]"></div>
        </div>
    );
};
