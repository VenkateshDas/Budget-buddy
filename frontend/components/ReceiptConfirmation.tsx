'use client';

import { useState, useEffect } from 'react';
import { Receipt, LineItem, ReceiptUploadResponse } from '@/lib/types';
import { receiptApi, userApi } from '@/lib/api';
import toast from 'react-hot-toast';
import ExtractionPerformance from './ExtractionPerformance';
import DuplicateWarning from './DuplicateWarning';

interface ReceiptConfirmationProps {
  uploadData: ReceiptUploadResponse;
  onSaveSuccess: () => void;
  onCancel: () => void;
}

function ReceiptImageDisplay({ imageUrl }: { imageUrl: string }) {
  const [imageError, setImageError] = useState(false);
  const [isPdf, setIsPdf] = useState(false);

  useEffect(() => {
    // Reset error state when URL changes
    setImageError(false);

    // Check if it's a PDF by checking the URL or making a HEAD request
    const checkFileType = async () => {
      try {
        const response = await fetch(imageUrl, { method: 'HEAD' });
        const contentType = response.headers.get('Content-Type');
        if (contentType?.includes('pdf')) {
          setIsPdf(true);
        } else {
          setIsPdf(false);
        }
      } catch (error) {
        console.error('Error checking file type:', error);
      }
    };

    checkFileType();
  }, [imageUrl]);

  if (imageError) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <svg
            className="w-16 h-16 mx-auto mb-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p>Image not available</p>
          <p className="text-xs mt-1">{imageUrl}</p>
        </div>
      </div>
    );
  }

  if (isPdf) {
    return (
      <iframe
        src={imageUrl}
        className="w-full h-[800px]"
        title="Receipt PDF"
      />
    );
  }

  return (
    <img
      src={imageUrl}
      alt="Receipt"
      className="w-full h-auto max-h-[800px] object-contain bg-gray-50"
      onError={() => {
        console.error('Failed to load image:', imageUrl);
        setImageError(true);
      }}
      onLoad={() => console.log('Image loaded successfully:', imageUrl)}
    />
  );
}

