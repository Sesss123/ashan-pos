import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, CircularProgress
} from '@mui/material';
import { Search, Plus, Edit2, Trash2, ShieldCheck, Key } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useNavigate } from 'react-router-dom';
import { useSocketEvent } from '../../realtime/socketHooks';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  branchId?: string;
}

interface Branch {
  id: string;
  name: string;
  location: string | null;
}

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [openModal, setOpenModal] = useState(false);
  const [openPasswordModal, setOpenPasswordModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const navigate = useNavigate();
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Waiter');
  const [isActive, setIsActive] = useState(true);
  const [branchId, setBranchId] = useState('');
  
  // Password Reset State
  const [newPassword, setNewPassword] = useState('');

  const queryClient = useQueryClient();

  // Queries
  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await axiosClient.get('/users');
      return res.data;
    }
  });

  const { data: branches, isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/branches');
      return res.data.data as Branch[];
    }
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newUser: any) => axiosClient.post('/users', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseModal();
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, user: any }) => axiosClient.put(`/users/${data.id}`, data.user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleCloseModal();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (data: { id: string, newPassword: string }) => 
      axiosClient.post(`/users/${data.id}/reset-password`, { newPassword: data.newPassword }),
    onSuccess: () => {
      alert('Password reset successfully!');
      handleClosePasswordModal();
    },
    onError: (err: any) => {
      alert(err.response?.data?.message || 'Error resetting password');
    }
  });

  // Real-time: invalidate users list on backend events
  useSocketEvent('user.created', ['users']);
  useSocketEvent('user.updated', ['users']);
  useSocketEvent('user.deleted', ['users']);

  const handleOpenModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setName(user.name);
      setEmail(user.email);
      setRole(user.role);
      setIsActive(user.isActive);
      setBranchId(user.branchId || '');
      setPassword(''); 
    } else {
      setEditingUser(null);
      setName('');
      setEmail('');
      setRole('Waiter');
      setIsActive(true);
      setBranchId('');
      setPassword('');
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingUser(null);
  };

  const handleOpenPasswordModal = (user: User) => {
    setPasswordTargetUser(user);
    setNewPassword('');
    setOpenPasswordModal(true);
  };

  const handleClosePasswordModal = () => {
    setOpenPasswordModal(false);
    setPasswordTargetUser(null);
  };

  const handleSave = () => {
    const userData: any = { 
      name, 
      email, 
      role, 
      isActive, 
      branchId: branchId || null 
    };

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, user: userData });
    } else {
      createMutation.mutate({ ...userData, password });
    }
  };

  const handleResetPasswordSave = () => {
    if (passwordTargetUser && newPassword) {
      resetPasswordMutation.mutate({ id: passwordTargetUser.id, newPassword });
    }
  };

  const filteredUsers = users?.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getBranchName = (userBranchId?: string) => {
    if (!userBranchId) return 'Global / Admin';
    const b = branches?.find(branch => branch.id === userBranchId);
    return b ? b.name : 'Unknown Branch';
  };

  const isLoading = usersLoading || branchesLoading;

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#fff' }}>User Management</Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#94A3B8' }}>
            Manage employee access, roles, and branch assignments.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenModal()}
          sx={{ 
            borderRadius: '12px', textTransform: 'none', px: 3, py: 1.5,
            fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif',
            bgcolor: '#6366F1', boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            '&:hover': { bgcolor: '#4F46E5' }
          }}
        >
          Add New User
        </Button>
      </Box>

      <Paper sx={{ 
        p: 2.5, mb: 4, borderRadius: '16px', display: 'flex', gap: 2,
        bgcolor: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)'
      }}>
        <TextField
          placeholder="Search by name or email..."
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search size={18} color="#64748B" />
              </InputAdornment>
            ),
            sx: { borderRadius: '10px', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600, color: '#fff' }
          }}
          sx={{ 
            maxWidth: 400,
            '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } }
          }}
        />
        <Button 
          variant="outlined" 
          startIcon={<ShieldCheck size={18} />} 
          onClick={() => navigate('/roles')}
          sx={{ 
            borderRadius: '10px', textTransform: 'none', fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif',
            borderColor: 'rgba(255,255,255,0.1)', color: '#fff'
          }}
        >
          Role Policies
        </Button>
      </Paper>

      <TableContainer component={Paper} sx={{ bgcolor: 'rgba(30, 41, 59, 0.7)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
            <TableRow sx={{ '& th': { borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#94A3B8', fontWeight: 700 } }}>
              <TableCell sx={{ fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Branch</TableCell>
              <TableCell sx={{ fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif', textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
            ) : filteredUsers.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, fontWeight: 700, color: '#94A3B8' }}>No users found.</TableCell></TableRow>
            ) : filteredUsers.map((user) => (
              <TableRow key={user.id} hover sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.02)', color: '#fff' } }}>
                <TableCell sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{user.name}</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 600, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{user.email}</TableCell>
                <TableCell sx={{ fontWeight: 600, fontFamily: '"Plus Jakarta Sans", sans-serif', color: '#6366F1' }}>
                  {getBranchName(user.branchId)}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.role} 
                    size="small" 
                    sx={{ 
                      borderRadius: '8px', fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif',
                      bgcolor: user.role === 'Admin' ? 'rgba(244, 63, 94, 0.1)' : 'rgba(99,102,241,0.1)',
                      color: user.role === 'Admin' ? '#F43F5E' : '#6366F1'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.isActive ? 'Active' : 'Inactive'} 
                    size="small" 
                    variant={user.isActive ? 'filled' : 'outlined'}
                    sx={{ 
                      borderRadius: '8px', fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif',
                      bgcolor: user.isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                      color: user.isActive ? '#10B981' : '#94A3B8',
                      borderColor: 'rgba(255,255,255,0.1)'
                    }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <IconButton 
                    onClick={() => handleOpenPasswordModal(user)} 
                    sx={{ color: '#F59E0B', bgcolor: 'rgba(245,158,11,0.1)', mr: 1, borderRadius: '8px' }} 
                    size="small"
                    title="Change Password"
                  >
                    <Key size={16} />
                  </IconButton>
                  <IconButton onClick={() => handleOpenModal(user)} sx={{ color: '#6366F1', bgcolor: 'rgba(99,102,241,0.1)', mr: 1, borderRadius: '8px' }} size="small">
                    <Edit2 size={16} />
                  </IconButton>
                  <IconButton onClick={() => { if(confirm('Are you sure?')) deleteMutation.mutate(user.id); }} sx={{ color: '#F43F5E', bgcolor: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px' }} size="small">
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
        <DialogTitle sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800 }}>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField 
            label="Full Name" 
            fullWidth 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
          />
          <TextField 
            label="Email Address" 
            fullWidth 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
          />
          {!editingUser && (
            <TextField 
              label="Password" 
              type="password"
              fullWidth 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
              InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
            />
          )}
          
          <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}>
            <InputLabel style={{ color: 'rgba(255,255,255,0.7)' }}>Assigned Branch</InputLabel>
            <Select value={branchId} label="Assigned Branch" onChange={(e) => setBranchId(e.target.value as string)} sx={{ color: '#fff' }}>
              <MenuItem value=""><em>None / Head Office</em></MenuItem>
              {branches?.map(b => (
                <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}>
            <InputLabel style={{ color: 'rgba(255,255,255,0.7)' }}>Role</InputLabel>
            <Select value={role} label="Role" onChange={(e) => setRole(e.target.value as string)} sx={{ color: '#fff' }}>
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="Manager">Manager</MenuItem>
              <MenuItem value="Cashier">Cashier</MenuItem>
              <MenuItem value="Waiter">Waiter</MenuItem>
              <MenuItem value="Kitchen">Kitchen</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}>
            <InputLabel style={{ color: 'rgba(255,255,255,0.7)' }}>Status</InputLabel>
            <Select value={isActive ? 'Active' : 'Inactive'} label="Status" onChange={(e) => setIsActive(e.target.value === 'Active')} sx={{ color: '#fff' }}>
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Inactive">Inactive</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseModal} sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} variant="contained" sx={{ bgcolor: '#6366F1', fontWeight: 700, textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#4F46E5' } }}>
            {editingUser ? 'Save Changes' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PASSWORD RESET MODAL */}
      <Dialog open={openPasswordModal} onClose={handleClosePasswordModal} PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#1E293B', color: '#fff', minWidth: 400, border: '1px solid rgba(255,255,255,0.1)' } }}>
        <DialogTitle sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 800 }}>
          Reset Password for {passwordTargetUser?.name}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1 }}>
            Enter a new password for <strong>{passwordTargetUser?.email}</strong>.
          </Typography>
          <TextField 
            label="New Password" 
            type="password"
            fullWidth 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)} 
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleClosePasswordModal} sx={{ color: '#94A3B8', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleResetPasswordSave} disabled={resetPasswordMutation.isPending || !newPassword} variant="contained" sx={{ bgcolor: '#F59E0B', fontWeight: 700, textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#D97706' } }}>
            {resetPasswordMutation.isPending ? 'Resetting...' : 'Reset Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
