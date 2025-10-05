'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { receiptApi } from '@/lib/api';
import { UploadJobStatus, UploadStatus } from '@/lib/types';
import { format } from 'date-fns';

export default function ReceiptHistory() {
  const [receipts, setReceipts] = useState<UploadJobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const data = await receiptApi.getAll();
      setReceipts(data);
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();

    // Poll for updates every 5 seconds to catch processing receipts
    const interval = setInterval(fetchReceipts, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: UploadStatus) => {
    switch (status) {
      case UploadStatus.COMPLETED:
        return 'bg-green-100 text-green-800';
      case UploadStatus.PROCESSING:
        return 'bg-blue-100 text-blue-800';
      case UploadStatus.PENDING:
        return 'bg-yellow-100 text-yellow-800';
      case UploadStatus.FAILED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: UploadStatus) => {
    switch (status) {
      case UploadStatus.COMPLETED:
        return '✅';
      case UploadStatus.PROCESSING:
        return '⏳';
      case UploadStatus.PENDING:
        return '⏸️';
      case UploadStatus.FAILED:
        return '❌';
      default:
        return '❓';
    }
  };

  const handleReceiptClick = (receipt: UploadJobStatus) => {
    if (receipt.status === UploadStatus.COMPLETED) {
      router.push(`/confirm/${receipt.receipt_id}`);
    }
  };

  if (loading && receipts.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
        <div className="text-center text-gray-500">Loading receipt history...</div>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
        <div className="text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-gray-600">No receipts yet</p>
          <p className="text-sm text-gray-500 mt-2">Upload your first receipt to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Receipt History</h2>
        <p className="text-sm text-gray-600 mt-1">
          {receipts.length} receipt{receipts.length !== 1 ? 's' : ''} total
        </p>
      </div>

      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {receipts.map((receipt) => (
          <div
            key={receipt.receipt_id}
            onClick={() => handleReceiptClick(receipt)}
            className={`p-4 hover:bg-gray-50 transition ${
              receipt.status === UploadStatus.COMPLETED ? 'cursor-pointer' : 'cursor-default'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      receipt.status
                    )}`}
                  >
                    {getStatusIcon(receipt.status)} {receipt.status}
                  </span>
                  {receipt.status === UploadStatus.PROCESSING && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${receipt.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs">{receipt.progress}%</span>
                    </div>
                  )}
                </div>

                {receipt.receipt_data && (
                  <>
                    <h3 className="font-semibold text-gray-900">
                      {receipt.receipt_data.merchant_details?.name || 'Unknown Merchant'}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                      <span>
                        📅 {receipt.receipt_data.purchase_date || 'No date'}
                      </span>
                      <span>
                        💰 ${receipt.receipt_data.total_amounts?.total?.toFixed(2) || '0.00'}
                      </span>
                      <span>
                        🛒 {receipt.receipt_data.line_items?.length || 0} items
                      </span>
                    </div>
                  </>
                )}

                {!receipt.receipt_data && receipt.status !== UploadStatus.PROCESSING && (
                  <p className="text-sm text-gray-500">Processing...</p>
                )}

                {receipt.status === UploadStatus.FAILED && receipt.error && (
                  <p className="text-sm text-red-600 mt-2">Error: {receipt.error}</p>
                )}
              </div>

              {receipt.status === UploadStatus.COMPLETED && (
                <div className="text-blue-600">
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
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
