import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress
} from '@mui/material';
import { Search, Plus, Edit2, History, AlertTriangle, Trash2, Truck } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';
import InventoryTransfer from './InventoryTransfer';

interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  minStock: number;
  unit: string;
  unitCost: number;
}

export default function InventoryManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [openTransferModal, setOpenTransferModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [minStock, setMinStock] = useState('0');
  const [unit, setUnit] = useState('pcs');
  const [unitCost, setUnitCost] = useState('0');

  const queryClient = useQueryClient();

  // Real-time: auto-refresh inventory on stock movement events
  useSocketEvent('inventory.updated', ['inventoryDashboard']);
  useSocketEvent('inventory.low_stock', ['inventoryDashboard']);
  useSocketEvent('inventory.item_created', ['inventoryDashboard']);
  useSocketEvent('inventory.item_deleted', ['inventoryDashboard']);
  useSocketEvent('purchase.received', ['inventoryDashboard']); // PO receive updates stock

  const [openLogsModal, setOpenLogsModal] = useState(false);
  const { data: timelineLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ['inventoryTimeline'],
    queryFn: async () => {
      const res = await axiosClient.get('/inventory/timeline');
      return res.data;
    },
    enabled: openLogsModal
  });

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['inventoryDashboard'],
    queryFn: async () => {
      const res = await axiosClient.get('/inventory/dashboard');
      return res.data;
    }
  });

  const createItemMutation = useMutation({
    mutationFn: (newItem: any) => axiosClient.post('/inventory/items', newItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
      handleCloseModal();
    }
  });

  const updateItemMutation = useMutation({
    mutationFn: (data: { id: string, item: any }) => axiosClient.put(`/inventory/items/${data.id}`, data.item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
      handleCloseModal();
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/inventory/items/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
    }
  });

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setSku(item.sku || '');
      setQuantity(item.quantity.toString());
      setMinStock(item.minStock.toString());
      setUnit(item.unit);
      setUnitCost(item.unitCost.toString());
    } else {
      setEditingItem(null);
      setName('');
      setSku('');
      setQuantity('0');
      setMinStock('0');
      setUnit('pcs');
      setUnitCost('0');
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    const itemData = {
      name,
      sku,
      quantity: parseInt(quantity, 10),
      minStock: parseInt(minStock, 10),
      unit,
      unitCost: parseFloat(unitCost)
    };

    if (editingItem) {
      updateItemMutation.mutate({ id: editingItem.id, item: itemData });
    } else {
      createItemMutation.mutate(itemData);
    }
  };

  const items: InventoryItem[] = dashboardData?.items || [];
  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getStatus = (item: InventoryItem) => {
    if (item.quantity === 0) return { label: 'Critical', color: '#F43F5E', bgcolor: 'rgba(244, 63, 94, 0.1)' };
    if (item.quantity <= item.minStock) return { label: 'Low Stock', color: '#F59E0B', bgcolor: 'rgba(245, 158, 11, 0.1)' };
    return { label: 'Optimal', color: '#10B981', bgcolor: 'rgba(16, 185, 129, 0.1)' };
  };

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: { xs: '1.5rem', md: '2.125rem' } }}>Inventory Control</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            Monitor real-time stock levels, shortages, and movement history.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenModal()}
          sx={{ 
            borderRadius: '12px', textTransform: 'none', px: 3, py: 1.5,
            fontWeight: 700, bgcolor: '#6366F1', boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            '&:hover': { bgcolor: '#4F46E5' },
            width: { xs: '100%', md: 'auto' }
          }}
        >
          Add Raw Material
        </Button>
      </Box>

      {/* KPIs Summary */}
      {!isLoading && dashboardData?.kpis && (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={700}>Total Items</Typography>
            <Typography variant="h4" fontWeight={800}>{dashboardData.kpis.totalItems}</Typography>
          </Paper>
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={700}>Low Stock Items</Typography>
            <Typography variant="h4" fontWeight={800} color="#F59E0B">{dashboardData.kpis.lowStockCount}</Typography>
          </Paper>
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={700}>Out of Stock</Typography>
            <Typography variant="h4" fontWeight={800} color="#F43F5E">{dashboardData.kpis.outOfStockCount}</Typography>
          </Paper>
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Typography variant="body2" color="text.secondary" fontWeight={700}>Total Value</Typography>
            <Typography variant="h4" fontWeight={800} color="#10B981">${dashboardData.kpis.totalValue.toFixed(2)}</Typography>
          </Paper>
        </Box>
      )}

      <Paper sx={{ 
        p: 2.5, mb: 4, borderRadius: '16px', display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2,
        border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
      }}>
        <TextField
          placeholder="Search materials by name or SKU..."
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search size={18} color="#64748B" /></InputAdornment>,
            sx: { borderRadius: '10px', fontWeight: 600 }
          }}
          sx={{ maxWidth: { xs: '100%', md: 400 } }}
        />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<Truck size={18} />} 
            onClick={() => setOpenTransferModal(true)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, borderColor: 'rgba(255,255,255,0.1)', color: 'text.primary' }}
          >
            Transfer Stock
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<History size={18} />} 
            onClick={() => setOpenLogsModal(true)}
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, borderColor: 'rgba(255,255,255,0.1)', color: 'text.primary' }}
          >
            Movement Logs
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: '16px', overflowX: 'auto', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
        <Table sx={{ minWidth: 800 }}>
          <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Material Name</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>SKU</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Current Stock</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Min Stock</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Unit Cost</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Health</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary', textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, fontWeight: 700, color: 'text.secondary' }}>No items found.</TableCell></TableRow>
            ) : filteredItems.map((item) => {
              const status = getStatus(item);
              return (
                <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 700 }}>{item.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{item.sku || 'N/A'}</TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>{item.quantity} <Typography component="span" variant="caption" color="text.secondary">{item.unit}</Typography></TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{item.minStock} {item.unit}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>${item.unitCost.toFixed(2)}</TableCell>
                  <TableCell>
                    <Chip 
                      icon={status.label !== 'Optimal' ? <AlertTriangle size={14} /> : undefined}
                      label={status.label} 
                      size="small" 
                      sx={{ 
                        borderRadius: '8px', fontWeight: 800,
                        bgcolor: status.bgcolor, color: status.color,
                        '& .MuiChip-icon': { color: 'inherit', ml: 1 }
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <IconButton onClick={() => handleOpenModal(item)} sx={{ color: '#6366F1', bgcolor: 'rgba(99,102,241,0.1)', mr: 1, borderRadius: '8px' }} size="small">
                      <Edit2 size={16} />
                    </IconButton>
                    <IconButton onClick={() => { if(confirm('Delete this item?')) deleteItemMutation.mutate(item.id); }} sx={{ color: '#F43F5E', bgcolor: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px' }} size="small">
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* CREATE/EDIT MODAL */}
      <Dialog open={openModal} onClose={handleCloseModal} PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#1E293B', color: '#fff', minWidth: 400, border: '1px solid rgba(255,255,255,0.1)' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingItem ? 'Edit Raw Material' : 'Add Raw Material'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
          <TextField label="SKU (Optional)" fullWidth value={sku} onChange={(e) => setSku(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Current Quantity" type="number" fullWidth value={quantity} onChange={(e) => setQuantity(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
            <TextField label="Minimum Stock" type="number" fullWidth value={minStock} onChange={(e) => setMinStock(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Unit (e.g., kg, pcs, L)" fullWidth value={unit} onChange={(e) => setUnit(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
            <TextField label="Unit Cost ($)" type="number" fullWidth value={unitCost} onChange={(e) => setUnitCost(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseModal} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleSave} disabled={createItemMutation.isPending || updateItemMutation.isPending} variant="contained" sx={{ bgcolor: '#6366F1', fontWeight: 700, textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#4F46E5' } }}>
            {editingItem ? 'Save Changes' : 'Create Material'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* MOVEMENT LOGS MODAL */}
      <Dialog 
        open={openLogsModal} 
        onClose={() => setOpenLogsModal(false)} 
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#1E293B', color: '#fff', minWidth: 600, border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          Inventory Movement History
        </DialogTitle>
        <DialogContent sx={{ minHeight: 300, maxHeight: 500, overflowY: 'auto' }}>
          {isLoadingLogs ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
          ) : !timelineLogs || timelineLogs.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 5, fontWeight: 700 }}>No stock movements logged yet.</Typography>
          ) : (
            <TableContainer component={Paper} sx={{ bgcolor: 'transparent', boxShadow: 'none' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>Material</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>Quantity</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 700 }}>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {timelineLogs.map((log: any) => (
                    <TableRow key={log.id}>
                      <TableCell sx={{ color: '#fff', fontWeight: 700 }}>{log.item?.name || 'Unknown Item'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={log.type} 
                          size="small" 
                          sx={{ 
                            fontWeight: 800, 
                            bgcolor: log.type === 'IN' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                            color: log.type === 'IN' ? '#10B981' : '#F43F5E'
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#fff', fontWeight: 700 }}>{log.quantity} {log.item?.unit || 'pcs'}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>{new Date(log.createdAt).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setOpenLogsModal(false)} variant="contained" sx={{ bgcolor: '#6366F1', textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#4F46E5' } }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* TRANSFER MODAL */}
      <InventoryTransfer 
        open={openTransferModal} 
        onClose={() => setOpenTransferModal(false)} 
        inventoryItems={items}
      />
    </Box>
  );
}
