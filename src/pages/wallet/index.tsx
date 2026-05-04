import { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, Button, IconButton, TextField, InputAdornment,
  Skeleton, Tooltip, Alert, Snackbar, Dialog, DialogTitle, DialogContent,
  DialogActions, Avatar,
} from '@mui/material';
import { SearchOutlined, PlusOutlined, MinusOutlined, HistoryOutlined, ReloadOutlined } from '@ant-design/icons';
import { walletApi } from '../../api';
import MainCard from '../../components/MainCard';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

export default function WalletPage() {
  const { can } = useUserContext();
  const canCredit = can(PERMISSIONS.WALLETS_CREDIT);
  const canDebit  = can(PERMISSIONS.WALLETS_DEBIT);

  const [wallets, setWallets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [txOpen, setTxOpen] = useState(false);
  const [txWallet, setTxWallet] = useState<any>(null);
  const [txType, setTxType] = useState<'credit' | 'debit'>('credit');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [histOpen, setHistOpen] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' as any });

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await walletApi.getAll({ page, limit: 10, search });
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setWallets(arr);
      setTotal(raw?.pagination?.total || arr.length || 0);
    } catch { setWallets([]); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchWallets(); }, [fetchWallets]);

  const openTx = (wallet: any, type: 'credit' | 'debit') => {
    setTxWallet(wallet);
    setTxType(type);
    setTxAmount('');
    setTxNote('');
    setTxOpen(true);
  };

  const handleTx = async () => {
    if (!txWallet || !txAmount) return;
    try {
      if (txType === 'credit') {
        await walletApi.credit(txWallet._id, { amount: Number(txAmount), note: txNote });
      } else {
        await walletApi.debit(txWallet._id, { amount: Number(txAmount), note: txNote });
      }
      setSnack({ open: true, msg: `Wallet ${txType}ed ₹${txAmount} successfully`, sev: 'success' });
      setTxOpen(false);
      fetchWallets();
    } catch { setSnack({ open: true, msg: 'Transaction failed', sev: 'error' }); }
  };

  const openHistory = async (wallet: any) => {
    setTxWallet(wallet);
    setHistOpen(true);
    setHistLoading(true);
    try {
      const res = await walletApi.getTransactions(wallet._id);
      const raw = res.data?.data ?? res.data;
      const arr = Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw) ? raw : []);
      setHistory(arr);
    } catch { setHistory([]); }
    finally { setHistLoading(false); }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>Wallet Management</Typography>
      <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
        View and manage agent & customer wallets
      </Typography>

      <MainCard>
        <Box sx={{ display: 'flex', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <Box component="form" onSubmit={(e) => { e.preventDefault(); fetchWallets(); }} sx={{ display: 'flex', gap: 1, flex: 1 }}>
            <TextField
              size="small" placeholder="Search by name, email..." value={search}
              onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1 }}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined /></InputAdornment> }}
            />
            <Button type="submit" variant="contained" size="small">Search</Button>
          </Box>
          <Tooltip title="Refresh"><IconButton onClick={fetchWallets} size="small"><ReloadOutlined /></IconButton></Tooltip>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Balance</TableCell>
                <TableCell>Total Credited</TableCell>
                <TableCell>Total Debited</TableCell>
                <TableCell>Last Tx</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array(6).fill(0).map((_, i) => (
                  <TableRow key={i}>{Array(8).fill(0).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                ))
              ) : wallets.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>No wallets found</TableCell></TableRow>
              ) : (
                wallets.map((w: any, i: number) => (
                  <TableRow key={w._id} hover>
                    <TableCell>{(page - 1) * 10 + i + 1}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'info.light', fontSize: '0.75rem' }}>
                          {(w.agentId?.contactPerson || w.agentId?.agencyName || 'A').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={600}>{w.agentId?.contactPerson || w.agentId?.agencyName || '—'}</Typography>
                          <Typography variant="caption" color="text.secondary">{w.agentId?.email || '—'}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={w.agentId?.status || 'agent'} size="small" variant="outlined"
                        color={w.agentId?.status === 'active' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700} color={w.balance >= 0 ? 'success.main' : 'error.main'}>
                        ₹{(w.balance || 0).toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell>₹{(w.totalCredited || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell>₹{(w.totalDebited || 0).toLocaleString('en-IN')}</TableCell>
                    <TableCell>{w.lastTransactionAt ? new Date(w.lastTransactionAt).toLocaleDateString('en-IN') : '—'}</TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                        {canCredit && <Tooltip title="Credit"><IconButton size="small" color="success" onClick={() => openTx(w, 'credit')}><PlusOutlined /></IconButton></Tooltip>}
                        {canDebit  && <Tooltip title="Debit"><IconButton size="small" color="error" onClick={() => openTx(w, 'debit')}><MinusOutlined /></IconButton></Tooltip>}
                        <Tooltip title="Transaction History"><IconButton size="small" color="info" onClick={() => openHistory(w)}><HistoryOutlined /></IconButton></Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary">Total: {total} wallets</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button size="small" variant="outlined" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
            <Button size="small" variant="outlined" disabled={wallets.length < 10} onClick={() => setPage(p => p + 1)}>Next</Button>
          </Box>
        </Box>
      </MainCard>

      {/* Credit/Debit Dialog */}
      <Dialog open={txOpen} onClose={() => setTxOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{txType === 'credit' ? '💰 Credit Wallet' : '💸 Debit Wallet'}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            User: <strong>{txWallet?.agentId?.contactPerson || txWallet?.agentId?.agencyName}</strong> | Current Balance: <strong>₹{(txWallet?.balance || 0).toLocaleString('en-IN')}</strong>
          </Typography>
          <TextField
            fullWidth label="Amount (₹)" type="number" value={txAmount}
            onChange={(e) => setTxAmount(e.target.value)} sx={{ mb: 2 }}
            inputProps={{ min: 1 }}
          />
          <TextField
            fullWidth label="Note / Reason" value={txNote}
            onChange={(e) => setTxNote(e.target.value)} multiline rows={2}
            placeholder="Reason for this transaction..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTxOpen(false)}>Cancel</Button>
          <Button
            variant="contained" color={txType === 'credit' ? 'success' : 'error'}
            onClick={handleTx} disabled={!txAmount}
          >
            {txType === 'credit' ? 'Credit' : 'Debit'} ₹{txAmount || 0}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction History Dialog */}
      <Dialog open={histOpen} onClose={() => setHistOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Transaction History — {txWallet?.agentId?.contactPerson || txWallet?.agentId?.agencyName}</DialogTitle>
        <DialogContent dividers>
          {histLoading ? (
            Array(5).fill(0).map((_, i) => <Box key={i} sx={{ mb: 1 }}><Skeleton height={40} /></Box>)
          ) : history.length === 0 ? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No transactions found</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell>Balance After</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((tx: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell>{tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-IN') : '—'}</TableCell>
                    <TableCell>
                      <Chip label={tx.type} color={tx.type === 'credit' ? 'success' : 'error'} size="small" />
                    </TableCell>
                    <TableCell>
                      <Typography fontWeight={700} color={tx.type === 'credit' ? 'success.main' : 'error.main'}>
                        {tx.type === 'credit' ? '+' : '-'}₹{(tx.amount || 0).toLocaleString('en-IN')}
                      </Typography>
                    </TableCell>
                    <TableCell>{tx.note || tx.description || '—'}</TableCell>
                    <TableCell>₹{(tx.balanceAfter || 0).toLocaleString('en-IN')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setHistOpen(false)}>Close</Button></DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}>
        <Alert severity={snack.sev} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
