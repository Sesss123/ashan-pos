import { useState } from 'react';
import { 
  Box, Typography, Button, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Chip, TextField,
  InputAdornment, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, FormControl, InputLabel, Select, MenuItem, IconButton,
  Grid, Card, CardContent, Tabs, Tab, Divider, List, ListItem, ListItemText
} from '@mui/material';
import { 
  Search, Plus, Package, Trash2, Mail, FileText, 
  Check, X, AlertTriangle, TrendingUp, BarChart4 
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';
import { useCurrency } from '../../shared/context/CurrencyContext';

interface PurchaseItem {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  cost: number;
  taxRate: number;
}

interface PurchaseReceiptItem {
  itemId: string;
  itemName: string;
  quantityReceived: number;
}

interface PurchaseReceipt {
  id: string;
  receivedBy: string;
  receivedAt: string;
  notes: string;
  items: PurchaseReceiptItem[];
}

interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplier: { name: string; email: string; phone: string };
  status: string;
  taxAmount: number;
  totalAmount: number;
  branchId: string;
  approvedBy: string;
  items: PurchaseItem[];
  receipts: PurchaseReceipt[];
  createdAt: string;
}

interface Supplier {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  unitCost: number;
  quantity: number;
  minStock: number;
}

interface ReorderSuggestion {
  itemId: string;
  itemName: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
  suggestedQuantity: number;
  estimatedCost: number;
}

