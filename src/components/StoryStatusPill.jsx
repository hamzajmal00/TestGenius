// src/components/StoryStatusPill.jsx
'use client';
import { Chip } from '@mui/material';

export default function StoryStatusPill({ value }) {
  const labelMap = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    DONE: 'Completed',
  };
  const styleMap = {
    TODO: { bg: '#f5f7fb', color: '#111827' },
    IN_PROGRESS: { bg: '#eef2ff', color: '#3730a3' },
    DONE: { bg: '#ecfdf5', color: '#065f46' },
  };
  const { bg, color } = styleMap[value] || styleMap.TODO;
  return (
    <Chip
      label={labelMap[value] || value}
      size='small'
      sx={{
        bgcolor: bg,
        color,
        fontWeight: 700,
        borderRadius: '999px',
        px: 1.5,
      }}
    />
  );
}
