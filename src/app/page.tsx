"use client";

import React, { useState } from 'react';
import { AppView } from '@/types';
import { LandingVault } from '@/components/LandingVault';
import { IntakeDashboard } from '@/components/IntakeDashboard';
import { LiveDebugger } from '@/components/LiveDebugger';
import { ReliefResults } from '@/components/ReliefResults';

interface AnalysisResult {
  bill_total: number;
  private_coverage: number;
  public_coverage: number;
  final_cost: number;
  logs: string[];
  summary: string;
}

export default function Home() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.LANDING);
  const [sessionLogs, setSessionLogs] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Generate a unique Policy ID for this session
  const [policyId] = useState(() => '88' + Math.floor(Math.random() * 9000000 + 1000000).toString());

  // Transition Helpers
  const goToUnlock = () => setCurrentView(AppView.DASHBOARD);

  const runActuaryEngine = async () => {
    setCurrentView(AppView.DEBUGGER);
    setSessionLogs(["Starting Actuary Engine...", "Connecting to backend..."]);

    try {
      const response = await fetch('http://localhost:8000/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: policyId,
          region: 'Ontario'
        })
      });

      if (!response.ok) {
        throw new Error('API returned error');
      }

      const result = await response.json();
      setAnalysisResult(result);
      setSessionLogs(result.logs || ["Analysis complete"]);

      // Wait to show the logs, then go to results
      setTimeout(() => {
        setCurrentView(AppView.RESULTS);
      }, 3000);

    } catch (error) {
      console.error('Analysis error:', error);
      setSessionLogs([
        "Starting Actuary Engine...",
        "Error: Could not connect to backend",
        "Please ensure the Python backend is running (./run_dev.sh)"
      ]);
      // Still show results with fallback data after a delay
      setTimeout(() => {
        setAnalysisResult({
          bill_total: 0,
          private_coverage: 0,
          public_coverage: 0,
          final_cost: 0,
          logs: ["Error connecting to backend"],
          summary: "Please restart the backend"
        });
        setCurrentView(AppView.RESULTS);
      }, 3000);
    }
  };

  const goToResults = () => setCurrentView(AppView.RESULTS);

  return (
    <>
      <main className="min-h-screen bg-background dark:bg-background-dark">
        {currentView === AppView.LANDING && <LandingVault onUnlock={goToUnlock} />}
        {currentView === AppView.DASHBOARD && (
          <IntakeDashboard onAnalyze={runActuaryEngine} policyId={policyId} />
        )}
        {currentView === AppView.DEBUGGER && (
          <LiveDebugger
            onComplete={goToResults}
            policyId={policyId}
            realLogs={sessionLogs}
          />
        )}
        {currentView === AppView.RESULTS && (
          <ReliefResults
            policyId={policyId}
            billTotal={analysisResult?.bill_total || 0}
            privateCoverage={analysisResult?.private_coverage || 0}
            publicCoverage={analysisResult?.public_coverage || 0}
            finalCost={analysisResult?.final_cost || 0}
          />
        )}
      </main>
    </>
  );
}
