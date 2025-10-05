'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ReceiptConfirmation from '@/components/ReceiptConfirmation';
import ExtractionChatSidebar from '@/components/ExtractionChatSidebar';
import { ReceiptUploadResponse } from '@/lib/types';
import { receiptApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function ConfirmPage() {
  const [uploadData, setUploadData] = useState<ReceiptUploadResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams();
  const receiptId = params.receiptId as string;

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        setLoading(true);

        // First check the status endpoint to see if it's still processing
        const status = await receiptApi.getStatus(receiptId);
        console.log('📊 Receipt status:', status);

        if (status.status === 'completed' && status.receipt_data) {
          console.log('✅ Receipt completed, setting data');
          // Convert status response to upload data format
          setUploadData({
            receipt_id: status.receipt_id,
            receipt: status.receipt_data,
            extraction_log: status.extraction_log || { success: true, prompt: '', response: '' },
            confidence: 0.85,
          });
          setLoading(false);
        } else if (status.status === 'processing' || status.status === 'pending') {
          console.log('⏳ Receipt still processing, starting polling');

          // Still processing, show loading state and poll
          toast.loading('Processing receipt...', { id: 'processing-receipt' });

          // Poll every 2 seconds
          const interval = setInterval(async () => {
            try {
              const newStatus = await receiptApi.getStatus(receiptId);
              if (newStatus.status === 'completed' && newStatus.receipt_data) {
                toast.dismiss('processing-receipt');
                toast.success('Receipt ready!');
                clearInterval(interval);
                setUploadData({
                  receipt_id: newStatus.receipt_id,
                  receipt: newStatus.receipt_data,
                  extraction_log: newStatus.extraction_log || { success: true, prompt: '', response: '' },
                  confidence: 0.85,
                });
                setLoading(false);
              } else if (newStatus.status === 'failed') {
                toast.dismiss('processing-receipt');
                toast.error('Failed to process receipt');
                clearInterval(interval);
                setTimeout(() => router.push('/'), 2000);
              }
            } catch (error) {
              console.error('Polling error:', error);
            }
          }, 2000);

          return () => clearInterval(interval);
        } else if (status.status === 'failed') {
          toast.error('Receipt processing failed');
          setTimeout(() => router.push('/'), 2000);
        }
      } catch (error: any) {
        console.error('Failed to fetch receipt:', error);
        toast.error('Failed to load receipt. Redirecting to upload page...');
        setTimeout(() => router.push('/'), 2000);
        setLoading(false);
      }
    };

    if (receiptId) {
      fetchReceipt();
    }
  }, [receiptId, router]);

  const handleSaveSuccess = () => {
    // Don't clear uploadData - just navigate immediately
    router.push('/insights');
  };

  const handleCancel = () => {
    router.push('/');
  };

  const handleReprocess = (newData: ReceiptUploadResponse) => {
    setUploadData(newData);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt data...</p>
        </div>
      </div>
    );
  }

  if (!uploadData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600">Receipt not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <ReceiptConfirmation
        uploadData={uploadData}
        onSaveSuccess={handleSaveSuccess}
        onCancel={handleCancel}
      />
      <ExtractionChatSidebar
        uploadData={uploadData}
        onReprocess={handleReprocess}
      />
    </div>
  );
}