export default function ReceiptConfirmation({
  uploadData,
  onSaveSuccess,
  onCancel,
}: ReceiptConfirmationProps) {
  const [receipt, setReceipt] = useState<Receipt | null>(uploadData.receipt);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    'Cash',
    'Credit Card',
    'Debit Card',
    'Digital Wallet',
    'MASTERCARD',
    'Other',
  ]);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicates, setDuplicates] = useState<any[]>([]);

  // Sync receipt when uploadData changes (e.g., after reprocessing)
  useEffect(() => {
    if (uploadData.receipt) {
      console.log('📝 ReceiptConfirmation: Syncing receipt from uploadData', uploadData.receipt);
      setReceipt(uploadData.receipt);
    }
  }, [uploadData.receipt]);

  // Guard against null receipt
  if (!receipt) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-lg border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt data...</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    // Load user categories
    userApi.getCategories().then((response) => {
      const categoryNames = response.categories.map((c: any) => c.name);
      console.log('📦 Loaded user categories for dropdown:', categoryNames);
      setCategories(categoryNames);
    }).catch((error) => {
      console.error('Failed to load user categories:', error);
      // Use defaults if API fails
      setCategories([
        'Groceries',
        'Dining',
        'Transport',
        'Utilities',
        'Entertainment',
        'Shopping',
        'Health',
        'Other',
      ]);
    });
  }, []);

  // Update categories to include any new categories from receipt items
  useEffect(() => {
    if (receipt && receipt.line_items && categories.length > 0) {
      const receiptCategories = receipt.line_items
        .map(item => item.category)
        .filter(cat => cat && cat.trim() !== '');

      const categorySet = new Set([...categories, ...receiptCategories]);
      const uniqueCategories = Array.from(categorySet);

      if (uniqueCategories.length !== categories.length) {
        setCategories(uniqueCategories);
      }
    }
  }, [receipt, categories]);

  // Update payment methods to include any new payment method from receipt
  useEffect(() => {
    if (receipt && receipt.total_amounts && receipt.total_amounts.payment_method) {
      const currentPaymentMethod = receipt.total_amounts.payment_method;
      if (currentPaymentMethod && !paymentMethods.includes(currentPaymentMethod)) {
        setPaymentMethods(prev => [...prev, currentPaymentMethod]);
      }
    }
  }, [receipt, paymentMethods]);

  const handleMerchantChange = (field: 'name' | 'address', value: string) => {
    setReceipt({
      ...receipt,
      merchant_details: {
        ...receipt.merchant_details,
        [field]: value,
      },
    });
  };

  const handleDateChange = (value: string) => {
    setReceipt({ ...receipt, purchase_date: value });
  };

  const handlePaymentChange = (value: string) => {
    setReceipt({
      ...receipt,
      total_amounts: {
        ...receipt.total_amounts,
        payment_method: value,
      },
    });
  };

  const handleLineItemChange = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const newLineItems = [...receipt.line_items];
    newLineItems[index] = {
      ...newLineItems[index],
      [field]: value,
    };

    // Recalculate price if quantity or unit_price changes
    if (field === 'quantity' || field === 'unit_price') {
      const item = newLineItems[index];
      item.price = item.quantity * item.unit_price;
    }

    setReceipt({ ...receipt, line_items: newLineItems });
  };

  const addLineItem = () => {
    setReceipt({
      ...receipt,
      line_items: [
        ...receipt.line_items,
        {
          item_name: '',
          unit_price: 0,
          quantity: 1,
          price: 0,
          category: 'Other',
        },
      ],
    });
  };

  const removeLineItem = (index: number) => {
    if (receipt.line_items.length <= 1) {
      toast.error('Receipt must have at least one item');
      return;
    }
    const newLineItems = receipt.line_items.filter((_, i) => i !== index);
    setReceipt({ ...receipt, line_items: newLineItems });
  };

  const calculateTotal = () => {
    return receipt.line_items.reduce((sum, item) => sum + item.price, 0);
  };

  const handleSave = async (forceSave: boolean = false) => {
    // Validate
    if (!receipt.merchant_details.name) {
      toast.error('Merchant name is required');
      return;
    }

    if (receipt.line_items.some((item) => !item.item_name)) {
      toast.error('All items must have a name');
      return;
    }

    setSaving(true);
    try {
      const response = await receiptApi.confirm(uploadData.receipt_id, receipt, forceSave);

      // Check if duplicates were detected
      if (response.duplicate_detected && !forceSave) {
        setDuplicates(response.duplicates);
        setShowDuplicateWarning(true);
        setSaving(false);
        return;
      }

      toast.success('Receipt saved successfully!');
      onSaveSuccess();
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.detail || 'Failed to save receipt');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAnyway = () => {
    setShowDuplicateWarning(false);
    handleSave(true);
  };

  const handleCancelDuplicate = () => {
    setShowDuplicateWarning(false);
    setDuplicates([]);
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loadingImages, setLoadingImages] = useState(true);
  const [isTextInput, setIsTextInput] = useState(false);
  const [originalText, setOriginalText] = useState<string | null>(null);

  useEffect(() => {
    // Fetch receipt metadata to check if it's a text input
    const fetchReceiptMetadata = async () => {
      try {
        const url = `${apiUrl}/receipts/${uploadData.receipt_id}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data.source === 'text_input' && data.original_text) {
            setIsTextInput(true);
            setOriginalText(data.original_text);
            setLoadingImages(false);
            return;
          }
        }
      } catch (error) {
        console.error('❌ Error fetching receipt metadata:', error);
      }

      // If not text input, fetch images
      fetchImages();
    };

    const fetchImages = async () => {
      setLoadingImages(true);
      try {
        const url = `${apiUrl}/receipts/${uploadData.receipt_id}/images`;
        console.log('🔍 Fetching images from:', url);
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('📸 Fetched images data:', data);

        if (data.images && data.images.length > 0) {
          const fullUrls = data.images.map((path: string) => {
            // Path already contains /api, so use base URL only
            const baseUrl = apiUrl.replace('/api', '');
            const fullUrl = `${baseUrl}${path}`;
            console.log('🖼️ Image URL:', fullUrl);
            return fullUrl;
          });
          console.log('✅ Setting image URLs:', fullUrls);
          setImageUrls(fullUrls);
        } else {
          // Fallback to single image
          const fallbackUrl = `${apiUrl}/receipts/${uploadData.receipt_id}/image`;
          console.log('⚠️ No images found, using fallback:', fallbackUrl);
          setImageUrls([fallbackUrl]);
        }
      } catch (error) {
        console.error('❌ Error fetching images:', error);
        // Fallback to single image
        const fallbackUrl = `${apiUrl}/receipts/${uploadData.receipt_id}/image`;
        console.log('⚠️ Error occurred, using fallback:', fallbackUrl);
        setImageUrls([fallbackUrl]);
      } finally {
        setLoadingImages(false);
      }
    };

    fetchReceiptMetadata();
  }, [uploadData.receipt_id, apiUrl]);

  return (
    <>
      {/* Duplicate Warning Modal */}
      {showDuplicateWarning && (
        <DuplicateWarning
          duplicates={duplicates}
          currentReceipt={{
            merchant: receipt.merchant_details.name,
            date: receipt.purchase_date,
            total: receipt.total_amounts.total
          }}
          onSaveAnyway={handleSaveAnyway}
          onCancel={handleCancelDuplicate}
        />
      )}

      <div className="space-y-6 relative z-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-black">
          <h2 className="text-2xl font-bold mb-2">Review & Confirm Receipt</h2>
          <p className="text-gray-900">
          Please review the extracted data and make any necessary corrections
        </p>
      </div>

      {/* Performance Metrics */}
      <ExtractionPerformance extractionLog={uploadData.extraction_log} />

      {/* Split Screen: Receipt Image & Extracted Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Receipt Images or Text Input */}
        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-6 self-start">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              {isTextInput ? '✍️ Original Text' : `📄 Receipt Images ${imageUrls.length > 1 ? `(${currentImageIndex + 1}/${imageUrls.length})` : ''}`}
            </h3>
            {!isTextInput && imageUrls.length > 1 && (
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentImageIndex === 0}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Previous image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentImageIndex(prev => Math.min(imageUrls.length - 1, prev + 1))}
                  disabled={currentImageIndex === imageUrls.length - 1}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Next image"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {loadingImages ? (
            <div className="border-2 border-gray-200 rounded-lg p-12">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="ml-4 text-gray-600">Loading...</p>
              </div>
            </div>
          ) : isTextInput && originalText ? (
            <div className="border-2 border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-purple-50">
              <div className="mb-2 text-xs text-gray-500 uppercase tracking-wide font-semibold">
                Your Input
              </div>
              <div className="text-gray-800 text-lg font-medium leading-relaxed">
                "{originalText}"
              </div>
            </div>
          ) : imageUrls.length > 0 ? (
            <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
              <ReceiptImageDisplay imageUrl={imageUrls[currentImageIndex]} />
            </div>
          ) : (
            <div className="border-2 border-gray-200 rounded-lg p-12 text-center text-gray-500">
              No images available
            </div>
          )}

          {/* Thumbnail navigation for multiple images */}
          {imageUrls.length > 1 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Click to switch images:</p>
              <div className="flex space-x-2 overflow-x-auto pb-2">
                {imageUrls.map((url, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      console.log('👆 Switching to image', index, url);
                      setCurrentImageIndex(index);
                    }}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all ${
                      currentImageIndex === index ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300 hover:border-gray-400'
                    }`}
                    title={`Image ${index + 1}`}
                  >
                    <img
                      src={url}
                      alt={`Receipt ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        console.error('❌ Thumbnail failed to load:', url);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                      onLoad={() => console.log('✅ Thumbnail loaded:', index)}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Extracted Data Form */}
        <div className="space-y-6">
          {/* Merchant Details */}
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          🏪 Merchant Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Merchant Name *
            </label>
            <input
              type="text"
              value={receipt.merchant_details.name}
              onChange={(e) => handleMerchantChange('name', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={receipt.merchant_details.address}
              onChange={(e) => handleMerchantChange('address', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Date (DD-MM-YYYY)
            </label>
            <input
              type="text"
              value={receipt.purchase_date}
              onChange={(e) => handleDateChange(e.target.value)}
              placeholder="DD-MM-YYYY"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Method
            </label>
            <select
              value={receipt.total_amounts.payment_method || 'Cash'}
              onChange={(e) => handlePaymentChange(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                🛒 Line Items ({receipt.line_items.length})
              </h3>
              <button
                onClick={addLineItem}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium text-gray-700"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-3">
              {receipt.line_items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div className="col-span-12 md:col-span-4">
                    <input
                      type="text"
                      value={item.item_name}
                      onChange={(e) =>
                        handleLineItemChange(index, 'item_name', e.target.value)
                      }
                      placeholder="Item name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <select
                      value={item.category}
                      onChange={(e) =>
                        handleLineItemChange(index, 'category', e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700"
                    >
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleLineItemChange(index, 'quantity', parseFloat(e.target.value))
                      }
                      step="0.01"
                      placeholder="Qty"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 tabular-nums"
                    />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <input
                      type="number"
                      value={item.unit_price}
                      onChange={(e) =>
                        handleLineItemChange(index, 'unit_price', parseFloat(e.target.value))
                      }
                      step="0.01"
                      placeholder="Unit $"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 tabular-nums"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1 flex items-center justify-end pr-2">
                    <span className="text-sm font-semibold text-gray-700 tabular-nums">
                      ${item.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="col-span-2 md:col-span-1 flex items-center justify-center">
                    <button
                      onClick={() => removeLineItem(index)}
                      className="text-red-600 hover:text-red-800 transition"
                      title="Remove item"
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
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="space-y-3 min-w-[280px]">
                  <div className="flex justify-between items-center text-gray-700">
                    <span className="text-sm">Subtotal:</span>
                    <span className="font-semibold text-base tabular-nums">${calculateTotal().toFixed(2)}</span>
                  </div>
                  {receipt.total_amounts.tax && (
                    <div className="flex justify-between items-center text-gray-700">
                      <span className="text-sm">Tax:</span>
                      <span className="font-semibold text-base tabular-nums">
                        ${receipt.total_amounts.tax.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-lg font-bold text-gray-900 border-t pt-3">
                    <span>Total:</span>
                    <span className="tabular-nums">${receipt.total_amounts.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span>✅ Confirm & Save</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
