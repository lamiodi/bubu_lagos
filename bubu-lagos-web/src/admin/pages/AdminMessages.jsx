import { AdminLayout } from '../components/AdminLayout';
import { useState, useEffect, useMemo } from 'react';
import { Clock, ChevronLeft, ChevronRight, Search, Inbox } from 'lucide-react';
import api from '../../utils/api';
import { logger } from '../../lib/logger';
import { Modal } from '../../components/Modal';
import { TableRowSkeleton, TableEmptyState } from '../../components/Skeleton';
import { formatDate, getInitials } from '../../lib/utils';

export function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' | 'unread' | 'read'
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchMessages(1);
  }, [statusFilter]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearchTerm(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const fetchMessages = async (page) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page });
      if (statusFilter) params.append('status', statusFilter);
      const data = await api.get(`/admin/messages?${params.toString()}`);
      setMessages(data.messages || data || []);
      setPagination(data.pagination || { page, totalPages: 1 });
    } catch (err) {
      logger.error('Failed to fetch messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMessages = useMemo(
    () => messages.filter((m) =>
      m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    ),
    [messages, searchTerm]
  );

  const openMessage = async (msg) => {
    setSelectedMessage(msg);
    setShowModal(true);
    if (!msg.readAt) {
      // Optimistic: mark as read locally
      setMessages((cur) => cur.map((m) => m.id === msg.id ? { ...m, readAt: new Date().toISOString() } : m));
      try {
        await api.put(`/admin/messages/${msg.id}/read`);
      } catch (err) {
        logger.error('Failed to mark message read', err);
      }
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500">{messages.filter((m) => !m.readAt).length} unread</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row gap-4 justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <label htmlFor="messages-search" className="sr-only">Search messages</label>
            <input
              id="messages-search"
              type="search"
              placeholder="Search by name, email, or subject..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black text-sm"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="msg-status" className="sr-only">Filter by status</label>
            <select
              id="msg-status"
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All</option>
              <option value="unread">Unread</option>
              <option value="read">Read</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">From</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Subject</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Date</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}
            </tbody>
          </table>
        ) : filteredMessages.length === 0 ? (
          <TableEmptyState
            icon={Inbox}
            title="Inbox is empty"
            description="Concierge enquiries from the website will appear here."
          />
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-900">From</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Subject</th>
                <th className="px-6 py-4 font-semibold text-gray-900">Date</th>
                <th className="px-6 py-4 font-semibold text-gray-900 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredMessages.map((msg) => (
                <tr
                  key={msg.id}
                  className={`hover:bg-gray-50 transition-colors cursor-pointer ${!msg.readAt ? 'bg-blue-50/30' : ''}`}
                  onClick={() => openMessage(msg)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold" aria-hidden="true">
                        {getInitials(msg.name)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {msg.name}
                          {!msg.readAt && <span className="w-2 h-2 rounded-full bg-blue-500" aria-label="Unread" />}
                        </div>
                        <div className="text-xs text-gray-500">{msg.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-900">{msg.subject}</td>
                  <td className="px-6 py-4 text-gray-600">{formatDate(msg.createdAt, { withTime: true })}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); openMessage(msg); }}
                      className="text-xs font-bold uppercase tracking-widest text-gray-600 hover:text-black transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded outline-none"
                      aria-label={`Open message from ${msg.name}`}
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
                disabled={pagination.page <= 1}
                onClick={() => fetchMessages(pagination.page - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button
                className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchMessages(pagination.page + 1)}
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
        title={selectedMessage?.subject}
        size="xl"
      >
        {selectedMessage && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-base font-bold" aria-hidden="true">
                {getInitials(selectedMessage.name)}
              </div>
              <div>
                <h3 className="font-bold">{selectedMessage.name}</h3>
                <a href={`mailto:${selectedMessage.email}`} className="text-sm text-blue-600 hover:underline">{selectedMessage.email}</a>
              </div>
            </div>
            <div className="text-sm text-gray-600 flex items-center gap-1.5">
              <Clock size={12} /> {formatDate(selectedMessage.createdAt, { withTime: true })}
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap">
              {selectedMessage.message}
            </div>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
