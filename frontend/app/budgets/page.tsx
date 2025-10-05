'use client';

import BudgetManager from '@/components/BudgetManager';
import GoalsTracker from '@/components/GoalsTracker';

export default function BudgetsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">💰 Budgets & Goals</h1>
        <p className="text-green-100">
          Manage your spending limits and track your financial goals
        </p>
      </div>

      {/* Budget Manager Section */}
      <BudgetManager />

      {/* Divider */}
      <div className="border-t-2 border-gray-200"></div>

      {/* Goals Tracker Section */}
      <GoalsTracker />
    </div>
  );
}
