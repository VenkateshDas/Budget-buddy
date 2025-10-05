'use client';

import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendData, CategoryAnalysis } from '@/lib/types';

interface TrendChartsProps {
  trendData: TrendData;
  categoryAnalysis: CategoryAnalysis;
}

const COLORS = [
  '#f59e0b', // amber/orange - for Groceries
  '#ec4899', // pink - for Dining
  '#3b82f6', // blue - for Transport
  '#ef4444', // red - for Shopping
  '#10b981', // green - for Health/Produce
  '#8b5cf6', // purple - for Entertainment
  '#06b6d4', // cyan - for Utilities
  '#6b7280', // gray - for Other
];

// Category icon mapping
const getCategoryIcon = (category: string): string => {
  const categoryLower = category.toLowerCase();
  if (categoryLower.includes('groceries') || categoryLower.includes('grocery')) return '🛒';
  if (categoryLower.includes('dining') || categoryLower.includes('restaurant') || categoryLower.includes('food')) return '🍽️';
  if (categoryLower.includes('transport') || categoryLower.includes('uber') || categoryLower.includes('taxi')) return '🚗';
  if (categoryLower.includes('utilities') || categoryLower.includes('utility') || categoryLower.includes('electric')) return '💡';
  if (categoryLower.includes('entertainment') || categoryLower.includes('movie') || categoryLower.includes('game')) return '🎬';
  if (categoryLower.includes('shopping') || categoryLower.includes('retail')) return '🛍️';
  if (categoryLower.includes('health') || categoryLower.includes('medical') || categoryLower.includes('pharmacy')) return '💊';
  if (categoryLower.includes('produce')) return '🥬';
  if (categoryLower.includes('bakery') || categoryLower.includes('bread')) return '🍞';
  if (categoryLower.includes('meat')) return '🥩';
  if (categoryLower.includes('home')) return '🏠';
  return '📦'; // Default for Other
};

// Custom label for donut chart - renders outside with icon and percentage
const renderCustomLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, percent, payload } = props;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 35;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if percentage is significant (>= 3%)
  if (percent < 0.03) return null;

  const icon = getCategoryIcon(payload.name);

  return (
    <g>
      {/* Icon background circle */}
      <circle
        cx={x}
        cy={y}
        r="18"
        fill={payload.fill}
        opacity="0.15"
      />
      {/* Icon */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="20"
      >
        {icon}
      </text>
      {/* Percentage text */}
      <text
        x={x}
        y={y + 25}
        textAnchor="middle"
        fill="#374151"
        fontSize="13"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    </g>
  );
};

// Center label showing total expenses
const renderCenterLabel = (totalSpending: number) => {
  return (
    <>
      <text
        x="50%"
        y="45%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="28"
        fontWeight="bold"
        fill="#111827"
      >
        ${totalSpending.toFixed(0)}
      </text>
      <text
        x="50%"
        y="55%"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="13"
        fill="#6b7280"
      >
        Total expenses
      </text>
    </>
  );
};

export default function TrendCharts({ trendData, categoryAnalysis }: TrendChartsProps) {
  // Prepare data for line chart (spending over time)
  const lineChartData = trendData.total_by_period.map((point) => ({
    date: point.date,
    total: point.amount,
  }));

  // Prepare data for bar chart (spending by category this period)
  const barChartData = categoryAnalysis.categories.slice(0, 8).map((cat) => ({
    category: cat.category,
    amount: cat.total,
  }));

  // Prepare data for donut chart - top 6 categories for cleaner display
  const donutChartData = categoryAnalysis.categories.slice(0, 6).map((cat) => ({
    name: cat.category,
    value: cat.total,
  }));

  return (
    <div className="space-y-6">
      {/* Spending Over Time - Line Chart */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📈 Spending Over Time
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={lineChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number) => `$${value.toFixed(2)}`}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', r: 5 }}
              activeDot={{ r: 7 }}
              name="Total Spending"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Category Breakdown - Bar & Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            📊 Spending by Category
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="category"
                tick={{ fontSize: 11 }}
                angle={-45}
                textAnchor="end"
                height={100}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              <Bar dataKey="amount" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🎯 Expense Distribution
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <PieChart>
              <Pie
                data={donutChartData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {donutChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                }}
              />
              {/* Center label */}
              <text>
                {renderCenterLabel(categoryAnalysis.total_spending)}
              </text>
            </PieChart>
          </ResponsiveContainer>

          {/* Legend below donut chart */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {donutChartData.map((entry, index) => (
              <div key={`legend-${index}`} className="flex items-center gap-2">
                <div className="flex items-center justify-center w-6 h-6 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                  <span className="text-xs">{getCategoryIcon(entry.name)}</span>
                </div>
                <span className="text-sm text-gray-700 truncate">{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
