import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField,
  InputAdornment
} from '@mui/material';
import { Search, Add, Edit, LocalShipping, ReceiptLong } from '@mui/icons-material';

const MOCK_SUPPLIERS = [
  { id: '1', name: 'Fresh Farms Inc.', category: 'Vegetables', pendingOrders: 2, status: 'Active', balance: '$450.00' },
  { id: '2', name: 'Premium Meats Co.', category: 'Meat & Poultry', pendingOrders: 0, status: 'Active', balance: '$0.00' },
  { id: '3', name: 'Ocean Catch', category: 'Seafood', pendingOrders: 1, status: 'On Hold', balance: '$1200.00' },
];

export default function SupplierManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Supplier Directory</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage vendors, purchase orders, and outstanding balances.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button variant="outlined" startIcon={<ReceiptLong />} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Pay Balances
          </Button>
          <Button variant="contained" startIcon={<Add />} sx={{ borderRadius: 2, textTransform: 'none' }}>
            New Purchase Order
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 4, borderRadius: 3, display: 'flex', gap: 2 }}>
        <TextField
          placeholder="Search suppliers..."
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
          }}
          sx={{ maxWidth: 400 }}
        />
        <Button variant="outlined" startIcon={<LocalShipping />} sx={{ borderRadius: 2, textTransform: 'none' }}>
          Track Deliveries
        </Button>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Supplier Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Pending Orders</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Outstanding Balance</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MOCK_SUPPLIERS.map((supplier) => (
              <TableRow key={supplier.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{supplier.name}</TableCell>
                <TableCell color="text.secondary">{supplier.category}</TableCell>
                <TableCell>
                  <Chip label={`${supplier.pendingOrders} Orders`} size="small" variant="outlined" color={supplier.pendingOrders > 0 ? 'warning' : 'default'} />
                </TableCell>
                <TableCell sx={{ fontWeight: 700, color: supplier.balance !== '$0.00' ? 'error.main' : 'inherit' }}>
                  {supplier.balance}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={supplier.status} 
                    size="small" 
                    color={supplier.status === 'Active' ? 'success' : 'error'}
                    variant="filled"
                    sx={{ borderRadius: 1.5, fontWeight: 600 }}
                  />
                </TableCell>
                <TableCell sx={{ textAlign: 'right' }}>
                  <IconButton color="primary" size="small"><Edit fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
