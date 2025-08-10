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
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'DONE', label: 'Done' },
];

export default function EditStoryDialog({
  open,
  onClose,
  onSaved,
  story,
  projectId,
}) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState('TODO');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && story) {
      setTitle(story.title || '');
      setDescription(story.description || '');
      setStatus(story.status || 'TODO');
    }
  }, [open, story]);

  const save = async () => {
    if (!story?.id) return;
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/stories/${story.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, status }),
      });
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth='sm' fullWidth>
      <DialogTitle>Edit Story</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label='Title'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
          />
          <TextField
            label='Description / Acceptance Criteria'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            minRows={3}
            placeholder='Given… When… Then…'
          />
          <TextField
            label='Status'
            select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
