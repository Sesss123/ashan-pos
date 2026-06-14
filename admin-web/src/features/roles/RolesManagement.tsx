import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Chip, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, Radio, 
  CircularProgress, Snackbar
} from '@mui/material';
import { Shield, Plus, Copy, Trash2, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';

interface RolePolicy {
  id: string;
  name: string;
  permissions: Record<string, 'write' | 'read' | 'none'>;
  isSystem: boolean;
  createdAt: string;
}

const MODULES = [
  { key: 'dashboard', label: 'Dashboard Overview' },
  { key: 'branches', label: 'Branch Management' },
  { key: 'users', label: 'User Management' },
  { key: 'roles', label: 'Roles Matrix' },
  { key: 'menu', label: 'Menu Management' },
  { key: 'inventory', label: 'Inventory Control' },
  { key: 'suppliers', label: 'Supplier Ledger' },
  { key: 'purchases', label: 'Purchase Orders' },
  { key: 'customers', label: 'Customer Relations' },
  { key: 'reports', label: 'Reports & Analytics' },
  { key: 'auditLogs', label: 'System Audit Logs' },
  { key: 'security', label: 'Security Center' },
  { key: 'backups', label: 'System Backups' },
  { key: 'settings', label: 'System Settings' }
];

export default function RolesManagement() {
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Modals state
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openCloneModal, setOpenCloneModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [cloneRoleName, setCloneRoleName] = useState('');

  // Real-time: auto-refresh roles list on backend role events
  useSocketEvent('role.created', ['roles']);
  useSocketEvent('role.updated', ['roles']);
  useSocketEvent('role.deleted', ['roles']);
  useSocketEvent('role.cloned', ['roles']);

  // Fetch all roles from backend
  const { data: roles, isLoading } = useQuery<RolePolicy[]>({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await axiosClient.get('/roles');
      return res.data.data;
    }
  });

  const selectedRole = roles?.find(r => r.id === selectedRoleId) || roles?.[0];

  // Set default selected role ID on data load
  if (roles && roles.length > 0 && !selectedRoleId) {
    setSelectedRoleId(roles[0].id);
  }

  // Mutations
  const createMutation = useMutation({
    mutationFn: (name: string) => axiosClient.post('/roles', { name, permissions: {} }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRoleId(res.data.data.id);
      setOpenCreateModal(false);
      setNewRoleName('');
      setSnackbarMessage('Custom role created successfully!');
    }
  });

  const cloneMutation = useMutation({
    mutationFn: (data: { id: string; newName: string }) => 
      axiosClient.post(`/roles/${data.id}/clone`, { newName: data.newName }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRoleId(res.data.data.id);
      setOpenCloneModal(false);
      setCloneRoleName('');
      setSnackbarMessage('Role cloned successfully!');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; name?: string; permissions: any }) => 
      axiosClient.put(`/roles/${data.id}`, { name: data.name, permissions: data.permissions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSnackbarMessage('Permissions updated successfully!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/roles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      setSelectedRoleId(roles?.[0]?.id || null);
      setSnackbarMessage('Custom role deleted successfully.');
    }
  });

  const handlePermissionChange = (moduleKey: string, val: 'write' | 'read' | 'none') => {
    if (!selectedRole) return;
    const updatedPermissions = {
      ...selectedRole.permissions,
      [moduleKey]: val
    };
    updateMutation.mutate({ id: selectedRole.id, permissions: updatedPermissions });
  };

  const handleClone = () => {
    if (selectedRole && cloneRoleName) {
      cloneMutation.mutate({ id: selectedRole.id, newName: cloneRoleName });
    }
  };

  const handleCreate = () => {
    if (newRoleName) {
      createMutation.mutate(newRoleName);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress sx={{ color: '#6366F1' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1.5, bgcolor: 'rgba(99, 102, 241, 0.1)', borderRadius: '12px', color: '#6366F1' }}>
            <Shield size={24} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#fff', fontWeight: 800 }}>Role-Based Access Control</Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8' }}>Assign module access and operations policy across System and Custom roles.</Typography>
          </Box>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />} 
          onClick={() => setOpenCreateModal(true)}
          sx={{ bgcolor: '#6366F1', borderRadius: '12px', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#4F46E5' } }}
        >
          Create Custom Role
        </Button>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, gap: 4 }}>
        
        {/* ROLES SIDEBAR LIST */}
        <Paper sx={{ 
          p: 2.5, borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', 
          bgcolor: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(20px)',
          display: 'flex', flexDirection: 'column', gap: 2, height: 'fit-content'
        }}>
          <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700, px: 1 }}>SELECT ACTIVE ROLE</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {roles?.map((role) => (
              <Button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                sx={{
                  justifyContent: 'space-between',
                  textTransform: 'none',
                  p: 1.8,
                  borderRadius: '12px',
                  fontWeight: 700,
                  color: selectedRoleId === role.id ? '#fff' : '#94A3B8',
                  bgcolor: selectedRoleId === role.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  border: '1px solid',
                  borderColor: selectedRoleId === role.id ? 'rgba(99, 102, 241, 0.3)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' }
                }}
              >
                <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>{role.name}</Typography>
                <Chip 
                  label={role.isSystem ? 'System' : 'Custom'} 
                  size="small"
                  sx={{ 
                    height: 20, fontSize: '0.7rem', fontWeight: 800,
                    bgcolor: role.isSystem ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)',
                    color: role.isSystem ? '#10B981' : '#6366F1'
                  }}
                />
              </Button>
            ))}
          </Box>
        </Paper>

        {/* PERMISSIONS GRID / EDITOR */}
        {selectedRole ? (
          <Paper sx={{ 
            p: 4, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', 
            bgcolor: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(20px)'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#fff' }}>{selectedRole.name} Permissions Matrix</Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>Define write, read-only, or denied access per system module.</Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<Copy size={16} />}
                  onClick={() => setOpenCloneModal(true)}
                  sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700, borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
                >
                  Clone Role
                </Button>
                {!selectedRole.isSystem && (
                  <IconButton 
                    onClick={() => { if (confirm(`Delete role ${selectedRole.name}?`)) deleteMutation.mutate(selectedRole.id); }}
                    sx={{ color: '#F43F5E', bgcolor: 'rgba(244, 63, 94, 0.1)', borderRadius: '10px' }}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                )}
              </Box>
            </Box>

            {selectedRole.isSystem && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 2, mb: 3, bgcolor: 'rgba(245, 158, 11, 0.08)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)' }}>
                <AlertTriangle size={18} color="#F59E0B" />
                <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 700 }}>
                  PROTECTED SYSTEM ROLE: Permissions are customizable, but the role itself cannot be deleted.
                </Typography>
              </Box>
              
            )}

            <TableContainer sx={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                  <TableRow>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 700 }}>ERP System Module</TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 700, textAlign: 'center' }}>None (Denied)</TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 700, textAlign: 'center' }}>Read Only</TableCell>
                    <TableCell sx={{ color: '#94A3B8', fontWeight: 700, textAlign: 'center' }}>Write (Full Access)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {MODULES.map((mod) => {
                    const currentVal = selectedRole.permissions[mod.key] || 'none';
                    return (
                      <TableRow key={mod.key} hover sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.02)' } }}>
                        <TableCell sx={{ fontWeight: 700, color: '#fff' }}>{mod.label}</TableCell>
                        
                        {/* NONE Access */}
                        <TableCell align="center">
                          <Radio 
                            checked={currentVal === 'none'} 
                            onChange={() => handlePermissionChange(mod.key, 'none')}
                            sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#F43F5E' } }}
                          />
                        </TableCell>

                        {/* READ Access */}
                        <TableCell align="center">
                          <Radio 
                            checked={currentVal === 'read'} 
                            onChange={() => handlePermissionChange(mod.key, 'read')}
                            sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#F59E0B' } }}
                          />
                        </TableCell>

                        {/* WRITE Access */}
                        <TableCell align="center">
                          <Radio 
                            checked={currentVal === 'write'} 
                            onChange={() => handlePermissionChange(mod.key, 'write')}
                            sx={{ color: 'rgba(255,255,255,0.2)', '&.Mui-checked': { color: '#10B981' } }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        ) : (
          <Typography sx={{ color: '#94A3B8', py: 5, textAlign: 'center', fontWeight: 700 }}>Create a role to get started.</Typography>
        )}

      </Box>

      {/* CREATE MODAL */}
      <Dialog 
        open={openCreateModal} 
        onClose={() => setOpenCreateModal(false)}
        PaperProps={{ sx: { bgcolor: '#1E293B', color: '#fff', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Create Custom Role</DialogTitle>
        <DialogContent>
          <TextField 
            label="Role Name" 
            fullWidth 
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            sx={{ mt: 2, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCreateModal(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newRoleName} sx={{ bgcolor: '#6366F1', fontWeight: 700 }}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* CLONE MODAL */}
      <Dialog 
        open={openCloneModal} 
        onClose={() => setOpenCloneModal(false)}
        PaperProps={{ sx: { bgcolor: '#1E293B', color: '#fff', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', minWidth: 400 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Clone {selectedRole?.name} Role</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This will copy all permissions of <strong>{selectedRole?.name}</strong> to a new custom role.
          </Typography>
          <TextField 
            label="New Cloned Role Name" 
            fullWidth 
            value={cloneRoleName}
            onChange={(e) => setCloneRoleName(e.target.value)}
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCloneModal(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button onClick={handleClone} variant="contained" disabled={!cloneRoleName} sx={{ bgcolor: '#6366F1', fontWeight: 700 }}>
            Clone Role
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar 
        open={!!snackbarMessage} 
        autoHideDuration={3000} 
        onClose={() => setSnackbarMessage('')}
        message={snackbarMessage}
      />
    </Box>
  );
}
