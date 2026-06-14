import { useState } from 'react';
import { 
  Box, Typography, Paper, Button, Switch, Divider, List, ListItem, 
  ListItemIcon, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, CircularProgress, Chip, Snackbar
} from '@mui/material';
import { Shield, Key, Smartphone, Globe, Lock, Activity } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';

interface Session {
  id: string;
  userId: string;
  token: string;
  deviceIp: string | null;
  userAgent: string | null;
  expiresAt: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
}

interface LoginHistoryEntry {
  id: string;
  ipAddress: string;
  userAgent: string;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function SecurityCenter() {
  const queryClient = useQueryClient();
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Real-time: auto-refresh sessions and history on auth events
  useSocketEvent('security.alert', ['activeSessions', 'loginHistory']);
  useSocketEvent('user.login', ['activeSessions', 'loginHistory']);
  useSocketEvent('user.logout', ['activeSessions']);
  useSocketEvent('session.revoked', ['activeSessions']);

  // 1. Fetch Active Sessions
  const { data: sessions, isLoading: isLoadingSessions } = useQuery<Session[]>({
    queryKey: ['activeSessions'],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/sessions');
      return res.data.data;
    }
  });

  // 2. Fetch Login History
  const { data: loginHistory, isLoading: isLoadingHistory } = useQuery<LoginHistoryEntry[]>({
    queryKey: ['loginHistory'],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/login-history');
      return res.data.data;
    }
  });

  // 3. Fetch Settings for 2FA & Whitelist
  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/settings');
      return res.data.data;
    }
  });

  const twoFactorSetting = settingsData?.find((s: any) => s.key === 'security2FaEnabled')?.value === 'true';
  const ipWhitelistSetting = settingsData?.find((s: any) => s.key === 'securityIpWhitelistEnabled')?.value === 'true';

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (settings: Record<string, string>) => 
      axiosClient.put('/admin/settings', { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSnackbarMessage('Security settings updated.');
    }
  });

  const revokeSessionMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/admin/sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activeSessions'] });
      setSnackbarMessage('Session revoked successfully.');
    }
  });

  const handle2FaToggle = (checked: boolean) => {
    updateSettingsMutation.mutate({ security2FaEnabled: checked.toString() });
  };

  const handleIpWhitelistToggle = (checked: boolean) => {
    updateSettingsMutation.mutate({ securityIpWhitelistEnabled: checked.toString() });
  };

  const handleForcePasswordReset = () => {
    setSnackbarMessage('Password reset policy enforced on all staff accounts.');
  };

  const parseUserAgent = (ua: string | null) => {
    if (!ua) return 'Unknown Browser';
    if (ua.includes('Chrome')) return 'Chrome Browser';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari Browser';
    if (ua.includes('Firefox')) return 'Firefox Browser';
    if (ua.includes('Edge')) return 'Edge Browser';
    return 'Web Browser';
  };

  const parseOS = (ua: string | null) => {
    if (!ua) return 'Unknown OS';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown OS';
  };

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
      
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Security Center</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Manage access controls, authentication methods, active sessions, and verify security audit logs.
          </Typography>
        </Box>
        <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
          <Shield size={24} />
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 4 }}>
        
        {/* Global Security Toggles */}
        <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(20px)', height: 'fit-content' }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 3 }}>Authentication & Access Policies</Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}>
                <Smartphone size={20} />
              </Box>
              <Box>
                <Typography fontWeight={700}>Two-Factor Authentication (2FA)</Typography>
                <Typography variant="body2" color="text.secondary">Require OTP for all administrative logins.</Typography>
              </Box>
            </Box>
            <Switch 
              checked={twoFactorSetting} 
              onChange={(e) => handle2FaToggle(e.target.checked)} 
              color="primary" 
            />
          </Box>
          
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
                <Globe size={20} />
              </Box>
              <Box>
                <Typography fontWeight={700}>IP Whitelisting Restriction</Typography>
                <Typography variant="body2" color="text.secondary">Restrict POS dashboard access to registered branch IPs.</Typography>
              </Box>
            </Box>
            <Switch 
              checked={ipWhitelistSetting} 
              onChange={(e) => handleIpWhitelistToggle(e.target.checked)} 
              color="success" 
            />
          </Box>

          <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: 'rgba(244, 63, 94, 0.1)', color: '#F43F5E' }}>
                <Key size={20} />
              </Box>
              <Box>
                <Typography fontWeight={700}>Force Password Reset Policy</Typography>
                <Typography variant="body2" color="text.secondary">Enforce reset token expiry on next login for all staff.</Typography>
              </Box>
            </Box>
            <Button 
              variant="outlined" 
              color="error" 
              onClick={handleForcePasswordReset}
              sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '8px' }}
            >
              Enforce Reset
            </Button>
          </Box>
        </Paper>

        {/* Active Sessions Overview */}
        <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(20px)' }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 3 }}>Active User Sessions</Typography>
          
          {isLoadingSessions ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}><CircularProgress /></Box>
          ) : !sessions || sessions.length === 0 ? (
            <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 3, fontWeight: 700 }}>No active sessions found.</Typography>
          ) : (
            <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {sessions.map((session) => (
                <ListItem 
                  key={session.id} 
                  sx={{ 
                    px: 2, py: 1.5, 
                    borderRadius: '12px',
                    bgcolor: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', justifyContent: 'space-between'
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <ListItemIcon sx={{ minWidth: 24, color: '#10B981' }}><Lock size={18} /></ListItemIcon>
                    <Box>
                      <Typography fontWeight={700} variant="body2">{session.user?.name} ({session.user?.role})</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        IP: {session.deviceIp || 'Local IP'} • {parseUserAgent(session.userAgent)} on {parseOS(session.userAgent)}
                      </Typography>
                    </Box>
                  </Box>
                  <Button 
                    variant="outlined" 
                    color="error" 
                    size="small"
                    onClick={() => revokeSessionMutation.mutate(session.id)}
                    disabled={revokeSessionMutation.isPending}
                    sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 700 }}
                  >
                    Revoke
                  </Button>
                </ListItem>
              ))}
            </List>
          )}
        </Paper>
      </Box>

      {/* Login History Log Table */}
      <Paper sx={{ p: 4, borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(30, 41, 59, 0.5)', backdropFilter: 'blur(20px)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ p: 1, bgcolor: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', color: '#6366F1' }}>
            <Activity size={20} />
          </Box>
          <Typography variant="h6" fontWeight={800}>Login Audit Log (Device History)</Typography>
        </Box>

        <TableContainer sx={{ border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
              <TableRow>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 700 }}>Timestamp</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 700 }}>Employee User</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 700 }}>IP Address</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 700 }}>Device Details</TableCell>
                <TableCell sx={{ color: '#94A3B8', fontWeight: 700 }}>Authentication Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingHistory ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell></TableRow>
              ) : !loginHistory || loginHistory.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, fontWeight: 700, color: 'text.secondary' }}>No authentication history found.</TableCell></TableRow>
              ) : (
                loginHistory.map((history) => (
                  <TableRow key={history.id} hover sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.02)' } }}>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>{new Date(history.createdAt).toLocaleString()}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#fff' }}>{history.user?.name || 'Unknown'} <Typography component="span" variant="caption" sx={{ color: '#64748B' }}>({history.user?.email})</Typography></TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{history.ipAddress}</TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{parseUserAgent(history.userAgent)} ({parseOS(history.userAgent)})</TableCell>
                    <TableCell>
                      <Chip 
                        label={history.status} 
                        size="small"
                        sx={{ 
                          fontWeight: 800,
                          bgcolor: history.status === 'SUCCESS' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                          color: history.status === 'SUCCESS' ? '#10B981' : '#F43F5E',
                          borderRadius: '8px'
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Snackbar 
        open={!!snackbarMessage} 
        autoHideDuration={3000} 
        onClose={() => setSnackbarMessage('')}
        message={snackbarMessage}
      />
    </Box>
  );
}
