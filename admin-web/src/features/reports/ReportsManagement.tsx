import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, CircularProgress, MenuItem, Select, FormControl
} from '@mui/material';
import { Download, Printer, Filter, DollarSign, ShoppingCart, Activity, MapPin } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';

export default function ReportsManagement() {
  const [dateRange, setDateRange] = useState('Today');
  const [selectedBranch, setSelectedBranch] = useState('All');

  const { data: branches } = useQuery({
    queryKey: ['branchesList'],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/branches');
      return res.data.data;
    }
  });

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['salesReport', dateRange, selectedBranch],
    queryFn: async () => {
      let params: Record<string, string> = {};
      const today = new Date();
      if (dateRange === 'Today') {
        const start = new Date(today.setHours(0,0,0,0)).toISOString();
        const end = new Date(today.setHours(23,59,59,999)).toISOString();
        params = { startDate: start, endDate: end };
      } else if (dateRange === 'Yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const start = new Date(yesterday.setHours(0,0,0,0)).toISOString();
        const end = new Date(yesterday.setHours(23,59,59,999)).toISOString();
        params = { startDate: start, endDate: end };
      } else if (dateRange === 'This Week') {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        start.setHours(0,0,0,0);
        params = { startDate: start.toISOString(), endDate: new Date().toISOString() };
      } else if (dateRange === 'This Month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        params = { startDate: start.toISOString(), endDate: new Date().toISOString() };
      }
      
      if (selectedBranch !== 'All') {
        params.branchId = selectedBranch;
      }

      const res = await axiosClient.get('/reports/sales', { params });
      return res.data.data;
    }
  });

  // Real-time: auto-refresh sales report when orders are completed/settled
  useSocketEvent('order.completed', ['salesReport']);
  useSocketEvent('order.settled', ['salesReport']);

  const orders = salesData || [];
  const totalRevenue = orders.reduce((sum: number, order: any) => sum + order.total, 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Process data for the chart
  const chartData = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const grouped: Record<string, number> = {};
    orders.forEach((order: any) => {
      const date = new Date(order.createdAt);
      let key = '';
      if (dateRange === 'Today' || dateRange === 'Yesterday') {
        key = `${date.getHours().toString().padStart(2, '0')}:00`;
      } else {
        key = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
      grouped[key] = (grouped[key] || 0) + order.total;
    });
    return Object.keys(grouped).sort().map(key => ({
      name: key,
      sales: grouped[key]
    }));
  }, [orders, dateRange]);

  const handleExportPDF = async () => {
    try {
      // @ts-ignore
      const { default: jsPDF } = await import('jspdf');
      // @ts-ignore
      const { default: autoTable } = await import('jspdf-autotable');
      
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text(`Sales Report - ${dateRange}`, 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 32);
      doc.text(`Total Revenue: $${totalRevenue.toFixed(2)}`, 14, 40);
      doc.text(`Total Orders: ${orders.length}`, 14, 48);

      const tableColumn = ["Date", "Order ID", "Type", "Subtotal", "Tax", "Total"];
      const tableRows = orders.map((order: any) => [
        new Date(order.createdAt).toLocaleString(),
        `#${order.id.slice(0,8).toUpperCase()}`,
        order.type,
        `$${(order.subtotal || 0).toFixed(2)}`,
        `$${(order.taxAmount || 0).toFixed(2)}`,
        `$${order.total.toFixed(2)}`
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 60,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [99, 102, 241] }
      });

      doc.save(`sales_report_${dateRange.replace(' ', '_').toLowerCase()}.pdf`);
    } catch (error) {
      console.error("Please install jspdf and jspdf-autotable first", error);
      alert("PDF Export dependencies missing. Please check terminal.");
    }
  };

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, fontSize: { xs: '1.5rem', md: '2.125rem' } }}>Reports & Analytics</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Generate financial reports, end-of-day summaries, and tax calculations.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', md: 'auto' } }}>
          <Button variant="outlined" startIcon={<Printer size={18} />} sx={{ flex: { xs: 1, md: 'none' }, borderRadius: '12px', textTransform: 'none', fontWeight: 700, borderColor: 'rgba(255,255,255,0.1)', color: 'text.primary' }}>
            Print Report
          </Button>
          <Button onClick={handleExportPDF} variant="contained" startIcon={<Download size={18} />} sx={{ flex: { xs: 1, md: 'none' }, borderRadius: '12px', textTransform: 'none', fontWeight: 700, bgcolor: '#6366F1', '&:hover': { bgcolor: '#4F46E5' } }}>
            Export PDF
          </Button>
        </Box>
      </Box>

      {/* Analytics Summary */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 4 }}>
        <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
            <DollarSign size={32} />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={700}>Total Revenue</Typography>
            <Typography variant="h4" fontWeight={800}>${totalRevenue.toFixed(2)}</Typography>
          </Box>
        </Paper>
        <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}>
            <ShoppingCart size={32} />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={700}>Total Orders</Typography>
            <Typography variant="h4" fontWeight={800}>{orders.length}</Typography>
          </Box>
        </Paper>
        <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
            <Activity size={32} />
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary" fontWeight={700}>Avg Order Value</Typography>
            <Typography variant="h4" fontWeight={800}>${avgOrderValue.toFixed(2)}</Typography>
          </Box>
        </Paper>
      </Box>

      {/* Sales Trend Chart */}
      <Paper sx={{ p: 3, mb: 4, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.02)' }}>
        <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Sales Trend</Typography>
        <Box sx={{ width: '100%', height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} axisLine={false} tickLine={false} />
              <YAxis stroke="rgba(255,255,255,0.5)" tick={{fill: 'rgba(255,255,255,0.5)'}} axisLine={false} tickLine={false} tickFormatter={(val) => `$${val}`} />
              <RechartsTooltip 
                contentStyle={{ backgroundColor: '#1E293B', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                itemStyle={{ color: '#6366F1', fontWeight: 700 }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="sales" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* Date Filters */}
      <Paper sx={{ p: 2, mb: 4, borderRadius: '16px', display: 'flex', flexWrap: 'wrap', gap: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {['Today', 'Yesterday', 'This Week', 'This Month', 'Custom Range'].map((range) => (
          <Button 
            key={range}
            variant={dateRange === range ? 'contained' : 'outlined'}
            onClick={() => setDateRange(range)}
            sx={{ 
              borderRadius: '10px', 
              textTransform: 'none', 
              fontWeight: 700,
              bgcolor: dateRange === range ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: 'text.primary',
              borderColor: 'transparent',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
            }}
          >
            {range}
          </Button>
        ))}
        </Box>
        <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'block' } }} />
        
        {/* Branch Selector */}
        <Box sx={{ display: 'flex', gap: 2, width: { xs: '100%', md: 'auto' } }}>
        <FormControl size="small" sx={{ minWidth: { xs: '100%', md: 200 } }}>
          <Select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            displayEmpty
            sx={{ 
              borderRadius: '10px', 
              color: '#fff', 
              bgcolor: 'rgba(255,255,255,0.05)',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
              '& .MuiSvgIcon-root': { color: '#fff' }
            }}
            startAdornment={<MapPin size={18} color="#94A3B8" style={{ marginRight: 8, marginLeft: 8 }} />}
          >
            <MenuItem value="All">All Branches</MenuItem>
            {branches?.map((b: any) => (
              <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button startIcon={<Filter size={18} />} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none', width: { xs: '100%', md: 'auto' } }}>
          More Filters
        </Button>
        </Box>
      </Paper>

      {/* Sales Report Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflowX: 'auto' }}>
        <Table sx={{ minWidth: 600 }}>
          <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Order ID</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Subtotal</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Tax</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary', textAlign: 'right' }}>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
            ) : orders.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, fontWeight: 700, color: 'text.secondary' }}>No sales found for this period.</TableCell></TableRow>
            ) : orders.map((order: any) => (
              <TableRow key={order.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ fontWeight: 600 }}>{new Date(order.createdAt).toLocaleString()}</TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#6366F1' }}>#{order.id.slice(0,8).toUpperCase()}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{order.type}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>${(order.subtotal || 0).toFixed(2)}</TableCell>
                <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>${(order.taxAmount || 0).toFixed(2)}</TableCell>
                <TableCell sx={{ fontWeight: 800, textAlign: 'right', color: '#10B981' }}>${order.total.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
