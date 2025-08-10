'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  Divider,
  Skeleton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import ScienceIcon from '@mui/icons-material/Science';
import AppHeader from '@/components/AppHeader';
import StoryStatusPill from '@/components/StoryStatusPill';
import { useParams } from 'next/navigation';
import StoryTestPanel from '@/components/StoryTestPanel';

function KpiCard({ label, value, hint }) {
  return (
    <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 800, fontSize: 24 }}>{value}</Typography>
      {hint ? (
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
          {hint}
        </Typography>
      ) : null}
    </Paper>
  );
}

export default function SuperViewReportPage() {
  const params = useParams();
  const projectId = params?.id;

  const [project, setProject] = React.useState(null);
  const [rows, setRows] = React.useState([]); // stories stitched with qa
  const [loading, setLoading] = React.useState(true);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [selectedStory, setSelectedStory] = React.useState(null);

  const openTester = (story) => {
    setSelectedStory(story);
    setPanelOpen(true);
  };

  const load = React.useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { cache: 'no-store' }),
        fetch(`/api/projects/${projectId}/stories`, { cache: 'no-store' }),
      ]);
      const p = await pRes.json();
      const s = await sRes.json();

      if (pRes.ok) setProject(p.project || null);

      const stories = sRes.ok ? s.stories || [] : [];

      // fetch QA for each story (RequiredFields + latestGeneration + recent runs)
      const qaRes = await Promise.all(
        stories.map((st) =>
          fetch(`/api/projects/${projectId}/stories/${st.id}/qa`, {
            cache: 'no-store',
          })
            .then((r) => (r.ok ? r.json() : Promise.resolve(null)))
            .catch(() => null)
        )
      );

      const stitched = stories.map((st, idx) => ({
        ...st,
        qa: qaRes[idx],
      }));

      setRows(stitched);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    load();
  }, [load]);

  // ---- derive KPIs from rows ----
  const k = React.useMemo(() => {
    const totalStories = rows.length;
    const byStatus = rows.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {});
    const withGen = rows.filter((r) => r?.qa?.latestGeneration).length;
    const coveragePct = totalStories
      ? Math.round((withGen / totalStories) * 100)
      : 0;

    // recent runs (we only fetched last up to 5 per story)
    let pass = 0,
      fail = 0;
    rows.forEach((r) => {
      (r?.qa?.latestGeneration?.runs || []).forEach((run) => {
        if (run.passed) pass++;
        else fail++;
      });
    });
    const totalRuns = pass + fail;
    const passRate = totalRuns ? Math.round((pass / totalRuns) * 100) : 0;

    return {
      totalStories,
      todo: byStatus.TODO || 0,
      inProgress: byStatus.IN_PROGRESS || 0,
      done: byStatus.DONE || 0,
      coveragePct,
      passRate,
      totalRuns,
      pass,
      fail,
    };
  }, [rows]);

  const exportJSON = () => {
    const payload = {
      project,
      generatedAt: new Date().toISOString(),
      summary: k,
      stories: rows.map((r) => ({
        id: r.id,
        title: r.title,
        status: r.status,
        requiredFields: r?.qa?.requiredFields || [],
        latestGeneration: r?.qa?.latestGeneration
          ? {
              id: r.qa.latestGeneration.id,
              url: r.qa.latestGeneration.url,
              createdAt: r.qa.latestGeneration.createdAt,
              runs: r.qa.latestGeneration.runs || [],
            }
          : null,
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `super-report-${project?.name || projectId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <AppHeader showSearch={false} />
      <Container maxWidth='xl' sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant='h4' sx={{ fontWeight: 800 }}>
            Super View Report
          </Typography>
          <Chip
            size='small'
            label={project?.testStatus || 'PENDING'}
            color={
              project?.testStatus === 'PASSING'
                ? 'success'
                : project?.testStatus === 'FAILING'
                ? 'error'
                : 'default'
            }
          />
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title='Refresh'>
            <IconButton onClick={load}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant='outlined'
            startIcon={<DownloadIcon />}
            onClick={exportJSON}
          >
            Export JSON
          </Button>
        </Box>
        <Typography sx={{ color: 'text.secondary', mb: 3 }}>
          Project: <strong>{project?.name || projectId}</strong>
        </Typography>

        {/* KPIs */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              label='Total Stories'
              value={loading ? <Skeleton width={60} /> : k.totalStories}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              label='Coverage (has tests)'
              value={loading ? <Skeleton width={80} /> : `${k.coveragePct}%`}
              hint={`${
                k.totalStories
                  ? k.totalStories -
                    (k.totalStories -
                      Math.round((k.totalStories * k.coveragePct) / 100))
                  : 0
              }/${k.totalStories} with generations`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <KpiCard
              label='Pass Rate (recent)'
              value={loading ? <Skeleton width={80} /> : `${k.passRate}%`}
              hint={`${k.pass} pass / ${k.fail} fail`}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper variant='outlined' sx={{ p: 2, borderRadius: 2 }}>
              <Typography
                sx={{ fontSize: 12, color: 'text.secondary', mb: 0.5 }}
              >
                Story Status
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip size='small' label={`TODO ${k.todo}`} />
                <Chip
                  size='small'
                  color='warning'
                  label={`IN PROGRESS ${k.inProgress}`}
                />
                <Chip size='small' color='success' label={`DONE ${k.done}`} />
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* Coverage bar */}
        <Paper variant='outlined' sx={{ p: 2, borderRadius: 2, mb: 2 }}>
          <Typography sx={{ fontWeight: 700, mb: 1 }}>Coverage</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flexGrow: 1 }}>
              <LinearProgress
                variant='determinate'
                value={loading ? 0 : k.coveragePct}
              />
            </Box>
            <Typography sx={{ minWidth: 60, textAlign: 'right' }}>
              {loading ? '...' : `${k.coveragePct}%`}
            </Typography>
          </Box>
        </Paper>

        {/* Table */}
        <Paper variant='outlined' sx={{ borderRadius: 2 }}>
          <Box
            sx={{ p: 2, pb: 0, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <ScienceIcon fontSize='small' />
            <Typography sx={{ fontWeight: 700 }}>
              Stories & Recent Runs
            </Typography>
          </Box>
          <TableContainer
            sx={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
          >
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Story</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 120 }}>
                    Req. Fields
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 140 }}>
                    Latest Gen
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 200 }}>
                    Recent Runs
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 700, width: 140, textAlign: 'right' }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton width='60%' />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={80} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={60} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={120} />
                      </TableCell>
                      <TableCell>
                        <Skeleton width='90%' />
                      </TableCell>
                      <TableCell>
                        <Skeleton width={100} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Box
                        sx={{
                          p: 3,
                          textAlign: 'center',
                          color: 'text.secondary',
                        }}
                      >
                        No stories yet.
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => {
                    const rfCount = r?.qa?.requiredFields?.length || 0;
                    const gen = r?.qa?.latestGeneration;
                    const runs = gen?.runs || [];
                    return (
                      <TableRow key={r.id} hover>
                        <TableCell>
                          <Typography sx={{ fontWeight: 600 }}>
                            {r.title}
                          </Typography>
                          <Typography
                            variant='caption'
                            sx={{ color: 'text.secondary' }}
                          >
                            {r.description || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <StoryStatusPill value={r.status} />
                        </TableCell>
                        <TableCell>
                          {rfCount > 0 ? (
                            <Chip size='small' label={rfCount} />
                          ) : (
                            <Typography
                              variant='body2'
                              sx={{ color: 'text.secondary' }}
                            >
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {gen ? (
                            <>
                              <Typography
                                variant='body2'
                                sx={{ fontWeight: 600 }}
                              >
                                {new URL(gen.url).pathname}
                              </Typography>
                              <Typography
                                variant='caption'
                                sx={{ color: 'text.secondary' }}
                              >
                                {new Date(gen.createdAt).toLocaleString()}
                              </Typography>
                            </>
                          ) : (
                            <Typography
                              variant='body2'
                              sx={{ color: 'text.secondary' }}
                            >
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box
                            sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}
                          >
                            {runs.length === 0 ? (
                              <Typography
                                variant='body2'
                                sx={{ color: 'text.secondary' }}
                              >
                                —
                              </Typography>
                            ) : (
                              runs.map((run) => (
                                <Chip
                                  key={run.id}
                                  size='small'
                                  label={run.passed ? 'PASS' : 'FAIL'}
                                  color={run.passed ? 'success' : 'error'}
                                  variant={run.passed ? 'filled' : 'outlined'}
                                />
                              ))
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align='right'>
                          <Button
                            size='small'
                            variant='outlined'
                            onClick={() => openTester(r)}
                          >
                            Open Tester
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Divider />
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant='text' onClick={load} startIcon={<RefreshIcon />}>
              Refresh Data
            </Button>
          </Box>
        </Paper>
      </Container>

      <StoryTestPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        story={selectedStory}
        projectId={projectId}
        onRefreshProject={load}
      />
    </>
  );
}
