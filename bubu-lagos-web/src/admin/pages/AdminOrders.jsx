import { AdminLayout } from '../components/AdminLayout';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Filter, Eye, ChevronLeft, ChevronRight, Download, Copy, Inbox } from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TableRowSkeleton, TableEmptyState } from '../../components/Skeleton';
import { formatNGN, formatDate } from '../../lib/utils';

const STATUS_COLORS = {
  'Pending': 'bg-yellow-100 text-yellow-700',
  'Paid': 'bg-blue-100 text-blue-700',
  'Shipped': 'bg-green-100 text-green-700',
  'Cancelled': 'bg-red-100 text-red-700'
};

export function AdminOrders() {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pendingCancel, setPendingCancel] = useState(null);
  const [pageInput, setPageInput] = useState('');

  const controllerRef = useRef(null);

  const fetchOrders = async (page = 1) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (statusFilter) params.append('status', statusFilter);
      const response = await api.get(`/orders?${params.toString()}`, { signal: controller.signal });
      setOrders(response.orders || []);
      setPagination(response.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 });
    } catch (err) {
      if (err.name === 'AbortError') return;
      logger.error('Failed to fetch orders:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(1);
    return () => controllerRef.current?.abort();
  }, [statusFilter]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchOrders(newPage);
    }
  };

  const filteredOrders = useMemo(() => orders.filter((order) =>
    order.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  ), [orders, searchTerm]);

  const openOrderDetails = async (order) => {
    try {
      const response = await api.get(`/orders/${order.id}`);
      setSelectedOrder(response);
      setShowModal(true);
    } catch (err) {
      logger.error('Failed to fetch order details:', err);
      toast.error('Failed to load order details');
    }
  };

  // [FIX #6] Optimistic status update with rollback.
  const updateOrderStatus = async (orderId, newStatus) => {
    const prev = orders;
    const prevSelected = selectedOrder;
    setOrders((cur) => cur.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    if (selectedOrder?.order?.id === orderId) {
      setSelectedOrder((s) => ({ ...s, order: { ...s.order, status: newStatus } }));
    }
    setUpdatingStatus(true);
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
    } catch (err) {
      logger.error('Failed to update order status:', err);
      toast.error('Could not update status — reverted.');
      setOrders(prev);
      setSelectedOrder(prevSelected);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // [FIX #20] Selection + bulk actions.
  const toggleSelect = (id) => {
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    setSelectedIds((s) => {
      if (s.size === filteredOrders.length) return new Set();
      return new Set(filteredOrders.map((o) => o.id));
    });
  };
  const bulkUpdate = async (status) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      await api.put('/orders/bulk-status', { ids, status });
      toast.success(`${ids.length} order${ids.length > 1 ? 's' : ''} marked ${status}`);
      setSelectedIds(new Set());
      fetchOrders(pagination.page);
    } catch (err) {
      // Fall back: update one-by-one.
      let ok = 0;
      for (const id of ids) {
        try { await api.put(`/orders/${id}/status`, { status }); ok++; } catch { /* ignore */ }
      }
      toast.success(`${ok}/${ids.length} updated`);
      setSelectedIds(new Set());
      fetchOrders(pagination.page);
    }
  };

  // [FIX #7] CSV export.
  const exportCSV = () => {
    const rows = [
      ['Reference', 'Customer', 'Email', 'Phone', 'Total', 'Status', 'Date'],
      ...filteredOrders.map((o) => [
        o.reference, o.customerName, o.customerEmail, o.customerPhone,
        o.totalAmount, o.status, o.createdAt
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500">
            {filteredOrders.length !== orders.length
              ? `${filteredOrders.length} matching · ${pagination.total} total`
              : `Manage client orders (${pagination.total})`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <label htmlFor="orders-search" className="sr-only">Search orders</label>
            <input
              id="orders-search"
              type="search"
              placeholder="Search by reference, name, or email..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="text-gray-400" size={18} />
            <label htmlFor="status-filter" className="sr-only">Filter by status</label>
            <select
              id="status-filter"
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
              <option value="Shipped">Shipped</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-sm">
            <span className="font-medium text-blue-900">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => bulkUpdate('Paid')}
                className="px-3 py-1 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
              >
                Mark Paid
              </button>
              <button
                onClick={() => bulkUpdate('Shipped')}
                className="px-3 py-1 bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-green-700 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
              >
                Mark Shipped
              </button>
              <button
                onClick={() => setPendingCancel({ count: selectedIds.size })}
                className="px-3 py-1 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-red-700 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
              >
                Cancel
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1 border border-gray-200 text-[10px] font-bold uppercase tracking-widest rounded hover:bg-white transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-10" />
                  <th className="px-6 py-4 font-semibold text-gray-900">Reference</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRowSkeleton key={i} columns={7} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredOrders.length === 0 ? (
          <TableEmptyState
            icon={Inbox}
            title="No orders found"
            description={searchTerm ? 'Try clearing your search or filters.' : 'When customers place orders they will appear here.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 w-10">
                    <input
                      type="checkbox"
                      aria-label="Select all orders"
                      checked={selectedIds.size === filteredOrders.length && filteredOrders.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    />
                  </th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Reference</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Customer</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Amount</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        aria-label={`Select order ${order.reference}`}
                        checked={selectedIds.has(order.id)}
                        onChange={() => toggleSelect(order.id)}
                        className="h-4 w-4 rounded border-gray-300 text-black focus:ring-2 focus:ring-accent focus:ring-offset-2"
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900 font-mono text-xs">{order.reference}</td>
                    <td className="px-6 py-4">
                      <div className="text-gray-900">{order.customerName}</div>
                      <div className="text-gray-500 text-xs">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-medium">{formatNGN(order.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{formatDate(order.createdAt, { withTime: true })}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openOrderDetails(order)}
                        className="p-2 text-gray-400 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded outline-none"
                        title="View Details"
                        aria-label={`View order ${order.reference}`}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
            <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)</span>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              {/* [FIX #33] Jump to page */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = parseInt(pageInput, 10);
                  if (Number.isFinite(n)) handlePageChange(n);
                  setPageInput('');
                }}
                className="flex items-center gap-1"
              >
                <label htmlFor="page-jump" className="sr-only">Jump to page</label>
                <input
                  id="page-jump"
                  type="number"
                  min="1"
                  max={pagination.totalPages}
                  value={pageInput}
                  onChange={(e) => setPageInput(e.target.value)}
                  placeholder="#"
                  className="w-14 px-2 py-1 border border-gray-200 rounded text-center focus:outline-none focus:ring-2 focus:ring-black/5"
                />
              </form>
              <button
                className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
                aria-label="Next page"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Order Details"
        size="2xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Reference</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono font-medium">{selectedOrder.order?.reference}</p>
                  <button
                    type="button"
                    aria-label="Copy reference"
                    onClick={() => navigator.clipboard?.writeText(selectedOrder.order?.reference || '').then(() => toast.success('Reference copied'))}
                    className="p-1 text-gray-400 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded outline-none"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[selectedOrder.order?.status] || 'bg-gray-100 text-gray-700'}`}>
                  {selectedOrder.order?.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer</p>
                <p className="font-medium">{selectedOrder.order?.customerName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{selectedOrder.order?.customerEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{selectedOrder.order?.customerPhone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="font-medium">{formatNGN(selectedOrder.order?.totalAmount)}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Shipping Address</p>
              <p className="text-sm bg-gray-50 p-3 rounded-lg">
                {selectedOrder.order?.shippingAddress?.address}
                {selectedOrder.order?.shippingAddress?.apartment && `, ${selectedOrder.order?.shippingAddress.apartment}`}
                <br />
                {selectedOrder.order?.shippingAddress?.city}, {selectedOrder.order?.shippingAddress?.state}
                {selectedOrder.order?.shippingAddress?.zipCode && ` ${selectedOrder.order?.shippingAddress.zipCode}`}
              </p>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Order Items</p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Product</th>
                      <th className="px-4 py-2 text-center">Qty</th>
                      <th className="px-4 py-2 text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">
                          <div className="font-medium">{item.productName}</div>
                          <div className="text-gray-500 text-xs">{item.variantName}</div>
                        </td>
                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatNGN(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {['Paid', 'Shipped', 'Cancelled'].map((status) => (
                  <button
                    key={status}
                    onClick={() => updateOrderStatus(selectedOrder.order?.id, status)}
                    disabled={updatingStatus || selectedOrder.order?.status === status}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none ${
                      selectedOrder.order?.status === status
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : status === 'Cancelled'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-black text-white hover:bg-gray-800'
                    }`}
                  >
                    Mark as {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-xs text-gray-400">
              Created: {formatDate(selectedOrder.order?.createdAt, { withTime: true })}
              {selectedOrder.order?.paymentVerifiedAt && (
                <span className="ml-4">Payment Verified: {formatDate(selectedOrder.order?.paymentVerifiedAt, { withTime: true })}</span>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pendingCancel}
        title={`Cancel ${pendingCancel?.count || 0} order${pendingCancel?.count === 1 ? '' : 's'}?`}
        description="This will mark the selected orders as cancelled. You cannot undo this from the admin UI."
        confirmLabel="Cancel orders"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={() => {
          bulkUpdate('Cancelled');
          setPendingCancel(null);
        }}
        onCancel={() => setPendingCancel(null)}
      />
    </AdminLayout>
  );
}
