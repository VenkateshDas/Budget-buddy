'use client';

import { useState, useEffect } from 'react';
import { goalApi } from '@/lib/api';
import { Goal } from '@/lib/types';
import toast from 'react-hot-toast';

export default function GoalsTracker() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [newGoal, setNewGoal] = useState({
    name: '',
    target_amount: 0,
    current_amount: 0,
    target_date: '',
    category: '',
    goal_type: 'savings' as 'savings' | 'spending_limit',
    auto_track: false,
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const data = await goalApi.getAll();
      setGoals(data);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGoal = async () => {
    if (!newGoal.name || newGoal.target_amount <= 0 || !newGoal.target_date) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await goalApi.create({
        ...newGoal,
        progress_percentage:
          (newGoal.current_amount / newGoal.target_amount) * 100,
      });
      toast.success('Goal created successfully!');
      setShowAddModal(false);
      setNewGoal({
        name: '',
        target_amount: 0,
        current_amount: 0,
        target_date: '',
        category: '',
        goal_type: 'savings',
        auto_track: false,
      });
      loadGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      await goalApi.delete(goalId);
      toast.success('Goal deleted successfully!');
      loadGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">🎯 Goals Tracker</h2>
          <div className="h-10 w-28 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
              <div className="h-4 bg-gray-100 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">🎯 Goals Tracker</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
        >
          + Add Goal
        </button>
      </div>

      {/* Goals Grid */}
      {goals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => {
            const daysUntilTarget = Math.ceil(
              (new Date(goal.target_date).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24)
            );
            const isOverdue = daysUntilTarget < 0;
            const isNearDeadline = daysUntilTarget <= 30 && daysUntilTarget >= 0;

            return (
              <div
                key={goal.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {goal.name}
                    </h3>
                    {goal.category && (
                      <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                        {goal.category}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id!)}
                    className="text-gray-400 hover:text-red-600 transition"
                    title="Delete goal"
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

                {/* Progress */}
                <div className="space-y-3 mb-4">
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-xs text-gray-600">Current</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${goal.current_amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600">Target</p>
                      <p className="text-xl font-bold text-gray-900">
                        ${goal.target_amount.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-semibold text-purple-600">
                        {goal.progress_percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          goal.progress_percentage >= 100
                            ? 'bg-green-500'
                            : 'bg-gradient-to-r from-purple-500 to-purple-600'
                        }`}
                        style={{
                          width: `${Math.min(goal.progress_percentage, 100)}%`,
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Remaining */}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Remaining:</span>
                    <span className="font-semibold text-gray-900">
                      ${(goal.target_amount - goal.current_amount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Target Date */}
                <div
                  className={`rounded-lg p-3 ${
                    goal.progress_percentage >= 100
                      ? 'bg-green-50 border border-green-200'
                      : isOverdue
                      ? 'bg-red-50 border border-red-200'
                      : isNearDeadline
                      ? 'bg-yellow-50 border border-yellow-200'
                      : 'bg-blue-50 border border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Target Date</p>
                      <p
                        className={`text-sm font-semibold ${
                          goal.progress_percentage >= 100
                            ? 'text-green-700'
                            : isOverdue
                            ? 'text-red-700'
                            : isNearDeadline
                            ? 'text-yellow-700'
                            : 'text-blue-700'
                        }`}
                      >
                        {new Date(goal.target_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      {goal.progress_percentage >= 100 ? (
                        <div className="text-2xl">✅</div>
                      ) : isOverdue ? (
                        <div>
                          <p className="text-xs text-red-700 font-medium">
                            {Math.abs(daysUntilTarget)} days overdue
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-600">
                            {daysUntilTarget} days left
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {goal.progress_percentage >= 100 && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-2">
                    <p className="text-xs text-green-700 font-medium text-center">
                      🎉 Goal achieved! Congratulations!
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Goals Set</h3>
          <p className="text-gray-600 mb-4">
            Create your first savings or spending goal
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
          >
            + Create Goal
          </button>
        </div>
      )}

      {/* Add Goal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Goal</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Goal Name *
                </label>
                <input
                  type="text"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="e.g., Save for vacation"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Amount ($) *
                </label>
                <input
                  type="number"
                  value={newGoal.target_amount || ''}
                  onChange={(e) =>
                    setNewGoal({
                      ...newGoal,
                      target_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.01"
                  min="0"
                  placeholder="Enter target amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Amount ($)
                </label>
                <input
                  type="number"
                  value={newGoal.current_amount || ''}
                  onChange={(e) =>
                    setNewGoal({
                      ...newGoal,
                      current_amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  step="0.01"
                  min="0"
                  placeholder="Enter current amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Date *
                </label>
                <input
                  type="date"
                  value={newGoal.target_date}
                  onChange={(e) =>
                    setNewGoal({ ...newGoal, target_date: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category (optional)
                </label>
                <input
                  type="text"
                  value={newGoal.category || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, category: e.target.value })}
                  placeholder="e.g., Savings, Travel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-700"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewGoal({
                    name: '',
                    target_amount: 0,
                    current_amount: 0,
                    target_date: '',
                    category: '',
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