export default function PurchasesManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('All');
  const { currencySymbol, formatCurrency } = useCurrency();
  
  // Create / Edit PO Dialog States
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poStatus, setPoStatus] = useState('Draft');
  const [poItems, setPoItems] = useState<Array<{ itemId: string; itemName: string; quantity: number; cost: number; taxRate: number }>>([
    { itemId: '', itemName: '', quantity: 1, cost: 0, taxRate: 0.08 }
  ]);

  // View PO / Details Side Dialog States
  const [viewPo, setViewPo] = useState<PurchaseOrder | null>(null);

  // Receive Goods Dialog States
  const [openReceiveModal, setOpenReceiveModal] = useState(false);
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const [receiveQuantities, setReceiveQuantities] = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes] = useState('');

  // Price History Dialog States
  const [priceHistoryItem, setPriceHistoryItem] = useState<{ id: string; name: string } | null>(null);
  const [priceHistoryData, setPriceHistoryData] = useState<any[]>([]);

  const queryClient = useQueryClient();

  // Real-time: auto-refresh purchase orders on ERP procurement events
  useSocketEvent('purchase.created', ['purchaseOrders', 'reorderSuggestions']);
  useSocketEvent('purchase.updated', ['purchaseOrders']);
  useSocketEvent('purchase.approved', ['purchaseOrders']);
  useSocketEvent('purchase.received', ['purchaseOrders', 'reorderSuggestions', 'inventoryDashboard']);
  useSocketEvent('purchase.cancelled', ['purchaseOrders']);

  // Queries
  const { data: orders, isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ['purchaseOrders'],
    queryFn: async () => {
      const res = await axiosClient.get('/inventory/purchase-orders');
      return res.data;
    }
  });

  const { data: suppliers } = useQuery<{ success: boolean; data: Supplier[] }>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const res = await axiosClient.get('/supplier/suppliers');
      return res.data;
    }
  });

  const { data: inventoryData } = useQuery({
    queryKey: ['inventoryDashboard'],
    queryFn: async () => {
      const res = await axiosClient.get('/inventory/dashboard');
      return res.data;
    }
  });

  const { data: suggestionsData } = useQuery<{ success: boolean; data: ReorderSuggestion[] }>({
    queryKey: ['reorderSuggestions'],
    queryFn: async () => {
      const res = await axiosClient.get('/supplier/purchase-orders/reorder-suggestions');
      return res.data;
    }
  });

  const inventoryItems: InventoryItem[] = inventoryData?.items || [];
  const suppliersList = suppliers?.data || [];
  const reorderSuggestions = suggestionsData?.data || [];

  // Mutations
  const createPoMutation = useMutation({
    mutationFn: (newPo: any) => axiosClient.post('/supplier/purchase-orders', newPo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['reorderSuggestions'] });
      setOpenCreateModal(false);
      resetPoForm();
    }
  });

  const editPoMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => axiosClient.put(`/supplier/purchase-orders/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setOpenCreateModal(false);
      resetPoForm();
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, remarks }: { id: string; status: string; remarks?: string }) => 
      axiosClient.put(`/supplier/purchase-orders/${id}/status`, { status, remarks }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      if (viewPo && viewPo.id === res.data.data.id) {
        setViewPo(res.data.data);
      }
    }
  });

  const emailPoMutation = useMutation({
    mutationFn: (id: string) => axiosClient.post(`/supplier/purchase-orders/${id}/email`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      alert('Email sent successfully!');
      if (viewPo && viewPo.id === res.data.data.id) {
        setViewPo(res.data.data);
      }
    }
  });

  const receiveGoodsMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => 
      axiosClient.post(`/supplier/purchase-orders/${id}/receive-goods`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryDashboard'] });
      queryClient.invalidateQueries({ queryKey: ['reorderSuggestions'] });
      setOpenReceiveModal(false);
      setReceivePo(null);
      setReceiveQuantities({});
      setReceiveNotes('');
      setViewPo(null);
    }
  });

  // Fetch Price History
  const fetchPriceHistory = async (itemId: string, itemName: string) => {
    try {
      const res = await axiosClient.get(`/supplier/purchase-orders/price-history/${itemId}`);
      setPriceHistoryData(res.data.data);
      setPriceHistoryItem({ id: itemId, name: itemName });
    } catch (error) {
      console.error(error);
    }
  };

  const resetPoForm = () => {
    setSelectedPo(null);
    setSelectedSupplierId('');
    setPoStatus('Draft');
    setPoItems([{ itemId: '', itemName: '', quantity: 1, cost: 0, taxRate: 0.08 }]);
  };

  const handleOpenEdit = (po: PurchaseOrder) => {
    setSelectedPo(po);
    setSelectedSupplierId(po.supplierId);
    setPoStatus(po.status);
    setPoItems(po.items.map(item => ({
      itemId: item.itemId,
      itemName: item.itemName,
      quantity: item.quantity,
      cost: item.cost,
      taxRate: item.taxRate
    })));
    setOpenCreateModal(true);
  };

  const handleAddRow = () => {
    setPoItems([...poItems, { itemId: '', itemName: '', quantity: 1, cost: 0, taxRate: 0.08 }]);
  };

  const handleRemoveRow = (index: number) => {
    const updated = [...poItems];
    updated.splice(index, 1);
    setPoItems(updated);
  };

  const handleItemChange = (index: number, itemId: string) => {
    const selectedItem = inventoryItems.find(item => item.id === itemId);
    if (!selectedItem) return;

    const updated = [...poItems];
    updated[index] = {
      itemId: selectedItem.id,
      itemName: selectedItem.name,
      quantity: updated[index].quantity,
      cost: selectedItem.unitCost,
      taxRate: 0.08 // default 8% tax
    };
    setPoItems(updated);
  };

  const handleQtyChange = (index: number, quantity: number) => {
    const updated = [...poItems];
    updated[index].quantity = Math.max(1, quantity);
    setPoItems(updated);
  };

  const handleCostChange = (index: number, cost: number) => {
    const updated = [...poItems];
    updated[index].cost = Math.max(0, cost);
    setPoItems(updated);
  };

  const handleTaxChange = (index: number, taxRate: number) => {
    const updated = [...poItems];
    updated[index].taxRate = taxRate;
    setPoItems(updated);
  };

  const handleSavePO = () => {
    if (!selectedSupplierId || poItems.length === 0) return;
    
    const validItems = poItems.filter(item => item.itemId !== '');
    if (validItems.length === 0) return;

    const payload = {
      supplierId: selectedSupplierId,
      status: poStatus,
      items: validItems
    };

    if (selectedPo) {
      editPoMutation.mutate({ id: selectedPo.id, data: payload });
    } else {
      createPoMutation.mutate(payload);
    }
  };

  const handleOpenReceive = (po: PurchaseOrder) => {
    setReceivePo(po);
    const initialQty: Record<string, number> = {};
    
    // Suggest remaining quantity to be received
    po.items.forEach(item => {
      const key = item.itemId || item.itemName;
      const totalAlreadyReceived = po.receipts?.reduce((sum, r) => {
        const matchingItem = r.items.find(ri => ri.itemId === item.itemId || ri.itemName === item.itemName);
        return sum + (matchingItem ? matchingItem.quantityReceived : 0);
      }, 0) || 0;
      
      initialQty[key] = Math.max(0, item.quantity - totalAlreadyReceived);
    });
    
    setReceiveQuantities(initialQty);
    setOpenReceiveModal(true);
  };

  const handleReceiveSubmit = () => {
    if (!receivePo) return;
    
    const itemsReceived = receivePo.items.map(item => {
      const key = item.itemId || item.itemName;
      return {
        itemId: item.itemId,
        itemName: item.itemName,
        quantityReceived: receiveQuantities[key] || 0
      };
    }).filter(i => i.quantityReceived > 0);

    if (itemsReceived.length === 0) {
      alert('Please enter at least one item quantity to receive');
      return;
    }

    receiveGoodsMutation.mutate({
      id: receivePo.id,
      payload: {
        itemsReceived,
        notes: receiveNotes
      }
    });
  };

  const triggerDownloadPdf = async (id: string) => {
    try {
      const res = await axiosClient.get(`/supplier/purchase-orders/${id}/pdf`);
      const meta = res.data.pdfMetadata;
      // Simple print preview layout trigger
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>PO Print Summary</title>
              <style>
                body { font-family: sans-serif; padding: 40px; color: #333; }
                h1 { margin-bottom: 5px; }
                .meta-table, .items-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                .meta-table td { padding: 5px 0; }
                .items-table th, .items-table td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                .items-table th { background-color: #f5f5f5; }
                .totals { margin-top: 20px; text-align: right; font-size: 1.1em; }
              </style>
            </head>
            <body>
              <h1>${meta.title}</h1>
              <p>Status: <strong>${meta.status}</strong></p>
              <hr />
              <table class="meta-table">
                <tr><td><strong>Supplier:</strong> ${meta.supplierName}</td><td><strong>Date:</strong> ${new Date(meta.date).toLocaleString()}</td></tr>
                <tr><td><strong>Contact:</strong> ${meta.supplierContact}</td><td><strong>Approved By:</strong> ${meta.approvedBy || 'N/A'}</td></tr>
                <tr><td><strong>Email:</strong> ${meta.supplierEmail || 'N/A'}</td><td></td></tr>
              </table>
              
              <h3>Ordered Items</h3>
              <table class="items-table">
                <thead>
                  <tr><th>Item Name</th><th>Quantity</th><th>Unit Cost</th><th>Tax Rate</th><th>Total</th></tr>
                </thead>
                <tbody>
                  ${meta.items.map((i: any) => `
                    <tr>
                      <td>${i.itemName}</td>
                      <td>${i.quantity}</td>
                      <td>${currencySymbol} ${i.cost.toFixed(2)}</td>
                      <td>${(i.taxRate * 100).toFixed(0)}%</td>
                      <td>${currencySymbol} ${(i.cost * i.quantity * (1 + i.taxRate)).toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="totals">
                <p>Tax Amount: ${currencySymbol} ${meta.taxAmount.toFixed(2)}</p>
                <p><strong>Grand Total: ${currencySymbol} ${meta.totalAmount.toFixed(2)}</strong></p>
              </div>
              <script>window.print();</script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredOrders = orders?.filter(o => 
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.supplier && o.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ).filter(o => activeTab === 'All' || o.status === activeTab) || [];

  // KPI calculations
  const totalPO = orders?.length || 0;
  const pendingApproval = orders?.filter(o => o.status === 'Pending Approval').length || 0;
  const partiallyReceived = orders?.filter(o => o.status === 'Partially Received').length || 0;
  const completedPO = orders?.filter(o => o.status === 'Completed').length || 0;

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      
      {/* HEADER SECTION */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>Purchase Orders</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Manage raw material procurement, track multi-level approvals, and receive goods.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Plus size={18} />}
          onClick={() => { resetPoForm(); setOpenCreateModal(true); }}
          sx={{ 
            borderRadius: '12px', textTransform: 'none', px: 3, py: 1.5,
            fontWeight: 700, bgcolor: '#6366F1', boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            '&:hover': { bgcolor: '#4F46E5' }
          }}
        >
          Create Purchase Order
        </Button>
      </Box>

      {/* KPI STATS BAR */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: '#1E293B' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" fontWeight={700}>Total Orders</Typography>
              <Typography variant="h4" fontWeight={800} mt={1}>{totalPO}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: '#1E293B' }}>
            <CardContent>
              <Typography variant="body2" color="warning.main" fontWeight={700}>Pending Approval</Typography>
              <Typography variant="h4" fontWeight={800} mt={1} color="warning.main">{pendingApproval}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: '#1E293B' }}>
            <CardContent>
              <Typography variant="body2" color="info.main" fontWeight={700}>Partially Received</Typography>
              <Typography variant="h4" fontWeight={800} mt={1} color="info.main">{partiallyReceived}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: '#1E293B' }}>
            <CardContent>
              <Typography variant="body2" color="success.main" fontWeight={700}>Completed POs</Typography>
              <Typography variant="h4" fontWeight={800} mt={1} color="success.main">{completedPO}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={4}>
        {/* PO TABLE LIST */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 2, borderRadius: '16px', mb: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
              <Tabs 
                value={activeTab} 
                onChange={(_, val) => setActiveTab(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ 
                  '& .MuiTabs-indicator': { bgcolor: '#6366F1' }, 
                  '& .MuiTab-root': { fontWeight: 700, textTransform: 'none', minWidth: 'auto', px: 2 } 
                }}
              >
                <Tab label="All" value="All" />
                <Tab label="Draft" value="Draft" />
                <Tab label="Pending Approval" value="Pending Approval" />
                <Tab label="Approved" value="Approved" />
                <Tab label="Sent To Supplier" value="Sent To Supplier" />
                <Tab label="Partially Received" value="Partially Received" />
                <Tab label="Completed" value="Completed" />
                <Tab label="Cancelled" value="Cancelled" />
              </Tabs>

              <TextField
                placeholder="Search PO ID, Supplier..."
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Search size={18} color="#64748B" /></InputAdornment>,
                  sx: { borderRadius: '10px', fontWeight: 600 }
                }}
                sx={{ maxWidth: 300 }}
              />
            </Box>

            <TableContainer>
              <Table>
                <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.01)' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>PO ID</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Supplier</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Total Cost</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {isLoading ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5 }}><CircularProgress /></TableCell></TableRow>
                  ) : filteredOrders.length === 0 ? (
                    <TableRow><TableCell colSpan={6} align="center" sx={{ py: 5, fontWeight: 700, color: 'text.secondary' }}>No Purchase Orders found.</TableCell></TableRow>
                  ) : filteredOrders.map((order) => (
                    <TableRow key={order.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell 
                        sx={{ fontWeight: 800, color: '#6366F1', cursor: 'pointer' }}
                        onClick={() => setViewPo(order)}
                      >
                        PO-{order.id.slice(0, 6).toUpperCase()}
                      </TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{order.supplier?.name || 'Unknown'}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{formatCurrency(order.totalAmount)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={order.status} 
                          size="small" 
                          sx={{ 
                            borderRadius: '8px', fontWeight: 800,
                            bgcolor: order.status === 'Completed' ? 'rgba(16, 185, 129, 0.1)' : 
                                     order.status === 'Partially Received' ? 'rgba(59, 130, 246, 0.1)' :
                                     order.status === 'Approved' ? 'rgba(139, 92, 246, 0.1)' :
                                     order.status === 'Draft' ? 'rgba(100, 116, 139, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                            color: order.status === 'Completed' ? '#10B981' : 
                                   order.status === 'Partially Received' ? '#3B82F6' :
                                   order.status === 'Approved' ? '#8B5CF6' :
                                   order.status === 'Draft' ? '#64748B' : '#F59E0B',
                            border: '1px solid rgba(255,255,255,0.05)'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                          <IconButton size="small" onClick={() => triggerDownloadPdf(order.id)} sx={{ color: '#94A3B8' }} title="Print PO">
                            <FileText size={16} />
                          </IconButton>
                          {order.status === 'Draft' && (
                            <Button size="small" variant="outlined" onClick={() => handleOpenEdit(order)} sx={{ borderRadius: '6px', textTransform: 'none', fontWeight: 700 }}>
                              Edit
                            </Button>
                          )}
                          {['Sent To Supplier', 'Partially Received', 'Approved'].includes(order.status) && (
                            <Button 
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<Package size={14} />}
                              onClick={() => handleOpenReceive(order)}
                              sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                            >
                              Receive
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* SIDE PANELS (REORDER SUGGESTIONS & PRICES) */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <AlertTriangle size={18} color="#F59E0B" />
              <Typography variant="subtitle1" fontWeight={800}>Auto Reorder Alerts</Typography>
            </Box>
            <Divider sx={{ mb: 2 }} />
            {reorderSuggestions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center', fontWeight: 600 }}>
                All stock levels healthy!
              </Typography>
            ) : (
              <List disablePadding>
                {reorderSuggestions.map(sug => (
                  <ListItem 
                    key={sug.itemId} 
                    disablePadding 
                    sx={{ 
                      flexDirection: 'column', alignItems: 'stretch', py: 1.5,
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      '&:last-child': { borderBottom: 0 }
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" fontWeight={800}>{sug.itemName}</Typography>
                      <Typography variant="caption" color="warning.main" fontWeight={700}>
                        Stock: {sug.currentStock} / Min: {sug.minStock}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={600}>
                        Suggest: <strong>{sug.suggestedQuantity}</strong> items
                      </Typography>
                      <Button 
                        size="small" 
                        variant="text" 
                        startIcon={<TrendingUp size={12} />}
                        onClick={() => fetchPriceHistory(sug.itemId, sug.itemName)}
                        sx={{ fontSize: '0.75rem', textTransform: 'none', fontWeight: 700 }}
                      >
                        Price Trend
                      </Button>
                    </Box>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>

          {/* QUICK HELP CARD */}
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', bgcolor: 'rgba(99, 102, 241, 0.03)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <BarChart4 size={18} color="#6366F1" />
              <Typography variant="subtitle1" fontWeight={800}>Procurement Info</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, lineHeight: 1.6 }}>
              Approved Purchase Orders increment supplier ledger balances when goods are received. Unapproved orders do not affect stock.
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* VIEW PO DETAILS MODAL / DRAWER */}
      <Dialog 
        open={!!viewPo} 
        onClose={() => setViewPo(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '20px', bgcolor: '#1E293B', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
        }}
      >
        {viewPo && (
          <>
            <DialogTitle sx={{ fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography variant="h6" fontWeight={800}>Purchase Order Detail</Typography>
                <Chip label={viewPo.status} size="small" sx={{ fontWeight: 800, bgcolor: 'rgba(99,102,241,0.15)', color: '#6366F1' }} />
              </Box>
              <Typography variant="body2" color="text.secondary">
                PO-{viewPo.id.slice(0, 8).toUpperCase()}
              </Typography>
            </DialogTitle>

            <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>SUPPLIER DETAILS</Typography>
                  <Typography variant="body1" fontWeight={800} sx={{ mt: 0.5 }}>{viewPo.supplier?.name || 'N/A'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{viewPo.supplier?.phone || 'N/A'}</Typography>
                  <Typography variant="body2" color="text.secondary">{viewPo.supplier?.email || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>ORDER TIMELINE</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Created: <strong>{new Date(viewPo.createdAt).toLocaleString()}</strong>
                  </Typography>
                  {viewPo.approvedBy && (
                    <Typography variant="body2" color="success.main" sx={{ mt: 0.5, fontWeight: 700 }}>
                      Approved By: {viewPo.approvedBy}
                    </Typography>
                  )}
                </Grid>
              </Grid>

              <Typography variant="subtitle2" color="text.secondary" fontWeight={800} sx={{ mb: 1.5 }}>ORDERED ITEMS</Typography>
              <TableContainer component={Paper} sx={{ bgcolor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>Item Name</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Quantity</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Unit Cost</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Tax Rate</TableCell>
                      <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {viewPo.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ fontWeight: 700 }}>{item.itemName}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{item.quantity}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{formatCurrency(item.cost)}</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>{(item.taxRate * 100).toFixed(0)}%</TableCell>
                        <TableCell sx={{ fontWeight: 800, textAlign: 'right' }}>
                          {formatCurrency(item.cost * item.quantity * (1 + item.taxRate))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* RECEIPTS SECTION */}
              {viewPo.receipts && viewPo.receipts.length > 0 && (
                <>
                  <Typography variant="subtitle2" color="text.secondary" fontWeight={800} sx={{ mb: 1.5 }}>GOODS RECEIPTS HISTORY</Typography>
                  {viewPo.receipts.map((rec) => (
                    <Box key={rec.id} sx={{ p: 2, mb: 1.5, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" fontWeight={800}>Receipt ID: GRN-{rec.id.slice(0, 6).toUpperCase()}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Received: {new Date(rec.receivedAt).toLocaleString()} by {rec.receivedBy}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                        Notes: {rec.notes || 'None'}
                      </Typography>
                      <Grid container spacing={1}>
                        {rec.items.map((ri, index) => (
                          <Grid item xs={6} sm={4} key={index}>
                            <Typography variant="caption" color="text.secondary">
                              • {ri.itemName}: <strong>{ri.quantityReceived}</strong> received
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  ))}
                </>
              )}
            </DialogContent>

            <DialogActions sx={{ p: 3, gap: 1 }}>
              <Button onClick={() => setViewPo(null)} sx={{ color: '#94A3B8' }}>Close</Button>
              {viewPo.status === 'Pending Approval' && (
                <>
                  <Button 
                    color="error" 
                    variant="outlined"
                    startIcon={<X size={16} />}
                    onClick={() => updateStatusMutation.mutate({ id: viewPo.id, status: 'Cancelled', remarks: 'Rejected by manager' })}
                    disabled={updateStatusMutation.isPending}
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    Reject PO
                  </Button>
                  <Button 
                    color="success" 
                    variant="contained"
                    startIcon={<Check size={16} />}
                    onClick={() => updateStatusMutation.mutate({ id: viewPo.id, status: 'Approved' })}
                    disabled={updateStatusMutation.isPending}
                    sx={{ textTransform: 'none', borderRadius: '8px' }}
                  >
                    Approve PO
                  </Button>
                </>
              )}
              {viewPo.status === 'Approved' && (
                <Button 
                  color="primary" 
                  variant="contained"
                  startIcon={<Mail size={16} />}
                  onClick={() => emailPoMutation.mutate(viewPo.id)}
                  disabled={emailPoMutation.isPending}
                  sx={{ textTransform: 'none', borderRadius: '8px', bgcolor: '#6366F1' }}
                >
                  Send to Supplier (Email)
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* CREATE & EDIT PURCHASE ORDER DIALOG */}
      <Dialog 
        open={openCreateModal} 
        onClose={() => setOpenCreateModal(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '20px', bgcolor: '#1E293B', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {selectedPo ? 'Edit Purchase Order' : 'Create Purchase Order'}
        </DialogTitle>
        
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 2 }}>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}>
                <InputLabel style={{ color: 'rgba(255,255,255,0.7)' }}>Select Supplier</InputLabel>
                <Select 
                  value={selectedSupplierId} 
                  label="Select Supplier" 
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  sx={{ color: '#fff' }}
                >
                  {suppliersList.map(sup => (
                    <MenuItem key={sup.id} value={sup.id}>{sup.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}>
                <InputLabel style={{ color: 'rgba(255,255,255,0.7)' }}>Initial Status</InputLabel>
                <Select 
                  value={poStatus} 
                  label="Initial Status" 
                  onChange={(e) => setPoStatus(e.target.value)}
                  sx={{ color: '#fff' }}
                >
                  <MenuItem value="Draft">Draft</MenuItem>
                  <MenuItem value="Pending Approval">Pending Approval</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ color: '#94A3B8', fontWeight: 700 }}>ORDER LINE ITEMS</Typography>

          {poItems.map((row, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}>
                <InputLabel style={{ color: 'rgba(255,255,255,0.7)' }}>Raw Material</InputLabel>
                <Select 
                  value={row.itemId} 
                  label="Raw Material" 
                  onChange={(e) => handleItemChange(index, e.target.value)}
                  sx={{ color: '#fff' }}
                >
                  {inventoryItems.map(item => (
                    <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField 
                label="Qty" 
                type="number"
                value={row.quantity}
                onChange={(e) => handleQtyChange(index, parseInt(e.target.value, 10))}
                sx={{ width: 90, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
              />

              <TextField 
                label="Cost (LKR)" 
                type="number"
                value={row.cost}
                onChange={(e) => handleCostChange(index, parseFloat(e.target.value))}
                sx={{ width: 120, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
              />

              <FormControl sx={{ width: 100, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}>
                <InputLabel style={{ color: 'rgba(255,255,255,0.7)' }}>Tax</InputLabel>
                <Select
                  value={row.taxRate}
                  label="Tax"
                  onChange={(e) => handleTaxChange(index, parseFloat(e.target.value as string))}
                  sx={{ color: '#fff' }}
                >
                  <MenuItem value={0.00}>0%</MenuItem>
                  <MenuItem value={0.05}>5%</MenuItem>
                  <MenuItem value={0.08}>8%</MenuItem>
                  <MenuItem value={0.10}>10%</MenuItem>
                  <MenuItem value={0.15}>15%</MenuItem>
                </Select>
              </FormControl>

              <IconButton 
                onClick={() => handleRemoveRow(index)} 
                sx={{ color: '#F43F5E', bgcolor: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px' }} 
                disabled={poItems.length === 1}
              >
                <Trash2 size={16} />
              </IconButton>
            </Box>
          ))}

          <Button 
            startIcon={<Plus size={16} />} 
            onClick={handleAddRow}
            sx={{ width: 'fit-content', textTransform: 'none', color: '#6366F1', fontWeight: 700 }}
          >
            Add Another Raw Material
          </Button>

          <Box sx={{ p: 2.5, bgcolor: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">Estimated Taxes:</Typography>
                <Typography variant="h6" fontWeight={800} color="#F59E0B">
                  LKR {poItems.reduce((sum, item) => sum + (item.cost * item.taxRate * item.quantity), 0).toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={6} sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="text.secondary">Total PO Cost:</Typography>
                <Typography variant="h6" fontWeight={800} color="#10B981">
                  LKR {poItems.reduce((sum, item) => sum + ((item.cost * (1 + item.taxRate)) * item.quantity), 0).toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenCreateModal(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button 
            onClick={handleSavePO} 
            disabled={createPoMutation.isPending || editPoMutation.isPending || !selectedSupplierId} 
            variant="contained" 
            sx={{ bgcolor: '#6366F1', fontWeight: 700 }}
          >
            {selectedPo ? 'Save Changes' : 'Submit PO'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* GOODS RECEIVING DIALOG */}
      <Dialog 
        open={openReceiveModal} 
        onClose={() => setOpenReceiveModal(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '20px', bgcolor: '#1E293B', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Process Goods Receipt (GRN)</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Enter the exact quantities received in this shipment for PO-{receivePo?.id.slice(0, 6).toUpperCase()}.
          </Typography>

          {receivePo?.items.map(item => {
            const key = item.itemId || item.itemName;
            const totalAlreadyReceived = receivePo.receipts?.reduce((sum, r) => {
              const matchingItem = r.items.find(ri => ri.itemId === item.itemId || ri.itemName === item.itemName);
              return sum + (matchingItem ? matchingItem.quantityReceived : 0);
            }, 0) || 0;

            return (
              <Box key={item.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, bgcolor: 'rgba(255,255,255,0.01)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <Box>
                  <Typography variant="body2" fontWeight={800}>{item.itemName}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Ordered: {item.quantity} | Already Received: {totalAlreadyReceived}
                  </Typography>
                </Box>
                <TextField
                  label="Receiving"
                  type="number"
                  size="small"
                  value={receiveQuantities[key] || 0}
                  onChange={(e) => setReceiveQuantities({
                    ...receiveQuantities,
                    [key]: Math.max(0, parseInt(e.target.value, 10) || 0)
                  })}
                  sx={{ width: 100, '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
                  InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
                />
              </Box>
            );
          })}

          <TextField
            label="Receiving Remarks / Notes"
            multiline
            rows={2}
            fullWidth
            value={receiveNotes}
            onChange={(e) => setReceiveNotes(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } } }}
            InputLabelProps={{ style: { color: 'rgba(255,255,255,0.7)' } }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenReceiveModal(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
          <Button 
            onClick={handleReceiveSubmit} 
            disabled={receiveGoodsMutation.isPending}
            variant="contained" 
            color="success"
            sx={{ fontWeight: 700 }}
          >
            Submit Receipt
          </Button>
        </DialogActions>
      </Dialog>

      {/* PRICE COMPARISON HISTORY DIALOG */}
      <Dialog
        open={!!priceHistoryItem}
        onClose={() => setPriceHistoryItem(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: '20px', bgcolor: '#1E293B', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Price Trends: {priceHistoryItem?.name}</DialogTitle>
        <DialogContent>
          {priceHistoryData.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
              No purchase history found for this item.
            </Typography>
          ) : (
            <List>
              {priceHistoryData.map((h, i) => (
                <ListItem key={i} sx={{ borderBottom: '1px solid rgba(255,255,255,0.03)', py: 1.5 }}>
                  <ListItemText
                    primary={`LKR ${h.cost.toFixed(2)} (+${(h.taxRate * 100).toFixed(0)}% Tax)`}
                    secondary={`Supplier: ${h.supplierName} | ${new Date(h.date).toLocaleDateString()}`}
                    primaryTypographyProps={{ fontWeight: 800, color: '#10B981' }}
                    secondaryTypographyProps={{ color: 'text.secondary', fontWeight: 600 }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setPriceHistoryItem(null)} sx={{ color: '#94A3B8' }}>Close</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
