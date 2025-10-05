'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { userApi } from '@/lib/api';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
}

const EMOJI_OPTIONS = ['📦', '🍔', '🚗', '🏠', '💊', '🎮', '👕', '💰', '✈️', '🎬', '📱', '🛒', '☕', '🍕', '🏋️'];
const COLOR_OPTIONS = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

export default function CategoryManager() {
  const { session } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '📦',
    color: '#6366f1',
  });

  useEffect(() => {
    if (session) {
      fetchCategories();
    }
  }, [session]);

  const fetchCategories = async () => {
    try {
      if (!session) {
        toast.error('Please sign in to manage categories');
        setLoading(false);
        return;
      }
      // Fetch ALL categories (active + inactive)
      const response = await userApi.getCategories(true);
      console.log('Fetched all categories:', response.categories);
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (categoryId: string) => {
    try {
      const updated = await userApi.toggleCategory(categoryId);
      setCategories(cats =>
        cats.map(c => (c.id === categoryId ? { ...c, is_active: updated.is_active } : c))
      );
      toast.success(updated.is_active ? 'Category enabled' : 'Category disabled');
    } catch (error) {
      console.error('Failed to toggle category:', error);
      toast.error('Failed to toggle category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Category name is required');
      return;
    }

    try {
      if (editingId) {
        // Update existing category
        const updated = await userApi.updateCategory(editingId, formData);
        setCategories(cats =>
          cats.map(c => (c.id === editingId ? updated : c))
        );
        toast.success('Category updated');
      } else {
        // Create new category (custom, not default)
        const created = await userApi.createCategory(formData);
        setCategories([...categories, created]);
        toast.success('Category created');
      }

      resetForm();
    } catch (error) {
      console.error('Failed to save category:', error);
      toast.error('Failed to save category');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (categoryId: string, isDefault: boolean) => {
    if (isDefault) {
      toast.error('Cannot delete default categories. You can disable them instead.');
      return;
    }

    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await userApi.deleteCategory(categoryId);
      setCategories(cats => cats.filter(c => c.id !== categoryId));
      toast.success('Category deleted');
    } catch (error) {
      console.error('Failed to delete category:', error);
      toast.error('Failed to delete category');
    }
  };

  const resetForm = () => {
    setFormData({ name: '', icon: '📦', color: '#6366f1' });
    setEditingId(null);
    setShowAddForm(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Separate default and custom categories
  const defaultCategories = categories.filter(c => c.is_default);
  const customCategories = categories.filter(c => !c.is_default);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Manage Categories</h2>
          <p className="text-sm text-gray-600 mt-1">
            Toggle default categories on/off, or create your own custom categories
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowAddForm(!showAddForm);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {showAddForm ? 'Cancel' : '+ Add Custom Category'}
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md space-y-4 border border-gray-200">
          <h3 className="font-semibold text-lg text-gray-900">
            {editingId ? 'Edit Category' : 'Add Custom Category'}
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700"
              placeholder="e.g., Coffee Shops"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Icon
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`w-12 h-12 text-2xl rounded-lg border-2 transition ${
                    formData.icon === emoji
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-12 h-12 rounded-lg border-2 transition ${
                    formData.color === color
                      ? 'border-gray-900 ring-2 ring-gray-300'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              {editingId ? 'Update Category' : 'Add Category'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      {/* Default Categories Section */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Default Categories</h3>
          <p className="text-sm text-gray-600">Toggle these on/off based on your needs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {defaultCategories.map((category) => (
            <div
              key={category.id}
              className={`bg-white p-4 rounded-lg shadow-sm border-2 transition ${
                category.is_active ? 'border-gray-200' : 'border-gray-100 opacity-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                    style={{ backgroundColor: category.color + '20' }}
                  >
                    {category.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <div
                      className="w-16 h-2 rounded-full mt-1"
                      style={{ backgroundColor: category.color }}
                    />
                  </div>
                </div>

                {/* Toggle Switch */}
                <button
                  onClick={() => handleToggle(category.id)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    category.is_active ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label={`Toggle ${category.name}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      category.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Categories Section */}
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h3 className="text-lg font-semibold text-gray-900">Custom Categories</h3>
          <p className="text-sm text-gray-600">Categories you've created</p>
        </div>

        {customCategories.length === 0 ? (
          <div className="bg-gray-50 rounded-lg p-8 text-center border border-gray-200">
            <p className="text-gray-600">No custom categories yet. Create your first one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {customCategories.map((category) => (
              <div
                key={category.id}
                className={`bg-white p-4 rounded-lg shadow-sm border-2 transition ${
                  category.is_active ? 'border-gray-200' : 'border-gray-100 opacity-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3 flex-1">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: category.color + '20' }}
                    >
                      {category.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{category.name}</h3>
                      <div
                        className="w-16 h-2 rounded-full mt-1"
                        style={{ backgroundColor: category.color }}
                      />
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => handleToggle(category.id)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      category.is_active ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    aria-label={`Toggle ${category.name}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        category.is_active ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => handleEdit(category)}
                    className="flex-1 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(category.id, category.is_default)}
                    className="flex-1 px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
