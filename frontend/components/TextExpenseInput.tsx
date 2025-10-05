'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { receiptApi } from '@/lib/api';
import { ReceiptUploadResponse } from '@/lib/types';
import toast from 'react-hot-toast';

interface TextExpenseInputProps {
  onSuccess?: (data: ReceiptUploadResponse) => void;
}

const EXAMPLES = [
  "Spent $45 on groceries at Whole Foods yesterday",
  "Coffee $5.50 at Starbucks this morning",
  "Uber ride home $23.45 last night",
  "Movie tickets $30, popcorn $8 at AMC yesterday",
  "Gas station fill up $65 this morning with credit card",
  "Bought lunch for $12.50 at Chipotle on Monday",
];

export default function TextExpenseInput({ onSuccess }: TextExpenseInputProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!text.trim()) {
      toast.error('Please enter an expense description');
      return;
    }

    if (text.trim().length < 5) {
      toast.error('Please provide more details about your expense');
      return;
    }

    setLoading(true);

    try {
      console.log('✍️ Extracting expense from text...');
      const data = await receiptApi.textToExpense(text);
      console.log('✅ Expense extracted:', data);

      toast.success('Expense extracted successfully!');

      // Navigate to confirmation page
      router.push(`/confirm/${data.receipt_id}`);

      // Reset form
      setText('');

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (error: any) {
      console.error('❌ Failed to extract expense:', error);
      toast.error(
        error.response?.data?.detail || 'Failed to extract expense. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setText(example);
  };

  const handleClear = () => {
    setText('');
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Input Area */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your expense in natural language
          </label>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g., Spent $45 on groceries at Whole Foods yesterday..."
            className="w-full h-32 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            disabled={loading}
          />

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500">
              {text.length} characters
            </span>
            {text && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-gray-500 hover:text-gray-700 transition"
              >
                Clear
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !text.trim()}
            className={`mt-4 w-full px-6 py-3 rounded-lg font-medium transition flex items-center justify-center space-x-2 ${
              loading || !text.trim()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Extracting...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Extract Expense</span>
              </>
            )}
          </button>
        </div>

        {/* Examples Section */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Example expenses (click to try):</span>
          </h3>

          <div className="space-y-2">
            {EXAMPLES.map((example, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleExampleClick(example)}
                className="w-full text-left px-3 py-2 bg-white rounded-lg border border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition text-sm text-gray-700"
                disabled={loading}
              >
                <span className="text-blue-600 font-mono">💬</span> {example}
              </button>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            ✨ Tips for best results:
          </h3>
          <ul className="text-sm text-gray-700 space-y-2">
            <li className="flex items-start space-x-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Include the <strong>amount</strong> (e.g., $45, €30)</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Mention the <strong>merchant or category</strong> (e.g., Starbucks, groceries)</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Specify when it happened (e.g., today, yesterday, last Monday)</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>Add payment method if relevant (e.g., with credit card)</span>
            </li>
            <li className="flex items-start space-x-2">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>List multiple items separately (e.g., "Coffee $5, pastry $3")</span>
            </li>
          </ul>
        </div>
      </form>
    </div>
  );
}
