import { AdminLayout } from '../components/AdminLayout';
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { logger } from '../../lib/logger';
import { formatNGN, formatDate, getInitials } from '../../lib/utils';
import { StatCardSkeleton, TableEmptyState } from '../../components/Skeleton';

const DATE_RANGES = [
  { id: '7', label: 'Last 7 days', days: 7 },
  { id: '30', label: 'Last 30 days', days: 30 },
  { id: '90', label: 'Last 90 days', days: 90 },
  { id: 'year', label: 'Year to date', days: 365 },
];

export function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rangeId, setRangeId] = useState('30');

  useEffect(() => {
    fetchDashboardData();
  }, [rangeId]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const days = DATE_RANGES.find((r) => r.id === rangeId)?.days || 30;
      const data = await api.get(`/admin/dashboard/stats?days=${days}`);
      setStats(data.stats || null);
      setRecentOrders(data.recentOrders || []);
      // Backend may return `dailyRevenue` as an array of {date, revenue}.
      // Fall back to a single point with the period total if not.
      setChartData(
        data.dailyRevenue && data.dailyRevenue.length > 0
          ? data.dailyRevenue
          : [{ name: 'Total', revenue: data.stats?.totalRevenue || 0 }]
      );
    } catch (err) {
      logger.error('Failed to fetch dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const STATS_CARDS = useMemo(() => stats ? [
    {
      label: 'Total Revenue',
      value: formatNGN(stats.totalRevenue),
      change: stats.revenueChange !== undefined ? `${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange}%` : '—',
      trend: (stats.revenueChange ?? 0) >= 0 ? 'up' : 'down',
      icon: DollarSign,
      color: 'bg-green-50 text-green-600'
    },
    {
      label: 'Total Orders',
      value: stats.totalOrders?.toLocaleString() || '0',
      change: stats.orderChange !== undefined ? `${stats.orderChange >= 0 ? '+' : ''}${stats.orderChange}%` : '—',
      trend: (stats.orderChange ?? 0) >= 0 ? 'up' : 'down',
      icon: ShoppingBag,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Awaiting Fulfilment',
      value: stats.pendingOrders?.toLocaleString() || '0',
      change: 'Pending',
      trend: 'up',
      icon: Users,
      color: 'bg-purple-50 text-purple-600'
    },
    {
      label: 'The Collection',
      value: stats.totalProducts?.toLocaleString() || '0',
      change: 'Pieces',
      trend: 'up',
      icon: TrendingUp,
      color: 'bg-orange-50 text-orange-600'
    }
  ] : [], [stats]);

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500">Welcome back, here&apos;s what&apos;s happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="dash-range" className="sr-only">Date range</label>
          <select
            id="dash-range"
            value={rangeId}
            onChange={(e) => setRangeId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            {DATE_RANGES.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          STATS_CARDS.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg ${stat.color}`} aria-hidden="true">
                    <Icon size={24} />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${stat.trend === 'up' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {stat.change}
                    {stat.trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  </div>
                </div>
                <h3 className="text-gray-500 text-sm font-medium mb-1">{stat.label}</h3>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              </div>
            );
          })
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Revenue Analytics</h2>
          <div className="h-[300px] w-full">
            {chartData.length === 0 ? (
              <TableEmptyState
                icon={TrendingUp}
                title="No data yet"
                description="Once you start receiving orders, your revenue will appear here."
              />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#000000" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6b7280', fontSize: 12 }}
                    tickFormatter={(value) => `₦${Number(value).toLocaleString()}`}
                  />
                  <Tooltip formatter={(value) => formatNGN(value)} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#000000"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Orders</h2>
          <div className="space-y-6">
            {recentOrders.length > 0 ? recentOrders.map((order) => (
              <div key={order.id} className="flex items-center gap-4">
                <div
                  className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center font-bold text-xs uppercase"
                  aria-hidden="true"
                >
                  {getInitials(order.customerName, 'G')}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-gray-900 truncate">{order.customerName}</h4>
                  <p className="text-xs text-gray-500">{formatDate(order.createdAt)}</p>
                </div>
                <div className="text-sm font-bold text-gray-900">{formatNGN(order.totalAmount)}</div>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-8">No orders yet — the atelier is ready.</p>
            )}
          </div>
          <Link
            to="/admin/orders"
            className="block w-full text-center mt-6 py-3 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 outline-none"
          >
            View All Orders
          </Link>
        </div>
      </div>
    </AdminLayout>
  );
}
