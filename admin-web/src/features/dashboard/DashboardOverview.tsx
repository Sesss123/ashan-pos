import { Grid, Card, CardContent, Typography, Box } from '@mui/material';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const mockData = [
  { name: 'Mon', revenue: 4000 },
  { name: 'Tue', revenue: 3000 },
  { name: 'Wed', revenue: 2000 },
  { name: 'Thu', revenue: 2780 },
  { name: 'Fri', revenue: 1890 },
  { name: 'Sat', revenue: 2390 },
  { name: 'Sun', revenue: 3490 },
];

export default function DashboardOverview() {
  return (
    <Box>
      <Grid container spacing={3}>
        {/* KPI Card */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                <Typography color="text.secondary" variant="subtitle2">Total Revenue</Typography>
                <Box sx={{ p: 1, bgcolor: 'rgba(94, 106, 210, 0.1)', borderRadius: 2 }}>
                  <AttachMoneyIcon color="primary" fontSize="small" />
                </Box>
              </Box>
              <Typography variant="h3" sx={{ mb: 1 }}>$124,500.00</Typography>
              <Typography variant="body2" color="success.main" fontWeight="bold">+12.5% vs last month</Typography>
            </CardContent>
          </Card>
        </Grid>
        
        {/* Placeholder KPI Cards */}
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography color="text.secondary" variant="subtitle2">Active Orders</Typography>
              <Typography variant="h3" sx={{ mt: 4 }}>342</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ p: 3 }}>
              <Typography color="text.secondary" variant="subtitle2">Low Stock Alerts</Typography>
              <Typography variant="h3" color="error.main" sx={{ mt: 4 }}>12</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Revenue Chart */}
        <Grid item xs={12}>
          <Card sx={{ mt: 2 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 4 }}>Revenue Trend</Typography>
              <Box sx={{ height: 300, width: '100%' }}>
                <ResponsiveContainer>
                  <AreaChart data={mockData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5E6AD2" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#5E6AD2" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip contentStyle={{ backgroundColor: '#141414', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    <Area type="monotone" dataKey="revenue" stroke="#5E6AD2" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
