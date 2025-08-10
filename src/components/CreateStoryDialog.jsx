// src/components/CreateStoryDialog.jsx
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

const STATUS = [
  { v: 'TODO', label: 'To Do' },
  { v: 'IN_PROGRESS', label: 'In Progress' },
  { v: 'DONE', label: 'Completed' },
];

export default function CreateStoryDialog({
  projectId,
  open,
  onClose,
  onCreated,
}) {
  const [form, setForm] = React.useState({
    title: '',
    description: '',
    status: 'TODO',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!open) {
      setForm({ title: '', description: '', status: 'TODO' });
      setError('');
    }
  }, [open]);

  const submit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add story');
      onCreated?.(data.story);
      onClose?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>Add New Story</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label='Title'
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <TextField
            label='Description'
            multiline
            minRows={2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <TextField
            select
            label='Status'
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            {STATUS.map((s) => (
              <MenuItem key={s.v} value={s.v}>
                {s.label}
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
          disabled={loading || !form.title.trim()}
        >
          {loading ? 'Saving...' : 'Add Story'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
