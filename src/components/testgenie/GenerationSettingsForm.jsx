'use client';
import { useDispatch, useSelector } from 'react-redux';
import { setSettings } from '@/store/testAuthoringSlice';
import {
  Box,
  FormControlLabel,
  Checkbox,
  MenuItem,
  TextField,
  Stack,
} from '@mui/material';

export default function GenerationSettingsForm() {
  const dispatch = useDispatch();
  const settings = useSelector((s) => s.authoring.settings);

  const set = (patch) => dispatch(setSettings(patch));

  return (
    <Stack spacing={2}>
      <TextField
        select
        label='Style'
        value={settings.style}
        onChange={(e) => set({ style: e.target.value })}
      >
        <MenuItem value='gherkin'>Gherkin</MenuItem>
        <MenuItem value='plain'>Plain Steps</MenuItem>
      </TextField>
      <TextField
        select
        label='Depth'
        value={settings.depth}
        onChange={(e) => set({ depth: e.target.value })}
      >
        <MenuItem value='smoke'>Smoke</MenuItem>
        <MenuItem value='regression'>Regression</MenuItem>
      </TextField>
      <TextField
        select
        label='Data Strategy'
        value={settings.dataStrategy}
        onChange={(e) => set({ dataStrategy: e.target.value })}
      >
        <MenuItem value='faker'>Faker</MenuItem>
        <MenuItem value='fixtures'>Fixtures</MenuItem>
      </TextField>
      <FormControlLabel
        control={
          <Checkbox
            checked={settings.negatives}
            onChange={(e) => set({ negatives: e.target.checked })}
          />
        }
        label='Include negative paths'
      />
    </Stack>
  );
}
