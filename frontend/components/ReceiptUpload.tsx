'use client';

import { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useRouter } from 'next/navigation';
import { receiptApi } from '@/lib/api';
import { ReceiptUploadResponse, UploadStatus } from '@/lib/types';
import toast from 'react-hot-toast';

interface ReceiptUploadProps {
  onUploadSuccess: (data: ReceiptUploadResponse) => void;
}

export default function ReceiptUpload({ onUploadSuccess }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [pollingReceiptId, setPollingReceiptId] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const router = useRouter();

  // Check for pending uploads on mount
  useEffect(() => {
    const pendingUpload = localStorage.getItem('pendingUpload');
    if (pendingUpload) {
      try {
        const data = JSON.parse(pendingUpload);
        if (data.receipt_id && data.status === 'processing') {
          console.log('📋 Found pending upload:', data.receipt_id);
          setPollingReceiptId(data.receipt_id);
          setUploading(true);
          toast.loading('Resuming upload...', { id: 'resume-upload' });
        }
      } catch (error) {
        console.error('Failed to parse pending upload:', error);
        localStorage.removeItem('pendingUpload');
      }
    }
  }, []);

  // Poll for upload status
  useEffect(() => {
    if (!pollingReceiptId) return;

    let hasNavigated = false;
    let failedAttempts = 0;

    const pollStatus = async () => {
      try {
        const status = await receiptApi.getStatus(pollingReceiptId);
        console.log('📊 Upload status:', status);

        // Reset failed attempts on successful response
        failedAttempts = 0;

        setProgress(status.progress);

        if (status.status === UploadStatus.COMPLETED && status.receipt_data) {
          if (!hasNavigated) {
            hasNavigated = true;
            toast.dismiss('resume-upload');
            toast.dismiss('processing');
            toast.success('Receipt extracted successfully!', { duration: 2000 });
            localStorage.removeItem('pendingUpload');
            setPollingReceiptId(null);
            setUploading(false);
            setProgress(0);

            // Navigate to confirmation page
            router.push(`/confirm/${pollingReceiptId}`);
          }
        } else if (status.status === UploadStatus.FAILED) {
          if (!hasNavigated) {
            hasNavigated = true;
            toast.dismiss('resume-upload');
            toast.dismiss('processing');
            toast.error(status.error || 'Failed to extract receipt data');
            localStorage.removeItem('pendingUpload');
            setPollingReceiptId(null);
            setUploading(false);
            setProgress(0);
          }
        }
      } catch (error: any) {
        console.error('Failed to poll status:', error);
        // If we get 404 errors repeatedly, the upload likely failed
        if (error.response?.status === 404) {
          failedAttempts++;
          console.warn(`⚠️ Receipt not found (attempt ${failedAttempts}/5)`);

          // After 5 failed attempts (10 seconds), give up
          if (failedAttempts >= 5) {
            if (!hasNavigated) {
              hasNavigated = true;
              toast.dismiss('resume-upload');
              toast.dismiss('processing');
              toast.error('Upload failed - receipt not found. Please try again.');
              localStorage.removeItem('pendingUpload');
              setPollingReceiptId(null);
              setUploading(false);
              setProgress(0);
            }
          }
        }
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);
    // Initial poll
    pollStatus();

    return () => {
      clearInterval(interval);
      hasNavigated = true; // Prevent any pending polls from showing toasts
    };
  }, [pollingReceiptId, router]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      console.log('📁 Files dropped:', acceptedFiles);
      if (acceptedFiles.length === 0) {
        toast.error('Please select valid image or PDF files');
        return;
      }

      console.log(`📄 Selected ${acceptedFiles.length} file(s)`);

      // Validate all files
      for (const file of acceptedFiles) {
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
          toast.error(`Invalid file type: ${file.name}`);
          return;
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File too large: ${file.name} (max 10MB)`);
          return;
        }
      }

      // Store selected files for preview (append to existing if any)
      setSelectedFiles(prev => {
        const combined = [...prev, ...acceptedFiles];
        // Limit to 5 files
        if (combined.length > 5) {
          toast.error('Maximum 5 files allowed');
          return combined.slice(0, 5);
        }
        return combined;
      });
    },
    []
  );

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setProgress(20);

    try {
      console.log('🚀 Starting async upload with multiple files...');
      const data = await receiptApi.uploadMultiple(selectedFiles, true);
      console.log('✅ Upload initiated:', data);

      // Store upload info in localStorage for persistence
      localStorage.setItem('pendingUpload', JSON.stringify({
        receipt_id: data.receipt_id,
        status: 'processing',
        timestamp: new Date().toISOString(),
      }));

      // Start polling for status
      setPollingReceiptId(data.receipt_id);
      toast.loading('Processing receipt...', { id: 'processing' });
      setSelectedFiles([]); // Clear selection
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      toast.error(
        error.response?.data?.detail || 'Failed to upload receipt'
      );
      setUploading(false);
      setProgress(0);
    }
  };

  const handleCancel = () => {
    setSelectedFiles([]);
  };

  const handleCancelUpload = () => {
    // Clear stuck upload
    localStorage.removeItem('pendingUpload');
    setPollingReceiptId(null);
    setUploading(false);
    setProgress(0);
    toast.dismiss('processing');
    toast.dismiss('resume-upload');
    toast.success('Upload cancelled');
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'image/bmp': ['.bmp'],
      'application/pdf': ['.pdf'],
    },
    multiple: true,
    maxFiles: 5,
    maxSize: 10 * 1024 * 1024, // 10MB per file
    disabled: uploading,
    onDropRejected: (fileRejections) => {
      console.log('❌ Drop rejected:', fileRejections);
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0];
        if (rejection.errors[0]?.code === 'file-invalid-type') {
          toast.error('Please drop an image or PDF file (JPG, PNG, GIF, WebP, PDF)');
        } else if (rejection.errors[0]?.code === 'file-too-large') {
          toast.error('File is too large. Maximum size is 10MB');
        } else {
          toast.error('Invalid file. Please try again.');
        }
      }
    },
  });

  return (
    <div className="w-full">
      {/* Show smaller dropzone when files are selected */}
      {selectedFiles.length > 0 && !uploading ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
            transition-all duration-200 ease-in-out
            ${
              isDragReject
                ? 'border-red-500 bg-red-50'
                : isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 bg-white'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Click or drag to add more files (max 5 total)</span>
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-12 text-center cursor-pointer
            transition-all duration-200 ease-in-out
            ${
              isDragReject
                ? 'border-red-500 bg-red-50'
                : isDragActive
                ? 'border-blue-500 bg-blue-50 scale-[1.02]'
                : 'border-gray-300 hover:border-blue-400 bg-white'
            }
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
        <input {...getInputProps()} />

        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-gray-700">
                Processing receipt...
              </p>
              <p className="text-sm text-gray-500">
                Using Gemini AI to extract data
              </p>
              {/* Progress bar */}
              <div className="max-w-xs mx-auto">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
              {/* Cancel button */}
              <button
                onClick={handleCancelUpload}
                className="mt-4 px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
              >
                Cancel Upload
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Upload Icon */}
            <div className="mx-auto w-16 h-16 text-blue-600">
              <svg
                className="w-full h-full"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>

            {isDragReject ? (
              <p className="text-lg font-medium text-red-600">
                ⚠️ Invalid file type or size
              </p>
            ) : isDragActive ? (
              <p className="text-lg font-medium text-blue-600">
                Drop your receipt here...
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-700">
                  Drag & drop your receipt image
                </p>
                <p className="text-sm text-gray-500">
                  or click to browse files
                </p>
              </div>
            )}

            <div className="flex items-center justify-center space-x-2 text-xs text-gray-400">
              <span>📸 Supports: JPG, PNG, GIF, WebP, PDF</span>
              <span>•</span>
              <span>Max 5 files</span>
              <span>•</span>
              <span>10MB each</span>
            </div>
          </div>
        )}
        </div>
      )}

      {/* File Preview */}
      {selectedFiles.length > 0 && !uploading && (
        <div className="mt-6 bg-white border border-gray-300 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-900">
              📎 Selected Files ({selectedFiles.length})
            </h3>
            <button
              onClick={handleCancel}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {file.type === 'application/pdf' ? '📄' : '🖼️'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                  title="Remove file"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={handleUpload}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center space-x-2"
          >
            <span>🚀 Process {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}</span>
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          📋 Tips for best results:
        </h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Ensure the entire receipt is visible and in focus</li>
          <li>Avoid shadows and glare on the receipt</li>
          <li>Take the photo straight-on (not at an angle)</li>
          <li>Make sure text is clear and readable</li>
          <li>Upload multiple images of the same receipt for better accuracy</li>
        </ul>
      </div>
    </div>
  );
}
