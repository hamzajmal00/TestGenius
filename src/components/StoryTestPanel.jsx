'use client';

import * as React from 'react';
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  TextField,
  Divider,
  Button,
  CircularProgress,
  Alert,
  Stack,
  Paper,
  Snackbar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RequiredDataList from './qa/RequiredDataList';
import CodeBlock from './qa/CodeBlock';
import { useParams } from 'next/navigation';

export default function StoryTestPanel({
  open,
  onClose,
  story,
  onRefreshProject,
}) {
  const params = useParams(); // { id }
  const projectId = params?.id;
  const [url, setUrl] = React.useState('');
  const [userStoryText, setUserStoryText] = React.useState('');
  const [requiredFields, setRequiredFields] = React.useState([]);
  const [testData, setTestData] = React.useState({});
  const [testCode, setTestCode] = React.useState('');
  const [generationId, setGenerationId] = React.useState(null);
  const [runResult, setRunResult] = React.useState(null);

  const [loadingExtract, setLoadingExtract] = React.useState(false);
  const [loadingGenerate, setLoadingGenerate] = React.useState(false);
  const [loadingRun, setLoadingRun] = React.useState(false);
  const [snack, setSnack] = React.useState({
    open: false,
    msg: '',
    severity: 'success',
  });

  React.useEffect(() => {
    if (open && story) {
      // Prime form with story details
      setUserStoryText(story.description || story.title || '');
      setRequiredFields([]);
      setTestData({});
      setTestCode('');
      setGenerationId(null);
      setRunResult(null);
    }
  }, [open, story]);

  const loadExisting = React.useCallback(async () => {
    if (!open || !story?.id) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/stories/${story.id}/qa`,
        { cache: 'no-store' }
      );
      if (!res.ok) return; // soft fail

      const data = await res.json();

      // Required fields
      if (Array.isArray(data.requiredFields)) {
        setRequiredFields(data.requiredFields);

        // Prefill testData from latestGeneration.testData if keys match
        const init = {};
        data.requiredFields.forEach((f) => {
          const savedVal = data?.latestGeneration?.testData?.[f.key];
          init[f.key] = savedVal ?? '';
        });
        setTestData((prev) => ({ ...init, ...prev }));
      }

      // Latest test generation
      if (data.latestGeneration) {
        setGenerationId(data.latestGeneration.id || null);
        setTestCode(data.latestGeneration.testCode || '');
        // If user didn't type URL yet, use the saved one
        setUrl((u) => (u ? u : data.latestGeneration.url || ''));
        // Optional: toast
        notify('Loaded previous test generation.', 'info');
      }
    } catch {
      /* ignore */
    }
  }, [open, story?.id]);

  React.useEffect(() => {
    // Reset fields whenever a new story opens
    if (open && story) {
      setUserStoryText(story.description || story.title || '');
      setRequiredFields([]);
      setTestData({});
      setTestCode('');
      setGenerationId(null);
      setRunResult(null);
      // Load saved data
      loadExisting();
    }
  }, [open, story, loadExisting]);

  const notify = (msg, severity = 'success') => {
    setSnack({ open: true, msg, severity });
  };

  const handleExtract = async () => {
    if (!url || !userStoryText || !story?.id) {
      notify('Please provide URL and user story text.', 'warning');
      return;
    }
    setLoadingExtract(true);
    try {
      const res = await fetch('/api/extract-required-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          userStory: userStoryText,
          storyId: story.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to extract data');

      setRequiredFields(data.requiredData || []);
      // Initialize testData keys if not present
      const init = {};
      (data.requiredData || []).forEach((f) => {
        init[f.key] = '';
      });
      setTestData((prev) => ({ ...init, ...prev }));
      notify('Required data extracted.');
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setLoadingExtract(false);
    }
  };

  const handleGenerate = async () => {
    if (!url || !userStoryText || !story?.id) {
      notify('Please provide URL and user story text.', 'warning');
      return;
    }
    setLoadingGenerate(true);
    try {
      const res = await fetch('/api/generate-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          userStory: userStoryText,
          testData,
          storyId: story.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate test');

      setTestCode(data.testCode || '');
      setGenerationId(data.generationId || null);
      notify('Cypress test generated.');
      onRefreshProject?.(); // may update story status to IN_PROGRESS
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setLoadingGenerate(false);
    }
  };

  const handleRun = async () => {
    if (!url || !testCode) {
      notify('Please generate test first.', 'warning');
      return;
    }
    setLoadingRun(true);
    try {
      const res = await fetch('/api/run-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          testCode,
          testData,
          generationId,
          storyId: story?.id,
        }),
      });
      const data = await res.json();
      if (!res.ok && !data.testCode)
        throw new Error(data.error || 'Failed to run test');

      setRunResult(data);
      notify(
        data.passed ? '✅ Test passed' : '❌ Test failed',
        data.passed ? 'success' : 'error'
      );
      onRefreshProject?.(); // update story/project status
    } catch (e) {
      notify(e.message, 'error');
    } finally {
      setLoadingRun(false);
    }
  };

  const drawerWidth = 560;

  return (
    <Drawer
      anchor='right'
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: drawerWidth } },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant='h6' sx={{ fontWeight: 800, flexGrow: 1 }}>
          Story Tester
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      <Divider />

      <Box sx={{ p: 2, display: 'grid', gap: 2 }}>
        <Alert severity='info'>
          <strong>{story?.title}</strong>
        </Alert>

        <TextField
          label='Target URL'
          placeholder='https://app.example.com/login'
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          fullWidth
          size='small'
        />

        <TextField
          label='User Story / Acceptance Criteria'
          placeholder='As a user, I want to ...'
          value={userStoryText}
          onChange={(e) => setUserStoryText(e.target.value)}
          fullWidth
          multiline
          minRows={3}
        />

        {/* Step 1: Extract Required Data */}
        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            sx={{ mb: 1 }}
          >
            <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
              1) Extract Required Data
            </Typography>
            <Button
              variant='contained'
              size='small'
              onClick={handleExtract}
              disabled={loadingExtract}
            >
              {loadingExtract ? <CircularProgress size={18} /> : 'Extract'}
            </Button>
          </Stack>

          <RequiredDataList
            fields={requiredFields}
            values={testData}
            onChangeValues={setTestData}
          />
        </Paper>

        {/* Step 2: Generate Test */}
        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            sx={{ mb: 1 }}
          >
            <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
              2) Generate Cypress Test
            </Typography>
            <Button
              variant='contained'
              size='small'
              onClick={handleGenerate}
              disabled={loadingGenerate}
            >
              {loadingGenerate ? <CircularProgress size={18} /> : 'Generate'}
            </Button>
          </Stack>

          <CodeBlock code={testCode || '// Generated test will appear here'} />
        </Paper>

        {/* Step 3: Run Test */}
        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2, mb: 8 }}>
          <Stack
            direction='row'
            alignItems='center'
            justifyContent='space-between'
            sx={{ mb: 1 }}
          >
            <Typography variant='subtitle1' sx={{ fontWeight: 700 }}>
              3) Run Test
            </Typography>
            <Button
              variant='contained'
              size='small'
              color='success'
              onClick={handleRun}
              disabled={loadingRun || !testCode}
            >
              {loadingRun ? <CircularProgress size={18} /> : 'Run'}
            </Button>
          </Stack>

          {runResult && (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Alert severity={runResult.passed ? 'success' : 'error'}>
                {runResult.passed
                  ? 'All good! Tests passed.'
                  : 'Some tests failed.'}
              </Alert>
              <Typography variant='caption' sx={{ color: 'text.secondary' }}>
                File: {runResult.testFilePath || '—'}
              </Typography>
              <Typography variant='subtitle2' sx={{ mt: 1 }}>
                Output
              </Typography>
              <Box
                component='pre'
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: 'grey.100',
                  border: '1px solid',
                  borderColor: 'divider',
                  maxHeight: 220,
                  overflow: 'auto',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {(runResult.output || '').slice(-4000) || '—'}
              </Box>
              {runResult.errorOutput ? (
                <>
                  <Typography variant='subtitle2' sx={{ mt: 1 }}>
                    Error Output
                  </Typography>
                  <Box
                    component='pre'
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: 'grey.100',
                      border: '1px solid',
                      borderColor: 'divider',
                      maxHeight: 220,
                      overflow: 'auto',
                      fontFamily:
                        'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {(runResult.errorOutput || '').slice(-4000)}
                  </Box>
                </>
              ) : null}
            </Box>
          )}
        </Paper>
      </Box>

      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.msg}
      />
    </Drawer>
  );
}
