'use client';

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
} from '@mui/material';

const STATUS = ['PASSING', 'FAILING', 'PENDING'];

export default function CreateProjectDialog({ open, onClose, onCreated }) {
  const [form, setForm] = React.useState({
    name: '',
    description: '',
    userStories: 0,
    testStatus: 'PENDING',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setForm({
        name: '',
        description: '',
        userStories: 0,
        testStatus: 'PENDING',
      });
      setError('');
    }
  }, [open]);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create project');
      onCreated?.(data.project);
      onClose?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>New Project</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label='Project Name'
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextField
            label='Description'
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            label='User Stories'
            type='number'
            inputProps={{ min: 0 }}
            value={form.userStories}
            onChange={(e) =>
              setForm({ ...form, userStories: Number(e.target.value) })
            }
          />
          <TextField
            select
            label='Test Status'
            value={form.testStatus}
            onChange={(e) => setForm({ ...form, testStatus: e.target.value })}
          >
            {STATUS.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          {error && (
            <div style={{ color: '#b91c1c', fontSize: 13 }}>{error}</div>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={submit}
          disabled={loading || !form.name.trim()}
        >
          {loading ? 'Saving...' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
