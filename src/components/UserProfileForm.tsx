"use client";

import React, { useState } from 'react';
import { UserProfile } from '@/types';

interface UserProfileFormProps {
    onComplete: (profile: UserProfile) => void;
}

const INSURANCE_PROVIDERS = [
    { value: 'sun_life', label: 'Sun Life Financial' },
    { value: 'manulife', label: 'Manulife' },
    { value: 'great_west', label: 'Great-West Life' },
    { value: 'blue_cross', label: 'Blue Cross' },
    { value: 'desjardins', label: 'Desjardins Insurance' },
    { value: 'canada_life', label: 'Canada Life' },
    { value: 'cigna', label: 'Cigna' },
    { value: 'aetna', label: 'Aetna' },
    { value: 'united_health', label: 'UnitedHealthcare' },
    { value: 'other', label: 'Other' },
];

export const UserProfileForm: React.FC<UserProfileFormProps> = ({ onComplete }) => {
    const [age, setAge] = useState<string>('');
    const [gender, setGender] = useState<UserProfile['gender']>('prefer_not_to_say');
    const [region, setRegion] = useState<UserProfile['region']>('Ontario');
    const [hasPrivateInsurance, setHasPrivateInsurance] = useState<boolean>(false);
    const [policyNumber, setPolicyNumber] = useState<string>('');
    const [insuranceProvider, setInsuranceProvider] = useState<string>('');

    const handleSubmit = () => {
        const ageNum = parseInt(age) || 30;
        onComplete({
            age: ageNum,
            gender,
            region,
            hasPrivateInsurance,
            policyNumber: hasPrivateInsurance ? policyNumber : undefined,
            insuranceProvider: hasPrivateInsurance ? insuranceProvider : undefined
        });
    };

    const isValid = age !== '' && parseInt(age) > 0 &&
        (!hasPrivateInsurance || (policyNumber !== '' && insuranceProvider !== ''));

    // Show eligibility hint based on age and insurance status
    const getEligibilityHint = () => {
        const ageNum = parseInt(age);
        if (!ageNum || ageNum <= 0) return '';

        if (ageNum >= 65) {
            return '✓ May qualify for senior programs (ODB, EPIC)';
        }
        if (ageNum < 25 && !hasPrivateInsurance && region === 'Ontario') {
            return '✓ May qualify for OHIP+ (free drugs for youth without private insurance)';
        }
        if (ageNum < 25) {
            return hasPrivateInsurance
                ? '⚠ OHIP+ only available if you don\'t have private insurance'
                : '';
        }
        return '';
    };

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background dark:bg-background-dark">
            {/* Header */}
            <header className="w-full flex items-center justify-center px-6 py-4 md:px-12 z-10">
                <div className="flex items-center gap-3">
                    <div className="size-8 text-primary">
                        <span className="material-symbols-outlined text-[32px]">health_and_safety</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-white">Salus</h2>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-start w-full px-4 py-4 relative z-0 overflow-y-auto">
                <div className="flex flex-col items-center max-w-md w-full gap-6 animate-zoom-in">

                    {/* Title */}
                    <div className="text-center space-y-2">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                            About You
                        </h1>
                        <p className="text-sm text-slate-400">
                            Help us find the best coverage options for you
                        </p>
                    </div>

                    {/* Form */}
                    <div className="w-full space-y-5">
                        {/* Age Input */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Age</label>
                            <input
                                type="number"
                                value={age}
                                onChange={(e) => setAge(e.target.value)}
                                placeholder="Enter your age"
                                min="1"
                                max="120"
                                className="w-full px-4 py-3 bg-[#16211b] border border-[#28392e] rounded-xl text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                            />
                            <p className="text-xs text-primary">
                                {getEligibilityHint()}
                            </p>
                        </div>

                        {/* Gender Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Gender</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'male', label: 'Male', icon: 'male' },
                                    { value: 'female', label: 'Female', icon: 'female' },
                                    { value: 'other', label: 'Other', icon: 'person' },
                                    { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: 'visibility_off' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setGender(option.value as UserProfile['gender'])}
                                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-sm ${gender === option.value
                                                ? 'bg-primary/20 border-primary text-primary'
                                                : 'bg-[#16211b] border-[#28392e] text-slate-400 hover:border-[#3b5443]'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">{option.icon}</span>
                                        <span>{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Region Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Region</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'Ontario', label: 'Ontario', flag: '🇨🇦' },
                                    { value: 'New York', label: 'New York', flag: '🇺🇸' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setRegion(option.value as UserProfile['region'])}
                                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border transition-all ${region === option.value
                                                ? 'bg-primary/20 border-primary text-primary'
                                                : 'bg-[#16211b] border-[#28392e] text-slate-400 hover:border-[#3b5443]'
                                            }`}
                                    >
                                        <span className="text-lg">{option.flag}</span>
                                        <span className="text-sm">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Private Insurance Toggle */}
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-300">Do you have private insurance?</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setHasPrivateInsurance(true)}
                                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${hasPrivateInsurance
                                            ? 'bg-primary/20 border-primary text-primary'
                                            : 'bg-[#16211b] border-[#28392e] text-slate-400 hover:border-[#3b5443]'
                                        }`}
                                >
                                    <span className="material-symbols-outlined">check_circle</span>
                                    <span>Yes</span>
                                </button>
                                <button
                                    onClick={() => setHasPrivateInsurance(false)}
                                    className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${!hasPrivateInsurance
                                            ? 'bg-primary/20 border-primary text-primary'
                                            : 'bg-[#16211b] border-[#28392e] text-slate-400 hover:border-[#3b5443]'
                                        }`}
                                >
                                    <span className="material-symbols-outlined">cancel</span>
                                    <span>No</span>
                                </button>
                            </div>
                        </div>

                        {/* Insurance Details (shown only if has private insurance) */}
                        {hasPrivateInsurance && (
                            <div className="space-y-4 p-4 bg-[#16211b] border border-[#28392e] rounded-xl animate-fade-in">
                                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-400">shield</span>
                                    Insurance Details
                                </h3>

                                {/* Insurance Provider */}
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-400">Insurance Provider</label>
                                    <select
                                        value={insuranceProvider}
                                        onChange={(e) => setInsuranceProvider(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#0b120e] border border-[#28392e] rounded-xl text-white focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all"
                                    >
                                        <option value="">Select provider...</option>
                                        {INSURANCE_PROVIDERS.map((provider) => (
                                            <option key={provider.value} value={provider.value}>
                                                {provider.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Policy Number */}
                                <div className="space-y-2">
                                    <label className="text-xs text-slate-400">Policy Number</label>
                                    <input
                                        type="text"
                                        value={policyNumber}
                                        onChange={(e) => setPolicyNumber(e.target.value)}
                                        placeholder="e.g., 88-1234567"
                                        className="w-full px-4 py-3 bg-[#0b120e] border border-[#28392e] rounded-xl text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/50 transition-all font-mono"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Continue Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid}
                        className={`w-full max-w-[320px] py-4 px-8 rounded-full font-bold text-lg transition-all ${isValid
                                ? 'bg-primary text-[#0b120e] hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(19,236,91,0.3)] hover:shadow-[0_0_50px_rgba(19,236,91,0.5)]'
                                : 'bg-[#28392e] text-slate-500 cursor-not-allowed'
                            }`}
                    >
                        Continue
                    </button>

                    {/* Privacy Note */}
                    <p className="text-xs text-center text-slate-500 max-w-xs pb-4">
                        <span className="material-symbols-outlined align-middle text-sm mr-1">lock</span>
                        This information is used locally to determine eligibility. Never shared.
                    </p>
                </div>
            </main>

            {/* Background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none z-[-1] bg-primary/5"></div>
        </div>
    );
};
