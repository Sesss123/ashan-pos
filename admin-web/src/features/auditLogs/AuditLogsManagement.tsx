import React, { useState } from 'react';
import { 
  Box, Typography, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, TextField, InputAdornment, 
  CircularProgress, Button, FormControl, InputLabel, Select, MenuItem,
  Collapse, IconButton, Grid
} from '@mui/material';
import { Shield, Search, Activity, FileSpreadsheet, ChevronDown, ChevronUp, Network } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';

interface AuditLog {
  id: string;
  action: string;
  module: string;
  userId: string;
  user: { name: string; role: string };
  details: string;
  oldValue: string;
  newValue: string;
  ipAddress: string;
  branchId: string;
  createdAt: string;
}

export default function AuditLogsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('All');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const { data: logsRes, isLoading } = useQuery<{ success: boolean; data: AuditLog[] }>({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const res = await axiosClient.get('/audit/logs');
      return res.data;
    }
  });

  // Real-time: new audit entries appear automatically when system events occur
  useSocketEvent('audit.created', ['auditLogs']);        // legacy event name
  useSocketEvent('audit.log.created', ['auditLogs']);    // new standardized event from socketEmitter
  useSocketEvent('security.alert', ['auditLogs']);
  useSocketEvent('security.login', ['auditLogs']);
  useSocketEvent('security.logout', ['auditLogs']);

  const logs = logsRes?.data || [];

  // Get unique modules list dynamically from existing log entries
  const modulesList = ['All', ...new Set(logs.map(log => log.module).filter(Boolean))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
      log.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesModule = moduleFilter === 'All' || log.module === moduleFilter;
    return matchesSearch && matchesModule;
  });

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = ['Timestamp', 'User', 'Role', 'Module', 'Action', 'Details', 'IP Address'];
    const rows = filteredLogs.map(log => [
      new Date(log.createdAt).toLocaleString(),
      log.user.name,
      log.user.role,
      log.module || 'System',
      log.action,
      log.details || '',
      log.ipAddress || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `system_audit_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const renderJsonDiff = (title: string, value: string | null) => {
    if (!value) return <Typography variant="caption" color="text.secondary">N/A</Typography>;
    try {
      const parsed = JSON.parse(value);
      return (
        <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 1.5, borderRadius: '8px', overflowX: 'auto', mt: 1 }}>
          <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700 }}>{title}:</Typography>
          <pre style={{ margin: '5px 0 0 0', fontSize: '0.75rem', fontFamily: 'monospace', color: '#94A3B8' }}>
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </Box>
      );
    } catch {
      return (
        <Box sx={{ bgcolor: 'rgba(0,0,0,0.3)', p: 1.5, borderRadius: '8px', mt: 1 }}>
          <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700 }}>{title}:</Typography>
          <Typography variant="body2" sx={{ color: '#94A3B8', fontFamily: 'monospace', mt: 0.5 }}>{value}</Typography>
        </Box>
      );
    }
  };

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', maxWidth: '1200px', margin: '0 auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Audit Logs</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Monitor system activities, user actions, and security events. Click on a row to view state comparison.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<FileSpreadsheet size={18} />}
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            sx={{ borderRadius: '12px', textTransform: 'none', fontWeight: 700, borderColor: 'rgba(255,255,255,0.1)' }}
          >
            Export Logs
          </Button>
          <Box sx={{ p: 2, borderRadius: '12px', bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}>
            <Shield size={24} />
          </Box>
        </Box>
      </Box>

      <Paper sx={{ p: 2.5, mb: 4, borderRadius: '16px', display: 'flex', gap: 2, border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', flexWrap: 'wrap' }}>
        <TextField
          placeholder="Search by user or action..."
          size="small"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search size={18} color="#64748B" /></InputAdornment>,
            sx: { borderRadius: '10px', fontWeight: 600 }
          }}
          sx={{ flexGrow: 1, maxWidth: 400 }}
        />

        <FormControl size="small" sx={{ width: 180, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}>
          <InputLabel style={{ color: 'rgba(255,255,255,0.6)' }}>Module Filter</InputLabel>
          <Select
            value={moduleFilter}
            label="Module Filter"
            onChange={(e) => setModuleFilter(e.target.value)}
            sx={{ color: '#fff' }}
          >
            {modulesList.map((m, idx) => (
              <MenuItem key={idx} value={m}>{m === 'All' ? 'All Modules' : m}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
            <TableRow>
              <TableCell sx={{ width: '50px' }}></TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Timestamp</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>User</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Module</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Action</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Details</TableCell>
              <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>IP Address</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, fontWeight: 700, color: 'text.secondary' }}>No audit logs found.</TableCell></TableRow>
            ) : filteredLogs.map((log) => {
              const isExpanded = expandedRow === log.id;
              return (
                <React.Fragment key={log.id}>
                  <TableRow 
                    hover 
                    onClick={() => toggleRow(log.id)}
                    sx={{ cursor: 'pointer', '& td': { borderBottom: isExpanded ? '0' : '1px solid rgba(255,255,255,0.03)' } }}
                  >
                    <TableCell>
                      <IconButton size="small">
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>
                      {new Date(log.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography fontWeight={700}>{log.user?.name || 'System'}</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>{log.user?.role || 'Service'}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#94A3B8' }}>{log.module || 'System'}</TableCell>
                    <TableCell>
                      <Chip 
                        icon={<Activity size={12} />}
                        label={log.action} 
                        size="small" 
                        sx={{ borderRadius: '8px', fontWeight: 800, bgcolor: 'rgba(99, 102, 241, 0.1)', color: '#6366F1' }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600, maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.details || 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Network size={14} style={{ opacity: 0.5 }} />
                        <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.85rem' }}>{log.ipAddress || 'Localhost'}</Typography>
                      </Box>
                    </TableCell>
                  </TableRow>

                  {/* COLLAPSIBLE ROW FOR COMPARATIVE VIEW */}
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#6366F1', mb: 1 }}>
                            State Comparison details
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 2 }}>
                            {log.details}
                          </Typography>
                          {(log.oldValue || log.newValue) ? (
                            <Grid container spacing={2}>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="caption" fontWeight={800} color="text.secondary">PREVIOUS STATE (OLD VALUE)</Typography>
                                {renderJsonDiff('Old Value', log.oldValue)}
                              </Grid>
                              <Grid item xs={12} sm={6}>
                                <Typography variant="caption" fontWeight={800} color="text.secondary">NEW STATE (NEW VALUE)</Typography>
                                {renderJsonDiff('New Value', log.newValue)}
                              </Grid>
                            </Grid>
                          ) : (
                            <Typography variant="caption" color="text.secondary" fontWeight={700}>
                              No state changes recorded for this operation type.
                            </Typography>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
