'use client';

import * as React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
} from '@mui/material';

export default function ConfirmDeleteDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth='xs' fullWidth>
      <DialogTitle>{title || 'Confirm delete'}</DialogTitle>
      <DialogContent dividers>
        <Typography sx={{ color: 'text.secondary' }}>
          {description || 'Are you sure you want to delete this item?'}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color='error' variant='contained' onClick={onConfirm}>
          Delete
        </Button>
      </DialogActions>
    </Dialog>
  );
}
