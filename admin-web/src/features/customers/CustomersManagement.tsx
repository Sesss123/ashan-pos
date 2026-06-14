import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress
} from '@mui/material';
import { Search, Plus, Edit2, Gift, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';

interface Customer {
  id: string;
  name: string;
  phone: string;
  credit: number;
  loyaltyPoints: number;
  creditHistories: any[];
}

export default function CustomersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Customer | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [credit, setCredit] = useState('0');
  const [loyaltyPoints, setLoyaltyPoints] = useState('0');

  // Credit Add Modal State
  const [openCreditModal, setOpenCreditModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [creditAmount, setCreditAmount] = useState('0');
  const [creditType, setCreditType] = useState('ADD'); // ADD or SETTLE
  const [creditNotes, setCreditNotes] = useState('');

  const queryClient = useQueryClient();

  // Real-time: auto-refresh customers on POS credit/loyalty events
  useSocketEvent('customer.created', ['customers']);
  useSocketEvent('customer.updated', ['customers']);
  useSocketEvent('customer.credit_settled', ['customers']);
  useSocketEvent('order.completed', ['customers']); // loyalty points update on order

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await axiosClient.get('/customers');
      return res.data.data;
    }
  });

  const createCustomerMutation = useMutation({
    mutationFn: (newCustomer: any) => axiosClient.post('/customers', newCustomer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      handleCloseModal();
    }
  });

  const updateCustomerMutation = useMutation({
    mutationFn: (data: { id: string, item: any }) => axiosClient.put(`/customers/${data.id}`, data.item),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      handleCloseModal();
    }
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/customers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
  });

  const addCreditMutation = useMutation({
    mutationFn: (data: { id: string, amount: number, type: string, notes: string }) => 
      axiosClient.post(`/customers/${data.id}/credit`, { amount: data.amount, type: data.type, notes: data.notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      handleCloseCreditModal();
    }
  });

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingItem(customer);
      setName(customer.name);
      setPhone(customer.phone);
      setCredit(customer.credit.toString());
      setLoyaltyPoints(customer.loyaltyPoints.toString());
    } else {
      setEditingItem(null);
      setName('');
      setPhone('');
      setCredit('0');
      setLoyaltyPoints('0');
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    const customerData = {
      name,
      phone,
      credit: parseFloat(credit),
      loyaltyPoints: parseInt(loyaltyPoints, 10)
    };

    if (editingItem) {
      updateCustomerMutation.mutate({ id: editingItem.id, item: customerData });
    } else {
      createCustomerMutation.mutate(customerData);
    }
  };

  const handleOpenCreditModal = (customer: Customer, type: string) => {
    setSelectedCustomer(customer);
    setCreditType(type);
    setCreditAmount('0');
    setCreditNotes('');
    setOpenCreditModal(true);
  };

  const handleCloseCreditModal = () => {
    setOpenCreditModal(false);
    setSelectedCustomer(null);
  };

  const handleSaveCredit = () => {
    if (selectedCustomer) {
      addCreditMutation.mutate({
        id: selectedCustomer.id,
        amount: parseFloat(creditAmount),
        type: creditType,
        notes: creditNotes
      });
    }
  };

  const filteredCustomers = customers?.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  ) || [];

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Customer Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Manage loyalty points, store credit, and customer records.
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
          Add Customer
        </Button>
      </Box>

      <Paper sx={{ p: 2.5, mb: 4, borderRadius: '16px', display: 'flex', gap: 2, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
        <TextField
          placeholder="Search customers by name or phone..."
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
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Store Credit</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Loyalty Points</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary', textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
            ) : filteredCustomers.length === 0 ? (
              <TableRow><TableCell colSpan={5} align="center" sx={{ py: 5, fontWeight: 700, color: 'text.secondary' }}>No customers found.</TableCell></TableRow>
            ) : filteredCustomers.map((customer) => (
              <TableRow key={customer.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ fontWeight: 700 }}>{customer.name}</TableCell>
                <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{customer.phone}</TableCell>
                <TableCell sx={{ fontWeight: 800, color: customer.credit > 0 ? '#F43F5E' : 'inherit' }}>
                  ${customer.credit.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Chip 
                    icon={<Gift size={14} />}
                    label={`${customer.loyaltyPoints} pts`} 
                    size="small" 
                    sx={{ borderRadius: '8px', fontWeight: 800, bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    color="success" 
                    sx={{ textTransform: 'none', borderRadius: '8px', mr: 1, fontWeight: 700 }}
                    onClick={() => handleOpenCreditModal(customer, 'SETTLE')}
                  >
                    Settle Credit
                  </Button>
                  <IconButton onClick={() => handleOpenModal(customer)} sx={{ color: '#6366F1', bgcolor: 'rgba(99,102,241,0.1)', mr: 1, borderRadius: '8px' }} size="small">
                    <Edit2 size={16} />
                  </IconButton>
                  <IconButton onClick={() => { if(confirm('Delete customer?')) deleteCustomerMutation.mutate(customer.id); }} sx={{ color: '#F43F5E', bgcolor: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px' }} size="small">
                    <Trash2 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* CREATE/EDIT MODAL */}
      <Dialog open={openModal} onClose={handleCloseModal} PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#1E293B', color: '#fff', minWidth: 400, border: '1px solid rgba(255,255,255,0.1)' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editingItem ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField label="Name" fullWidth value={name} onChange={(e) => setName(e.target.value)} sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
          <TextField label="Phone Number" fullWidth value={phone} onChange={(e) => setPhone(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="Store Credit Balance" type="number" fullWidth value={credit} onChange={(e) => setCredit(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
            <TextField label="Loyalty Points" type="number" fullWidth value={loyaltyPoints} onChange={(e) => setLoyaltyPoints(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseModal} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleSave} disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending} variant="contained" sx={{ bgcolor: '#6366F1', fontWeight: 700, textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#4F46E5' } }}>
            {editingItem ? 'Save Changes' : 'Create Customer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* SETTLE CREDIT MODAL */}
      <Dialog open={openCreditModal} onClose={handleCloseCreditModal} PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#1E293B', color: '#fff', minWidth: 400, border: '1px solid rgba(255,255,255,0.1)' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Settle Credit Balance</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography color="text.secondary">
            Customer: {selectedCustomer?.name} (Current Debt: ${selectedCustomer?.credit.toFixed(2)})
          </Typography>
          <TextField label="Amount to Settle ($)" type="number" fullWidth value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
          <TextField label="Notes/Receipt Ref" fullWidth value={creditNotes} onChange={(e) => setCreditNotes(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }} InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }} />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseCreditModal} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleSaveCredit} disabled={addCreditMutation.isPending} variant="contained" color="success" sx={{ fontWeight: 700, textTransform: 'none', borderRadius: '8px' }}>
            Settle Now
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
