import { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Paper, TextField, Switch, CircularProgress, Snackbar,
  Select, MenuItem, FormControl, InputLabel
} from '@mui/material';
import { Save, Store, Banknote, Printer, CreditCard, Palette } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { axiosClient } from '../../shared/api/axiosClient';
import { useSocketEvent } from '../../realtime/socketHooks';

export default function SettingsManagement() {
  const queryClient = useQueryClient();
  const [snackbarMessage, setSnackbarMessage] = useState('');

  useSocketEvent('settings.updated', ['settings']);

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await axiosClient.get('/admin/settings');
      return res.data.data;
    }
  });

  const updateMutation = useMutation({
    mutationFn: (settings: Record<string, string>) => 
      axiosClient.put('/admin/settings', { settings }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSnackbarMessage('Settings saved successfully!');
    }
  });

  // Local state for forms matching backend database keys
  const [settings, setSettings] = useState<any>({
    restaurant_name: '',
    restaurant_address: '',
    tax_rate: '0',
    service_charge_rate: '0',
    restaurant_currency: 'USD',
    auto_print_receipts: true,
    cash_enabled: true,
    credit_card_enabled: true,
    qr_payment_enabled: true,
    localization_language: 'en',
    theme_mode: 'dark'
  });

  useEffect(() => {
    if (settingsData) {
      const newSettings = { ...settings };
      // Map string values back to correct types
      Object.keys(settingsData).forEach((key) => {
        if (key === 'auto_print_receipts' || key === 'cash_enabled' || key === 'credit_card_enabled' || key === 'qr_payment_enabled') {
          newSettings[key] = settingsData[key] === 'true';
        } else {
          newSettings[key] = settingsData[key];
        }
      });
      setSettings(newSettings);
    }
  }, [settingsData]);

  const handleSave = () => {
    // Convert booleans back to string before sending
    const payload = {
      ...settings,
      auto_print_receipts: settings.auto_print_receipts.toString(),
      cash_enabled: settings.cash_enabled.toString(),
      credit_card_enabled: settings.credit_card_enabled.toString(),
      qr_payment_enabled: settings.qr_payment_enabled.toString(),
    };
    updateMutation.mutate(payload);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ fontFamily: '"Plus Jakarta Sans", sans-serif', maxWidth: '800px', margin: '0 auto', pb: 8 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>System Settings</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
            Full control over application configurations and POS defaults.
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          startIcon={<Save size={18} />}
          onClick={handleSave}
          disabled={updateMutation.isPending}
          sx={{ 
            borderRadius: '12px', textTransform: 'none', px: 4, py: 1.5,
            fontWeight: 700, bgcolor: '#6366F1', boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
            '&:hover': { bgcolor: '#4F46E5' }
          }}
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </Box>

      {/* General Settings */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: '#6366F1' }}>
          <Store size={20} />
          <Typography variant="h6" fontWeight={800}>General Information</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <TextField 
            label="Restaurant Name" 
            fullWidth 
            value={settings.restaurant_name}
            onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
          />
          <TextField 
            label="Main Address" 
            fullWidth 
            value={settings.restaurant_address}
            onChange={(e) => setSettings({ ...settings, restaurant_address: e.target.value })}
          />
        </Box>
      </Paper>

      {/* App & Theme Preferences */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: '#EC4899' }}>
          <Palette size={20} />
          <Typography variant="h6" fontWeight={800}>App Preferences & Theme</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <FormControl fullWidth>
            <InputLabel>System Language</InputLabel>
            <Select
              value={settings.localization_language || 'en'}
              label="System Language"
              onChange={(e) => setSettings({ ...settings, localization_language: e.target.value })}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="si">Sinhala (සිංහල)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Theme Mode</InputLabel>
            <Select
              value={settings.theme_mode || 'dark'}
              label="Theme Mode"
              onChange={(e) => setSettings({ ...settings, theme_mode: e.target.value })}
            >
              <MenuItem value="dark">Dark Mode</MenuItem>
              <MenuItem value="light">Light Mode</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Financial Settings */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: '#10B981' }}>
          <Banknote size={20} />
          <Typography variant="h6" fontWeight={800}>Financial Configuration</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <TextField 
            label="Tax Rate (%)" 
            type="number"
            fullWidth 
            value={settings.tax_rate}
            onChange={(e) => setSettings({ ...settings, tax_rate: e.target.value })}
          />
          <TextField 
            label="Service Charge (%)" 
            type="number"
            fullWidth 
            value={settings.service_charge_rate}
            onChange={(e) => setSettings({ ...settings, service_charge_rate: e.target.value })}
          />
          <FormControl fullWidth>
            <InputLabel>Currency Symbol</InputLabel>
            <Select
              value={settings.restaurant_currency || '$'}
              label="Currency Symbol"
              onChange={(e) => setSettings({ ...settings, restaurant_currency: e.target.value })}
            >
              <MenuItem value="$">$ (US Dollar)</MenuItem>
              <MenuItem value="Rs">Rs (Rupee)</MenuItem>
              <MenuItem value="LKR">LKR (Sri Lankan Rupee)</MenuItem>
              <MenuItem value="€">€ (Euro)</MenuItem>
              <MenuItem value="£">£ (British Pound)</MenuItem>
              <MenuItem value="AED">AED (Emirati Dirham)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Paper>

      {/* Payment Methods */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: '#F43F5E' }}>
          <CreditCard size={20} />
          <Typography variant="h6" fontWeight={800}>Payment Methods Configuration</Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            <Typography fontWeight={700}>Cash Payments</Typography>
            <Switch checked={settings.cash_enabled} onChange={(e) => setSettings({ ...settings, cash_enabled: e.target.checked })} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            <Typography fontWeight={700}>Credit / Debit Card</Typography>
            <Switch checked={settings.credit_card_enabled} onChange={(e) => setSettings({ ...settings, credit_card_enabled: e.target.checked })} />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            <Typography fontWeight={700}>QR & Wallet Payments (LankaQR)</Typography>
            <Switch checked={settings.qr_payment_enabled} onChange={(e) => setSettings({ ...settings, qr_payment_enabled: e.target.checked })} />
          </Box>
        </Box>
      </Paper>

      {/* Hardware Settings */}
      <Paper sx={{ p: 4, mb: 4, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, color: '#F59E0B' }}>
          <Printer size={20} />
          <Typography variant="h6" fontWeight={800}>Hardware & Peripherals</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <Box>
            <Typography fontWeight={700}>Auto-Print Receipts</Typography>
            <Typography variant="body2" color="text.secondary">Automatically print customer receipt upon checkout.</Typography>
          </Box>
          <Switch 
            checked={settings.auto_print_receipts} 
            onChange={(e) => setSettings({ ...settings, auto_print_receipts: e.target.checked })}
            color="primary"
          />
        </Box>
      </Paper>

      <Snackbar 
        open={!!snackbarMessage} 
        autoHideDuration={3000} 
        onClose={() => setSnackbarMessage('')}
        message={snackbarMessage}
      />
    </Box>
  );
}
