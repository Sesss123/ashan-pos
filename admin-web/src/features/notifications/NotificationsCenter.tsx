import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Tabs, Tab, TextField, InputAdornment, 
  CircularProgress, IconButton, Divider, Switch, 
  FormControlLabel, Grid, List, ListItem, ListItemText, ListItemSecondaryAction, Snackbar, Alert,
  Chip, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { 
  Bell, Search, CheckCircle, Trash2, Settings, ShieldAlert, 
  Filter, Eye, Check, AlertTriangle, HardDrive 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';

interface Notification {
  id: string;
  message: string;
  isRead: boolean;
  category: string;
  priority: string;
  createdAt: string;
}

interface Preference {
  id: string;
  key: string;
  value: string;
  group: string;
}

export default function NotificationsCenter() {
  const [activeTab, setActiveTab] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  const queryClient = useQueryClient();

  // Queries
  const { data: notificationsRes, isLoading } = useQuery<{ success: boolean; data: Notification[] }>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await axiosClient.get('/notifications');
      return res.data;
    }
  });

  const { data: preferencesRes } = useQuery<{ success: boolean; data: Preference[] }>({
    queryKey: ['notificationPreferences'],
    queryFn: async () => {
      const res = await axiosClient.get('/notifications/preferences');
      return res.data;
    }
  });

  const notifications = notificationsRes?.data || [];
  const preferences = preferencesRes?.data || [];

  // Mutations
  const markReadMutation = useMutation({
    mutationFn: (id: string) => axiosClient.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => axiosClient.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSnackbar('All notifications marked as read.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/notifications/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const clearAllMutation = useMutation({
    mutationFn: () => axiosClient.delete('/notifications'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      showSnackbar('All notifications cleared.');
    }
  });

  const savePreferencesMutation = useMutation({
    mutationFn: (payload: any) => axiosClient.put('/notifications/preferences', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationPreferences'] });
      showSnackbar('Preferences saved successfully.');
    }
  });

  // Socket triggers to auto-update list on incoming system events
  useSocketEvent('notification.created', ['notifications']);
  useSocketEvent('notification.updated', ['notifications']);
  useSocketEvent('notification.all_read', ['notifications']);
  useSocketEvent('order.created', ['notifications']);
  useSocketEvent('order.ready', ['notifications']);
  useSocketEvent('inventory.low_stock', ['notifications']);
  useSocketEvent('purchase.received', ['notifications']);
  useSocketEvent('security.alert', ['notifications']);
  useSocketEvent('backup.completed', ['notifications']);

  const showSnackbar = (msg: string) => {
    setSnackbarMsg(msg);
    setSnackbarOpen(true);
  };

  const handlePreferenceToggle = (key: string, currentValue: string) => {
    const newValue = currentValue === 'true' ? 'false' : 'true';
    
    const exists = preferences.some(p => p.key === key);
    let updatedPreferences;
    
    if (exists) {
      updatedPreferences = preferences.map(pref => {
        if (pref.key === key) {
          return { ...pref, value: newValue };
        }
        return pref;
      });
    } else {
      updatedPreferences = [...preferences, { id: '', key, value: newValue, group: 'general' }];
    }

    savePreferencesMutation.mutate({
      preferences: updatedPreferences.map(p => ({ key: p.key, value: p.value }))
    });
  };

  // Filter & Search Logic
  const filteredNotifications = notifications.filter(notif => {
    const matchesTab = activeTab === 'All' || notif.category === activeTab;
    const matchesPriority = priorityFilter === 'All' || notif.priority === priorityFilter;
    const matchesSearch = notif.message.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesPriority && matchesSearch;
  });

  // Calculate unread counts
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      default: return '#10B981';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Orders': return <CheckCircle size={16} />;
      case 'Inventory': return <AlertTriangle size={16} />;
      case 'Purchases': return <Eye size={16} />;
      case 'Security': return <ShieldAlert size={16} />;
      case 'System': return <HardDrive size={16} />;
      default: return <Bell size={16} />;
    }
  };

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      
      {/* HEADER SECTION */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>Notification Center</Typography>
            {unreadCount > 0 && (
              <Chip 
                label={`${unreadCount} New`} 
                color="error" 
                size="small" 
                sx={{ fontWeight: 800, borderRadius: '8px' }} 
              />
            )}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mt: 0.5 }}>
            Monitor real-time security alerts, order statuses, inventory updates, and backup completions.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button 
            variant="outlined" 
            startIcon={<Check size={18} />}
            onClick={() => markAllReadMutation.mutate()}
            disabled={unreadCount === 0 || markAllReadMutation.isPending}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, borderColor: 'rgba(255,255,255,0.1)' }}
          >
            Mark All Read
          </Button>
          <Button 
            variant="outlined" 
            color="error"
            startIcon={<Trash2 size={18} />}
            onClick={() => { if(confirm('Clear all notifications?')) clearAllMutation.mutate(); }}
            disabled={notifications.length === 0 || clearAllMutation.isPending}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, borderColor: 'rgba(244,63,94,0.2)' }}
          >
            Clear All
          </Button>
        </Box>
      </Box>

      <Grid container spacing={4}>
        {/* LEFT COLUMN: FILTERS & LIST */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: '16px', display: 'flex', gap: 2, alignItems: 'center', border: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search notifications..."
              size="small"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search size={18} color="#64748B" /></InputAdornment>,
                sx: { borderRadius: '10px', fontWeight: 600 }
              }}
              sx={{ flexGrow: 1, minWidth: '200px' }}
            />

            <FormControl size="small" sx={{ width: 140, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}>
              <InputLabel style={{ color: 'rgba(255,255,255,0.6)' }}>Priority</InputLabel>
              <Select
                value={priorityFilter}
                label="Priority"
                onChange={(e: any) => setPriorityFilter(e.target.value)}
                sx={{ color: '#fff' }}
              >
                <MenuItem value="All">All Priorities</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
              </Select>
            </FormControl>
          </Paper>

          <Paper sx={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
            <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(255,255,255,0.01)' }}>
              <Tabs 
                value={activeTab} 
                onChange={(_, val) => setActiveTab(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ 
                  '& .MuiTabs-indicator': { bgcolor: '#6366F1' }, 
                  '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', px: 3 } 
                }}
              >
                <Tab label="All Alerts" value="All" />
                <Tab label="Orders" value="Orders" />
                <Tab label="Inventory" value="Inventory" />
                <Tab label="Purchases" value="Purchases" />
                <Tab label="Customers" value="Customers" />
                <Tab label="Security" value="Security" />
                <Tab label="System" value="System" />
              </Tabs>
            </Box>

            <List disablePadding>
              {isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
              ) : filteredNotifications.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Bell size={48} color="#64748B" style={{ opacity: 0.4, marginBottom: '16px' }} />
                  <Typography variant="body1" fontWeight={700} color="text.secondary">
                    No notifications in this view.
                  </Typography>
                </Box>
              ) : (
                filteredNotifications.map((notif) => (
                  <ListItem 
                    key={notif.id}
                    sx={{ 
                      py: 2, px: 3,
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      bgcolor: notif.isRead ? 'transparent' : 'rgba(99, 102, 241, 0.02)',
                      '&:last-child': { borderBottom: 0 },
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: 'rgba(255,255,255,0.01)' }
                    }}
                  >
                    <Box 
                      sx={{ 
                        p: 1, borderRadius: '8px', 
                        bgcolor: notif.isRead ? 'rgba(255,255,255,0.05)' : 'rgba(99, 102, 241, 0.15)', 
                        color: notif.isRead ? '#94A3B8' : '#6366F1', 
                        mr: 2, display: 'flex', alignItems: 'center'
                      }}
                    >
                      {getCategoryIcon(notif.category)}
                    </Box>

                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2" fontWeight={notif.isRead ? 600 : 800}>
                            {notif.message}
                          </Typography>
                          <Chip 
                            label={notif.priority} 
                            size="small" 
                            sx={{ 
                              fontSize: '0.65rem', height: '16px', fontWeight: 800,
                              color: getPriorityColor(notif.priority), 
                              bgcolor: `${getPriorityColor(notif.priority)}15`,
                              border: `1px solid ${getPriorityColor(notif.priority)}30`
                            }} 
                          />
                        </Box>
                      }
                      secondary={new Date(notif.createdAt).toLocaleString()}
                      primaryTypographyProps={{ style: { color: notif.isRead ? '#94A3B8' : '#F8FAFC' } }}
                      secondaryTypographyProps={{ style: { color: '#64748B', fontWeight: 600, fontSize: '0.75rem', marginTop: '4px' } }}
                    />

                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {!notif.isRead && (
                          <IconButton 
                            size="small" 
                            onClick={() => markReadMutation.mutate(notif.id)} 
                            sx={{ color: '#10B981', bgcolor: 'rgba(16,185,129,0.05)' }}
                            title="Mark as Read"
                          >
                            <Check size={14} />
                          </IconButton>
                        )}
                        <IconButton 
                          size="small" 
                          onClick={() => deleteMutation.mutate(notif.id)}
                          sx={{ color: '#EF4444', bgcolor: 'rgba(239,68,68,0.05)' }}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))
              )}
            </List>
          </Paper>
        </Grid>

        {/* RIGHT COLUMN: PREFERENCES PANELS */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Settings size={18} color="#6366F1" />
              <Typography variant="subtitle1" fontWeight={800}>Dispatch Channels</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <List disablePadding>
              <ListItem disablePadding sx={{ py: 1.5 }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={preferences.find(p => p.key === 'email_notifications')?.value === 'true'} 
                      onChange={() => handlePreferenceToggle('email_notifications', preferences.find(p => p.key === 'email_notifications')?.value || 'false')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={800}>Email Notifications</Typography>
                      <Typography variant="caption" color="text.secondary">Forward security and backup logs to email.</Typography>
                    </Box>
                  }
                />
              </ListItem>
              <ListItem disablePadding sx={{ py: 1.5 }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={preferences.find(p => p.key === 'push_notifications')?.value === 'true'} 
                      onChange={() => handlePreferenceToggle('push_notifications', preferences.find(p => p.key === 'push_notifications')?.value || 'false')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={800}>Browser Push alerts</Typography>
                      <Typography variant="caption" color="text.secondary">Flash browser notifications instantly on events.</Typography>
                    </Box>
                  }
                />
              </ListItem>
            </List>
          </Paper>

          <Paper sx={{ p: 3, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Filter size={18} color="#6366F1" />
              <Typography variant="subtitle1" fontWeight={800}>System Filters</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <List disablePadding>
              <ListItem disablePadding sx={{ py: 1.5 }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={preferences.find(p => p.key === 'low_stock_alerts')?.value === 'true'} 
                      onChange={() => handlePreferenceToggle('low_stock_alerts', preferences.find(p => p.key === 'low_stock_alerts')?.value || 'false')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={800}>Low Stock Warnings</Typography>
                      <Typography variant="caption" color="text.secondary">Notify when ingredients fall below thresholds.</Typography>
                    </Box>
                  }
                />
              </ListItem>
              <ListItem disablePadding sx={{ py: 1.5 }}>
                <FormControlLabel
                  control={
                    <Switch 
                      checked={preferences.find(p => p.key === 'security_alerts')?.value === 'true'} 
                      onChange={() => handlePreferenceToggle('security_alerts', preferences.find(p => p.key === 'security_alerts')?.value || 'false')}
                      color="primary"
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={800}>Security Incidents</Typography>
                      <Typography variant="caption" color="text.secondary">Alert on suspicious failed logins and revocations.</Typography>
                    </Box>
                  }
                />
              </ListItem>
            </List>
          </Paper>
        </Grid>
      </Grid>

      {/* SNACKBAR FEEDBACK */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={3000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" variant="filled" sx={{ borderRadius: '10px', fontWeight: 700 }}>
          {snackbarMsg}
        </Alert>
      </Snackbar>

    </Box>
  );
}
