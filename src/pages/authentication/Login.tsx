import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Button, Card, CardContent, CircularProgress,
  IconButton, InputAdornment, TextField, Typography, Alert,
} from '@mui/material';
import { EyeOutlined, EyeInvisibleOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import useUserContext from '../../hooks/useUser';
import Logo from '../../components/Logo';
import { BRAND } from '../../themes/palette';

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
        // Brand-blue dominant page (~80%) with a brand-orange glow in the
        // bottom-right corner (~20% accent). Both colours are taken straight
        // from the logo (#209ACD blue + #CF4D26 orange).
        background: `
          radial-gradient(circle at 100% 100%, ${BRAND.ORANGE_TINT} 0%, transparent 35%),
          radial-gradient(circle at 0% 0%, ${BRAND.BLUE_TINT} 0%, transparent 50%),
          linear-gradient(135deg, ${BRAND.BLUE_TINT} 0%, #ffffff 60%, ${BRAND.ORANGE_TINT} 100%)
        `,
        p: 2,
      }}
    >
      <Card
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 440,
          border: '1px solid',
          borderColor: BRAND.BLUE_LIGHT,
          borderRadius: 3,
          boxShadow: `0 12px 40px rgba(32, 154, 205, 0.18)`,
          overflow: 'hidden',
          position: 'relative',
          // Brand-orange top stripe — the 20% accent moment on this card
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 4,
            background: BRAND.GRADIENT_BRAND,
          },
        }}
      >
        <CardContent sx={{ p: 4 }}>
          {/* Logo — single source of truth in <Logo /> component */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <Logo size={64} withHalo />
            </Box>
            <Typography variant="h4" fontWeight={800} gutterBottom sx={{ color: BRAND.BLUE, letterSpacing: '-0.02em' }}>
              Tramps Aviation
            </Typography>
            <Typography variant="body2" sx={{ color: BRAND.ORANGE, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', fontSize: '0.7rem' }}>
              Admin Control Panel
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
                    <MailOutlined style={{ color: BRAND.BLUE }} />
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
                    <LockOutlined style={{ color: BRAND.BLUE }} />
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
              sx={{
                mt: 1,
                py: 1.4,
                borderRadius: 2,
                fontWeight: 700,
                fontSize: '0.95rem',
                background: BRAND.GRADIENT_BLUE,
                boxShadow: `0 4px 14px rgba(32, 154, 205, 0.35)`,
                '&:hover': {
                  background: BRAND.GRADIENT_BLUE,
                  boxShadow: `0 6px 20px rgba(32, 154, 205, 0.45)`,
                  transform: 'translateY(-1px)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
