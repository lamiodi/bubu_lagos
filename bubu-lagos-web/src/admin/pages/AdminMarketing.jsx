import { useState, useEffect } from 'react';
import { AdminLayout } from '../components/AdminLayout';
import {
  Plus,
  CheckCircle2,
  XCircle,
  History,
  Copy,
  Inbox
} from 'lucide-react';
import { cn, formatNGN, formatDate } from '../../lib/utils';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { Modal } from '../../components/Modal';
import { TableEmptyState } from '../../components/Skeleton';

export function AdminMarketing() {
  const [activeTab, setActiveTab] = useState('coupons');
  const [coupons, setCoupons] = useState([]);
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [showGiftCardModal, setShowGiftCardModal] = useState(false);
  const [selectedGC, setSelectedGC] = useState(null);
  const [gcLogs, setGcLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [issuedCode, setIssuedCode] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const toast = useToast();

  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'Percentage',
    value: '',
    minOrderAmount: '',
    maxDiscountAmount: '',
    usageLimit: '',
    isUnlimited: true,
    expiryDate: ''
  });

  const [newGiftCard, setNewGiftCard] = useState({
    balance: '',
    expiryMonths: 12,
    customerId: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'coupons') {
        const data = await api.get('/coupons/admin/all');
        setCoupons(data || []);
      } else {
        const data = await api.get('/gift-cards/admin/all');
        setGiftCards(data || []);
      }
    } catch (error) {
      logger.error('Fetch error:', error);
      toast.error('Failed to load marketing data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    try {
      await api.post('/coupons/admin/create', {
        ...newCoupon,
        usageLimit: newCoupon.isUnlimited ? null : Number(newCoupon.usageLimit),
      });
      toast.success('Coupon created successfully');
      setShowCouponModal(false);
      fetchData();
      setNewCoupon({
        code: '', type: 'Percentage', value: '',
        minOrderAmount: '', maxDiscountAmount: '',
        usageLimit: '', isUnlimited: true, expiryDate: ''
      });
    } catch (error) {
      toast.error(error.message || 'Failed to create coupon');
    }
  };

  // [FIX #9] Show the code inline via a success modal — no more window.prompt().
  const handleCreateGiftCard = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/gift-cards/admin/create', newGiftCard);
      setIssuedCode(response);
      setShowGiftCardModal(false);
      setShowCodeModal(true);
      fetchData();
      setNewGiftCard({ balance: '', expiryMonths: 12, customerId: '' });
    } catch (error) {
      toast.error(error.message || 'Failed to create gift card');
    }
  };

  const fetchLogs = async (gcId) => {
    setLoadingLogs(true);
    setSelectedGC(gcId);
    try {
      const data = await api.get(`/gift-cards/admin/logs/${gcId}`);
      setGcLogs(data || []);
    } catch (error) {
      toast.error('Failed to load transaction logs');
    } finally {
      setLoadingLogs(false);
    }
  };

  const copyCode = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Code copied to clipboard');
    } catch {
      toast.error('Copy failed — please select and copy manually.');
    }
  };

  return (
    <AdminLayout>
      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {[
          { id: 'coupons', label: 'Coupons' },
          { id: 'giftCards', label: 'Gift Cards' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-5 py-2.5 text-sm font-bold uppercase tracking-widest transition-colors -mb-px border-b-2 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none",
              activeTab === tab.id
                ? "border-black text-black"
                : "border-transparent text-gray-500 hover:text-black"
            )}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {activeTab === 'coupons' ? 'Coupons' : 'Gift Cards'}
        </h1>
        <button
          onClick={() => (activeTab === 'coupons' ? setShowCouponModal(true) : setShowGiftCardModal(true))}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
        >
          <Plus size={16} />
          {activeTab === 'coupons' ? 'New Coupon' : 'New Gift Card'}
        </button>
      </div>

      {activeTab === 'coupons' ? (
        <CouponsTable coupons={coupons} loading={loading} />
      ) : (
        <GiftCardsTable
          giftCards={giftCards}
          loading={loading}
          onViewLogs={fetchLogs}
        />
      )}

      {/* Logs panel */}
      {selectedGC && (
        <div className="mt-6 bg-white border border-gray-100 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <History size={16} />
            <h2 className="font-bold">Transaction Logs</h2>
          </div>
          {loadingLogs ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : gcLogs.length === 0 ? (
            <p className="text-sm text-gray-500">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm">
              {gcLogs.map((log) => (
                <li key={log.id} className="py-3 flex justify-between">
                  <span>{log.description}</span>
                  <span className={log.amount > 0 ? 'text-red-600' : 'text-green-600'}>
                    {log.amount > 0 ? '-' : '+'}{formatNGN(Math.abs(log.amount))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* New Coupon Modal */}
      <Modal
        open={showCouponModal}
        onClose={() => setShowCouponModal(false)}
        title="Create Coupon"
        size="lg"
      >
        <form onSubmit={handleCreateCoupon} className="space-y-4">
          <div>
            <label htmlFor="cpn-code" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Code</label>
            <input id="cpn-code" type="text" required value={newCoupon.code}
              onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cpn-type" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Type</label>
              <select id="cpn-type" value={newCoupon.type} onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black">
                <option>Percentage</option>
                <option>Fixed</option>
              </select>
            </div>
            <div>
              <label htmlFor="cpn-value" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Value</label>
              <input id="cpn-value" type="number" required value={newCoupon.value}
                onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="cpn-min" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Min Order</label>
              <input id="cpn-min" type="number" value={newCoupon.minOrderAmount}
                onChange={(e) => setNewCoupon({ ...newCoupon, minOrderAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black" />
            </div>
            <div>
              <label htmlFor="cpn-max" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Max Discount</label>
              <input id="cpn-max" type="number" value={newCoupon.maxDiscountAmount}
                onChange={(e) => setNewCoupon({ ...newCoupon, maxDiscountAmount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Usage Limit</label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={newCoupon.isUnlimited}
                  onChange={(e) => setNewCoupon({ ...newCoupon, isUnlimited: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-accent"
                />
                Unlimited
              </label>
              <input
                type="number"
                disabled={newCoupon.isUnlimited}
                value={newCoupon.usageLimit}
                onChange={(e) => setNewCoupon({ ...newCoupon, usageLimit: e.target.value })}
                placeholder="Limit"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black disabled:opacity-50"
              />
            </div>
          </div>
          <div>
            <label htmlFor="cpn-exp" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Expiry</label>
            <input id="cpn-exp" type="date" value={newCoupon.expiryDate}
              onChange={(e) => setNewCoupon({ ...newCoupon, expiryDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowCouponModal(false)} className="px-4 py-2 border border-gray-200 text-sm rounded-md hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none">Create</button>
          </div>
        </form>
      </Modal>

      {/* New Gift Card Modal */}
      <Modal
        open={showGiftCardModal}
        onClose={() => setShowGiftCardModal(false)}
        title="Create Gift Card"
        size="md"
      >
        <form onSubmit={handleCreateGiftCard} className="space-y-4">
          <div>
            <label htmlFor="gc-bal" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Balance (₦)</label>
            <input id="gc-bal" type="number" required min="5000" value={newGiftCard.balance}
              onChange={(e) => setNewGiftCard({ ...newGiftCard, balance: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black" />
          </div>
          <div>
            <label htmlFor="gc-exp" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Expires in (months)</label>
            <input id="gc-exp" type="number" min="1" max="60" value={newGiftCard.expiryMonths}
              onChange={(e) => setNewGiftCard({ ...newGiftCard, expiryMonths: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black" />
          </div>
          <div>
            <label htmlFor="gc-cust" className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Customer (optional)</label>
            <input id="gc-cust" type="text" value={newGiftCard.customerId}
              onChange={(e) => setNewGiftCard({ ...newGiftCard, customerId: e.target.value })}
              placeholder="Leave blank to issue anonymous"
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={() => setShowGiftCardModal(false)} className="px-4 py-2 border border-gray-200 text-sm rounded-md hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none">Create</button>
          </div>
        </form>
      </Modal>

      {/* Gift Card code modal (inline success) */}
      <Modal
        open={showCodeModal}
        onClose={() => { setShowCodeModal(false); setIssuedCode(null); }}
        title="Gift Card Created"
        size="md"
        footer={
          <>
            <button onClick={() => { setShowCodeModal(false); setIssuedCode(null); }} className="px-4 py-2 border border-gray-200 text-sm rounded-md hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none">Close</button>
            <button
              onClick={() => copyCode(issuedCode?.code || '')}
              className="px-4 py-2 bg-black text-white text-sm rounded-md hover:bg-gray-800 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
            >
              Copy code
            </button>
          </>
        }
      >
        {issuedCode && (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-green-100 text-green-700 flex items-center justify-center">
              <CheckCircle2 size={24} />
            </div>
            <p className="text-sm text-gray-500">A new gift card was created. This is the only time the code will be shown — copy it now.</p>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Code</p>
              <div className="flex items-center justify-center gap-2">
                <code className="font-mono text-base font-bold tracking-widest">{issuedCode.code}</code>
                <button
                  type="button"
                  onClick={() => copyCode(issuedCode.code)}
                  aria-label="Copy code"
                  className="p-1.5 text-gray-500 hover:text-black transition-colors rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}

function CouponsTable({ coupons, loading }) {
  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (coupons.length === 0) {
    return (
      <TableEmptyState
        icon={Inbox}
        title="No coupons yet"
        description="Create a coupon to give customers a reason to buy."
      />
    );
  }
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 font-semibold">Code</th>
            <th className="px-6 py-4 font-semibold">Discount</th>
            <th className="px-6 py-4 font-semibold">Usage</th>
            <th className="px-6 py-4 font-semibold">Expires</th>
            <th className="px-6 py-4 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {coupons.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-mono text-xs">{c.code}</td>
              <td className="px-6 py-4">{c.type === 'Percentage' ? `${c.value}%` : formatNGN(c.value)}</td>
              <td className="px-6 py-4">{c.usageLimit ? `${c.usageCount}/${c.usageLimit}` : `${c.usageCount}/∞`}</td>
              <td className="px-6 py-4 text-gray-600">{formatDate(c.expiryDate)}</td>
              <td className="px-6 py-4">
                {c.isActive ? (
                  <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 size={12} /> Active</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-red-600"><XCircle size={12} /> Inactive</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GiftCardsTable({ giftCards, loading, onViewLogs }) {
  if (loading) return <p className="text-sm text-gray-500">Loading…</p>;
  if (giftCards.length === 0) {
    return (
      <TableEmptyState
        icon={Inbox}
        title="No gift cards yet"
        description="Create the first gift card to begin offering them to clients."
      />
    );
  }
  return (
    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-4 font-semibold">Code</th>
            <th className="px-6 py-4 font-semibold">Balance</th>
            <th className="px-6 py-4 font-semibold">Customer</th>
            <th className="px-6 py-4 font-semibold">Expires</th>
            <th className="px-6 py-4 font-semibold text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {giftCards.map((gc) => (
            <tr key={gc.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 font-mono text-xs">{gc.code}</td>
              <td className="px-6 py-4 font-medium">{formatNGN(gc.balance)}</td>
              <td className="px-6 py-4">{gc.customerName || 'Anonymous'}</td>
              <td className="px-6 py-4 text-gray-600">{formatDate(gc.expiryDate)}</td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => onViewLogs(gc.id)}
                  className="text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded outline-none"
                  aria-label={`View logs for gift card ${gc.code}`}
                >
                  View logs
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
