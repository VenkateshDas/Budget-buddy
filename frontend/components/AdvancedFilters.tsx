'use client';

import { useState } from 'react';

export interface FilterState {
  dateRange: 'all' | 'last_7' | 'last_30' | 'last_90' | 'this_month' | 'last_month' | 'this_year' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  categories: string[];
  merchants: string[];
  paymentMethods: string[];
  minAmount?: number;
  maxAmount?: number;
}

interface AdvancedFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableCategories: string[];
  availableMerchants: string[];
  availablePaymentMethods: string[];
}

export default function AdvancedFilters({
  filters,
  onFiltersChange,
  availableCategories,
  availableMerchants,
  availablePaymentMethods,
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof FilterState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilter('categories', newCategories);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      dateRange: 'all',
      categories: [],
      merchants: [],
      paymentMethods: [],
    });
  };

  const activeFilterCount =
    (filters.dateRange !== 'all' ? 1 : 0) +
    filters.categories.length +
    filters.merchants.length +
    filters.paymentMethods.length +
    (filters.minAmount ? 1 : 0) +
    (filters.maxAmount ? 1 : 0);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900">🔍 Advanced Filters</h3>
          {activeFilterCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              {activeFilterCount} active
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          {activeFilterCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {isExpanded ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-4 border-t border-gray-200">
          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { value: 'all', label: 'All Time' },
                { value: 'last_7', label: 'Last 7 Days' },
                { value: 'last_30', label: 'Last 30 Days' },
                { value: 'last_90', label: 'Last 90 Days' },
                { value: 'this_month', label: 'This Month' },
                { value: 'last_month', label: 'Last Month' },
                { value: 'this_year', label: 'This Year' },
                { value: 'custom', label: 'Custom' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateFilter('dateRange', option.value)}
                  className={`px-3 py-2 text-sm rounded-lg border transition ${
                    filters.dateRange === option.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {filters.dateRange === 'custom' && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.customStartDate || ''}
                    onChange={(e) => updateFilter('customStartDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.customEndDate || ''}
                    onChange={(e) => updateFilter('customEndDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Categories Filter */}
          {availableCategories.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categories ({filters.categories.length} selected)
              </label>
              <div className="flex flex-wrap gap-2">
                {availableCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                      filters.categories.includes(category)
                        ? 'bg-purple-600 text-white border-purple-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Amount Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Min Amount</label>
                <input
                  type="number"
                  value={filters.minAmount || ''}
                  onChange={(e) => updateFilter('minAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="$0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Max Amount</label>
                <input
                  type="number"
                  value={filters.maxAmount || ''}
                  onChange={(e) => updateFilter('maxAmount', e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="No limit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
