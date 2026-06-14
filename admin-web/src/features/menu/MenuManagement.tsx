import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Chip, TextField,
  InputAdornment, Tabs, Tab, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, CircularProgress,
  Menu as MuiMenu, FormControlLabel, Switch
} from '@mui/material';
import { Search, Plus, Edit2, Trash2, Filter } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';
import { useCurrency } from '../../shared/context/CurrencyContext';

interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

interface Product {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
  price: number;
  stock: number;
  isActive: boolean;
  requiresKitchen: boolean;
  image?: string;
}

export default function MenuManagement() {
  const [tab, setTab] = useState(0); // 0: Products, 1: Categories
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState(''); // '' = All Categories
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Modal State
  const [openModal, setOpenModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const { currencySymbol, formatCurrency } = useCurrency();

  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [requiresKitchen, setRequiresKitchen] = useState(true);

  const queryClient = useQueryClient();

  // Real-time: auto-refresh menu data on backend events
  useSocketEvent('menu.product_created', ['products']);
  useSocketEvent('menu.product_updated', ['products']);
  useSocketEvent('menu.product_deleted', ['products']);
  useSocketEvent('menu.category_created', ['categories']);
  useSocketEvent('menu.category_updated', ['categories']);
  useSocketEvent('menu.category_deleted', ['categories']);

  // Queries
  const { data: products, isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await axiosClient.get('/menu/products');
      return res.data;
    }
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await axiosClient.get('/menu/categories');
      return res.data;
    }
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (newProduct: any) => axiosClient.post('/menu/products', newProduct),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCloseModal();
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: (data: { id: string, product: any }) => axiosClient.put(`/menu/products/${data.id}`, data.product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      handleCloseModal();
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/menu/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: (newCategory: any) => axiosClient.post('/menu/categories', newCategory),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseModal();
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: (data: { id: string, category: any }) => axiosClient.put(`/menu/categories/${data.id}`, data.category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      handleCloseModal();
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: string) => axiosClient.delete(`/menu/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    }
  });

  const handleOpenModal = (item?: any) => {
    if (tab === 0) { // Products
      if (item) {
        setEditingItem(item);
        setName(item.name);
        setPrice(item.price.toString());
        setStock(item.stock?.toString() || '0');
        setCategoryId(item.categoryId);
        setIsAvailable(item.isActive);
        setRequiresKitchen(item.requiresKitchen ?? true);
      } else {
        setEditingItem(null);
        setName('');
        setPrice('');
        setStock('');
        setCategoryId('');
        setIsAvailable(true);
        setRequiresKitchen(true);
      }
    } else { // Categories
      if (item) {
        setEditingItem(item);
        setName(item.name);
        setIsAvailable(item.isActive);
      } else {
        setEditingItem(null);
        setName('');
        setIsAvailable(true);
      }
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingItem(null);
  };

  const handleSave = () => {
    if (tab === 0) {
      const productData = { 
        name, 
        price: parseFloat(price), 
        stock: parseInt(stock, 10), 
        categoryId, 
        isActive: isAvailable,
        requiresKitchen
      };
      if (editingItem) {
        updateProductMutation.mutate({ id: editingItem.id, product: productData });
      } else {
        createProductMutation.mutate(productData);
      }
    } else {
      const categoryData = {
        name,
        isActive: isAvailable
      };
      if (editingItem) {
        updateCategoryMutation.mutate({ id: editingItem.id, category: categoryData });
      } else {
        createCategoryMutation.mutate(categoryData);
      }
    }
  };

  const filteredProducts = products?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategoryId || p.categoryId === filterCategoryId;
    return matchesSearch && matchesCategory;
  }) || [];

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Menu Management</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Manage your restaurant's products, categories, and pricing.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />}
          onClick={() => handleOpenModal()}
          sx={{ 
            borderRadius: '12px', textTransform: 'none', px: 3, py: 1.5,
            fontWeight: 700, bgcolor: '#6366F1', boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            '&:hover': { bgcolor: '#4F46E5' }
          }}
        >
          {tab === 0 ? 'Add Product' : 'Add Category'}
        </Button>
      </Box>

      <Paper sx={{ mb: 3, borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', bgcolor: 'background.paper' }}>
        <Tabs 
          value={tab} 
          onChange={(_, v) => setTab(v)} 
          sx={{ 
            px: 2, pt: 1, borderBottom: '1px solid rgba(255,255,255,0.05)',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minWidth: 120 },
            '& .Mui-selected': { color: '#6366F1 !important' },
            '& .MuiTabs-indicator': { backgroundColor: '#6366F1', height: 3, borderRadius: '3px 3px 0 0' }
          }}
        >
          <Tab label="Products" />
          <Tab label="Categories" />
        </Tabs>
        
        <Box sx={{ p: 2.5, display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="Search menu items..."
            size="small"
            fullWidth
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search size={18} color="#64748B" /></InputAdornment>,
              sx: { borderRadius: '10px', fontWeight: 600 }
            }}
            sx={{ maxWidth: 400 }}
          />
          <Button 
            variant="outlined" 
            startIcon={<Filter size={18} />} 
            onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
            sx={{ 
              borderRadius: '10px', textTransform: 'none', fontWeight: 700, borderColor: filterCategoryId ? '#6366F1' : 'rgba(255,255,255,0.1)', 
              color: filterCategoryId ? '#6366F1' : 'text.primary',
              bgcolor: filterCategoryId ? 'rgba(99,102,241,0.08)' : 'transparent'
            }}
          >
            {filterCategoryId ? (categories?.find(c => c.id === filterCategoryId)?.name || 'Filtered') : 'Filter Category'}
          </Button>
          {/* Category Filter Dropdown Menu */}
          <MuiMenu
            anchorEl={filterMenuAnchor}
            open={Boolean(filterMenuAnchor)}
            onClose={() => setFilterMenuAnchor(null)}
            PaperProps={{ sx: { bgcolor: '#1E293B', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', minWidth: 200 } }}
          >
            <MenuItem 
              onClick={() => { setFilterCategoryId(''); setFilterMenuAnchor(null); }}
              sx={{ fontWeight: 700, color: !filterCategoryId ? '#6366F1' : '#fff' }}
            >
              All Categories
            </MenuItem>
            {categories?.map(cat => (
              <MenuItem
                key={cat.id}
                onClick={() => { setFilterCategoryId(cat.id); setFilterMenuAnchor(null); }}
                sx={{ fontWeight: 600, color: filterCategoryId === cat.id ? '#6366F1' : '#fff' }}
              >
                {cat.name}
              </MenuItem>
            ))}
          </MuiMenu>
        </Box>
      </Paper>

      {tab === 0 && (
        <TableContainer component={Paper} sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Item Name</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Category</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Price</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Stock</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoadingProducts ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, fontWeight: 700, color: 'text.secondary' }}>No products found.</TableCell></TableRow>
              ) : filteredProducts.map((item) => (
                <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 700 }}>
                    {item.name}
                    {item.requiresKitchen && <span title="Requires Kitchen" style={{ marginLeft: 8 }}>🍳</span>}
                  </TableCell>
                  <TableCell>
                    <Chip label={item.category?.name || 'Uncategorized'} size="small" sx={{ borderRadius: '6px', bgcolor: 'rgba(255,255,255,0.05)', fontWeight: 600 }} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 800 }}>{formatCurrency(item.price)}</TableCell>
                  <TableCell sx={{ color: item.stock === 0 ? '#F43F5E' : 'inherit', fontWeight: 700 }}>
                    {item.stock} units
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={item.isActive ? 'Available' : 'Sold Out'} 
                      size="small" 
                      variant={item.isActive ? 'filled' : 'outlined'}
                      sx={{ 
                        borderRadius: '8px', fontWeight: 800,
                        bgcolor: item.isActive ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                        color: item.isActive ? '#10B981' : 'text.secondary',
                        borderColor: 'rgba(255,255,255,0.1)'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <IconButton onClick={() => handleOpenModal(item)} sx={{ color: '#6366F1', bgcolor: 'rgba(99,102,241,0.1)', mr: 1, borderRadius: '8px' }} size="small">
                      <Edit2 size={16} />
                    </IconButton>
                    <IconButton onClick={() => { if(confirm('Are you sure?')) deleteProductMutation.mutate(item.id); }} sx={{ color: '#F43F5E', bgcolor: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px' }} size="small">
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && (
        <TableContainer component={Paper} sx={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 24px rgba(0,0,0,0.2)' }}>
          <Table>
            <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Category Name</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'text.secondary', textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!categories ? (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
              ) : categories.length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 5, fontWeight: 700, color: 'text.secondary' }}>No categories found.</TableCell></TableRow>
              ) : categories.map((cat) => (
                <TableRow key={cat.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ fontWeight: 700 }}>{cat.name}</TableCell>
                  <TableCell>
                    <Chip 
                      label={cat.isActive ? 'Active' : 'Inactive'} 
                      size="small" 
                      sx={{ 
                        borderRadius: '8px', fontWeight: 800,
                        bgcolor: cat.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)',
                        color: cat.isActive ? '#10B981' : '#F43F5E'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    <IconButton onClick={() => handleOpenModal(cat)} sx={{ color: '#6366F1', bgcolor: 'rgba(99,102,241,0.1)', mr: 1, borderRadius: '8px' }} size="small">
                      <Edit2 size={16} />
                    </IconButton>
                    <IconButton onClick={() => { if(confirm('Are you sure?')) deleteCategoryMutation.mutate(cat.id); }} sx={{ color: '#F43F5E', bgcolor: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px' }} size="small">
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* CREATE/EDIT MODAL */}
      <Dialog open={openModal} onClose={handleCloseModal} PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#1E293B', color: '#fff', minWidth: 400, border: '1px solid rgba(255,255,255,0.1)' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {tab === 0 
            ? (editingItem ? 'Edit Product' : 'Add New Product')
            : (editingItem ? 'Edit Category' : 'Add New Category')
          }
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField 
            label={tab === 0 ? "Product Name" : "Category Name"}
            fullWidth 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            sx={{ mt: 1, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
          />
          {tab === 0 && (
            <>
              <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}>
                <InputLabel style={{ color: 'rgba(255,255,255,0.7)' }}>Category</InputLabel>
                <Select value={categoryId} label="Category" onChange={(e) => setCategoryId(e.target.value as string)} sx={{ color: '#fff' }}>
                  {categories?.map(c => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField 
                  label={`Price (${currencySymbol})`} 
                  fullWidth 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  inputProps={{ inputMode: 'decimal', pattern: '[0-9.]*' }}
                  sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                  InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
                />
                <TextField 
                  label="Stock Quantity" 
                  fullWidth 
                  value={stock} 
                  onChange={(e) => setStock(e.target.value)} 
                  inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}
                  sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                  InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
                />
              </Box>
            </>
          )}
          <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}>
            <InputLabel style={{ color: 'rgba(255,255,255,0.7)' }}>Status</InputLabel>
            <Select value={isAvailable ? 'Available' : 'Sold Out/Inactive'} label="Status" onChange={(e) => setIsAvailable(e.target.value === 'Available')} sx={{ color: '#fff' }}>
              <MenuItem value="Available">{tab === 0 ? 'Available' : 'Active'}</MenuItem>
              <MenuItem value="Sold Out/Inactive">{tab === 0 ? 'Sold Out' : 'Inactive'}</MenuItem>
            </Select>
          </FormControl>
          {tab === 0 && (
            <FormControlLabel
              control={
                <Switch 
                  checked={requiresKitchen} 
                  onChange={(e) => setRequiresKitchen(e.target.checked)} 
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#6366F1' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#6366F1' } }}
                />
              }
              label={<Typography sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Requires Kitchen Preparation 🍳</Typography>}
              sx={{ mt: 1, ml: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleCloseModal} sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'none' }}>Cancel</Button>
          <Button onClick={handleSave} disabled={createProductMutation.isPending || updateProductMutation.isPending || createCategoryMutation.isPending || updateCategoryMutation.isPending} variant="contained" sx={{ bgcolor: '#6366F1', fontWeight: 700, textTransform: 'none', borderRadius: '8px', '&:hover': { bgcolor: '#4F46E5' } }}>
            {editingItem ? 'Save Changes' : (tab === 0 ? 'Create Product' : 'Create Category')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
