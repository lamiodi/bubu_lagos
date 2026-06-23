import { AdminLayout } from '../components/AdminLayout';
import { useState, useEffect } from 'react';
import { Save, Store, Mail, Phone, MapPin, DollarSign, Truck, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';

export function AdminSettings() {
  const [settings, setSettings] = useState({
    store_name: '',
    store_email: '',
    store_phone: '',
    store_address: '',
    currency: 'NGN',
    shipping_fee: '0'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const toast = useToast();
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/settings');
      setSettings(prev => ({ ...prev, ...response }));
      setIsDirty(false);
    } catch (err) {
      logger.error('Failed to fetch settings:', err);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put('/settings', {
        storeName: settings.store_name,
        storeEmail: settings.store_email,
        storePhone: settings.store_phone,
        storeAddress: settings.store_address,
        currency: settings.currency,
        shippingFee: settings.shipping_fee
      });
      toast.success('Settings saved successfully');
      setIsDirty(false);
    } catch (err) {
      logger.error('Failed to save settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // [FIX #23] Block navigation if there are unsaved changes.
  useEffect(() => {
    if (!isDirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center text-gray-500">Loading settings...</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">The House</h1>
          <p className="text-gray-500">Atelier details, currency, and shipping preferences.</p>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
              Unsaved changes
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Store size={20} /> Store Information
            </h2>
            <p className="text-sm text-gray-500 mt-1">Basic information about your store</p>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store Name</label>
              <input
                type="text"
                value={settings.store_name || ''}
                onChange={(e) => handleChange('store_name', e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                placeholder="Bubu Lagos"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Mail size={14} /> Email Address
                </label>
                <input
                  type="email"
                  value={settings.store_email || ''}
                  onChange={(e) => handleChange('store_email', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                  placeholder="hello@bubulagos.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Phone size={14} /> Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.store_phone || ''}
                  onChange={(e) => handleChange('store_phone', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                  placeholder="+234 123 456 7890"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <MapPin size={14} /> Atelier Address
              </label>
              <textarea
                value={settings.store_address || ''}
                onChange={(e) => handleChange('store_address', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black resize-none"
                placeholder="Lagos, Nigeria"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign size={20} /> Currency & Pricing
            </h2>
            <p className="text-sm text-gray-500 mt-1">Configure currency and pricing settings</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={settings.currency || 'NGN'}
                  onChange={(e) => handleChange('currency', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black bg-white"
                >
                  <option value="NGN">Nigerian Naira (NGN)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="GBP">British Pound (GBP)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Truck size={14} /> Shipping Fee
                </label>
                <input
                  type="number"
                  value={settings.shipping_fee || '0'}
                  onChange={(e) => handleChange('shipping_fee', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-medium text-amber-800">Important Note</h3>
            <p className="text-sm text-amber-700 mt-1">
              Changes here affect how the boutique appears to clients and how orders are processed. Review carefully before saving.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
