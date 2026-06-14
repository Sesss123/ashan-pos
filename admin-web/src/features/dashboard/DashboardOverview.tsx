import { Box, Typography, Paper, Avatar, CircularProgress } from '@mui/material';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Utensils, 
  Package, CheckCircle2, AlertTriangle, BellRing,
  DollarSign, ShoppingCart, UsersRound, Store, Clock, Plus
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';
import { useBranchStore } from '../../shared/store/branchStore';

// --- FALLBACK MOCK DATA ---
const defaultSalesData = [
  { name: 'Mon', sales: 4000 }, { name: 'Tue', sales: 3000 }, { name: 'Wed', sales: 5000 },
  { name: 'Thu', sales: 4500 }, { name: 'Fri', sales: 7000 }, { name: 'Sat', sales: 9000 }, { name: 'Sun', sales: 8500 },
];
const ordersTrendData = [
  { name: 'Breakfast', orders: 45 }, { name: 'Lunch', orders: 120 }, { name: 'Dinner', orders: 210 },
];
const topProductsData = [
  { name: 'Wagyu Burger', value: 400, color: '#6366F1' },
  { name: 'Truffle Fries', value: 300, color: '#10B981' },
  { name: 'Matcha Latte', value: 200, color: '#F59E0B' },
  { name: 'Caesar Salad', value: 100, color: '#F43F5E' },
];

const activities = [
  { id: 1, title: 'Purchase Order #8921 Created', time: '2 mins ago', icon: <Package size={18} />, color: '#6366F1' },
  { id: 2, title: 'Wagyu Beef stock critically low (5 left)', time: '14 mins ago', icon: <AlertTriangle size={18} />, color: '#F43F5E' },
  { id: 3, title: 'Table 14 Bill Settled ($142.50)', time: '28 mins ago', icon: <CheckCircle2 size={18} />, color: '#10B981' },
  { id: 4, title: 'New staff logged in: John (Cashier)', time: '45 mins ago', icon: <UsersRound size={18} />, color: '#3B82F6' },
];

const defaultOrderStatusFlow = [
  { name: 'Pending', count: 12, fill: '#F59E0B' },
  { name: 'Preparing', count: 8, fill: '#6366F1' },
  { name: 'Ready', count: 5, fill: '#10B981' },
  { name: 'Completed', count: 45, fill: '#3B82F6' }
];

