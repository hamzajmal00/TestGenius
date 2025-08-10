'use client';

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  MenuItem,
} from '@mui/material';

const STATUS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'PASSING', label: 'Passing' },
  { value: 'FAILING', label: 'Failing' },
];

export default function EditProjectDialog({ open, onClose, onSaved, project }) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [testStatus, setTestStatus] = React.useState('PENDING');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && project) {
      setName(project.name || '');
      setDescription(project.description || '');
      setTestStatus(project.testStatus || 'PENDING');
    }
  }, [open, project]);

  const save = async () => {
    if (!project?.id) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, testStatus }),
      });
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Edit Project</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label='Project Name'
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />
          <TextField
            label='Description'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
          <TextField
            label='Test Status'
            select
            value={testStatus}
            onChange={(e) => setTestStatus(e.target.value)}
            fullWidth
          >
            {STATUS.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={save} variant='contained' disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
