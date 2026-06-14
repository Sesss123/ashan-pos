import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, AppBar, Toolbar, Avatar, Menu, MenuItem, IconButton, Snackbar, Alert, Slide, Select, SelectChangeEvent } from '@mui/material';
import { 
  LayoutDashboard, 
  Store,
  Users, 
  Shield,
  Menu as MenuIcon, 
  Box as BoxIcon, 
  Truck, 
  ShoppingCart,
  LineChart, 
  Search,
  Bell,
  Clipboard,
  Database,
  Settings,
  LogOut,
  Activity,
  TrendingUp
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useBranchStore } from '../store/branchStore';
import { socketClient } from '../../realtime/socketClient';
import { useSocketData } from '../../realtime/socketHooks';
import { useQuery } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';

const drawerWidth = 280;

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, logout } = useAuthStore();
  const { selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { data: branches } = useQuery({
    queryKey: ['admin-layout-branches'],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/branches');
      return res.data.data as { id: string, name: string, isActive: boolean }[];
    }
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toast, setToast] = useState<{open: boolean, message: string, severity: 'success' | 'info' | 'warning' | 'error'}>({ open: false, message: '', severity: 'info' });

  useSocketData('order.created', () => setToast({ open: true, message: 'New Order Received! 🛍️', severity: 'success' }));
  useSocketData('kitchen.order_ready', () => setToast({ open: true, message: 'Kitchen prepared an order! 🍳', severity: 'info' }));
  useSocketData('inventory.low_stock', () => setToast({ open: true, message: 'Inventory Warning: Item low on stock! ⚠️', severity: 'warning' }));
  useSocketData('table.status_changed', () => setToast({ open: true, message: 'Table status updated! 🍽️', severity: 'info' }));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  useEffect(() => {
    if (token) {
      socketClient.connect(token);
      // Poll socket connection status every 2s
      const checkInterval = setInterval(() => {
        const sock = socketClient.getSocket();
        setSocketConnected(sock?.connected ?? false);
      }, 2000);
      return () => {
        clearInterval(checkInterval);
        socketClient.disconnect();
      };
    }
  }, [token]);

  // Global keyboard shortcut: Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('global-search-input');
        if (input) {
          input.focus();
          setSearchFocused(true);
        }
      }
      if (e.key === 'Escape') {
        setSearchTerm('');
        setSearchFocused(false);
        const input = document.getElementById('global-search-input');
        if (input) input.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/dashboard' },
    { text: 'Branches', icon: <Store size={20} />, path: '/branches' },
    { text: 'Tables', icon: <LayoutDashboard size={20} />, path: '/tables' },
    { text: 'Users', icon: <Users size={20} />, path: '/users' },
    { text: 'Roles', icon: <Shield size={20} />, path: '/roles' },
    { text: 'Menu', icon: <MenuIcon size={20} />, path: '/menu' },
    { text: 'Inventory', icon: <BoxIcon size={20} />, path: '/inventory' },
    { text: 'Suppliers', icon: <Truck size={20} />, path: '/suppliers' },
    { text: 'Purchases', icon: <ShoppingCart size={20} />, path: '/purchases' },
    { text: 'Live Monitors', icon: <Activity size={20} />, path: '/monitors' },
    { text: 'AI Analytics', icon: <TrendingUp size={20} />, path: '/analytics' },
    { text: 'Customers', icon: <Users size={20} />, path: '/customers' },
    { text: 'Reports', icon: <LineChart size={20} />, path: '/reports' },
    { text: 'Notifications', icon: <Bell size={20} />, path: '/notifications' },
    { text: 'Audit Logs', icon: <Clipboard size={20} />, path: '/audit-logs' },
    { text: 'Security', icon: <Shield size={20} />, path: '/security' },
    { text: 'Backup Center', icon: <Database size={20} />, path: '/backups' },
    { text: 'Settings', icon: <Settings size={20} />, path: '/settings' },
  ];

  // Filter navigation items based on search term
  const filteredSearchResults = searchTerm.length > 0
    ? menuItems.filter(item =>
        item.text.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleSearchNavigate = (path: string) => {
    navigate(path);
    setSearchTerm('');
    setSearchFocused(false);
    const input = document.getElementById('global-search-input');
    if (input) input.blur();
  };

  const drawerContent = (
    <>
      <Box sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ width: 40, height: 40, bgcolor: '#6366F1', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
          <MenuIcon color="white" size={24} />
        </Box>
        <Typography variant="h6" color="text.primary" fontWeight={800} fontFamily='"Plus Jakarta Sans", sans-serif'>AshnAdmin</Typography>
      </Box>
      
      <Box sx={{ px: 3, mb: 2 }}>
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, letterSpacing: 1, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>MAIN MENU</Typography>
      </Box>

      <List sx={{ px: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <ListItemButton 
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false); // Close drawer on mobile after navigation
                }}
                sx={{ 
                  borderRadius: '12px',
                  bgcolor: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                  color: isActive ? '#6366F1' : '#94A3B8',
                  border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                  py: 1.5,
                  transition: 'all 0.15s ease',
                  '&:hover': { 
                    bgcolor: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255,255,255,0.05)',
                    color: isActive ? '#6366F1' : '#E2E8F0',
                    transform: 'translateX(2px)'
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isActive ? 800 : 600, fontFamily: '"Plus Jakarta Sans", sans-serif' }} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Socket Connection Status Indicator */}
      <Box sx={{ px: 3, py: 2, mt: 'auto', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.02)' }}>
          <Box sx={{
            width: 8, height: 8, borderRadius: '50%',
            bgcolor: socketConnected ? '#10B981' : '#F43F5E',
            boxShadow: socketConnected ? '0 0 6px #10B981' : '0 0 6px #F43F5E',
            transition: 'all 0.3s ease'
          }} />
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700 }}>
            {socketConnected ? 'Real-Time Connected' : 'Connecting...'}
          </Typography>
        </Box>
      </Box>
    </>
  );

  return (
    <Box sx={{ 
      display: 'flex', 
      fontFamily: '"Plus Jakarta Sans", sans-serif', 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)',
      color: '#fff'
    }}>
      {/* Mobile Sidebar */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
            color: '#fff'
          },
        }}
      >
        {drawerContent}
      </Drawer>
      
      {/* Desktop Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { 
            width: drawerWidth, 
            boxSizing: 'border-box',
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
            color: '#fff'
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, width: { lg: `calc(100% - ${drawerWidth}px)` }, height: '100vh', overflow: 'auto', bgcolor: 'transparent' }}>
        <AppBar position="sticky" elevation={0} sx={{ width: '100%', background: 'rgba(2, 6, 23, 0.45)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.05)', boxShadow: '0 4px 30px rgba(0,0,0,0.1)' }}>
          <Toolbar sx={{ py: 1 }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { lg: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h5" component="div" sx={{ flexGrow: 1, color: 'text.primary', fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif', fontSize: { xs: '1.25rem', md: '1.5rem' } }}>
              {menuItems.find(i => location.pathname.startsWith(i.path))?.text || 'Dashboard'}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Global Branch Selector */}
              <Box sx={{ display: { xs: 'none', md: 'block' } }}>
                <Select
                  value={selectedBranchId}
                  onChange={(e: SelectChangeEvent) => setSelectedBranchId(e.target.value)}
                  size="small"
                  sx={{
                    color: '#fff',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#6366F1' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
                    '.MuiSvgIcon-root': { color: '#fff' },
                    fontFamily: '"Plus Jakarta Sans", sans-serif',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    minWidth: 160
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: '#1E293B',
                        color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)',
                        '& .MuiMenuItem-root': {
                          fontFamily: '"Plus Jakarta Sans", sans-serif',
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="all">All Branches</MenuItem>
                  {branches?.map(branch => (
                    <MenuItem key={branch.id} value={branch.id}>
                      {branch.name} {!branch.isActive && '(Inactive)'}
                    </MenuItem>
                  ))}
                </Select>
              </Box>

              {/* FUNCTIONAL Command Palette Search */}
              <Box sx={{ position: 'relative', display: { xs: 'none', md: 'block' } }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  bgcolor: searchFocused ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)', 
                  px: 2, 
                  py: 1, 
                  borderRadius: '12px', 
                  border: searchFocused ? '1px solid rgba(99,102,241,0.4)' : '1px solid rgba(255,255,255,0.05)', 
                  minWidth: { md: 200, lg: 280 },
                  transition: 'all 0.2s ease',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }
                }}>
                  <Search size={18} color="#64748B" style={{ marginRight: 8, flexShrink: 0 }} />
                  <Box
                    component="input"
                    id="global-search-input"
                    placeholder="Search modules... (Ctrl+K)"
                    value={searchTerm}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => { setSearchFocused(false); }, 150)}
                    sx={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#E2E8F0',
                      fontFamily: '"Plus Jakarta Sans", sans-serif',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      flexGrow: 1,
                      '&::placeholder': { color: '#94A3B8' }
                    }}
                  />
                  {!searchTerm && (
                    <Box sx={{ bgcolor: 'rgba(255,255,255,0.05)', px: 1, py: 0.5, borderRadius: '6px', flexShrink: 0 }}>
                      <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800 }}>⌘K</Typography>
                    </Box>
                  )}
                </Box>

                {/* Search Results Dropdown */}
                {searchFocused && filteredSearchResults.length > 0 && (
                  <Box sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    mt: 1,
                    bgcolor: '#1E293B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    zIndex: 9999,
                    overflow: 'hidden'
                  }}>
                    <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 800, letterSpacing: 1 }}>
                        NAVIGATE TO
                      </Typography>
                    </Box>
                    {filteredSearchResults.map((item) => (
                      <Box
                        key={item.path}
                        onClick={() => handleSearchNavigate(item.path)}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                          px: 2,
                          py: 1.5,
                          cursor: 'pointer',
                          transition: 'background 0.1s ease',
                          color: '#E2E8F0',
                          '&:hover': { bgcolor: 'rgba(99,102,241,0.1)', color: '#6366F1' }
                        }}
                      >
                        <Box sx={{ color: 'inherit', opacity: 0.7 }}>{item.icon}</Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
                          {item.text}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}

                {/* No results state */}
                {searchFocused && searchTerm.length > 0 && filteredSearchResults.length === 0 && (
                  <Box sx={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    mt: 1,
                    bgcolor: '#1E293B',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    p: 2.5,
                    zIndex: 9999,
                    textAlign: 'center'
                  }}>
                    <Typography variant="body2" sx={{ color: '#64748B', fontWeight: 700 }}>
                      No modules matching "{searchTerm}"
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* Notifications Bell — navigates to /notifications on click */}
              <Box 
                onClick={() => navigate('/notifications')}
                sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', transform: 'scale(1.05)' } }}
                title="View Notifications"
              >
                <Bell size={20} color="#94A3B8" />
                <Box sx={{ position: 'absolute', top: 8, right: 10, width: 8, height: 8, bgcolor: '#F43F5E', borderRadius: '50%', border: '2px solid #0B0F19' }} />
              </Box>

              <Avatar 
                onClick={handleMenu}
                sx={{ width: 40, height: 40, border: '2px solid rgba(255,255,255,0.1)', cursor: 'pointer', bgcolor: '#6366F1', transition: 'all 0.2s', '&:hover': { transform: 'scale(1.05)', borderColor: '#6366F1' } }} 
              >
                {user?.name?.charAt(0) || 'A'}
              </Avatar>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                PaperProps={{
                  sx: {
                    bgcolor: '#1E293B',
                    color: '#fff',
                    border: '1px solid rgba(255,255,255,0.1)',
                    mt: 1.5,
                    minWidth: 180,
                    borderRadius: '12px'
                  }
                }}
              >
                <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.1)', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"Plus Jakarta Sans", sans-serif' }}>{user?.name}</Typography>
                  <Typography variant="caption" sx={{ color: '#94A3B8' }}>{user?.email}</Typography>
                </Box>
                <MenuItem onClick={handleLogout} sx={{ '&:hover': { bgcolor: 'rgba(244,63,94,0.1)' }, color: '#F43F5E', fontFamily: '"Plus Jakarta Sans", sans-serif', fontWeight: 600, m: 1, borderRadius: '8px' }}>
                  <LogOut size={16} style={{ marginRight: 12 }} /> Logout
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ p: { xs: 2, md: 3, lg: 5 } }}>
          <Outlet />
        </Box>
      </Box>

      {/* Global Real-Time Toasts */}
      <Snackbar 
        open={toast.open} 
        autoHideDuration={4000} 
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        TransitionComponent={Slide}
        sx={{ mt: 8 }}
      >
        <Alert 
          onClose={() => setToast({ ...toast, open: false })} 
          severity={toast.severity} 
          variant="filled"
          sx={{ 
            width: '100%', 
            borderRadius: '12px', 
            fontFamily: '"Plus Jakarta Sans", sans-serif', 
            fontWeight: 700,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
            alignItems: 'center'
          }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
