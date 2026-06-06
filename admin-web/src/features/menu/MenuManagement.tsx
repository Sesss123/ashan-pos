import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField,
  InputAdornment, Tabs, Tab
} from '@mui/material';
import { Search, Add, Edit, Delete, RestaurantMenu } from '@mui/icons-material';

const MOCK_MENU = [
  { id: '1', name: 'Wagyu Beef Burger', category: 'Mains', price: '$24.00', stock: 45, status: 'Available' },
  { id: '2', name: 'Truffle Fries', category: 'Sides', price: '$12.00', stock: 120, status: 'Available' },
  { id: '3', name: 'Matcha Latte', category: 'Beverages', price: '$6.50', stock: 0, status: 'Sold Out' },
  { id: '4', name: 'Caesar Salad', category: 'Starters', price: '$14.00', stock: 30, status: 'Available' },
];

export default function MenuManagement() {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>Menu Management</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage your restaurant's products, categories, and pricing.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Add />}
          sx={{ borderRadius: 2, textTransform: 'none', px: 3 }}
        >
          Add Product
        </Button>
      </Box>

      <Paper sx={{ mb: 3, borderRadius: 3, overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ px: 2, pt: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Products" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Categories" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab label="Modifiers" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
        
        <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
          <TextField
            placeholder="Search menu items..."
            size="small"
            fullWidth
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search sx={{ color: 'text.secondary' }} /></InputAdornment>,
            }}
            sx={{ maxWidth: 400 }}
          />
          <Button variant="outlined" startIcon={<RestaurantMenu />} sx={{ borderRadius: 2, textTransform: 'none' }}>
            Filter Category
          </Button>
        </Box>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'background.default' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Item Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Category</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Price</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Stock</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600, textAlign: 'right' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {MOCK_MENU.map((item) => (
              <TableRow key={item.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{item.name}</TableCell>
                <TableCell color="text.secondary">{item.category}</TableCell>
                <TableCell sx={{ fontWeight: 500 }}>{item.price}</TableCell>
                <TableCell sx={{ color: item.stock === 0 ? 'error.main' : 'inherit' }}>
                  {item.stock} units
                </TableCell>
                <TableCell>
                  <Chip 
                    label={item.status} 
                    size="small" 
                    color={item.status === 'Available' ? 'success' : 'error'}
                    variant="filled"
                    sx={{ borderRadius: 1.5, fontWeight: 500 }}
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
