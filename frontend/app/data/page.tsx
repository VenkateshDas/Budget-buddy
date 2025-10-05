'use client';

import { useState, useEffect } from 'react';
import { sheetsApi } from '@/lib/api';
import EditableTable from '@/components/EditableTable';
import toast from 'react-hot-toast';

interface Sheet {
  title: string;
  id: number;
  row_count: number;
  col_count: number;
}

interface SheetData {
  sheet_name: string;
  headers: string[];
  rows: Array<{
    row_number: number;
    values: string[];
  }>;
  row_count: number;
}

export default function DataPage() {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [sheetData, setSheetData] = useState<SheetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  // Load list of sheets
  useEffect(() => {
    loadSheets();
  }, []);

  // Load data when active sheet changes
  useEffect(() => {
    if (activeSheet) {
      loadSheetData(activeSheet);
    }
  }, [activeSheet]);

  const loadSheets = async () => {
    try {
      setLoading(true);
      const data = await sheetsApi.listSheets();
      setSheets(data.sheets);

      // Set first sheet as active if available
      if (data.sheets && data.sheets.length > 0) {
        setActiveSheet(data.sheets[0].title);
      }
    } catch (error) {
      console.error('Failed to load sheets:', error);
      toast.error('Failed to load sheets');
    } finally {
      setLoading(false);
    }
  };

  const loadSheetData = async (sheetName: string) => {
    try {
      setLoadingData(true);
      const data = await sheetsApi.getSheetData(sheetName);
      setSheetData(data);
    } catch (error) {
      console.error(`Failed to load sheet ${sheetName}:`, error);
      toast.error(`Failed to load sheet data`);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCellUpdate = async (rowNumber: number, colIndex: number, value: string) => {
    if (!activeSheet || !sheetData) return;

    try {
      // Column index is 0-based in our array, but API expects 1-based
      // Also need to add 1 because first column is A (col 1), not 0
      const apiColIndex = colIndex + 1;

      await sheetsApi.updateCell(activeSheet, rowNumber, apiColIndex, value);

      // Update local state
      setSheetData(prev => {
        if (!prev) return null;
        const newRows = prev.rows.map(row => {
          if (row.row_number === rowNumber) {
            const newValues = [...row.values];
            newValues[colIndex] = value;
            return { ...row, values: newValues };
          }
          return row;
        });
        return { ...prev, rows: newRows };
      });

      toast.success('Cell updated successfully');
    } catch (error) {
      console.error('Failed to update cell:', error);
      toast.error('Failed to update cell');
    }
  };

  const handleRowDelete = async (rowNumber: number) => {
    if (!activeSheet) return;

    if (!confirm('Are you sure you want to delete this row? This cannot be undone.')) {
      return;
    }

    try {
      await sheetsApi.deleteRow(activeSheet, rowNumber);

      // Reload sheet data
      await loadSheetData(activeSheet);

      toast.success('Row deleted successfully');
    } catch (error) {
      console.error('Failed to delete row:', error);
      toast.error('Failed to delete row');
    }
  };

  const handleRowAdd = async (values: string[]) => {
    if (!activeSheet) return;

    try {
      await sheetsApi.addRow(activeSheet, values);

      // Reload sheet data
      await loadSheetData(activeSheet);

      toast.success('Row added successfully');
    } catch (error) {
      console.error('Failed to add row:', error);
      toast.error('Failed to add row');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">📊 Data Manager</h1>
          <p className="text-green-100">Loading sheets...</p>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading spreadsheet data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">📊 Data Manager</h1>
          <p className="text-green-100">View and edit your Google Sheets data</p>
        </div>
        <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-200">
          <div className="text-center">
            <div className="text-6xl mb-4">📄</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Sheets Found</h2>
            <p className="text-gray-600">No sheets available in the spreadsheet.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">📊 Data Manager</h1>
        <p className="text-green-100">View and edit your Google Sheets data</p>
      </div>

      {/* Sheet Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 overflow-x-auto">
          <div className="flex">
            {sheets.map((sheet) => (
              <button
                key={sheet.id}
                onClick={() => setActiveSheet(sheet.title)}
                className={`px-6 py-4 font-medium text-sm whitespace-nowrap transition ${
                  activeSheet === sheet.title
                    ? 'border-b-2 border-green-600 text-green-600 bg-green-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {sheet.title}
                <span className="ml-2 text-xs text-gray-500">
                  ({sheet.row_count - 1} rows)
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Sheet Data */}
        <div className="p-6">
          {loadingData ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading {activeSheet}...</p>
            </div>
          ) : sheetData ? (
            <EditableTable
              sheetName={sheetData.sheet_name}
              headers={sheetData.headers}
              rows={sheetData.rows}
              onCellUpdate={handleCellUpdate}
              onRowDelete={handleRowDelete}
              onRowAdd={handleRowAdd}
            />
          ) : (
            <div className="text-center py-12 text-gray-500">
              No data to display
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
