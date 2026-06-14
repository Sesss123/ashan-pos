import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Button, IconButton, Chip, Dialog, DialogTitle, 
  DialogContent, DialogActions, TextField, Switch, FormControlLabel, CircularProgress,
  Snackbar, Alert
} from '@mui/material';
import { Store, Plus, Edit2, MapPin, Phone, Copy, Check, Key, Shield, Trash2 } from 'lucide-react';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';

interface Branch {
  id: string;
  name: string;
  location: string | null;
  contact: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function BranchesManagement() {
  const queryClient = useQueryClient();
  
  // Real-time: auto-refresh branches list on backend events
  useSocketEvent('branch.created', ['branches']);
  useSocketEvent('branch.updated', ['branches']);
  useSocketEvent('branch.deactivated', ['branches']);
  useSocketEvent('branch.deleted', ['branches']); // Gap #3 Fix

  const [openDialog, setOpenDialog] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState({ name: '', location: '', contact: '', isActive: true });
  
  // Delete confirmation dialog state — Gap #4 Fix
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  
  // Snackbar toast — Gap #6 Fix
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const showToast = (message: string, severity: 'success' | 'error' = 'success') => setToast({ open: true, message, severity });

  // State to hold and display newly generated credentials for cashier and waiter
  const [createdCredentials, setCreatedCredentials] = useState<{
    branchName: string;
    cashier: { email: string; password: string };
    waiter: { email: string; password: string };
  } | null>(null);

  // Manage Branch Users Modal State
  const [manageUsersOpen, setManageUsersOpen] = useState(false);
  const [selectedBranchForUsers, setSelectedBranchForUsers] = useState<Branch | null>(null);
  const [cashierUser, setCashierUser] = useState<any>(null);
  const [waiterUser, setWaiterUser] = useState<any>(null);

  // Inputs for Branch Users Modal
  const [cashierEmail, setCashierEmail] = useState('');
  const [cashierPassword, setCashierPassword] = useState('');
  const [waiterEmail, setWaiterEmail] = useState('');
  const [waiterPassword, setWaiterPassword] = useState('');

  const [isSavingUsers, setIsSavingUsers] = useState(false);

  // Clipboard copy feedback states
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/branches');
      return res.data.data as Branch[];
    }
  });

  // Fetch all users to filter branch specific ones
  const { data: users, refetch: refetchUsers } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axiosClient.get('/users');
      return res.data as any[];
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (editBranch) {
        return axiosClient.put(`/admin/branches/${editBranch.id}`, data);
      } else {
        return axiosClient.post('/admin/branches', data);
      }
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      
      if (!editBranch && res.data && res.data.credentials) {
        setCreatedCredentials({
          branchName: formData.name,
          cashier: res.data.credentials.cashier,
          waiter: res.data.credentials.waiter
        });
      }
      handleClose();
      showToast(editBranch ? 'Branch updated successfully!' : 'Branch created successfully!');
    },
    onError: (err: any) => showToast(err.response?.data?.message || 'Failed to save branch', 'error')
  });

  // Delete / Deactivate Branch Mutation — Gap #4 Fix
  const deleteBranchMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/admin/branches/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      setDeleteTarget(null);
      showToast('Branch deactivated successfully!');
    },
    onError: (err: any) => {
      setDeleteTarget(null);
      showToast(err.response?.data?.message || 'Failed to delete branch', 'error');
    }
  });

  const handleOpen = (branch?: Branch) => {
    if (branch) {
      setEditBranch(branch);
      setFormData({ 
        name: branch.name, 
        location: branch.location || '', 
        contact: branch.contact || '', 
        isActive: branch.isActive 
      });
    } else {
      setEditBranch(null);
      setFormData({ name: '', location: '', contact: '', isActive: true });
    }
    setOpenDialog(true);
  };

  const handleClose = () => {
    setOpenDialog(false);
    setEditBranch(null);
  };

  const handleSubmit = () => {
    mutation.mutate(formData);
  };

  // Open manage users modal and load details
  const handleManageUsers = (branch: Branch) => {
    setSelectedBranchForUsers(branch);
    
    const branchCashier = users?.find(u => u.branchId === branch.id && u.role === 'Cashier' && !u.isDeleted);
    const branchWaiter = users?.find(u => u.branchId === branch.id && u.role === 'Waiter' && !u.isDeleted);

    setCashierUser(branchCashier || null);
    setWaiterUser(branchWaiter || null);

    setCashierEmail(branchCashier ? branchCashier.email : '');
    setCashierPassword('');
    setWaiterEmail(branchWaiter ? branchWaiter.email : '');
    setWaiterPassword('');

    setManageUsersOpen(true);
  };

  // Auto-generate credentials based on branch name slug
  const handleGenerateDefaults = () => {
    if (!selectedBranchForUsers) return;
    const slug = selectedBranchForUsers.name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '.');
    const safeSlug = slug || 'branch';

    if (!cashierUser) {
      setCashierEmail(`${safeSlug}.cashier@ashnpos.local`);
      setCashierPassword(`${safeSlug}.cashier123`);
    }
    if (!waiterUser) {
      setWaiterEmail(`${safeSlug}.waiter@ashnpos.local`);
      setWaiterPassword(`${safeSlug}.waiter123`);
    }
  };

  const handleSaveUsers = async () => {
    if (!selectedBranchForUsers) return;
    setIsSavingUsers(true);
    try {
      // 1. Cashier Account Update / Create
      if (cashierUser) {
        if (cashierEmail !== cashierUser.email) {
          await axiosClient.put(`/users/${cashierUser.id}`, {
            name: cashierUser.name,
            email: cashierEmail,
            role: 'Cashier',
            isActive: cashierUser.isActive,
            branchId: selectedBranchForUsers.id
          });
        }
        if (cashierPassword) {
          await axiosClient.post(`/users/${cashierUser.id}/reset-password`, {
            newPassword: cashierPassword
          });
        }
      } else if (cashierEmail) {
        const passwordToUse = cashierPassword || `${selectedBranchForUsers.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.cashier123`;
        await axiosClient.post('/users', {
          name: `${selectedBranchForUsers.name} Cashier`,
          email: cashierEmail,
          password: passwordToUse,
          role: 'Cashier',
          branchId: selectedBranchForUsers.id
        });
      }

      // 2. Waiter Account Update / Create
      if (waiterUser) {
        if (waiterEmail !== waiterUser.email) {
          await axiosClient.put(`/users/${waiterUser.id}`, {
            name: waiterUser.name,
            email: waiterEmail,
            role: 'Waiter',
            isActive: waiterUser.isActive,
            branchId: selectedBranchForUsers.id
          });
        }
        if (waiterPassword) {
          await axiosClient.post(`/users/${waiterUser.id}/reset-password`, {
            newPassword: waiterPassword
          });
        }
      } else if (waiterEmail) {
        const passwordToUse = waiterPassword || `${selectedBranchForUsers.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.waiter123`;
        await axiosClient.post('/users', {
          name: `${selectedBranchForUsers.name} Waiter`,
          email: waiterEmail,
          password: passwordToUse,
          role: 'Waiter',
          branchId: selectedBranchForUsers.id
        });
      }

      await refetchUsers();
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setManageUsersOpen(false);
      alert('Branch credentials updated successfully!');
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Error saving branch credentials');
    } finally {
      setIsSavingUsers(false);
    }
  };

  useEffect(() => {
    if (manageUsersOpen && selectedBranchForUsers && users) {
      const branchCashier = users.find(u => u.branchId === selectedBranchForUsers.id && u.role === 'Cashier' && !u.isDeleted);
      const branchWaiter = users.find(u => u.branchId === selectedBranchForUsers.id && u.role === 'Waiter' && !u.isDeleted);
      setCashierUser(branchCashier || null);
      setWaiterUser(branchWaiter || null);
    }
  }, [users, manageUsersOpen, selectedBranchForUsers]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: '#6366F1' }}>
            <Store size={24} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800 }}>Branch Management</Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>Manage enterprise branches and locations.</Typography>
          </Box>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />} 
          onClick={() => handleOpen()}
          sx={{ 
            bgcolor: '#6366F1', 
            borderRadius: '12px', 
            textTransform: 'none', 
            fontWeight: 700,
            '&:hover': { bgcolor: '#4F46E5' }
          }}
        >
          Add New Branch
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ bgcolor: 'rgba(30, 41, 59, 0.7)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94A3B8', fontWeight: 700 } }}>
              <TableCell>Branch Name</TableCell>
              <TableCell>Location</TableCell>
              <TableCell>Contact</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {branches?.map((row) => (
              <TableRow key={row.id} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#fff' } }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{row.name}</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B' }}>ID: {row.id.substring(0, 8)}...</Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <MapPin size={14} color="#64748B" />
                    <Typography variant="body2">{row.location || 'N/A'}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Phone size={14} color="#64748B" />
                    <Typography variant="body2">{row.contact || 'N/A'}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={row.isActive ? 'Active' : 'Inactive'} 
                    size="small" 
                    sx={{ 
                      bgcolor: row.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)', 
                      color: row.isActive ? '#10B981' : '#F43F5E', 
                      fontWeight: 700 
                    }} 
                  />
                </TableCell>
                <TableCell align="right">
                  <IconButton 
                    onClick={() => handleManageUsers(row)} 
                    sx={{ color: '#F59E0B', bgcolor: 'rgba(245,158,11,0.1)', '&:hover': { bgcolor: 'rgba(245,158,11,0.2)' }, mr: 1 }}
                    title="Manage Credentials"
                  >
                    <Key size={16} />
                  </IconButton>
                  <IconButton onClick={() => handleOpen(row)} sx={{ color: '#6366F1', bgcolor: 'rgba(99,102,241,0.1)', '&:hover': { bgcolor: 'rgba(99,102,241,0.2)' }, mr: 1 }}>
                    <Edit2 size={16} />
                  </IconButton>
                  <IconButton 
                    onClick={() => setDeleteTarget(row)} 
                    sx={{ color: '#F43F5E', bgcolor: 'rgba(244,63,94,0.1)', '&:hover': { bgcolor: 'rgba(244,63,94,0.2)' } }}
                    title="Deactivate Branch"
                  >
                    <Trash2 size={16} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {branches?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: '#94A3B8' }}>No branches found. Create one to get started.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog 
        open={openDialog} 
        onClose={handleClose}
        PaperProps={{
          sx: { 
            bgcolor: '#1E293B', 
            color: '#fff', 
            borderRadius: '24px', 
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: 400
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, borderBottom: '1px solid rgba(255,255,255,0.05)', pb: 2 }}>
          {editBranch ? 'Edit Branch' : 'Create New Branch'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField 
            label="Branch Name" 
            variant="outlined" 
            fullWidth 
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } },
              '& .MuiInputLabel-root': { color: '#94A3B8' }
            }}
          />
          <TextField 
            label="Location / Address" 
            variant="outlined" 
            fullWidth 
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } },
              '& .MuiInputLabel-root': { color: '#94A3B8' }
            }}
          />
          <TextField 
            label="Contact Number" 
            variant="outlined" 
            fullWidth 
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
            sx={{
              '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } },
              '& .MuiInputLabel-root': { color: '#94A3B8' }
            }}
          />
          {editBranch && (
            <FormControlLabel
              control={
                <Switch 
                  checked={formData.isActive} 
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} 
                  color="primary"
                />
              }
              label="Active Status"
              sx={{ color: '#fff' }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Button onClick={handleClose} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={mutation.isPending || !formData.name}
            variant="contained"
            sx={{ bgcolor: '#6366F1', borderRadius: '8px' }}
          >
            {mutation.isPending ? 'Saving...' : 'Save Branch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Generated Credentials Success Modal */}
      <Dialog
        open={Boolean(createdCredentials)}
        onClose={() => setCreatedCredentials(null)}
        PaperProps={{
          sx: {
            bgcolor: '#0F172A',
            color: '#fff',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            maxWidth: 500,
            width: '100%',
            p: 1,
            backdropFilter: 'blur(20px)',
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pt: 3, pb: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            🎉 Branch Created Successfully!
          </Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', mt: 1 }}>
            Login credentials for <strong>{createdCredentials?.branchName}</strong> dashboards have been generated.
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
          
          {/* Cashier Credentials Card */}
          <Box sx={{
            p: 2.5,
            borderRadius: '16px',
            bgcolor: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            position: 'relative'
          }}>
            <Typography variant="subtitle2" sx={{ color: '#6366F1', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Key size={16} /> Cashier Dashboard Account
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>USERNAME / EMAIL</Typography>
                  <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 600 }}>{createdCredentials?.cashier.email}</Typography>
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => createdCredentials && handleCopy(createdCredentials.cashier.email, 'cashier-email')}
                  sx={{ color: copiedField === 'cashier-email' ? '#10B981' : '#94A3B8', bgcolor: 'rgba(255,255,255,0.02)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                >
                  {copiedField === 'cashier-email' ? <Check size={14} /> : <Copy size={14} />}
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', pt: 1.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>TEMPORARY PASSWORD</Typography>
                  <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 600, fontFamily: 'monospace' }}>{createdCredentials?.cashier.password}</Typography>
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => createdCredentials && handleCopy(createdCredentials.cashier.password, 'cashier-password')}
                  sx={{ color: copiedField === 'cashier-password' ? '#10B981' : '#94A3B8', bgcolor: 'rgba(255,255,255,0.02)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                >
                  {copiedField === 'cashier-password' ? <Check size={14} /> : <Copy size={14} />}
                </IconButton>
              </Box>
            </Box>
          </Box>

          {/* Waiter Credentials Card */}
          <Box sx={{
            p: 2.5,
            borderRadius: '16px',
            bgcolor: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            position: 'relative'
          }}>
            <Typography variant="subtitle2" sx={{ color: '#EC4899', fontWeight: 800, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Key size={16} /> Waiter Dashboard Account
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>USERNAME / EMAIL</Typography>
                  <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 600 }}>{createdCredentials?.waiter.email}</Typography>
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => createdCredentials && handleCopy(createdCredentials.waiter.email, 'waiter-email')}
                  sx={{ color: copiedField === 'waiter-email' ? '#10B981' : '#94A3B8', bgcolor: 'rgba(255,255,255,0.02)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                >
                  {copiedField === 'waiter-email' ? <Check size={14} /> : <Copy size={14} />}
                </IconButton>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', pt: 1.5 }}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>TEMPORARY PASSWORD</Typography>
                  <Typography variant="body2" sx={{ color: '#F1F5F9', fontWeight: 600, fontFamily: 'monospace' }}>{createdCredentials?.waiter.password}</Typography>
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => createdCredentials && handleCopy(createdCredentials.waiter.password, 'waiter-password')}
                  sx={{ color: copiedField === 'waiter-password' ? '#10B981' : '#94A3B8', bgcolor: 'rgba(255,255,255,0.02)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' } }}
                >
                  {copiedField === 'waiter-password' ? <Check size={14} /> : <Copy size={14} />}
                </IconButton>
              </Box>
            </Box>
          </Box>

          <Typography variant="caption" sx={{ color: '#64748B', textAlign: 'center', px: 2 }}>
            ⚠️ Please copy and save these credentials. They can also be modified later in User Management.
          </Typography>
        </DialogContent>

        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.05)', justifyContent: 'center' }}>
          <Button 
            onClick={() => setCreatedCredentials(null)} 
            variant="contained"
            sx={{ 
              bgcolor: '#6366F1', 
              borderRadius: '12px',
              px: 5,
              py: 1.2,
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': { bgcolor: '#4F46E5' }
            }}
          >
            Got It, Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Branch Users Modal */}
      <Dialog
        open={manageUsersOpen}
        onClose={() => setManageUsersOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#1E293B',
            color: '#fff',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.1)',
            minWidth: 450,
            maxWidth: 550,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Shield size={20} color="#F59E0B" />
          Branch Credentials: {selectedBranchForUsers?.name}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 3, mt: 1 }}>
          <Button 
            variant="outlined" 
            onClick={handleGenerateDefaults}
            sx={{ 
              color: '#F59E0B', 
              borderColor: 'rgba(245,158,11,0.3)', 
              borderRadius: '10px',
              textTransform: 'none', 
              fontWeight: 700,
              '&:hover': { borderColor: '#F59E0B', bgcolor: 'rgba(245,158,11,0.05)' }
            }}
          >
            Auto-Fill Default Suggestions
          </Button>

          {/* Cashier Account Form */}
          <Box sx={{ p: 2, borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(0,0,0,0.1)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#6366F1', mb: 2 }}>
              Cashier Account Details
            </Typography>
            <TextField 
              label="Cashier Email / Username" 
              variant="outlined" 
              fullWidth 
              size="small"
              value={cashierEmail}
              onChange={(e) => setCashierEmail(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } },
                '& .MuiInputLabel-root': { color: '#94A3B8' }
              }}
            />
            <TextField 
              label={cashierUser ? "New Cashier Password (Leave blank to keep same)" : "Cashier Password"} 
              type="password"
              variant="outlined" 
              fullWidth 
              size="small"
              value={cashierPassword}
              onChange={(e) => setCashierPassword(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } },
                '& .MuiInputLabel-root': { color: '#94A3B8' }
              }}
            />
          </Box>

          {/* Waiter Account Form */}
          <Box sx={{ p: 2, borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(0,0,0,0.1)' }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#EC4899', mb: 2 }}>
              Waiter Account Details
            </Typography>
            <TextField 
              label="Waiter Email / Username" 
              variant="outlined" 
              fullWidth 
              size="small"
              value={waiterEmail}
              onChange={(e) => setWaiterEmail(e.target.value)}
              sx={{
                mb: 2,
                '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } },
                '& .MuiInputLabel-root': { color: '#94A3B8' }
              }}
            />
            <TextField 
              label={waiterUser ? "New Waiter Password (Leave blank to keep same)" : "Waiter Password"} 
              type="password"
              variant="outlined" 
              fullWidth 
              size="small"
              value={waiterPassword}
              onChange={(e) => setWaiterPassword(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } },
                '& .MuiInputLabel-root': { color: '#94A3B8' }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Button onClick={() => setManageUsersOpen(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button 
            onClick={handleSaveUsers} 
            disabled={isSavingUsers}
            variant="contained"
            sx={{ bgcolor: '#6366F1', borderRadius: '8px' }}
          >
            {isSavingUsers ? 'Saving...' : 'Save Credentials'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* BRANCH DELETE CONFIRMATION — Gap #4 Fix */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#1E293B', color: '#fff', minWidth: 380, border: '1px solid rgba(255,255,255,0.1)' } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Deactivate Branch</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#94A3B8', fontWeight: 600 }}>
            Are you sure you want to deactivate <strong style={{ color: '#fff' }}>{deleteTarget?.name}</strong>?
          </Typography>
          <Typography variant="caption" sx={{ color: '#F59E0B', mt: 1, display: 'block' }}>
            ⚠️ All users in this branch will lose access. This can be reversed by editing the branch status.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button
            onClick={() => deleteTarget && deleteBranchMutation.mutate(deleteTarget.id)}
            disabled={deleteBranchMutation.isPending}
            variant="contained"
            sx={{ bgcolor: '#F43F5E', fontWeight: 700, textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#E11D48' } }}
          >
            {deleteBranchMutation.isPending ? 'Deactivating...' : 'Yes, Deactivate'}
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
