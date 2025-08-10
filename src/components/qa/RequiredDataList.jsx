'use client';

import * as React from 'react';
import { Box, Grid, TextField, Chip, Typography } from '@mui/material';

export default function RequiredDataList({
  fields = [],
  values = {},
  onChangeValues,
}) {
  if (!fields?.length) {
    return (
      <Box sx={{ color: 'text.secondary', fontSize: 14 }}>
        No required fields yet. Click <b>Extract</b> to infer required test
        data.
      </Box>
    );
  }

  const handleChange = (key, val) => {
    onChangeValues?.((prev) => ({ ...prev, [key]: val }));
  };

  return (
    <Grid container spacing={1.5}>
      {fields.map((f) => (
        <Grid item xs={12} key={f.key}>
          <Box
            sx={{
              display: 'grid',
              gap: 1,
              border: '1px solid',
              borderColor: 'divider',
              p: 1.5,
              borderRadius: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography sx={{ fontWeight: 600 }}>
                {f.name || f.key}
              </Typography>
              {f.required ? (
                <Chip label='required' size='small' color='warning' />
              ) : null}
              <Chip label={f.type || 'text'} size='small' variant='outlined' />
            </Box>
            {f.description ? (
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                {f.description}
              </Typography>
            ) : null}
            <TextField
              size='small'
              fullWidth
              placeholder={f.placeholder || `Enter ${f.name || f.key}`}
              value={values?.[f.key] ?? ''}
              onChange={(e) => handleChange(f.key, e.target.value)}
            />
          </Box>
        </Grid>
      ))}
    </Grid>
  );
}