export default function DashboardOverview() {
  const { selectedBranchId } = useBranchStore();

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['dashboardStats', selectedBranchId],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/dashboard/stats', {
        params: { branchId: selectedBranchId !== 'all' ? selectedBranchId : undefined }
      });
      return res.data.data;
    }
  });

  // Real-time: auto-refresh dashboard KPIs on critical ERP events
  useSocketEvent('order.created', ['dashboardStats']);
  useSocketEvent('order.completed', ['dashboardStats']);
  useSocketEvent('order.settled', ['dashboardStats']);
  useSocketEvent('kitchen.order_ready', ['dashboardStats']);
  useSocketEvent('table.updated', ['dashboardStats']);
  useSocketEvent('inventory.low_stock', ['dashboardStats']);
  useSocketEvent('purchase.received', ['dashboardStats']);
  useSocketEvent('user.login', ['dashboardStats']);
  // New: backend now emits these on any CRUD mutation for instant KPI refresh
  useSocketEvent('dashboard.stats.updated', ['dashboardStats']);
  useSocketEvent('dashboard.revenue.updated', ['dashboardStats']);
  useSocketEvent('user.created', ['dashboardStats']);
  useSocketEvent('user.deleted', ['dashboardStats']);
  useSocketEvent('customer.created', ['dashboardStats']);
  useSocketEvent('branch.created', ['dashboardStats']);
  useSocketEvent('purchase.created', ['dashboardStats']);
  useSocketEvent('inventory.item_created', ['dashboardStats']);
  useSocketEvent('inventory.stock_moved', ['dashboardStats']);
  useSocketEvent('backup.completed', ['dashboardStats']);

  const KPICard = ({ title, value, icon, trend, trendVal, color }: any) => (
    <Paper sx={{ 
      p: 2.5, borderRadius: '20px', 
      background: 'rgba(30, 41, 59, 0.4)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.05)', 
      boxShadow: `0 8px 32px ${color}15`,
      display: 'flex', flexDirection: 'column', gap: 1.5, position: 'relative', overflow: 'hidden',
      transition: 'all 0.3s ease',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 40px ${color}30`, border: `1px solid ${color}40` }
    }}>
      <Box sx={{ position: 'absolute', top: -10, right: -10, opacity: 0.1, color: color }}>
        {icon}
      </Box>
      <Typography variant="body2" color="text.secondary" fontWeight={700} letterSpacing={0.5} fontFamily='"Plus Jakarta Sans", sans-serif'>{title}</Typography>
      <Typography variant="h4" fontWeight={800} fontFamily='"Plus Jakarta Sans", sans-serif'>{value}</Typography>
      {trend && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: trend === 'up' ? '#10B981' : '#F43F5E', bgcolor: trend === 'up' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', p: 0.5, px: 1, borderRadius: '6px', width: 'fit-content' }}>
          {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          <Typography variant="caption" fontWeight={700} fontFamily='"Plus Jakarta Sans", sans-serif'>{trendVal}</Typography>
        </Box>
      )}
    </Paper>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const stats = statsData || {
    revenueToday: 0, ordersToday: 0, customerCount: 0, staffOnline: 0,
    activeTables: '0 / 0', kitchenQueue: 0, pendingPurchases: 0, lowStockItems: 0,
    revenueData: []
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'UsersRound': return <UsersRound size={18} />;
      case 'Plus': return <Plus size={18} />;
      case 'AlertTriangle': return <AlertTriangle size={18} />;
      case 'Package':
      default:
        return <Package size={18} />;
    }
  };

  const topProducts = stats.topProducts?.length ? stats.topProducts : topProductsData;
  const weeklySales = stats.weeklySales?.length ? stats.weeklySales : defaultSalesData;
  const ordersTrend = stats.ordersTrend?.length ? stats.ordersTrend : ordersTrendData;
  const orderStatusFlow = stats.orderStatusFlow?.length ? stats.orderStatusFlow : defaultOrderStatusFlow;

  const branchPerformance = stats.branchPerformance?.length ? stats.branchPerformance : [
    { name: 'Downtown Hub', revenue: 8000, change: '+8%' },
    { name: 'Westside Mall', revenue: 6500, change: '+6.5%' },
    { name: 'Airport Terminal', revenue: 5000, change: '+5%' }
  ];

  const recentActivities = stats.recentActivities?.length ? stats.recentActivities.map((act: any) => ({
    id: act.id,
    title: act.title,
    time: act.time,
    icon: getIcon(act.iconType),
    color: act.color
  })) : activities;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, fontFamily: '"Plus Jakarta Sans", sans-serif', maxWidth: '1800px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Dashboard Overview</Typography>
          <Typography color="text.secondary" fontWeight={500}>Welcome back, Admin. Here's what's happening today.</Typography>
        </Box>
      </Box>

      {/* KPI GRID 1 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 3 }}>
        <KPICard title="TODAY'S REVENUE" value={`$${stats.revenueToday.toLocaleString()}`} icon={<DollarSign size={80} />} trend="up" trendVal="+12.5% vs yesterday" color="#10B981" />
        <KPICard title="ORDERS TODAY" value={stats.ordersToday} icon={<ShoppingCart size={80} />} trend="up" trendVal="+5.2% vs yesterday" color="#6366F1" />
        <KPICard title="CUSTOMER COUNT" value={stats.customerCount} icon={<UsersRound size={80} />} trend="up" trendVal="+8.1% vs last week" color="#3B82F6" />
        <KPICard title="STAFF ONLINE" value={stats.staffOnline} icon={<UsersRound size={80} />} color="#F59E0B" />
      </Box>

      {/* KPI GRID 2 */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 3 }}>
        <KPICard title="ACTIVE TABLES" value={stats.activeTables} icon={<Utensils size={80} />} trend="down" trendVal="Live Occupancy" color="#F59E0B" />
        <KPICard title="KITCHEN QUEUE" value={`${stats.kitchenQueue} Pending`} icon={<Clock size={80} />} color="#6366F1" />
        <KPICard title="PENDING PURCHASES" value={stats.pendingPurchases} icon={<Package size={80} />} color="#10B981" />
        <KPICard title="LOW STOCK ALERTS" value={`${stats.lowStockItems} Items`} icon={<AlertTriangle size={80} />} trend={stats.lowStockItems > 0 ? "down" : undefined} trendVal={stats.lowStockItems > 0 ? "Needs attention" : undefined} color="#F43F5E" />
      </Box>

      {/* CHARTS GRID */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr', xl: '1.5fr 1fr 1fr' }, gap: 3 }}>
        
        {/* Revenue Chart */}
        <Paper sx={{ p: 3, borderRadius: '20px', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6" fontWeight={800}>Revenue Chart (Today)</Typography>
          </Box>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.revenueData || []}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 600}} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', backgroundColor: '#1E293B', border: '1px solid #334155' }} />
                <Area type="monotone" dataKey="rev" stroke="#10B981" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Top Selling Products */}
        <Paper sx={{ p: 3, borderRadius: '20px', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <Typography variant="h6" fontWeight={800} mb={3}>Top Selling Products</Typography>
          <Box sx={{ height: 250, display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topProducts} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                  {topProducts.map((entry: any, index: number) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <RechartsTooltip contentStyle={{ borderRadius: '12px', backgroundColor: '#1E293B', border: '1px solid #334155' }} />
              </PieChart>
            </ResponsiveContainer>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, mt: 2 }}>
            {topProducts.map((s: any) => (
              <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ w: 10, h: 10, borderRadius: '50%', bgcolor: s.color, width: 10, height: 10 }} />
                <Typography variant="caption" color="text.secondary" fontWeight={700}>{s.name}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Sales Chart (Weekly) */}
        <Paper sx={{ p: 3, borderRadius: '20px', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <Typography variant="h6" fontWeight={800} mb={3}>Sales Chart (Weekly)</Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklySales}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 600}} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', backgroundColor: '#1E293B', border: '1px solid #334155' }} />
                <Line type="monotone" dataKey="sales" stroke="#6366F1" strokeWidth={4} dot={{ r: 4, fill: '#6366F1' }} />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Orders Trend */}
        <Paper sx={{ p: 3, borderRadius: '20px', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <Typography variant="h6" fontWeight={800} mb={3}>Orders Trend (By Shift)</Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ordersTrend}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 600}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 600}} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="orders" fill="#3B82F6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>

        {/* Real-Time Order Flow */}
        <Paper sx={{ p: 3, borderRadius: '20px', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <Typography variant="h6" fontWeight={800} mb={3}>Real-Time Order Flow</Typography>
          <Box sx={{ height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderStatusFlow} layout="vertical" margin={{ top: 0, right: 0, left: 20, bottom: 0 }}>
                <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 600}} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748B', fontWeight: 600}} />
                <RechartsTooltip contentStyle={{ borderRadius: '12px', backgroundColor: '#1E293B', border: '1px solid #334155', color: '#fff' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {orderStatusFlow.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Paper>
      </Box>

      {/* BOTTOM PANELS */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 3 }}>
        
        {/* Branch Performance */}
        <Paper sx={{ p: 3, borderRadius: '20px', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <Typography variant="h6" fontWeight={800} mb={3}>Branch Performance</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {branchPerformance.map((branch: any) => (
              <Box key={branch.id || branch.name} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 40, height: 40, bgcolor: 'rgba(99,102,241,0.1)', color: '#6366F1', fontWeight: 800 }}>
                    <Store size={20} />
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight={700}>{branch.name}</Typography>
                    <Typography variant="caption" color="text.secondary">Total Revenue: ${branch.revenue.toLocaleString()}</Typography>
                  </Box>
                </Box>
                <Typography variant="body1" fontWeight={800} color="success.main">{branch.change || '+0%'}</Typography>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Recent Activities */}
        <Paper sx={{ p: 3, borderRadius: '20px', background: 'rgba(30, 41, 59, 0.4)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ p: 1, bgcolor: 'rgba(99,102,241,0.1)', borderRadius: '10px' }}>
              <BellRing size={20} color="#6366F1" />
            </Box>
            <Typography variant="h6" fontWeight={800}>Recent Activities</Typography>
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {recentActivities.map((act: any) => (
              <Box key={act.id} sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ color: act.color, p: 1.5, bgcolor: `${act.color}15`, borderRadius: '12px', height: 'fit-content' }}>
                  {act.icon}
                </Box>
                <Box>
                  <Typography variant="body1" fontWeight={700}>{act.title}</Typography>
                  <Typography variant="body2" color="text.secondary" fontWeight={600}>{act.time}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Paper>

      </Box>

    </Box>
  );
}
