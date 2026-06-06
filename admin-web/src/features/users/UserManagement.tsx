import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField,
  InputAdornment
} from '@mui/material';
import { Search, Add, Edit, Delete, Security } from '@mui/icons-material';

// MOCK DATA for Phase 4 UI visualization
const MOCK_USERS = [
  { id: '1', name: 'John Doe', email: 'john@erp.com', role: 'Admin', status: 'Active' },
  { id: '2', name: 'Jane Smith', email: 'jane@erp.com', role: 'Cashier', status: 'Active' },
  { id: '3', name: 'Mike Ross', email: 'mike@erp.com', role: 'Waiter', status: 'Inactive' },
  { id: '4', name: 'Gordon Ramsay', email: 'gordon@erp.com', role: 'Kitchen', status: 'Active' },
];

export default function UserManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>User Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage employee access, roles, and security policies.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
        >
          Add New User
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 4, borderRadius: 3, display: 'flex', gap: 2 }}>
        <TextField
          placeholder="Search by name or email..."
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'text.secondary' }} />
              </InputAdornment>
            ),
          }}
          sx={{ maxWidth: 400 }}
        />
        <Button variant="outlined" startIcon={<Security />} sx={{ borderRadius: 2, textTransform: 'none' }}>
          Role Policies
        </Button>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Role</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MOCK_USERS.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{user.name}</TableCell>
                <TableCell color="text.secondary">{user.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={user.role} 
                    size="small" 
                    color={user.role === 'Admin' ? 'error' : 'primary'}
                    sx={{ borderRadius: 1.5, fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={user.status} 
                    size="small" 
                    color={user.status === 'Active' ? 'success' : 'default'}
                    variant={user.status === 'Active' ? 'filled' : 'outlined'}
                    sx={{ borderRadius: 1.5 }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <IconButton color="primary" size="small"><Edit fontSize="small" /></IconButton>
                  <IconButton color="error" size="small"><Delete fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
