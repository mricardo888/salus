"use client";

import React, { useState } from 'react';
import { UserProfile } from '@/types';

interface UserProfileFormProps {
    onComplete: (profile: UserProfile) => void;
}

export const UserProfileForm: React.FC<UserProfileFormProps> = ({ onComplete }) => {
    const [age, setAge] = useState<string>('');
    const [gender, setGender] = useState<UserProfile['gender']>('prefer_not_to_say');
    const [region, setRegion] = useState<UserProfile['region']>('Ontario');

    const handleSubmit = () => {
        const ageNum = parseInt(age) || 30;
        onComplete({
            age: ageNum,
            gender,
            region
        });
    };

    const isValid = age !== '' && parseInt(age) > 0;

    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-background dark:bg-background-dark">
            {/* Header */}
            <header className="w-full flex items-center justify-center px-6 py-6 md:px-12 z-10">
                <div className="flex items-center gap-3">
                    <div className="size-8 text-primary">
                        <span className="material-symbols-outlined text-[32px]">health_and_safety</span>
                    </div>
                    <h2 className="text-xl font-bold tracking-tight text-white">Salus</h2>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-center w-full px-4 relative z-0">
                <div className="flex flex-col items-center max-w-md w-full gap-8 animate-zoom-in">

                    {/* Icon */}
                    <div className="text-primary">
                        <span className="material-symbols-outlined" style={{ fontSize: '80px', fontVariationSettings: "'wght' 200" }}>
                            person
                        </span>
                    </div>

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
                    <div className="w-full space-y-6">
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
                            <p className="text-xs text-slate-500">
                                {parseInt(age) >= 65 ? '✓ May qualify for senior programs (ODB, EPIC)' :
                                    parseInt(age) < 25 && parseInt(age) > 0 ? '✓ May qualify for youth programs (OHIP+)' :
                                        ''}
                            </p>
                        </div>

                        {/* Gender Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Gender</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'male', label: 'Male', icon: 'male' },
                                    { value: 'female', label: 'Female', icon: 'female' },
                                    { value: 'other', label: 'Other', icon: 'person' },
                                    { value: 'prefer_not_to_say', label: 'Prefer not to say', icon: 'visibility_off' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setGender(option.value as UserProfile['gender'])}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${gender === option.value
                                                ? 'bg-primary/20 border-primary text-primary'
                                                : 'bg-[#16211b] border-[#28392e] text-slate-400 hover:border-[#3b5443]'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-lg">{option.icon}</span>
                                        <span className="text-sm">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Region Selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-300">Region</label>
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { value: 'Ontario', label: 'Ontario, Canada', flag: '🇨🇦' },
                                    { value: 'New York', label: 'New York, USA', flag: '🇺🇸' }
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setRegion(option.value as UserProfile['region'])}
                                        className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border transition-all ${region === option.value
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
                    <p className="text-xs text-center text-slate-500 max-w-xs">
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
