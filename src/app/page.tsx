"use client";

import React, { useState, useCallback } from 'react';
import { AppView, UserProfile } from '@/types';
import { LandingVault } from '@/components/LandingVault';
import { UserProfileForm } from '@/components/UserProfileForm';
import { IntakeDashboard } from '@/components/IntakeDashboard';
import { LiveDebugger } from '@/components/LiveDebugger';
import { ReliefResults } from '@/components/ReliefResults';
import { ClaimsDashboard } from '@/components/ClaimsDashboard';
import { API_URL } from '@/config/api';

interface AnalysisResult {
  bill_total: number;
  private_coverage: number;
  public_coverage: number;
  final_cost: number;
  logs: string[];
  summary: string;
  insurance_plan?: string;
  government_program?: string;
}

export default function Home() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [passkeyUserId, setPasskeyUserId] = useState<string | null>(null);

  // Generate a unique Policy ID for this session
  const [policyId] = useState(() => '88' + Math.floor(Math.random() * 9000000 + 1000000).toString());

  // Transition Helpers
  const goToProfile = (passkeyId: string) => {
    setPasskeyUserId(passkeyId);
    // Check if user already has a profile
    fetch(`${API_URL}/api/user?passkey_id=${encodeURIComponent(passkeyId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.user?.profile) {
          // User already has a profile, skip to dashboard
          setUserProfile(data.user.profile);
          setCurrentView(AppView.DASHBOARD);
        } else {
          // New user, show profile form
          setCurrentView(AppView.PROFILE);
        }
      })
      .catch(() => {
        // On error, show profile form anyway
        setCurrentView(AppView.PROFILE);
      });
  };

  const handleProfileComplete = async (profile: UserProfile) => {
    setUserProfile(profile);

    // Save profile to MongoDB if we have a passkey ID
    if (passkeyUserId) {
      try {
        await fetch(`${API_URL}/api/user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            passkey_id: passkeyUserId,
            profile: profile
          })
        });
      } catch (e) {
        console.error('Failed to save profile:', e);
      }
    }

    setCurrentView(AppView.DASHBOARD);
  };

  // Add log progressively
  const addLog = useCallback((log: string) => {
    setSessionLogs(prev => [...prev, log]);
  }, []);

  const runActuaryEngine = async () => {
    setCurrentView(AppView.DEBUGGER);
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setSessionLogs([]);

    // Show initial progress logs
    addLog("System: Starting Actuary Engine...");

    await new Promise(r => setTimeout(r, 300));
    addLog("System: Connecting to MongoDB Atlas...");

    await new Promise(r => setTimeout(r, 300));
    addLog("System: Loading agent personas...");

    // Log user profile info
    if (userProfile) {
      addLog(`System: User profile - Age: ${userProfile.age}, Region: ${userProfile.region}`);
    }

    try {
      // Show connecting message
      await new Promise(r => setTimeout(r, 300));
      addLog("System: Sending request to backend...");

      const response = await fetch(`${API_URL}/api/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: policyId,
          region: userProfile?.region || 'Ontario',
          age: userProfile?.age || 30,
          gender: userProfile?.gender || 'prefer_not_to_say',
          passkey_id: passkeyUserId  // Include passkey ID for user-specific data
        })
      });

      if (!response.ok) {
        throw new Error('API returned error');
      }

      const result = await response.json();

      // Progressively show each log from the result
      if (result.logs && result.logs.length > 0) {
        addLog("System: Backend connected! Processing agents...");
        await new Promise(r => setTimeout(r, 500));

        // Show logs one by one with delays for visibility
        for (let i = 0; i < result.logs.length; i++) {
          await new Promise(r => setTimeout(r, 150)); // Small delay between logs
          addLog(result.logs[i]);
        }
      }

      // Mark as complete and set results
      await new Promise(r => setTimeout(r, 500));
      addLog("System: ✓ Analysis complete!");

      setAnalysisResult(result);
      setIsAnalyzing(false);
      setAnalysisComplete(true);

    } catch (error) {
      console.error('Analysis error:', error);
      addLog("System: ⚠ Error connecting to backend");
      addLog("System: Please ensure the Python backend is running (./run_dev.sh)");
      setIsAnalyzing(false);

      // Set fallback result
      setAnalysisResult({
        bill_total: 0,
        private_coverage: 0,
        public_coverage: 0,
        final_cost: 0,
        logs: ["Error connecting to backend"],
        summary: "Please restart the backend"
      });
      setAnalysisComplete(true);
    }
  };

  const goToResults = () => {
    // Only allow going to results if analysis is complete with data
    if (analysisComplete && analysisResult) {
      setCurrentView(AppView.RESULTS);
    }
  };

  const goToClaimsDashboard = () => {
    setCurrentView(AppView.CLAIMS_DASHBOARD);
  };

  const goToIntakeDashboard = () => {
    setCurrentView(AppView.DASHBOARD);
  };

  return (
    <>
      <main className="min-h-screen bg-background dark:bg-background-dark">
        {currentView === AppView.LANDING && <LandingVault onUnlock={goToProfile} />}
        {currentView === AppView.PROFILE && (
          <UserProfileForm onComplete={handleProfileComplete} />
        )}
        {currentView === AppView.DASHBOARD && (
          <IntakeDashboard
            onAnalyze={runActuaryEngine}
            policyId={policyId}
            passkeyUserId={passkeyUserId}
          />
        )}
        {currentView === AppView.DEBUGGER && (
          <LiveDebugger
            onComplete={goToResults}
            policyId={policyId}
            realLogs={sessionLogs}
            isAnalyzing={isAnalyzing}
            analysisComplete={analysisComplete}
          />
        )}
        {currentView === AppView.RESULTS && (
          <ReliefResults
            policyId={policyId}
            billTotal={analysisResult?.bill_total || 0}
            privateCoverage={analysisResult?.private_coverage || 0}
            publicCoverage={analysisResult?.public_coverage || 0}
            finalCost={analysisResult?.final_cost || 0}
            userProfile={userProfile}
            insurancePlan={analysisResult?.insurance_plan}
            governmentProgram={analysisResult?.government_program}
            onGoToDashboard={goToClaimsDashboard}
          />
        )}
        {currentView === AppView.CLAIMS_DASHBOARD && (
          <ClaimsDashboard
            passkeyUserId={passkeyUserId}
            onNewBill={goToIntakeDashboard}
          />
        )}
      </main>
    </>
  );
}
