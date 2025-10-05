'use client';

import { useState } from 'react';

interface Row {
  row_number: number;
  values: string[];
}

interface EditableTableProps {
  sheetName: string;
  headers: string[];
  rows: Row[];
  onCellUpdate: (rowNumber: number, colIndex: number, value: string) => Promise<void>;
  onRowDelete: (rowNumber: number) => Promise<void>;
  onRowAdd: (values: string[]) => Promise<void>;
}

interface EditingCell {
  rowNumber: number;
  colIndex: number;
}

export default function EditableTable({
  sheetName,
  headers,
  rows,
  onCellUpdate,
  onRowDelete,
  onRowAdd,
}: EditableTableProps) {
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showAddRow, setShowAddRow] = useState(false);
  const [newRowValues, setNewRowValues] = useState<string[]>([]);

  const handleCellClick = (rowNumber: number, colIndex: number, currentValue: string) => {
    setEditingCell({ rowNumber, colIndex });
    setEditValue(currentValue);
  };

  const handleCellBlur = async () => {
    if (editingCell) {
      const row = rows.find(r => r.row_number === editingCell.rowNumber);
      const currentValue = row?.values[editingCell.colIndex] || '';

      // Only update if value changed
      if (editValue !== currentValue) {
        await onCellUpdate(editingCell.rowNumber, editingCell.colIndex, editValue);
      }
    }
    setEditingCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCellBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleAddRowClick = () => {
    setNewRowValues(headers.map(() => ''));
    setShowAddRow(true);
  };

  const handleAddRowSubmit = async () => {
    await onRowAdd(newRowValues);
    setShowAddRow(false);
    setNewRowValues([]);
  };

  const handleAddRowCancel = () => {
    setShowAddRow(false);
    setNewRowValues([]);
  };

  if (rows.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">📭</div>
        <p className="text-gray-600 mb-4">No data in this sheet yet</p>
        <button
          onClick={handleAddRowClick}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          + Add First Row
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Action buttons */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {rows.length} row{rows.length !== 1 ? 's' : ''} in {sheetName}
        </p>
        <button
          onClick={handleAddRowClick}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
        >
          + Add Row
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full border-collapse bg-white">
          <thead>
            <tr className="bg-gray-50 border-b-2 border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase sticky left-0 bg-gray-50 z-10 border-r border-gray-200">
                #
              </th>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase sticky right-0 bg-gray-50 z-10 border-l border-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((row, rowIdx) => (
              <tr key={row.row_number} className="hover:bg-gray-50 transition">
                <td className="px-4 py-2 text-sm text-gray-500 sticky left-0 bg-white group-hover:bg-gray-50 border-r border-gray-200">
                  {rowIdx + 1}
                </td>
                {row.values.map((value, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-4 py-2 text-sm text-gray-900 cursor-pointer hover:bg-blue-50 relative group"
                    onClick={() => handleCellClick(row.row_number, colIdx, value)}
                  >
                    {editingCell?.rowNumber === row.row_number &&
                    editingCell?.colIndex === colIdx ? (
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleCellBlur}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="min-h-[24px] flex items-center">
                        {value || <span className="text-gray-400 italic">empty</span>}
                        <span className="ml-2 opacity-0 group-hover:opacity-100 text-xs text-blue-600">
                          ✎
                        </span>
                      </div>
                    )}
                  </td>
                ))}
                <td className="px-4 py-2 text-center sticky right-0 bg-white group-hover:bg-gray-50 border-l border-gray-200">
                  <button
                    onClick={() => onRowDelete(row.row_number)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition"
                    title="Delete row"
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Row Modal */}
      {showAddRow && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-auto shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Row to {sheetName}</h3>
            <div className="space-y-4">
              {headers.map((header, index) => (
                <div key={index}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {header}
                  </label>
                  <input
                    type="text"
                    value={newRowValues[index] || ''}
                    onChange={(e) => {
                      const newValues = [...newRowValues];
                      newValues[index] = e.target.value;
                      setNewRowValues(newValues);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-700"
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleAddRowCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddRowSubmit}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Add Row
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage hints */}
      <div className="text-xs text-gray-500 mt-4 p-3 bg-blue-50 rounded-lg">
        <p className="font-semibold mb-1">💡 Tips:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Click any cell to edit its value</li>
          <li>Press Enter to save changes or Esc to cancel</li>
          <li>Click the trash icon to delete a row</li>
          <li>Changes are saved immediately to Google Sheets</li>
        </ul>
      </div>
    </div>
  );
}
