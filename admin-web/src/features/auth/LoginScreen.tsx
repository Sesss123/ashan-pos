import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, InputAdornment, IconButton, CircularProgress } from '@mui/material';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../shared/store/authStore';
import { axiosClient } from '../../shared/api/axiosClient';
import { useNavigate } from 'react-router-dom';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axiosClient.post('/auth/login', { email, password });
      const { token, user } = response.data.data;
      
      if (user.role !== 'Admin') {
        setError('Access denied: Admins only.');
        setLoading(false);
        return;
      }
      
      setAuth(token, user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
      fontFamily: '"Plus Jakarta Sans", sans-serif',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative Blobs */}
      <Box sx={{
        position: 'absolute', top: -100, left: -100, width: 400, height: 400,
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(40px)', zIndex: 0
      }} />
      <Box sx={{
        position: 'absolute', bottom: -150, right: -100, width: 500, height: 500,
        background: 'radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', zIndex: 0
      }} />

      <Paper
        elevation={24}
        sx={{
          p: 5,
          width: '100%',
          maxWidth: 420,
          borderRadius: '24px',
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          zIndex: 1,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Box sx={{ 
            width: 64, height: 64, bgcolor: '#6366F1', borderRadius: '16px', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto', mb: 2, boxShadow: '0 10px 25px rgba(99,102,241,0.4)'
          }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#fff', fontFamily: '"Plus Jakarta Sans", sans-serif' }}>A</Typography>
          </Box>
          <Typography variant="h4" sx={{ color: '#fff', fontWeight: 800, fontFamily: '"Plus Jakarta Sans", sans-serif', mb: 1 }}>
            Admin Portal
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
            Sign in to manage your ERP system
          </Typography>
        </Box>

        <form onSubmit={handleLogin}>
          {error && (
            <Box sx={{ p: 2, mb: 3, borderRadius: '12px', bgcolor: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)' }}>
              <Typography sx={{ color: '#F43F5E', fontSize: '0.875rem', fontWeight: 600, textAlign: 'center' }}>
                {error}
              </Typography>
            </Box>
          )}

          <TextField
            fullWidth
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            sx={{
              mb: 3,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '14px',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontWeight: 500,
                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: '2px' },
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px #1E293B inset !important',
                  WebkitTextFillColor: '#fff !important',
                  caretColor: '#fff'
                }
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Mail size={20} color="rgba(255,255,255,0.5)" />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            sx={{
              mb: 4,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                bgcolor: 'rgba(15, 23, 42, 0.6)',
                borderRadius: '14px',
                fontFamily: '"Plus Jakarta Sans", sans-serif',
                fontWeight: 500,
                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.2)' },
                '&.Mui-focused fieldset': { borderColor: '#6366F1', borderWidth: '2px' },
                '& input:-webkit-autofill': {
                  WebkitBoxShadow: '0 0 0 1000px #1E293B inset !important',
                  WebkitTextFillColor: '#fff !important',
                  caretColor: '#fff'
                }
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock size={20} color="rgba(255,255,255,0.5)" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading || !email || !password}
            sx={{
              py: 1.8,
              borderRadius: '14px',
              textTransform: 'none',
              fontSize: '1rem',
              fontWeight: 800,
              fontFamily: '"Plus Jakarta Sans", sans-serif',
              bgcolor: '#6366F1',
              color: '#fff',
              boxShadow: '0 8px 20px rgba(99,102,241,0.4)',
              '&:hover': { bgcolor: '#4F46E5', boxShadow: '0 8px 25px rgba(99,102,241,0.6)' },
              '&.Mui-disabled': { bgcolor: 'rgba(99,102,241,0.5)', color: 'rgba(255,255,255,0.5)' }
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : 'Sign In'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
