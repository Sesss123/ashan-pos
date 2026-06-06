import { Box, Typography, Paper, IconButton, Chip, Avatar, LinearProgress } from '@mui/material';
import { AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { 
  TrendingUp, TrendingDown, MoreVert, Restaurant, 
  Inventory, CheckCircle, Warning, NotificationsActive 
} from '@mui/icons-material';

// MOCK DATA
const revenueData = [
  { time: '10am', rev: 1200 }, { time: '12pm', rev: 3500 }, { time: '2pm', rev: 4800 },
  { time: '4pm', rev: 2900 }, { time: '6pm', rev: 6100 }, { time: '8pm', rev: 8900 },
];
const orderStatusData = [
  { name: 'Pending', value: 15, color: '#F59E0B' }, // Amber
  { name: 'Preparing', value: 24, color: '#6366F1' }, // Indigo
  { name: 'Ready', value: 8, color: '#10B981' }, // Emerald
];
const activities = [
  { id: 1, title: 'Purchase Order #8921 Created', time: '2 mins ago', icon: <Inventory fontSize="small" />, color: '#6366F1' },
  { id: 2, title: 'Wagyu Beef stock critically low (5 left)', time: '14 mins ago', icon: <Warning fontSize="small" />, color: '#F43F5E' },
  { id: 3, title: 'Table 14 Bill Settled ($142.50)', time: '28 mins ago', icon: <CheckCircle fontSize="small" />, color: '#10B981' },
];

export default function DashboardOverview() {
  return (
    <Box sx={{ 
      display: 'grid', 
      gridTemplateColumns: { xs: '1fr', lg: '1fr 320px' }, 
      gap: 4,
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      
      {/* MAIN LEFT COLUMN */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        
        {/* ROW 1: KPI CARDS */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 3 }}>
          {/* Revenue Card */}
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'background.paper' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600} mb={1}>Revenue Today</Typography>
            <Typography variant="h3" fontWeight={800} mb={1}>$14,289</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#10B981' }}>
              <TrendingUp fontSize="small" />
              <Typography variant="body2" fontWeight={600}>+12.5% vs yesterday</Typography>
            </Box>
          </Paper>

          {/* Orders Card */}
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'background.paper' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600} mb={1}>Orders Today</Typography>
            <Typography variant="h3" fontWeight={800} mb={1}>342</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#10B981' }}>
              <TrendingUp fontSize="small" />
              <Typography variant="body2" fontWeight={600}>+5.2% vs yesterday</Typography>
            </Box>
          </Paper>

          {/* Tables Card */}
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'background.paper' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600} mb={1}>Active Tables</Typography>
            <Typography variant="h3" fontWeight={800} mb={1}>24 / 30</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#F59E0B' }}>
              <TrendingDown fontSize="small" />
              <Typography variant="body2" fontWeight={600}>80% Occupancy</Typography>
            </Box>
          </Paper>

          {/* Inventory Card */}
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'background.paper' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={600} mb={1}>Inventory Health</Typography>
            <Typography variant="h3" fontWeight={800} mb={1}>94%</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#F43F5E' }}>
              <Warning fontSize="small" />
              <Typography variant="body2" fontWeight={600}>12 items low stock</Typography>
            </Box>
          </Paper>
        </Box>

        {/* ROW 2: MAIN ANALYTICS */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h6" fontWeight={700}>Revenue Analytics</Typography>
              <IconButton size="small"><MoreVert /></IconButton>
            </Box>
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', backgroundColor: '#121214', border: 'none' }} />
                  <Area type="monotone" dataKey="rev" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="h6" fontWeight={700} mb={3}>Order Status</Typography>
            <Box sx={{ height: 200, display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={orderStatusData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ borderRadius: '12px', backgroundColor: '#121214', border: 'none' }} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2 }}>
              {orderStatusData.map(s => (
                <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ w: 8, h: 8, borderRadius: '50%', bgcolor: s.color, width: 8, height: 8 }} />
                  <Typography variant="caption" color="text.secondary">{s.name}</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>

        {/* ROW 3: KITCHEN COMMAND & ROW 4: BRANCH PERFORMANCE */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="h6" fontWeight={700} mb={3}>Kitchen Command Center</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" fontWeight={600}>Preparing Orders</Typography>
                  <Typography variant="body2" fontWeight={700}>24</Typography>
                </Box>
                <LinearProgress variant="determinate" value={80} sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(99,102,241,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#6366F1' } }} />
              </Box>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" fontWeight={600}>Pending Orders</Typography>
                  <Typography variant="body2" fontWeight={700}>15</Typography>
                </Box>
                <LinearProgress variant="determinate" value={45} sx={{ height: 8, borderRadius: 4, bgcolor: 'rgba(245,158,11,0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#F59E0B' } }} />
              </Box>
            </Box>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="h6" fontWeight={700} mb={3}>Branch Performance</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {['Downtown Hub', 'Westside Mall', 'Airport Terminal'].map((branch, i) => (
                <Box key={branch} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark', fontSize: '0.8rem' }}>{i + 1}</Avatar>
                    <Typography variant="body2" fontWeight={600}>{branch}</Typography>
                  </Box>
                  <Typography variant="body2" fontWeight={700} color="success.main">+{(8 - i).toFixed(1)}%</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
        
      </Box>

      {/* RIGHT COLUMN: INSIGHTS PANEL */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        
        {/* Smart Notifications */}
        <Paper sx={{ p: 3, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'background.paper', flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <NotificationsActive color="primary" />
            <Typography variant="h6" fontWeight={700}>Smart Insights</Typography>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {activities.map(act => (
              <Box key={act.id} sx={{ display: 'flex', gap: 2 }}>
                <Box sx={{ mt: 0.5, color: act.color }}>
                  {act.icon}
                </Box>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{act.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{act.time}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
          
          <Box sx={{ mt: 4, p: 2, borderRadius: 3, bgcolor: 'rgba(99,102,241,0.1)', border: '1px dashed #6366F1' }}>
            <Typography variant="body2" fontWeight={700} color="primary.main" mb={0.5}>AI Prediction</Typography>
            <Typography variant="caption" color="text.secondary">
              Dinner rush is expected to be 15% heavier tonight due to a local concert. Recommend calling in 1 extra Waiter.
            </Typography>
          </Box>
        </Paper>

      </Box>

    </Box>
  );
}
