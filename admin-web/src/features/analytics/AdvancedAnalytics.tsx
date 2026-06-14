import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Paper, CircularProgress, Grid } from '@mui/material';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, BarChart2 } from 'lucide-react';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';

export default function AdvancedAnalytics() {
  const { data: forecastData, isLoading: isLoadingForecast } = useQuery({
    queryKey: ['aiForecast'],
    queryFn: async () => {
      const res = await axiosClient.get('/reports/ai-forecast');
      return res.data.data;
    }
  });

  const { data: branchData, isLoading: isLoadingBranches } = useQuery({
    queryKey: ['multiBranchAnalytics'],
    queryFn: async () => {
      const res = await axiosClient.get('/reports/multi-branch');
      return res.data.data;
    }
  });

  // Real-time: refresh analytics when orders settle across branches
  useSocketEvent('order.completed', ['aiForecast', 'multiBranchAnalytics']);
  useSocketEvent('order.settled', ['aiForecast', 'multiBranchAnalytics']);
  useSocketEvent('dashboard.stats.updated', ['aiForecast', 'multiBranchAnalytics']); // Gap #3 Fix
  useSocketEvent('purchase.received', ['multiBranchAnalytics']); // Gap #3 Fix


  if (isLoadingForecast || isLoadingBranches) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 1 }}>
          Enterprise Analytics
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
          AI Sales Forecasting and Multi-Branch Performance
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {/* AI Forecast Chart */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3, 
            bgcolor: 'rgba(30, 41, 59, 0.7)', 
            borderRadius: '24px', 
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Box sx={{ p: 1.5, bgcolor: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: '#6366F1' }}>
                <TrendingUp size={24} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>AI Sales Forecast (7 Days)</Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>Projected sales based on a 7-day moving average growth algorithm.</Typography>
              </Box>
            </Box>

            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecastData}>
                  <defs>
                    <linearGradient id="colorHistorical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="date" stroke="#94A3B8" tick={{ fill: '#94A3B8' }} />
                  <YAxis stroke="#94A3B8" tick={{ fill: '#94A3B8' }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="historical" name="Historical Baseline" stroke="#10B981" fillOpacity={1} fill="url(#colorHistorical)" />
                  <Area type="monotone" dataKey="predicted" name="AI Projected" stroke="#6366F1" fillOpacity={1} fill="url(#colorPredicted)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        {/* Multi-Branch Chart */}
        <Grid item xs={12}>
          <Paper sx={{ 
            p: 3, 
            bgcolor: 'rgba(30, 41, 59, 0.7)', 
            borderRadius: '24px', 
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(20px)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
              <Box sx={{ p: 1.5, bgcolor: 'rgba(236, 72, 153, 0.1)', borderRadius: '12px', color: '#EC4899' }}>
                <BarChart2 size={24} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>Multi-Branch Performance</Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>Total Sales aggregation across all enterprise branches.</Typography>
              </Box>
            </Box>

            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={branchData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                  <XAxis dataKey="name" stroke="#94A3B8" tick={{ fill: '#94A3B8' }} />
                  <YAxis stroke="#94A3B8" tick={{ fill: '#94A3B8' }} tickFormatter={(val) => `$${val}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff' }}
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  />
                  <Legend />
                  <Bar dataKey="totalSales" name="Total Revenue" fill="#EC4899" radius={[8, 8, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
