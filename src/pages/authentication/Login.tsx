import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, CircularProgress,
  IconButton, InputAdornment, TextField, Typography, Alert,
} from '@mui/material';
import { EyeOutlined, EyeInvisibleOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import useUserContext from '../../hooks/useUser';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const { login, loading } = useUserContext();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #e6f4ff 0%, #f0f5ff 50%, #fff 100%)',
        p: 2,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 420,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 3,
          boxShadow: '0 8px 40px rgba(0,0,0,0.08)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                fontSize: 28,
              }}
            >
              ✈️
            </Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Tramps Aviation Admin
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Sign in to manage your Tramps Aviation
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MailOutlined style={{ color: '#8c8c8c' }} />
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label="Password"
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              fullWidth
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined style={{ color: '#8c8c8c' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPwd(!showPwd)} edge="end" size="small">
                      {showPwd ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 1, py: 1.4, borderRadius: 2, fontWeight: 600, fontSize: '0.95rem' }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
