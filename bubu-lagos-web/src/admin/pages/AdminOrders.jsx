import { AdminLayout } from '../components/AdminLayout';
import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Eye, ChevronLeft, ChevronRight, Download, Copy, Inbox, ArrowLeft, Calendar } from 'lucide-react';
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
  const [dateRange, setDateRange] = useState('all'); // 'all' | 'today' | 'week' | 'month'
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [pendingCancel, setPendingCancel] = useState(null);
  const [pageInput, setPageInput] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingCarrier, setShippingCarrier] = useState('');

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

  const filteredOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      const matchesSearch = 
        order.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (dateRange === 'today') {
        const orderDate = new Date(order.createdAt);
        return orderDate.toDateString() === now.toDateString();
      }

      if (dateRange === 'week') {
        const orderDate = new Date(order.createdAt);
        const sevenDaysAgo = new Date(now.valueOf() - 7 * 24 * 60 * 60 * 1000);
        return orderDate >= sevenDaysAgo;
      }

      if (dateRange === 'month') {
        const orderDate = new Date(order.createdAt);
        const thirtyDaysAgo = new Date(now.valueOf() - 30 * 24 * 60 * 60 * 1000);
        return orderDate >= thirtyDaysAgo;
      }

      return true;
    });
  }, [orders, searchTerm, dateRange]);

  const openOrderDetails = async (order) => {
    try {
      const response = await api.get(`/orders/${order.id}`);
      setSelectedOrder(response);
      setTrackingNumber(response.order?.trackingNumber || '');
      setShippingCarrier(response.order?.shippingCarrier || '');
      setShowModal(true);
    } catch (err) {
      logger.error('Failed to fetch order details:', err);
      toast.error('Failed to load order details');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    const prev = orders;
    const prevSelected = selectedOrder;
    setOrders((cur) => cur.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    if (selectedOrder?.order?.id === orderId) {
      setSelectedOrder((s) => ({ ...s, order: { ...s.order, status: newStatus } }));
    }
    setUpdatingStatus(true);
    try {
      await api.put(`/orders/${orderId}/status`, { 
        status: newStatus,
        trackingNumber: newStatus === 'Shipped' ? trackingNumber : undefined,
        shippingCarrier: newStatus === 'Shipped' ? shippingCarrier : undefined
      });
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
      let ok = 0;
      for (const id of ids) {
        try { await api.put(`/orders/${id}/status`, { status }); ok++; } catch { /* ignore */ }
      }
      toast.success(`${ok}/${ids.length} updated`);
      setSelectedIds(new Set());
      fetchOrders(pagination.page);
    }
  };

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
    link.download = `bubu-lagos-orders-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const printPackingSlip = (orderObj) => {
    if (!orderObj || !orderObj.order) return;
    const printContent = `
      <html>
        <head>
          <title>Packing Slip - ${orderObj.order.reference}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #000; }
            h1 { font-size: 24px; border-bottom: 2px solid #000; padding-bottom: 10px; }
            .header { margin-bottom: 30px; display: flex; justify-content: space-between; }
            .items { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .items th, .items td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>Packing Slip</h1>
              <p><strong>Order:</strong> ${orderObj.order.reference}</p>
              <p><strong>Date:</strong> ${new Date(orderObj.order.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p><strong>Ship To:</strong></p>
              <p>${orderObj.order.customerName}</p>
              <p>${orderObj.order.shippingAddress?.address || ''}</p>
              <p>${orderObj.order.shippingAddress?.city || ''}, ${orderObj.order.shippingAddress?.state || ''}</p>
            </div>
          </div>
          <table class="items">
            <thead>
              <tr><th>Item</th><th>Variant</th><th>Qty</th></tr>
            </thead>
            <tbody>
              ${orderObj.items.map(item => `
                <tr>
                  <td>${item.productName}</td>
                  <td>${item.variantName}</td>
                  <td>${item.quantity}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:text-black hover:bg-gray-100 transition-colors flex items-center justify-center"
            title="Back to Dashboard"
            aria-label="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
            <p className="text-gray-500 text-sm">
              {filteredOrders.length !== orders.length
                ? `${filteredOrders.length} matching · ${pagination.total} total`
                : `Manage client orders (${pagination.total})`}
            </p>
          </div>
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
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <label htmlFor="orders-search" className="sr-only">Search orders</label>
            <input
              id="orders-search"
              type="search"
              placeholder="Search by reference, name, email..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            {/* Date Range Quick Filter */}
            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200 text-xs font-semibold">
              <span className="px-2 text-gray-400 flex items-center gap-1">
                <Calendar size={13} />
              </span>
              {[
                { id: 'all', label: 'All Time' },
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'This Week' },
                { id: 'month', label: 'This Month' }
              ].map(range => (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => setDateRange(range.id)}
                  className={`px-2.5 py-1 rounded transition-all ${
                    dateRange === range.id
                      ? 'bg-black text-white shadow-2xs'
                      : 'text-gray-600 hover:text-black'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="text-gray-400" size={16} />
              <select
                id="status-filter"
                className="px-3 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-black/5"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Shipped">Shipped</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
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
            description={searchTerm || dateRange !== 'all' ? 'Try clearing your search or date range filters.' : 'When customers place orders they will appear here.'}
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
                      <div className="text-gray-900 font-medium">{order.customerName}</div>
                      <div className="text-gray-500 text-xs">{order.customerEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-gray-900 font-bold font-mono">{formatNGN(order.totalAmount)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">{formatDate(order.createdAt, { withTime: true })}</td>
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
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
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
              <button
                onClick={() => printPackingSlip(selectedOrder)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-black/5"
              >
                Print Packing Slip
              </button>
            </div>

            <div>
              <p className="text-sm text-gray-500 mb-2">Update Status</p>
              
              <div className="bg-gray-50 p-4 rounded-lg mb-4 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tracking Information (Optional)</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Carrier (e.g. DHL)</label>
                    <input 
                      type="text" 
                      value={shippingCarrier}
                      onChange={(e) => setShippingCarrier(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                      placeholder="DHL, FedEx, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Tracking Number</label>
                    <input 
                      type="text" 
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-black/5"
                      placeholder="1234567890"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400">Tracking info will be emailed to the customer if you mark the order as 'Shipped'.</p>
              </div>

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
