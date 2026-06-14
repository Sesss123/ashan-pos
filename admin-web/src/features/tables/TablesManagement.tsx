import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, MenuItem, CircularProgress, Chip 
} from '@mui/material';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { axiosClient as api } from '../../shared/api/axiosClient';
import { socketClient } from '../../realtime/socketClient';

interface RestaurantTable {
  id: string;
  name: string;
  branchId: string | null;
  status: string;
}

export default function TablesManagement() {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    status: 'Available'
  });

  useEffect(() => {
    fetchTables();
    
    const socket = socketClient.getSocket();
    if (socket) {
      socket.on('table.updated', () => {
        fetchTables();
      });
    }
  }, []);

  const fetchTables = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/tables');
      setTables(data.data);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
    setLoading(false);
  };

  const handleOpenDialog = (table?: RestaurantTable) => {
    if (table) {
      setEditingTable(table);
      setFormData({ name: table.name, status: table.status });
    } else {
      setEditingTable(null);
      setFormData({ name: '', status: 'Available' });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => setOpenDialog(false);

  const handleSubmit = async () => {
    try {
      if (editingTable) {
        await api.put(`/tables/${editingTable.id}`, formData);
      } else {
        await api.post('/tables', formData);
      }
      fetchTables();
      handleCloseDialog();
    } catch (error) {
      console.error('Failed to save table:', error);
      alert('Failed to save table');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this table?')) {
      try {
        await api.delete(`/tables/${id}`);
        fetchTables();
      } catch (error) {
        console.error('Failed to delete table:', error);
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ color: 'text.primary', fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            Table Management
          </Typography>
          <Typography sx={{ color: 'text.secondary', mt: 1 }}>
            Manage restaurant tables and current statuses
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenDialog()}
          sx={{ 
            bgcolor: '#6366F1', 
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 700,
            px: 3,
            boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            '&:hover': { bgcolor: '#4F46E5' }
          }}
        >
          Add Table
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ bgcolor: '#111827', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
            <TableRow>
              <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Table Name</TableCell>
              <TableCell sx={{ color: '#94A3B8', fontWeight: 600 }}>Status</TableCell>
              <TableCell align="right" sx={{ color: '#94A3B8', fontWeight: 600 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4 }}>
                  <CircularProgress size={32} sx={{ color: '#6366F1' }} />
                </TableCell>
              </TableRow>
            ) : tables.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ py: 4, color: '#64748B' }}>
                  No tables found. Add your first table.
                </TableCell>
              </TableRow>
            ) : (
              tables.map((table) => (
                <TableRow key={table.id} sx={{ '&:last-child td': { border: 0 } }}>
                  <TableCell sx={{ color: '#E2E8F0', fontWeight: 600 }}>{table.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={table.status} 
                      size="small"
                      sx={{ 
                        bgcolor: table.status === 'Available' ? 'rgba(16,185,129,0.1)' : 
                                table.status === 'Occupied' ? 'rgba(244,63,94,0.1)' : 'rgba(245,158,11,0.1)',
                        color: table.status === 'Available' ? '#10B981' : 
                               table.status === 'Occupied' ? '#F43F5E' : '#F59E0B',
                        fontWeight: 700,
                        borderRadius: '6px'
                      }} 
                    />
                  </TableCell>
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => handleOpenDialog(table)} sx={{ color: '#6366F1', mr: 1 }}>
                      <Edit2 size={18} />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDelete(table.id)} sx={{ color: '#F43F5E' }}>
                      <Trash2 size={18} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleCloseDialog} PaperProps={{ sx: { bgcolor: '#1E293B', color: '#fff', borderRadius: '16px', minWidth: 400 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingTable ? 'Edit Table' : 'Add New Table'}</DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            fullWidth
            label="Table Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 3 }}
            InputLabelProps={{ style: { color: '#94A3B8' } }}
            InputProps={{ style: { color: '#fff' } }}
          />
          <TextField
            fullWidth
            select
            label="Status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            InputLabelProps={{ style: { color: '#94A3B8' } }}
            InputProps={{ style: { color: '#fff' } }}
          >
            <MenuItem value="Available">Available</MenuItem>
            <MenuItem value="Occupied">Occupied</MenuItem>
            <MenuItem value="Reserved">Reserved</MenuItem>
            <MenuItem value="Cleaning">Cleaning</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={handleCloseDialog} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            sx={{ bgcolor: '#6366F1', '&:hover': { bgcolor: '#4F46E5' }, borderRadius: '8px' }}
          >
            {editingTable ? 'Save Changes' : 'Create Table'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
