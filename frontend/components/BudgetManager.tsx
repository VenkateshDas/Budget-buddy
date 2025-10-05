'use client';

import { useState, useEffect } from 'react';
import { budgetApi, analysisApi, categoryApi } from '@/lib/api';
import { Budget, BudgetStatus } from '@/lib/types';
import toast from 'react-hot-toast';

export default function BudgetManager() {
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBudget, setNewBudget] = useState({
    category: '',
    limit: 0,
    period: 'monthly',
    period_type: 'calendar_month' as 'rolling' | 'calendar_month' | 'calendar_week' | 'custom',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [status, cats] = await Promise.all([
        analysisApi.getBudgetStatus(),
        categoryApi.getAll(),
      ]);
      setBudgetStatus(status);
      setCategories(cats.map((c: any) => c.name));
    } catch (error) {
      console.error('Error loading budgets:', error);
      toast.error('Failed to load budget data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBudget = async () => {
    if (!newBudget.category || newBudget.limit <= 0) {
      toast.error('Please select a category and enter a valid limit');
      return;
    }

    try {
      await budgetApi.create(newBudget);
      toast.success('Budget created successfully!');
      setShowAddModal(false);
      setNewBudget({
        category: '',
        limit: 0,
        period: 'monthly',
        period_type: 'calendar_month',
        start_date: '',
        end_date: '',
      });
      loadData();
    } catch (error) {
      console.error('Error creating budget:', error);
      toast.error('Failed to create budget');
    }
  };

  const handleDeleteBudget = async (budgetId: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    try {
      await budgetApi.delete(budgetId);
      toast.success('Budget deleted successfully!');
      loadData();
    } catch (error) {
      console.error('Error deleting budget:', error);
      toast.error('Failed to delete budget');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">💰 Budget Manager</h2>
          <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="bg-gray-100 rounded-xl p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">💰 Budget Manager</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
        >
          + Add Budget
        </button>
      </div>

      {/* Overall Budget Status */}
      {budgetStatus && budgetStatus.budgets.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Overall Budget Status</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-blue-100 mb-1">Total Budget</p>
              <p className="text-2xl font-bold">${budgetStatus.total_budget.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-blue-100 mb-1">Total Spent</p>
              <p className="text-2xl font-bold">${budgetStatus.total_spent.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-blue-100 mb-1">Remaining</p>
              <p className="text-2xl font-bold">
                ${(budgetStatus.total_budget - budgetStatus.total_spent).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Overall Progress</span>
              <span>{budgetStatus.overall_percentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all duration-500 ${
                  budgetStatus.overall_percentage > 100
                    ? 'bg-red-400'
                    : budgetStatus.overall_percentage > 80
                    ? 'bg-yellow-400'
                    : 'bg-green-400'
                }`}
                style={{ width: `${Math.min(budgetStatus.overall_percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Budget Cards */}
      {budgetStatus && budgetStatus.budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgetStatus.budgets.map((budget) => (
            <div
              key={budget.id}
              className={`bg-white rounded-xl shadow-sm p-5 border-2 ${
                budget.is_exceeded
                  ? 'border-red-300'
                  : budget.percentage_used! > 80
                  ? 'border-yellow-300'
                  : 'border-green-300'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{budget.category}</h3>
                  <p className="text-xs text-gray-600 mt-1">
                    📅 {budget.period_display || 'Current month'}
                  </p>
                  {budget.resets_on && budget.resets_on !== 'Does not reset' && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Resets: {budget.resets_on}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteBudget(budget.id!)}
                  className="text-gray-400 hover:text-red-600 transition"
                  title="Delete budget"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-xs text-gray-600">Spent</p>
                    <p className="text-xl font-bold text-gray-900">
                      ${budget.current_spend?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Limit</p>
                    <p className="text-xl font-bold text-gray-900">
                      ${budget.limit.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600">Progress</span>
                    <span
                      className={`font-semibold ${
                        budget.is_exceeded
                          ? 'text-red-600'
                          : budget.percentage_used! > 80
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}
                    >
                      {budget.percentage_used?.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full transition-all duration-500 ${
                        budget.is_exceeded
                          ? 'bg-red-500'
                          : budget.percentage_used! > 80
                          ? 'bg-yellow-500'
                          : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(budget.percentage_used || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>

                {budget.is_exceeded && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2">
                    <p className="text-xs text-red-700 font-medium">
                      ⚠️ Budget exceeded by $
                      {((budget.current_spend || 0) - budget.limit).toFixed(2)}
                    </p>
                  </div>
                )}

                {!budget.is_exceeded && budget.percentage_used! > 80 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                    <p className="text-xs text-yellow-700 font-medium">
                      ⚡ {(100 - budget.percentage_used!).toFixed(1)}% remaining
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <div className="text-6xl mb-4">💰</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Budgets Set</h3>
          <p className="text-gray-600 mb-4">Create your first budget to start tracking spending limits</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
          >
            + Create Budget
          </button>
        </div>
      )}

      {/* Add Budget Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Budget</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={newBudget.category}
                  onChange={(e) => setNewBudget({ ...newBudget, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                >
                  <option value="">Select category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Budget Limit ($) *
                </label>
                <input
                  type="number"
                  value={newBudget.limit || ''}
                  onChange={(e) =>
                    setNewBudget({ ...newBudget, limit: parseFloat(e.target.value) || 0 })
                  }
                  step="0.01"
                  min="0"
                  placeholder="Enter limit amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Period
                </label>
                <select
                  value={newBudget.period}
                  onChange={(e) => setNewBudget({ ...newBudget, period: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewBudget({ category: '', limit: 0, period: 'monthly' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddBudget}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Create Budget
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
