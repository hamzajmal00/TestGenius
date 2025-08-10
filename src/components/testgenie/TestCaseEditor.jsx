'use client';
import { useState } from 'react';
import { Tabs, Tab, Box, TextField, Stack, Button } from '@mui/material';

export default function TestCaseEditor({ testCase, onSaved }) {
  const [tab, setTab] = useState(0);
  const [title, setTitle] = useState(testCase?.title || '');
  const [specText, setSpecText] = useState(testCase?.specText || '');
  const [code, setCode] = useState(testCase?.code || '');

  const save = async () => {
    const res = await fetch(`/api/testcases/${testCase.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, specText, code }),
    });
    const json = await res.json();
    onSaved?.(json.testCase);
  };

  return (
    <Stack spacing={2}>
      <TextField
        label='Title'
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        fullWidth
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label='Spec' />
        <Tab label='Code' />
      </Tabs>
      <Box hidden={tab !== 0}>
        <TextField
          multiline
          minRows={8}
          fullWidth
          value={specText}
          onChange={(e) => setSpecText(e.target.value)}
        />
      </Box>
      <Box hidden={tab !== 1}>
        <TextField
          multiline
          minRows={12}
          fullWidth
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button variant='contained' onClick={save}>
          Save Draft
        </Button>
      </Box>
    </Stack>
  );
}
