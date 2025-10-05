'use client';

import { useState, useEffect, useMemo } from 'react';
import { analysisApi } from '@/lib/api';
import { TrendData, CategoryAnalysis, ForecastData } from '@/lib/types';
import TrendCharts from '@/components/TrendCharts';
import AdvancedFilters, { FilterState } from '@/components/AdvancedFilters';
import toast from 'react-hot-toast';

export default function InsightsPage() {
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [categoryAnalysis, setCategoryAnalysis] = useState<CategoryAnalysis | null>(null);
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [sheetsUrl, setSheetsUrl] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    categories: [],
    merchants: [],
    paymentMethods: [],
  });

  useEffect(() => {
    loadData();
  }, [period, filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Build API params from filter state
      const apiParams: any = {
        period: filters.dateRange,
      };

      // Add custom date range if applicable
      if (filters.dateRange === 'custom') {
        if (filters.customStartDate) {
          apiParams.start_date = filters.customStartDate;
        }
        if (filters.customEndDate) {
          apiParams.end_date = filters.customEndDate;
        }
      }

      // Add category filter (comma-separated string)
      if (filters.categories && filters.categories.length > 0) {
        apiParams.categories = filters.categories.join(',');
      }

      // Add amount filters
      if (filters.minAmount !== undefined && filters.minAmount !== null) {
        apiParams.min_amount = filters.minAmount;
      }
      if (filters.maxAmount !== undefined && filters.maxAmount !== null) {
        apiParams.max_amount = filters.maxAmount;
      }

      console.log('🔍 Loading insights with filters:', apiParams);

      // Build trends API params
      const trendParams: any = { period };
      if (filters.dateRange !== 'all') {
        trendParams.date_filter = filters.dateRange;
        if (filters.dateRange === 'custom') {
          if (filters.customStartDate) trendParams.start_date = filters.customStartDate;
          if (filters.customEndDate) trendParams.end_date = filters.customEndDate;
        }
      }

      const [trends, categories, forecast, sheets] = await Promise.all([
        analysisApi.getTrends(trendParams),
        analysisApi.getCategorization(apiParams),
        analysisApi.getForecast(),
        analysisApi.getSheetsUrl().catch(() => ({ url: null })), // Handle gracefully if sheets URL is not available
      ]);

      console.log('📊 Received data:', {
        categoryCount: categories.categories?.length,
        totalSpending: categories.total_spending,
        trendCategories: trends.categories?.length
      });

      setTrendData(trends);
      setCategoryAnalysis(categories);
      setForecastData(forecast);
      setSheetsUrl(sheets.url);
    } catch (error: any) {
      console.error('Error loading insights:', error);
      toast.error('Failed to load insights data');
    } finally {
      setLoading(false);
    }
  };

  // Filter trend data based on selected categories - MUST be before any conditional returns
  const filteredTrendData = useMemo(() => {
    if (!trendData) return null;

    // If no category filter, return all data
    if (!filters.categories || filters.categories.length === 0) {
      return trendData;
    }

    // Filter the data to only include selected categories
    const filteredData: any = {};
    filters.categories.forEach(cat => {
      if (trendData.data[cat]) {
        filteredData[cat] = trendData.data[cat];
      }
    });

    return {
      ...trendData,
      categories: filters.categories,
      data: filteredData,
    };
  }, [trendData, filters.categories]);

  const SkeletonCard = () => (
    <div className="bg-white rounded-xl shadow-sm p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3"></div>
      <div className="h-8 bg-gray-300 rounded w-3/4"></div>
    </div>
  );

  const SkeletonChart = () => (
    <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
      <div className="h-64 bg-gray-100 rounded"></div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">📊 Spending Insights</h1>
          <p className="text-blue-100">Analyze your spending patterns and trends</p>
        </div>

        {/* Skeleton Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Skeleton Charts */}
        <SkeletonChart />
        <SkeletonChart />
      </div>
    );
  }

  // Check if we have any actual data
  const hasData = categoryAnalysis?.categories && categoryAnalysis.categories.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📊 Spending Insights</h1>
        <p className="text-blue-100">Analyze your spending patterns and trends</p>
      </div>

      {/* Google Sheets Link */}
      {sheetsUrl && (
        <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="text-2xl">📊</div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Google Sheets Data</h3>
                <p className="text-sm text-gray-600">View and edit your receipt data in Google Sheets</p>
              </div>
            </div>
            <a
              href={sheetsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <span className="mr-2">Open Spreadsheet</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Advanced Filters */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableCategories={trendData?.categories || []}
        availableMerchants={[]}
        availablePaymentMethods={[]}
      />

      {/* Quick Stats & Period Selector */}
      <div className="flex flex-wrap gap-4 bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium text-gray-700">Chart View:</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'monthly' | 'weekly')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
          >
            <option value="monthly">Monthly Trends</option>
            <option value="weekly">Weekly Trends</option>
          </select>
        </div>
      </div>

      {/* No Data Message */}
      {!hasData && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600 mb-6">
            {filters.dateRange !== 'all'
              ? 'No receipts found for the selected filters. Try adjusting your filters above.'
              : 'Upload some receipts to see your spending insights!'}
          </p>
          {filters.dateRange === 'all' && (
            <a
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Upload Receipt
            </a>
          )}
        </div>
      )}

      {/* Summary Cards */}
      {hasData && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Spending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${categoryAnalysis.total_spending.toFixed(2)}
                  </p>
                </div>
                <div className="text-3xl">💰</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Top Category</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {categoryAnalysis.top_category}
                  </p>
                </div>
                <div className="text-3xl">🏆</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Categories</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {categoryAnalysis.categories.length}
                  </p>
                </div>
                <div className="text-3xl">📁</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Next Month Est.</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${forecastData.total_forecast.toFixed(2)}
                  </p>
                </div>
                <div className="text-3xl">🔮</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <TrendCharts trendData={filteredTrendData} categoryAnalysis={categoryAnalysis} />

          {/* Forecast Section */}
          {forecastData.forecasts.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="text-2xl mr-2">🔮</span>
                Next Month Forecast
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Based on the last {forecastData.based_on_months} months of data
                (Confidence: {(forecastData.confidence * 100).toFixed(0)}%)
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {forecastData.forecasts.map((forecast) => (
                  <div
                    key={forecast.category}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <h4 className="font-semibold text-gray-900 mb-1">
                      {forecast.category}
                    </h4>
                    <p className="text-2xl font-bold text-blue-600 mb-1">
                      ${forecast.total.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {forecast.percentage.toFixed(1)}% of total
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Details */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              📋 Category Breakdown
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Category
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Total
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Count
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Average
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {categoryAnalysis.categories.map((cat) => (
                    <tr key={cat.category} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {cat.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        ${cat.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        {cat.count}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        ${cat.average.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {cat.percentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
