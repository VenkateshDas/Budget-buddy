'use client';

import { useEffect, useState } from 'react';
import ReceiptUpload from '@/components/ReceiptUpload';
import ReceiptHistory from '@/components/ReceiptHistory';
import { ReceiptUploadResponse } from '@/lib/types';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function HomePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');

  useEffect(() => {
    // Check for pending uploads on page load
    const checkPendingUploads = () => {
      const pendingUpload = localStorage.getItem('pendingUpload');
      if (pendingUpload) {
        try {
          const uploadData = JSON.parse(pendingUpload);
          if (uploadData.receipt_id && uploadData.status === 'processing') {
            toast.loading('Checking upload status...', { id: 'pending-check' });
            // The upload component will handle polling
          }
        } catch (error) {
          console.error('Failed to parse pending upload:', error);
          localStorage.removeItem('pendingUpload');
        }
      }
    };

    checkPendingUploads();
  }, []);

  const handleUploadSuccess = (data: ReceiptUploadResponse) => {
    console.log('Upload success data:', data);
    // Navigate to confirmation page
    router.push(`/confirm/${data.receipt_id}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header with Tabs */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          Receipt Manager
        </h1>
        <p className="text-lg text-gray-600">
          AI-powered receipt processing in seconds
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('upload')}
          className={`pb-3 px-4 font-medium transition ${
            activeTab === 'upload'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📤 Upload Receipt
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 px-4 font-medium transition ${
            activeTab === 'history'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          📋 Transaction History
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'upload' ? (
        <div className="space-y-6">
          <ReceiptUpload onUploadSuccess={handleUploadSuccess} />

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="text-3xl mb-3">🤖</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI Extraction
              </h3>
              <p className="text-sm text-gray-600">
                Powered by Google Gemini AI to accurately extract receipt data
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="text-3xl mb-3">📊</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Smart Insights
              </h3>
              <p className="text-sm text-gray-600">
                Get spending trends, forecasts, and category breakdowns
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="text-3xl mb-3">💰</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Budget Tracking
              </h3>
              <p className="text-sm text-gray-600">
                Set budgets, track goals, and stay on top of your finances
              </p>
            </div>
          </div>
        </div>
      ) : (
        <ReceiptHistory />
      )}
    </div>
  );
}
