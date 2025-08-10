'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  Skeleton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayCircleIcon from '@mui/icons-material/PlayCircleOutline';
import ScienceIcon from '@mui/icons-material/Science';
import AppHeader from '@/components/AppHeader';
import StoryTestPanel from '@/components/StoryTestPanel';
import Link from 'next/link';

function StatCard({ label, value, hint, color = 'default' }) {
  return (
    <Paper variant='outlined' sx={{ p: 2, borderRadius: 2, height: '100%' }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 900, fontSize: 28, mt: 0.5 }}>
        {value}
      </Typography>
      {hint && (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
          {hint}
        </Typography>
      )}
    </Paper>
  );
}

function Ring({ value = 0, size = 84 }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <CircularProgress
        variant='determinate'
        value={100}
        sx={{ color: 'divider' }}
        size={size}
      />
      <CircularProgress variant='determinate' value={value} size={size} />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
        }}
      >
        {value}%
      </Box>
    </Box>
  );
}

function RunDots({ runs = [] }) {
  // runs: boolean[] (true=pass, false=fail)
  return (
    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
      {runs.map((p, i) => (
        <Box
          key={i}
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: p ? 'success.main' : 'error.main',
            opacity: 0.85,
          }}
        />
      ))}
    </Box>
  );
}

export default function DashboardPage() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState(null);

  // drill-in (reuse your StoryTestPanel)
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [panelStory, setPanelStory] = React.useState(null);
  const [panelProjectId, setPanelProjectId] = React.useState(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/qa/overview', { cache: 'no-store' });
      const j = await res.json();
      if (!res.ok && j?.error) throw new Error(j.error);
      setData(j);
    } catch (e) {
      setErr(e.message || 'Failed to load overview');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <AppHeader showSearch={false} />
      <Container maxWidth='xl' sx={{ py: 4 }}>
        {err ? (
          <Paper
            variant='outlined'
            sx={{
              p: 1.5,
              mb: 2,
              borderColor: 'error.light',
              bgcolor: 'error.50',
            }}
          >
            <Typography color='error'>
              Failed to load dashboard data. {err}
            </Typography>
          </Paper>
        ) : null}
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant='h4' sx={{ fontWeight: 900 }}>
            QA Dashboard
          </Typography>
          <Chip
            size='small'
            color='primary'
            label={
              data
                ? `Updated ${new Date(data.generatedAt).toLocaleTimeString()}`
                : 'Loading…'
            }
          />
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title='Refresh'>
            <IconButton onClick={load}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} md={3}>
            <StatCard
              label='Projects'
              value={
                loading ? <Skeleton width={60} /> : data.summary.totalProjects
              }
              hint='Active test spaces'
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              label='Stories'
              value={
                loading ? <Skeleton width={60} /> : data.summary.totalStories
              }
              hint={`${data?.summary?.totalGenerations ?? 0} test generations`}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <StatCard
              label='Pass Rate (recent)'
              value={
                loading ? <Skeleton width={80} /> : `${data.summary.passRate}%`
              }
              hint={`${data?.summary?.passCount ?? 0} pass / ${
                data?.summary?.failCount ?? 0
              } fail`}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper
              variant='outlined'
              sx={{
                p: 2,
                borderRadius: 2,
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  Coverage
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  Stories with tests
                </Typography>
              </Box>
              {loading ? (
                <Skeleton variant='circular' width={84} height={84} />
              ) : (
                <Ring value={data.summary.coveragePct} />
              )}
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          {/* Left: Projects */}
          <Grid item xs={12} lg={7}>
            <Paper variant='outlined' sx={{ borderRadius: 2 }}>
              <Box
                sx={{
                  p: 2,
                  pb: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <ScienceIcon fontSize='small' />
                <Typography sx={{ fontWeight: 800 }}>Projects</Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Project</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 160 }}>
                        Status
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 220 }}>
                        Coverage
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 160 }}>
                        Recent
                      </TableCell>
                      <TableCell
                        sx={{ fontWeight: 700, width: 120, textAlign: 'right' }}
                      >
                        Open
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell>
                            <Skeleton width='40%' />
                          </TableCell>
                          <TableCell>
                            <Skeleton width={90} />
                          </TableCell>
                          <TableCell>
                            <Skeleton width='90%' />
                          </TableCell>
                          <TableCell>
                            <Skeleton width='40%' />
                          </TableCell>
                          <TableCell align='right'>
                            <Skeleton width={60} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : data.projects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <Box
                            sx={{
                              p: 3,
                              textAlign: 'center',
                              color: 'text.secondary',
                            }}
                          >
                            No projects yet.
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.projects.map((p) => (
                        <TableRow key={p.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'grid' }}>
                              <Link
                                href={`/projects/${p.id}`}
                                style={{
                                  textDecoration: 'none',
                                  color: 'inherit',
                                }}
                              >
                                <Typography sx={{ fontWeight: 700 }}>
                                  {p.name}
                                </Typography>
                              </Link>
                              <Typography
                                variant='caption'
                                sx={{ color: 'text.secondary' }}
                              >
                                {p.description || '—'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size='small'
                              label={p.testStatus}
                              color={
                                p.testStatus === 'PASSING'
                                  ? 'success'
                                  : p.testStatus === 'FAILING'
                                  ? 'error'
                                  : 'default'
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Box sx={{ flexGrow: 1 }}>
                                <LinearProgress
                                  variant='determinate'
                                  value={p.stories.coveragePct}
                                />
                              </Box>
                              <Typography
                                variant='body2'
                                sx={{ minWidth: 52, textAlign: 'right' }}
                              >
                                {p.stories.coveragePct}%
                              </Typography>
                            </Box>
                            <Typography
                              variant='caption'
                              sx={{ color: 'text.secondary' }}
                            >
                              {p.stories.withTests}/{p.stories.total} stories
                              with tests
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <RunDots runs={p.recentRuns} />
                          </TableCell>
                          <TableCell align='right'>
                            <Button
                              size='small'
                              variant='outlined'
                              component={Link}
                              href={`/projects/${p.id}`}
                            >
                              Open
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          {/* Right: Top failing + Recent runs */}
          <Grid item xs={12} lg={5}>
            <Paper variant='outlined' sx={{ p: 2, borderRadius: 2, mb: 2 }}>
              <Typography sx={{ fontWeight: 800, mb: 1 }}>
                Top Failing Stories (7d)
              </Typography>
              {loading ? (
                <Stack spacing={1}>
                  <Skeleton height={28} />
                  <Skeleton height={28} />
                  <Skeleton height={28} />
                </Stack>
              ) : data.topFailingStories.length === 0 ? (
                <Typography sx={{ color: 'text.secondary' }}>
                  No failures in the past 7 days.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {data.topFailingStories.map((s) => (
                    <Box
                      key={s.storyId}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontWeight: 600 }}>
                          {s.title}
                        </Typography>
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary' }}
                        >
                          {s.projectName}
                        </Typography>
                      </Box>
                      <Chip
                        color='error'
                        size='small'
                        label={`${s.fails} fails`}
                      />
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>

            <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
              >
                <Typography sx={{ fontWeight: 800 }}>Recent Runs</Typography>
              </Box>
              {loading ? (
                <Stack spacing={1}>
                  <Skeleton height={28} />
                  <Skeleton height={28} />
                  <Skeleton height={28} />
                </Stack>
              ) : data.recentRuns.length === 0 ? (
                <Typography sx={{ color: 'text.secondary' }}>
                  No runs yet.
                </Typography>
              ) : (
                <Stack spacing={1.2}>
                  {data.recentRuns.map((r) => (
                    <Box
                      key={r.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 96px 120px 32px',
                        alignItems: 'center',
                        gap: 1,
                        p: 1,
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1.5,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography noWrap sx={{ fontWeight: 600 }}>
                          {r.storyTitle}
                        </Typography>
                        <Typography
                          variant='caption'
                          sx={{ color: 'text.secondary' }}
                        >
                          {r.projectName}
                        </Typography>
                      </Box>
                      <Chip
                        size='small'
                        color={r.passed ? 'success' : 'error'}
                        label={r.passed ? 'PASS' : 'FAIL'}
                      />
                      <Typography
                        variant='caption'
                        sx={{ color: 'text.secondary' }}
                      >
                        {new Date(r.startedAt).toLocaleString()}
                      </Typography>
                      <Tooltip title='Open Tester'>
                        <IconButton
                          size='small'
                          onClick={() => {
                            setPanelStory({
                              id: r.storyId,
                              title: r.storyTitle,
                            });
                            setPanelProjectId(r.projectId);
                            setPanelOpen(true);
                          }}
                        >
                          <PlayCircleIcon fontSize='small' />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                </Stack>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <StoryTestPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        story={panelStory}
        projectId={panelProjectId}
        onRefreshProject={() => load()}
      />
    </>
  );
}
