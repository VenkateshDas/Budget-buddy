'use client';

interface DuplicateReceipt {
  Date: string;
  Merchant: string;
  Item: string;
  Category: string;
  'Total Price': number | string;
  'Grand Total': number | string;
  Payment: string;
}

interface DuplicateWarningProps {
  duplicates: DuplicateReceipt[];
  currentReceipt: {
    merchant: string;
    date: string;
    total: number;
  };
  onSaveAnyway: () => void;
  onCancel: () => void;
}

export default function DuplicateWarning({
  duplicates,
  currentReceipt,
  onSaveAnyway,
  onCancel
}: DuplicateWarningProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-yellow-50 border-b-4 border-yellow-400 p-6">
          <div className="flex items-start space-x-4">
            <div className="text-5xl">⚠️</div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Potential Duplicate Receipt Detected
              </h2>
              <p className="text-gray-700">
                We found {duplicates.length} similar receipt{duplicates.length > 1 ? 's' : ''} in your records.
                Please review below to avoid duplicate entries.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Current Receipt */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-2xl mr-2">📄</span>
              Receipt You're Trying to Save
            </h3>
            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Merchant</p>
                  <p className="font-semibold text-gray-900">{currentReceipt.merchant}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold text-gray-900">{currentReceipt.date}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="font-semibold text-gray-900">${currentReceipt.total.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Existing Duplicates */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <span className="text-2xl mr-2">📋</span>
              Similar Receipt{duplicates.length > 1 ? 's' : ''} Already Saved
            </h3>
            <div className="space-y-3">
              {duplicates.map((dup, index) => (
                <div
                  key={index}
                  className="bg-red-50 border-2 border-red-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-red-700">
                      Duplicate #{index + 1}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-600">Merchant</p>
                      <p className="font-medium text-gray-900">{dup.Merchant}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Date</p>
                      <p className="font-medium text-gray-900">{dup.Date}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Item</p>
                      <p className="font-medium text-gray-900">{dup.Item}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Total</p>
                      <p className="font-medium text-gray-900">
                        ${typeof dup['Grand Total'] === 'number'
                          ? dup['Grand Total'].toFixed(2)
                          : dup['Grand Total']}
                      </p>
                    </div>
                    {dup.Category && (
                      <div>
                        <p className="text-gray-600">Category</p>
                        <p className="font-medium text-gray-900">{dup.Category}</p>
                      </div>
                    )}
                    {dup.Payment && (
                      <div>
                        <p className="text-gray-600">Payment</p>
                        <p className="font-medium text-gray-900">{dup.Payment}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-gray-50 border-l-4 border-gray-400 p-4 rounded">
            <p className="text-sm text-gray-700">
              <strong>Note:</strong> If this is genuinely a different purchase, you can still save it.
              However, if it's the same receipt, saving it again will create a duplicate entry in your records.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t bg-gray-50 p-6">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={onSaveAnyway}
              className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition font-medium flex items-center justify-center"
            >
              <span className="mr-2">⚠️</span>
              Save Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
