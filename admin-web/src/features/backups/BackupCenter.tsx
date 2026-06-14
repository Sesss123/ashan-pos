import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Chip, CircularProgress,
  keyframes
} from '@mui/material';
import { Database, RefreshCcw, Trash2, HardDrive, ShieldAlert, CloudOff } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';

interface Backup {
  id: string;
  file: string;
  createdAt: string;
}

const pulseGlow = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
`;

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

export default function BackupCenter() {
  const queryClient = useQueryClient();

  useSocketEvent('backup.completed', ['backups']);
  useSocketEvent('backup.failed', ['backups']);

  const { data: backups, isLoading } = useQuery<Backup[]>({
    queryKey: ['backups'],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/backups');
      return res.data;
    }
  });

  const runBackupMutation = useMutation({
    mutationFn: () => axiosClient.post('/admin/backups/run'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    }
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => axiosClient.post(`/admin/backups/restore/${id}`),
    onSuccess: () => {
      alert('System restored successfully!');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/admin/backups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    }
  });

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 4 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 3, mb: 5 }}>
        <Box>
          <Typography variant="h3" sx={{ fontWeight: 900, mb: 1, background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-0.5px' }}>
            System Backups
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShieldAlert size={18} color="#6366F1" /> Manage database snapshots and disaster recovery points.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={runBackupMutation.isPending ? <CircularProgress size={18} color="inherit" /> : <Database size={20} />}
          onClick={() => runBackupMutation.mutate()}
          disabled={runBackupMutation.isPending}
          sx={{ 
            borderRadius: '16px', textTransform: 'none', px: 4, py: 1.8,
            fontWeight: 800, fontSize: '0.95rem',
            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', 
            boxShadow: '0 8px 20px rgba(16,185,129,0.3)',
            animation: `${pulseGlow} 2s infinite`,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': { 
              transform: 'translateY(-2px)',
              boxShadow: '0 12px 28px rgba(16,185,129,0.5)',
            }
          }}
        >
          {runBackupMutation.isPending ? 'Processing...' : 'Run Manual Backup'}
        </Button>
      </Box>

      {/* Storage Usage Summary */}
      <Paper sx={{ 
        p: 4, mb: 5, borderRadius: '24px', display: 'flex', alignItems: 'center', gap: 4, 
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background glow */}
        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: '#6366F1', filter: 'blur(80px)', opacity: 0.3, borderRadius: '50%' }} />

        <Box sx={{ 
          p: 2.5, borderRadius: '18px', 
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0.05) 100%)', 
          color: '#818CF8', border: '1px solid rgba(99, 102, 241, 0.2)' 
        }}>
          <HardDrive size={36} strokeWidth={1.5} />
        </Box>
        <Box sx={{ flexGrow: 1, position: 'relative', zIndex: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1.5 }}>
            <Typography variant="subtitle1" color="text.secondary" fontWeight={600} letterSpacing="0.5px" textTransform="uppercase" fontSize="0.85rem">
              Storage Utilisation
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#E0E7FF' }}>
              4.5 GB <Typography component="span" variant="subtitle1" color="text.secondary">/ 10 GB</Typography>
            </Typography>
          </Box>
          <Box sx={{ flexGrow: 1, height: 12, bgcolor: 'rgba(0,0,0,0.3)', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Box sx={{ 
              width: '45%', height: '100%', 
              background: 'linear-gradient(90deg, #4F46E5 0%, #818CF8 50%, #4F46E5 100%)',
              backgroundSize: '200% 100%',
              animation: `${shimmer} 3s linear infinite`,
              borderRadius: 6
            }} />
          </Box>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ 
        borderRadius: '24px', 
        background: 'rgba(255, 255, 255, 0.02)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.05)', 
        boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ background: 'rgba(255,255,255,0.03)' }}>
              <TableCell sx={{ fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', py: 3, px: 4 }}>Date & Time</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', py: 3 }}>Snapshot File</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', py: 3 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '1px', fontSize: '0.75rem', py: 3, px: 4, textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 8 }}>
                  <CircularProgress size={40} thickness={4} sx={{ color: '#6366F1' }} />
                  <Typography mt={2} color="text.secondary" fontWeight={600}>Loading snapshots...</Typography>
                </TableCell>
              </TableRow>
            ) : !backups || backups.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 10 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6 }}>
                    <CloudOff size={64} color="#6B7280" style={{ marginBottom: 16 }} />
                    <Typography variant="h6" fontWeight={700} color="#E5E7EB">No backups found</Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>Run a manual backup to create your first restore point.</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : backups.map((backup) => (
              <TableRow 
                key={backup.id} 
                sx={{ 
                  transition: 'all 0.2s ease',
                  '&:hover': { background: 'rgba(255,255,255,0.04)', transform: 'scale(1.002)' },
                  '& td': { borderBottom: '1px solid rgba(255,255,255,0.05)', py: 2.5, px: 4 }
                }}
              >
                <TableCell sx={{ fontWeight: 600, color: '#E5E7EB' }}>{new Date(backup.createdAt).toLocaleString()}</TableCell>
                <TableCell sx={{ color: '#9CA3AF', fontWeight: 500, fontFamily: 'monospace', fontSize: '0.9rem' }}>{backup.file}</TableCell>
                <TableCell>
                  <Chip 
                    label="Successful" 
                    size="small" 
                    icon={<Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#10B981', ml: 1 }} />}
                    sx={{ 
                      borderRadius: '12px', fontWeight: 700, fontSize: '0.75rem',
                      background: 'rgba(16, 185, 129, 0.1)', color: '#34D399',
                      border: '1px solid rgba(16, 185, 129, 0.2)',
                      px: 0.5
                    }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <Button 
                    size="small" 
                    variant="outlined" 
                    startIcon={<RefreshCcw size={16} />}
                    onClick={() => { if(confirm('WARNING: This will overwrite the current database! Are you sure?')) restoreMutation.mutate(backup.id); }}
                    sx={{ 
                      textTransform: 'none', borderRadius: '10px', mr: 2, fontWeight: 600,
                      color: '#F59E0B', borderColor: 'rgba(245, 158, 11, 0.3)',
                      '&:hover': { borderColor: '#F59E0B', background: 'rgba(245, 158, 11, 0.1)' }
                    }}
                    disabled={restoreMutation.isPending}
                  >
                    Restore
                  </Button>
                  <IconButton 
                    onClick={() => { if(confirm('Delete this backup permanently?')) deleteMutation.mutate(backup.id); }} 
                    sx={{ 
                      color: '#F43F5E', background: 'rgba(244, 63, 94, 0.1)', borderRadius: '10px',
                      transition: 'all 0.2s',
                      '&:hover': { background: '#F43F5E', color: '#fff', transform: 'scale(1.1)' }
                    }} 
                    size="small"
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
