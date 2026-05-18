import { Box, TextField, Button, Tooltip, Typography } from '@mui/material';
import { ClearOutlined } from '@ant-design/icons';

/**
 * DateRangeFilter — small, dependency-free from/to date picker used across
 * admin tables (bookings, fares, commission rules, wallets, etc.).
 *
 * Uses native `<input type="date">` via MUI TextField so we avoid pulling in
 * @mui/x-date-pickers as a new dependency. Returns ISO `YYYY-MM-DD` strings.
 *
 * Defaults to "last 30 days" the first time it mounts when no values are set,
 * via the caller's state initializer (see helpers below).
 */
export interface DateRangeValue {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

interface Props {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  onClear?: () => void;
  fromLabel?: string;
  toLabel?: string;
  size?: 'small' | 'medium';
  /** Optional inline title shown to the left of the inputs. */
  label?: string;
}

export const defaultLast30 = (): DateRangeValue => {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
};

export default function DateRangeFilter({
  value,
  onChange,
  onClear,
  fromLabel = 'From',
  toLabel = 'To',
  size = 'small',
  label,
}: Props) {
  const clear = () => {
    if (onClear) onClear();
    else onChange({ from: '', to: '' });
  };

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
      {label && (
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
      )}
      <TextField
        type="date"
        size={size}
        label={fromLabel}
        InputLabelProps={{ shrink: true }}
        value={value.from}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        sx={{ minWidth: 150 }}
      />
      <TextField
        type="date"
        size={size}
        label={toLabel}
        InputLabelProps={{ shrink: true }}
        value={value.to}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        sx={{ minWidth: 150 }}
      />
      {(value.from || value.to) && (
        <Tooltip title="Clear date range">
          <Button
            size="small"
            color="inherit"
            startIcon={<ClearOutlined />}
            onClick={clear}
          >
            Clear
          </Button>
        </Tooltip>
      )}
    </Box>
  );
}
