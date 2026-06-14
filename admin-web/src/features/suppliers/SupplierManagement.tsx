import { Search, Plus, Edit2, FileText, Mail, Phone, MapPin, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useNavigate } from 'react-router-dom';
import { useSocketEvent } from '../../realtime/socketHooks';
import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, TextField,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Chip, Snackbar, Alert
} from '@mui/material';


interface Supplier {
  id: string;
  name: string;
  contact: string;
  email?: string;
  phone?: string;
  address?: string;
  creditLimit: number;
  outstandingBalance: number;
  orders?: any[];
}

export default function SupplierManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  // Delete Confirmation Dialog State
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  
  // Snackbar feedback state
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const showToast = (message: string, severity: 'success' | 'error' = 'success') => setToast({ open: true, message, severity });

  // Form State
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [creditLimit, setCreditLimit] = useState('0');

  const queryClient = useQueryClient();

  // Fetch all suppliers
  const { data: suppliers, isLoading } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await axiosClient.get('/supplier/suppliers');
      return res.data.data;
    }
  });

  // Create Supplier Mutation
  const createSupplierMutation = useMutation({
    mutationFn: (newSupplier: any) => axiosClient.post('/supplier/suppliers', newSupplier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      handleCloseModal();
      showToast('Supplier created successfully!');
    },
    onError: (err: any) => showToast(err.response?.data?.message || 'Failed to create supplier', 'error')
  });

  // Update Supplier Mutation — correctly uses PUT /supplier/suppliers/:id
  const updateSupplierMutation = useMutation({
    mutationFn: (data: { id: string; supplier: any }) =>
      axiosClient.put(`/supplier/suppliers/${data.id}`, data.supplier),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      handleCloseModal();
      showToast('Supplier updated successfully!');
    },
    onError: (err: any) => showToast(err.response?.data?.message || 'Failed to update supplier', 'error')
  });

  // Delete Supplier Mutation — Gap #1 Fix
  const deleteSupplierMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/supplier/suppliers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setDeleteTarget(null);
      showToast('Supplier deleted successfully!');
    },
    onError: (err: any) => {
      setDeleteTarget(null);
      showToast(err.response?.data?.message || 'Failed to delete supplier', 'error');
    }
  });

  // Real-time: invalidate suppliers list when backend emits updates
  useSocketEvent('supplier.created', ['suppliers']);
  useSocketEvent('supplier.updated', ['suppliers']);
  useSocketEvent('purchase.received', ['suppliers']); // balance changes on PO receive

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setName(supplier.name);
      setContact(supplier.contact);
      setEmail(supplier.email || '');
      setPhone(supplier.phone || '');
      setAddress(supplier.address || '');
      setCreditLimit(supplier.creditLimit.toString());
    } else {
      setEditingSupplier(null);
      setName('');
      setContact('');
      setEmail('');
      setPhone('');
      setAddress('');
      setCreditLimit('0');
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingSupplier(null);
  };

  const handleSave = () => {
    const supplierData = {
      name,
      contact,
      email: email || null,
      phone: phone || null,
      address: address || null,
      creditLimit: parseFloat(creditLimit) || 0
    };

    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, supplier: supplierData });
    } else {
      createSupplierMutation.mutate(supplierData);
    }
  };

  const filteredSuppliers = suppliers?.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Supplier Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Manage vendors, procurement credit, and track outstanding supplier balances.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenModal()}
          sx={{ 
            borderRadius: '12px', textTransform: 'none', px: 3, py: 1.5,
            fontWeight: 700, bgcolor: '#6366F1', boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            '&:hover': { bgcolor: '#4F46E5' }
          }}
        >
          Add Supplier
        </Button>
      </Box>

      {/* SEARCH AND FILTERS */}
      <Paper sx={{ p: 2.5, mb: 4, borderRadius: '16px', display: 'flex', gap: 2, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
        <TextField
          placeholder="Search suppliers by name, email or contact..."
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search size={18} color="#64748B" /></InputAdornment>,
            sx: { borderRadius: '10px', fontWeight: 600 }
          }}
          sx={{ maxWidth: 400 }}
        />
        <Box sx={{ flexGrow: 1 }} />
        <Button 
          variant="outlined" 
          startIcon={<FileText size={18} />} 
          onClick={() => navigate('/purchases')}
          sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, borderColor: 'rgba(255,255,255,0.1)', color: 'text.primary' }}
        >
          Purchase Orders
        </Button>
      </Paper>

      {/* SUPPLIERS TABLE */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Supplier Name</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Primary Contact</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Contact Details</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Credit Limit</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Outstanding Balance</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary', textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
            ) : filteredSuppliers.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, fontWeight: 700, color: 'text.secondary' }}>No suppliers found.</TableCell></TableRow>
            ) : filteredSuppliers.map((supplier) => (
              <TableRow key={supplier.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell>
                  <Typography sx={{ fontWeight: 700 }}>{supplier.name}</Typography>
                  {supplier.address && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, color: 'text.secondary' }}>
                      <MapPin size={12} />
                      <Typography variant="caption">{supplier.address}</Typography>
                    </Box>
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{supplier.contact}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {supplier.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <Mail size={12} />
                        <Typography variant="caption">{supplier.email}</Typography>
                      </Box>
                    )}
                    {supplier.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <Phone size={12} />
                        <Typography variant="caption">{supplier.phone}</Typography>
                      </Box>
                    )}
                  </Box>
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>
                  ${(supplier.creditLimit || 0).toFixed(2)}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={`$${(supplier.outstandingBalance || 0).toFixed(2)}`}
                    size="small"
                    sx={{ 
                      fontWeight: 800, 
                      bgcolor: (supplier.outstandingBalance || 0) > 0 ? 'rgba(244, 63, 94, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                      color: (supplier.outstandingBalance || 0) > 0 ? '#F43F5E' : '#10B981',
                      borderRadius: '8px'
                    }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <IconButton onClick={() => handleOpenModal(supplier)} sx={{ color: '#6366F1', bgcolor: 'rgba(99,102,241,0.1)', borderRadius: '8px', mr: 1 }} size="small" title="Edit Supplier">
                    <Edit2 size={16} />
                  </IconButton>
                  <IconButton 
                    onClick={() => setDeleteTarget(supplier)} 
                    sx={{ color: '#F43F5E', bgcolor: 'rgba(244,63,94,0.1)', borderRadius: '8px' }} 
                    size="small"
                    title="Delete Supplier"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* CREATE/EDIT MODAL */}
      <Dialog 
        open={openModal} 
        onClose={handleCloseModal} 
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#1E293B', color: '#fff', minWidth: 500, border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <TextField 
            label="Supplier / Company Name" 
            fullWidth 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} 
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} 
          />
          <TextField 
            label="Contact Person Name" 
            fullWidth 
            value={contact} 
            onChange={(e) => setContact(e.target.value)} 
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} 
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} 
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField 
              label="Email Address" 
              type="email"
              fullWidth 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} 
              InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} 
            />
            <TextField 
              label="Phone Number" 
              fullWidth 
              value={phone} 
              onChange={(e) => setPhone(e.target.value)} 
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} 
              InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} 
            />
          </Box>
          <TextField 
            label="Business Address" 
            fullWidth 
            value={address} 
            onChange={(e) => setAddress(e.target.value)} 
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} 
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} 
          />
          <TextField 
            label="Procurement Credit Limit ($)" 
            type="number"
            fullWidth 
            value={creditLimit} 
            onChange={(e) => setCreditLimit(e.target.value)} 
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} 
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} 
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseModal} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending} 
            variant="contained" 
            sx={{ bgcolor: '#6366F1', fontWeight: 700, textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#4F46E5' } }}
          >
            {editingSupplier ? 'Save Changes' : 'Create Supplier'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG — Gap #1 Fix */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#1E293B', color: '#fff', minWidth: 360, border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Supplier</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#94A3B8', fontWeight: 600 }}>
            Are you sure you want to delete <strong style={{ color: '#fff' }}>{deleteTarget?.name}</strong>?
          </Typography>
          <Typography variant="caption" sx={{ color: '#F43F5E', mt: 1, display: 'block' }}>
            ⚠️ This action cannot be undone. All related data will be removed.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button
            onClick={() => deleteTarget && deleteSupplierMutation.mutate(deleteTarget.id)}
            disabled={deleteSupplierMutation.isPending}
            variant="contained"
            sx={{ bgcolor: '#F43F5E', fontWeight: 700, textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#E11D48' } }}
          >
            {deleteSupplierMutation.isPending ? 'Deleting...' : 'Yes, Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* TOAST SNACKBAR — Gap #6 Fix */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast(t => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast(t => ({ ...t, open: false }))} sx={{ fontWeight: 700, borderRadius: '10px' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>

  );
}
