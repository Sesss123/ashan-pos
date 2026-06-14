import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, Typography, Paper, Grid, CircularProgress, Chip, Divider, Fade } from '@mui/material';
import { Activity, Clock, Utensils, Users, AlertCircle } from 'lucide-react';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';

const formatWaitTime = (createdAt: string) => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffSecs = Math.floor((diffMs % 60000) / 1000);
  return { mins: diffMins, secs: diffSecs, isLate: diffMins >= 15 };
};

const OrderCard = ({ order, statusColor }: any) => {
  const [time, setTime] = useState(() => formatWaitTime(order.createdAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(formatWaitTime(order.createdAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [order.createdAt]);

  const items = order.order?.items || [];
  const table = order.order?.table?.number || 'Takeaway';

  return (
    <Fade in={true}>
      <Paper sx={{ 
        p: 2, 
        mb: 2, 
        bgcolor: time.isLate ? 'rgba(244, 63, 94, 0.1)' : 'rgba(15, 23, 42, 0.6)', 
        border: `1px solid ${time.isLate ? 'rgba(244, 63, 94, 0.3)' : 'rgba(255,255,255,0.05)'}`,
        borderLeft: `4px solid ${time.isLate ? '#F43F5E' : statusColor}`, 
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box>
            <Typography variant="body1" sx={{ color: '#fff', fontWeight: 800 }}>#{order.orderId.substring(0, 6).toUpperCase()}</Typography>
            <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>Table {table}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: time.isLate ? '#F43F5E' : '#94A3B8', bgcolor: time.isLate ? 'rgba(244, 63, 94, 0.1)' : 'rgba(255,255,255,0.05)', px: 1, py: 0.5, borderRadius: '6px' }}>
            {time.isLate ? <AlertCircle size={14} /> : <Clock size={14} />}
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {time.mins.toString().padStart(2, '0')}:{time.secs.toString().padStart(2, '0')}
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 1, borderColor: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {items.map((item: any) => (
            <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" sx={{ color: '#CBD5E1', fontWeight: 500 }}>
                <span style={{ color: statusColor, fontWeight: 800, marginRight: '4px' }}>{item.quantity}x</span> 
                {item.product?.name || 'Unknown Item'}
              </Typography>
            </Box>
          ))}
        </Box>
      </Paper>
    </Fade>
  );
};

export default function LiveMonitors() {
  const { data: kitchenQueue, isLoading: loadingKitchen } = useQuery({
    queryKey: ['kitchenQueue'],
    queryFn: async () => {
      const res = await axiosClient.get('/kitchen/queue');
      return res.data.data;
    }
  });

  const { data: tables, isLoading: loadingTables } = useQuery({
    queryKey: ['liveTables'],
    queryFn: async () => {
      const res = await axiosClient.get('/pos/tables');
      return res.data.data;
    }
  });

  // Real-time updates
  useSocketEvent('kitchen.queue_updated', ['kitchenQueue']);
  useSocketEvent('table.updated', ['liveTables']);

  if (loadingKitchen || loadingTables) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    );
  }

  const pendingOrders = kitchenQueue?.filter((o: any) => o.status === 'Pending') || [];
  const preparingOrders = kitchenQueue?.filter((o: any) => o.status === 'Preparing') || [];

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ p: 1.5, bgcolor: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: '#6366F1' }}>
          <Activity size={24} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800 }}>Live Operations Monitor</Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8' }}>Real-time synchronization with POS and Kitchen.</Typography>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* Kitchen Monitor */}
        <Grid item xs={12} lg={7} xl={8}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(30, 41, 59, 0.7)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Utensils size={20} color="#F59E0B" />
              <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>Kitchen KDS Link</Typography>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#F59E0B', fontWeight: 800, letterSpacing: 1 }}>PENDING</Typography>
                  <Chip label={pendingOrders.length} size="small" sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', fontWeight: 800 }} />
                </Box>
                {pendingOrders.map((order: any) => <OrderCard key={order.id} order={order} statusColor="#F59E0B" />)}
                {pendingOrders.length === 0 && <Typography variant="caption" color="text.secondary">No pending orders.</Typography>}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#3B82F6', fontWeight: 800, letterSpacing: 1 }}>PREPARING</Typography>
                  <Chip label={preparingOrders.length} size="small" sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', fontWeight: 800 }} />
                </Box>
                {preparingOrders.map((order: any) => <OrderCard key={order.id} order={order} statusColor="#3B82F6" />)}
                {preparingOrders.length === 0 && <Typography variant="caption" color="text.secondary">No orders being prepared.</Typography>}
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Table Monitor */}
        <Grid item xs={12} lg={5} xl={4}>
          <Paper sx={{ p: 3, bgcolor: 'rgba(30, 41, 59, 0.7)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', height: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Users size={20} color="#10B981" />
                <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>Floor Plan / Tables</Typography>
              </Box>
              <Chip label={`${tables?.filter((t:any) => t.status==='Occupied').length || 0} / ${tables?.length || 0} Active`} size="small" sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontWeight: 800 }} />
            </Box>

            <Grid container spacing={2}>
              {tables?.map((table: any) => {
                const isOccupied = table.status === 'Occupied';
                return (
                  <Grid item xs={6} sm={4} lg={6} xl={4} key={table.id}>
                    <Fade in={true}>
                      <Paper sx={{ 
                        p: 2, 
                        textAlign: 'center',
                        bgcolor: isOccupied ? 'rgba(16, 185, 129, 0.05)' : 'rgba(15, 23, 42, 0.6)',
                        border: isOccupied ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(255,255,255,0.05)',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': { transform: 'translateY(-2px)', boxShadow: isOccupied ? '0 4px 12px rgba(16, 185, 129, 0.2)' : '0 4px 12px rgba(0,0,0,0.2)' }
                      }}>
                        <Typography variant="h5" sx={{ color: isOccupied ? '#10B981' : '#fff', fontWeight: 800 }}>{table.number}</Typography>
                        <Typography variant="caption" sx={{ color: isOccupied ? '#10B981' : '#94A3B8', fontWeight: 600 }}>{table.capacity} Pax</Typography>
                        <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.05)' }} />
                        <Chip 
                          label={table.status} 
                          size="small" 
                          sx={{ 
                            bgcolor: isOccupied ? '#10B981' : '#334155', 
                            color: '#fff', 
                            fontWeight: 800,
                            fontSize: '0.65rem',
                            letterSpacing: 0.5,
                            textTransform: 'uppercase'
                          }} 
                        />
                      </Paper>
                    </Fade>
                  </Grid>
                );
              })}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
