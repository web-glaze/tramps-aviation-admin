import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { DeleteOutlined, EditOutlined, LockOutlined, PlusOutlined } from '@ant-design/icons';
import MainCard from '../../components/MainCard';
import { adminUsersApi, rbacApi } from '../../api';
import useUserContext from '../../hooks/useUser';
import { PERMISSIONS } from '../../constants/permissions';

type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  designation?: string;
  permissions: string[];
  isActive: boolean;
};

const defaultForm = {
  name: '',
  email: '',
  phone: '',
  designation: 'Sub Admin',
  password: '',
  isActive: true,
  permissions: [] as string[],
};

export default function AdminUsersPage() {
  const { can } = useUserContext();
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [catalog, setCatalog] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');

  const groupedPermissions = useMemo(() => {
    return catalog.reduce<Record<string, string[]>>((acc, permission) => {
      const [group] = permission.split('.');
      acc[group] = acc[group] || [];
      acc[group].push(permission);
      return acc;
    }, {});
  }, [catalog]);

  const load = async () => {
    const [usersRes, permissionsRes] = await Promise.all([
      adminUsersApi.getAll(),
      rbacApi.getPermissions(),
    ]);
    setRows(usersRes.data?.data || usersRes.data || []);
    setCatalog(permissionsRes.data?.data?.permissions || permissionsRes.data?.permissions || []);
  };

  useEffect(() => {
    load().catch((err) => setError(err?.response?.data?.message || 'Failed to load RBAC data'));
  }, []);

  const togglePermission = (permission: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((item) => item !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const openCreate = () => {
    setSelected(null);
    setForm(defaultForm);
    setOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setSelected(user);
    setForm({
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      designation: user.designation || 'Sub Admin',
      password: '',
      isActive: user.isActive,
      permissions: user.permissions || [],
    });
    setOpen(true);
  };

  const submit = async () => {
    if (selected) {
      await adminUsersApi.update(selected.id, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        designation: form.designation,
        isActive: form.isActive,
        permissions: form.permissions,
      });
    } else {
      await adminUsersApi.create(form);
    }
    setOpen(false);
    await load();
  };

  const resetPassword = async () => {
    if (!selected || !newPassword) return;
    await adminUsersApi.updatePassword(selected.id, { newPassword });
    setPasswordOpen(false);
    setNewPassword('');
  };

  const removeUser = async (user: AdminUser) => {
    // Pre-fix: a single click on the trash icon irreversibly deleted the
    // sub-admin with no confirmation. Adding a hard confirm so accidental
    // clicks (especially from a touch device) don't wipe out a teammate's
    // account.
    const ok = window.confirm(
      `Permanently remove ${user.name || user.email}?\n\nThis cannot be undone.`,
    );
    if (!ok) return;
    await adminUsersApi.remove(user.id);
    await load();
  };

  if (!can(PERMISSIONS.ADMIN_USERS_VIEW)) {
    return <Alert severity="error">You do not have access to admin RBAC management.</Alert>;
  }

  return (
    <Stack spacing={3}>
      <MainCard
        title="Admin Access Control"
        secondary={
          can(PERMISSIONS.ADMIN_USERS_CREATE) ? (
            <Button startIcon={<PlusOutlined />} variant="contained" onClick={openCreate}>
              Add Sub Admin
            </Button>
          ) : null
        }
      >
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Create sub admins, define roles, reset passwords, and control exactly which pages and actions they can access.
        </Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2}>
          {rows.map((user) => (
            <Box
              key={user.id}
              sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2.5 }}
            >
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="h6">{user.name}</Typography>
                    <Chip
                      label={user.role === 'admin' ? 'Primary Admin' : user.designation || 'Sub Admin'}
                      color={user.role === 'admin' ? 'primary' : 'default'}
                      size="small"
                    />
                    <Chip label={user.isActive ? 'Active' : 'Inactive'} color={user.isActive ? 'success' : 'default'} size="small" />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                  {user.phone && <Typography variant="body2" color="text.secondary">{user.phone}</Typography>}
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
                    {(user.permissions || []).map((permission) => (
                      <Chip key={permission} label={permission} size="small" variant="outlined" />
                    ))}
                  </Stack>
                </Box>
                {user.role !== 'admin' && (
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    {can(PERMISSIONS.ADMIN_USERS_EDIT) && (
                      <IconButton color="primary" onClick={() => openEdit(user)}>
                        <EditOutlined />
                      </IconButton>
                    )}
                    {can(PERMISSIONS.ADMIN_USERS_PASSWORD) && (
                      <IconButton
                        color="secondary"
                        onClick={() => {
                          setSelected(user);
                          setPasswordOpen(true);
                        }}
                      >
                        <LockOutlined />
                      </IconButton>
                    )}
                    {can(PERMISSIONS.ADMIN_USERS_DELETE) && (
                      <IconButton color="error" onClick={() => removeUser(user)}>
                        <DeleteOutlined />
                      </IconButton>
                    )}
                  </Stack>
                )}
              </Stack>
            </Box>
          ))}
        </Stack>
      </MainCard>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{selected ? 'Edit Sub Admin' : 'Create Sub Admin'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{xs:12, md:6}}>
              <TextField fullWidth label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Grid>
            <Grid size={{xs:12, md:6}}>
              <TextField fullWidth label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Grid>
            <Grid size={{xs:12, md:6}}>
              <TextField fullWidth label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Grid>
            <Grid size={{xs:12, md:6}}>
              <TextField fullWidth label="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
            </Grid>
            {!selected && (
              <Grid size={{xs:12, md:6}}>
                <TextField
                  fullWidth
                  label="Temporary Password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </Grid>
            )}
            <Grid size={{xs:12, md:6}}>
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />}
                label="Active access"
              />
            </Grid>
            <Grid size={{xs:12, md:6}}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>Permissions</Typography>
              <Grid container spacing={1.5}>
                {Object.entries(groupedPermissions).map(([group, permissions]) => (
                  <Grid size={{xs:12, md:6}} key={group}>
                    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 2 }}>
                      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', mb: 1.5 }}>
                        {group.replace('-', ' ')}
                      </Typography>
                      <Stack spacing={0.75}>
                        {permissions.map((permission) => (
                          <FormControlLabel
                            key={permission}
                            control={
                              <Switch
                                checked={form.permissions.includes(permission)}
                                onChange={() => togglePermission(permission)}
                              />
                            }
                            label={permission}
                          />
                        ))}
                      </Stack>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} variant="contained">
            {selected ? 'Update Access' : 'Create Sub Admin'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Reset Sub Admin Password</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordOpen(false)}>Cancel</Button>
          <Button onClick={resetPassword} variant="contained">Update Password</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
