import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, AppBar, Toolbar, IconButton, Avatar } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import RestaurantMenuIcon from '@mui/icons-material/RestaurantMenu';
import InventoryIcon from '@mui/icons-material/Inventory';
import SearchIcon from '@mui/icons-material/Search';

const drawerWidth = 260;

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Overview', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
    { text: 'Menu', icon: <RestaurantMenuIcon />, path: '/admin/menu' },
    { text: 'Inventory', icon: <InventoryIcon />, path: '/admin/inventory' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ width: 32, height: 32, bgcolor: 'primary.main', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RestaurantMenuIcon sx={{ color: 'white', fontSize: 20 }} />
          </Box>
          <Typography variant="h6" color="text.primary">AshnAdmin</Typography>
        </Box>
        
        <List sx={{ px: 2 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton 
                  onClick={() => navigate(item.path)}
                  sx={{ 
                    borderRadius: 2,
                    bgcolor: isActive ? 'rgba(94, 106, 210, 0.1)' : 'transparent',
                    color: isActive ? 'primary.main' : 'text.secondary',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: 'inherit' }}>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isActive ? 600 : 500 }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Drawer>

      {/* Main Content Area */}
      <Box component="main" sx={{ flexGrow: 1, height: '100vh', overflow: 'auto', bgcolor: 'background.default' }}>
        <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.default', borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <Typography variant="h5" component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
              {menuItems.find(i => location.pathname.startsWith(i.path))?.text || 'Dashboard'}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Fake Command Palette Search */}
              <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'background.paper', px: 2, py: 1, borderRadius: 2, border: 1, borderColor: 'divider', minWidth: 250 }}>
                <SearchIcon sx={{ color: 'text.secondary', fontSize: 20, mr: 1 }} />
                <Typography color="text.secondary" variant="body2" sx={{ flexGrow: 1 }}>Search anything...</Typography>
                <Box sx={{ bgcolor: 'background.default', px: 1, py: 0.5, borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'bold' }}>⌘K</Typography>
                </Box>
              </Box>
              <Avatar src="https://i.pravatar.cc/150?img=11" sx={{ width: 36, height: 36 }} />
            </Box>
          </Toolbar>
        </AppBar>
        
        <Box sx={{ p: 4 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
