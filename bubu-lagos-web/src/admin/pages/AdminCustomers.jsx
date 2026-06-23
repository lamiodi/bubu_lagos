import { AdminLayout } from '../components/AdminLayout';
import { useState, useEffect, useMemo } from 'react';
import { Search, Eye, Mail, Phone, MapPin, ShoppingBag, Users as UsersIcon } from 'lucide-react';
import api from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { logger } from '../../lib/logger';
import { Modal } from '../../components/Modal';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { TableRowSkeleton, TableEmptyState } from '../../components/Skeleton';
import { formatNGN, formatDate, getInitials } from '../../lib/utils';

export function AdminCustomers() {
  const toast = useToast();
  const [customers, setCustomers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(''); // raw input
  const [searchTerm, setSearchTerm] = useState(''); // debounced
  const [showModal, setShowModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pendingSuspend, setPendingSuspend] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  // [FIX #4] 300ms debounce on the search input.
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/customers');
      setCustomers(data.customers || data || []);
    } catch (err) {
      logger.error('Failed to fetch customers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredCustomers = useMemo(
    () => customers.filter((c) =>
      c.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [customers, searchTerm]
  );

  const openCustomerDetails = async (customer) => {
    try {
      const data = await api.get(`/customers/${customer.id}`);
      setSelectedCustomer(data.customer || data);
      setShowModal(true);
    } catch (err) {
      logger.error('Failed to fetch customer details:', err);
      setShowModal(false);
    }
  };

  const toggleCustomerStatus = async (customer) => {
    if (!customer) return;
    const action = customer.isActive ? 'suspend' : 'activate';
    try {
      await api.put(`/customers/${customer.id}/status`, { isActive: !customer.isActive });
      toast.success(`Client ${action}d`);
      fetchCustomers();
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, isActive: !customer.isActive });
      }
    } catch (err) {
      logger.error('Failed to toggle customer status:', err);
      toast.error(`Failed to ${action} customer`);
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500">
            {filteredCustomers.length !== customers.length
              ? `${filteredCustomers.length} of ${customers.length} matching`
              : `${customers.length} customer${customers.length === 1 ? '' : 's'}`}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <label htmlFor="customers-search" className="sr-only">Search customers</label>
            <input
              id="customers-search"
              type="search"
              placeholder="Search by name, email, or phone..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black text-sm"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">Customer</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Phone</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Orders</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRowSkeleton key={i} columns={6} />
              ))}
            </tbody>
          </table>
        ) : filteredCustomers.length === 0 ? (
          <TableEmptyState
            icon={UsersIcon}
            title="No clients yet"
            description="When clients join the house, they'll appear here."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">Customer</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Phone</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Orders</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold"
                        aria-hidden="true"
                      >
                        {getInitials(`${customer.firstName || ''} ${customer.lastName || ''}`)}
                      </div>
                      <div className="font-medium text-gray-900">
                        {customer.firstName} {customer.lastName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{customer.email}</td>
                  <td className="px-6 py-4 text-gray-600">{customer.phone || '—'}</td>
                  <td className="px-6 py-4 text-gray-600">{customer.ordersCount || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {customer.isActive ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openCustomerDetails(customer)}
                      className="p-2 text-gray-400 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded outline-none"
                      title="View Details"
                      aria-label={`View customer ${customer.firstName} ${customer.lastName}`}
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Customer Details"
        size="2xl"
        footer={
          selectedCustomer && (
            <>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
              >
                Close
              </button>
              <button
                onClick={() => setPendingSuspend(selectedCustomer)}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none ${selectedCustomer.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {selectedCustomer.isActive ? 'Suspend' : 'Activate'}
              </button>
            </>
          )
        }
      >
        {selectedCustomer && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-base font-bold">
                {getInitials(`${selectedCustomer.firstName || ''} ${selectedCustomer.lastName || ''}`)}
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </h3>
                <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                  <Mail size={12} /> Email
                </p>
                <p className="font-medium">{selectedCustomer.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                  <Phone size={12} /> Phone
                </p>
                <p className="font-medium">{selectedCustomer.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1 flex items-center gap-1.5">
                  <ShoppingBag size={12} /> Total Orders
                </p>
                <p className="font-medium">{selectedCustomer.ordersCount || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Spent</p>
                <p className="font-medium">{formatNGN(selectedCustomer.totalSpent || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Joined</p>
                <p className="font-medium">{formatDate(selectedCustomer.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedCustomer.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {selectedCustomer.isActive ? 'Active' : 'Suspended'}
                </span>
              </div>
            </div>

            {/* [FIX #8] Show all addresses with default badge */}
            {Array.isArray(selectedCustomer.addresses) && selectedCustomer.addresses.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1.5">
                  <MapPin size={12} /> Addresses ({selectedCustomer.addresses.length})
                </p>
                <ul className="space-y-2">
                  {selectedCustomer.addresses.map((addr, i) => (
                    <li key={i} className="text-sm bg-gray-50 p-3 rounded-lg flex justify-between gap-3">
                      <div>
                        {addr.isDefault && (
                          <span className="text-[9px] font-bold uppercase tracking-widest bg-black text-white px-1.5 py-0.5 rounded mr-2">Default</span>
                        )}
                        {addr.address}
                        {addr.apartment && `, ${addr.apartment}`}
                        <br />
                        {addr.city}, {addr.state} {addr.zipCode}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(selectedCustomer.recentOrders) && selectedCustomer.recentOrders.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Recent Orders</p>
                <ul className="space-y-2">
                  {selectedCustomer.recentOrders.map((o) => (
                    <li key={o.id} className="text-sm flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                      <span className="font-mono text-xs">{o.reference}</span>
                      <span className="font-medium">{formatNGN(o.totalAmount)}</span>
                      <span className="text-xs text-gray-500">{formatDate(o.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={!!pendingSuspend}
        title={pendingSuspend?.isActive ? 'Suspend customer?' : 'Activate customer?'}
        description={
          pendingSuspend
            ? `Are you sure you want to ${pendingSuspend.isActive ? 'suspend' : 'activate'} ${pendingSuspend.firstName} ${pendingSuspend.lastName}? ${
                pendingSuspend.isActive ? 'They will not be able to place new orders.' : 'They will be able to place orders again.'
              }`
            : ''
        }
        confirmLabel={pendingSuspend?.isActive ? 'Suspend' : 'Reactivate'}
        cancelLabel="Cancel"
        variant={pendingSuspend?.isActive ? 'danger' : 'primary'}
        onConfirm={() => {
          toggleCustomerStatus(pendingSuspend);
          setPendingSuspend(null);
          setShowModal(false);
        }}
        onCancel={() => setPendingSuspend(null)}
      />
    </AdminLayout>
  );
}
