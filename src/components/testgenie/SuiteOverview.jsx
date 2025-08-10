'use client';
import { List, ListItemButton, ListItemText, Chip } from '@mui/material';

export default function SuiteOverview({ suite, onOpen }) {
  if (!suite) return null;
  return (
    <List dense>
      {suite.cases.map((c) => (
        <ListItemButton key={c.id} onClick={() => onOpen(c)}>
          <ListItemText primary={c.title} secondary={c.status} />
          <Chip size='small' label={c.style} sx={{ ml: 1 }} />
        </ListItemButton>
      ))}
    </List>
  );
}
