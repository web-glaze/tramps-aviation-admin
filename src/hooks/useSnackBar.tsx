import { useState } from 'react';

interface SnackbarOptions {
  message: string;
  severity?: 'success' | 'error' | 'warning' | 'info';
}

export default function useSnackBar() {
  const [snackbar, setSnackbar] = useState<SnackbarOptions & { open: boolean }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const hideSnackbar = () => setSnackbar((s) => ({ ...s, open: false }));

  return { snackbar, showSnackbar, hideSnackbar };
}
