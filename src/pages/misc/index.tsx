import { Box, Typography, Card, Chip } from '@mui/material';
export function FlightsPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>✈️ Flights Management</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Monitor and manage all flight bookings</Typography>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 4, textAlign: 'center' }}>
        <Typography fontSize={64}>✈️</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>Flight Bookings</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          This module shows all flight-type bookings. Use <Chip label="All Bookings" size="small" /> with filter Type=Flight for now.
        </Typography>
      </Card>
    </Box>
  );
}

export function HotelsPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>🏨 Hotels Management</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Monitor and manage all hotel bookings</Typography>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 4, textAlign: 'center' }}>
        <Typography fontSize={64}>🏨</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>Hotel Bookings</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          This module shows all hotel-type bookings. Use <Chip label="All Bookings" size="small" /> with filter Type=Hotel for now.
        </Typography>
      </Card>
    </Box>
  );
}

export function InsurancePage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>🛡️ Insurance Management</Typography>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 4, textAlign: 'center' }}>
        <Typography fontSize={64}>🛡️</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>Insurance Bookings</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>Insurance bookings module coming soon.</Typography>
      </Card>
    </Box>
  );
}

export function RefundsPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>💸 Refunds Management</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>Process and track all refund requests</Typography>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 4, textAlign: 'center' }}>
        <Typography fontSize={64}>💸</Typography>
        <Typography variant="h5" fontWeight={700} sx={{ mt: 1 }}>Pending Refunds</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Refund management module — process refunds from the <Chip label="All Bookings" size="small" /> page by clicking Refund on cancelled bookings.
        </Typography>
      </Card>
    </Box>
  );
}

// NOTE: SubagentsPage placeholder was removed — the full module now lives at
// `src/pages/subagents/index.tsx` and is registered at the `/subagents` route.
