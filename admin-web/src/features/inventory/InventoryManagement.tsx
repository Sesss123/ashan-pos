import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField,
  InputAdornment
} from '@mui/material';
import { Search, Add, Edit, History, Warning } from '@mui/icons-material';

const MOCK_INVENTORY = [
  { id: '1', name: 'Wagyu Beef Patty', stock: 45, minStock: 50, unit: 'kg', status: 'Low Stock' },
  { id: '2', name: 'Burger Buns', stock: 120, minStock: 100, unit: 'pcs', status: 'Optimal' },
  { id: '3', name: 'Truffle Oil', stock: 2, minStock: 5, unit: 'L', status: 'Critical' },
  { id: '4', name: 'Romaine Lettuce', stock: 30, minStock: 20, unit: 'kg', status: 'Optimal' },
];

export default function InventoryManagement() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Inventory Control</Typography>
          <Typography variant="body2" color="text.secondary">
            Monitor real-time stock levels, shortages, and movement history.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
        >
          Add Raw Material
        </Button>
      </Box>

      <Paper sx={{ p: 2, mb: 4, borderRadius: 3, display: 'flex', gap: 2 }}>
        <TextField
          placeholder="Search materials..."
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
          }}
          sx={{ maxWidth: 400 }}
        />
        <Button variant="outlined" startIcon={<History />} sx={{ borderRadius: 2, textTransform: 'none' }}>
          Movement Logs
        </Button>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Material Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Current Stock</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Min Stock Level</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Health</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MOCK_INVENTORY.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{item.stock} {item.unit}</TableCell>
                <TableCell color="text.secondary">{item.minStock} {item.unit}</TableCell>
                <TableCell>
                  <Chip 
                    icon={item.status !== 'Optimal' ? <Warning fontSize="small" /> : undefined}
                    label={item.status} 
                    size="small" 
                    color={item.status === 'Optimal' ? 'success' : item.status === 'Critical' ? 'error' : 'warning'}
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
