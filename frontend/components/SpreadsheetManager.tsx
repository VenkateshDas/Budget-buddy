'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface Spreadsheet {
  id: string;
  google_sheet_id: string;
  google_sheet_name: string;
  display_name: string;
  is_active: boolean;
  created_at: string;
}

export default function SpreadsheetManager() {
  const { session, user } = useAuth();
  const [spreadsheets, setSpreadsheets] = useState<Spreadsheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSpreadsheet, setNewSpreadsheet] = useState({
    google_sheet_id: '',
    google_sheet_name: '',
    display_name: '',
  });

  useEffect(() => {
    if (session) {
      fetchSpreadsheets();
    }
  }, [session]);

  const getAuthToken = () => {
    return session?.access_token || '';
  };

  const fetchSpreadsheets = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        toast.error('Please sign in to manage spreadsheets');
        setLoading(false);
        return;
      }
      const response = await api.get('/users/spreadsheets', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSpreadsheets(response.data.spreadsheets || []);
    } catch (error) {
      console.error('Failed to fetch spreadsheets:', error);
      toast.error('Failed to load spreadsheets');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSpreadsheet = async (sheetId: string) => {
    try {
      const token = getAuthToken();
      await api.put(`/users/spreadsheets/${sheetId}/activate`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update local state
      setSpreadsheets(sheets =>
        sheets.map(s => ({ ...s, is_active: s.id === sheetId }))
      );

      toast.success('Active spreadsheet updated');
    } catch (error) {
      console.error('Failed to activate spreadsheet:', error);
      toast.error('Failed to activate spreadsheet');
    }
  };

  const handleAddSpreadsheet = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newSpreadsheet.google_sheet_id || !newSpreadsheet.display_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const token = getAuthToken();
      const response = await api.post('/users/spreadsheets', newSpreadsheet, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSpreadsheets([...spreadsheets, response.data]);
      setNewSpreadsheet({ google_sheet_id: '', google_sheet_name: '', display_name: '' });
      setShowAddForm(false);
      toast.success('Spreadsheet added successfully');
    } catch (error) {
      console.error('Failed to add spreadsheet:', error);
      toast.error('Failed to add spreadsheet');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">My Spreadsheets</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showAddForm ? 'Cancel' : '+ Add Spreadsheet'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSpreadsheet} className="bg-white p-6 rounded-lg shadow-md space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Display Name *
            </label>
            <input
              type="text"
              value={newSpreadsheet.display_name}
              onChange={(e) => setNewSpreadsheet({ ...newSpreadsheet, display_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700"
              placeholder="My Budget 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Google Sheet ID *
            </label>
            <input
              type="text"
              value={newSpreadsheet.google_sheet_id}
              onChange={(e) => setNewSpreadsheet({ ...newSpreadsheet, google_sheet_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            />
            <p className="text-xs text-gray-500 mt-1">
              Found in the URL: docs.google.com/spreadsheets/d/[SHEET_ID]/edit
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sheet Name (optional)
            </label>
            <input
              type="text"
              value={newSpreadsheet.google_sheet_name}
              onChange={(e) => setNewSpreadsheet({ ...newSpreadsheet, google_sheet_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700"
              placeholder="Receipts"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Add Spreadsheet
          </button>
        </form>
      )}

      {spreadsheets.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-600">No spreadsheets yet. Add your first one to get started!</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {spreadsheets.map((sheet) => (
            <div
              key={sheet.id}
              className={`bg-white p-4 rounded-lg shadow-md border-2 transition ${
                sheet.is_active ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{sheet.display_name}</h3>
                    {sheet.is_active && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">Sheet ID: {sheet.google_sheet_id}</p>
                  {sheet.google_sheet_name && (
                    <p className="text-sm text-gray-500">Tab: {sheet.google_sheet_name}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    Added {new Date(sheet.created_at).toLocaleDateString()}
                  </p>
                </div>

                {!sheet.is_active && (
                  <button
                    onClick={() => handleActivateSpreadsheet(sheet.id)}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Set Active
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
