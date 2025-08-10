// src/app/projects/[id]/page.jsx
'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import AppHeader from '@/components/AppHeader';
import StoryStatusPill from '@/components/StoryStatusPill';
import CreateStoryDialog from '@/components/CreateStoryDialog';
import { useParams } from 'next/navigation';

export default function ProjectDetailPage() {
  const params = useParams(); // { id }
  const projectId = params?.id;

  const [project, setProject] = React.useState(null);
  const [stories, setStories] = React.useState([]);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    const [pRes, sRes] = await Promise.all([
      fetch(`/api/projects/${projectId}`, { cache: 'no-store' }),
      fetch(`/api/projects/${projectId}/stories`, { cache: 'no-store' }),
    ]);
    const p = await pRes.json();
    const s = await sRes.json();
    if (pRes.ok) setProject(p.project);
    if (sRes.ok) setStories(s.stories);
  }, [projectId]);

  React.useEffect(() => {
    if (projectId) load();
  }, [projectId, load]);

  return (
    <>
      <AppHeader showSearch={false} />
      <Container maxWidth='lg' sx={{ py: 6 }}>
        <Typography variant='h3' sx={{ fontWeight: 800, mb: 1 }}>
          {project?.name || 'Project'}
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 5 }}>
          {project?.description || '—'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant='h6' sx={{ fontWeight: 800, flexGrow: 1 }}>
            User Stories
          </Typography>
          <Button
            variant='contained'
            onClick={() => setOpen(true)}
            disableElevation
          >
            Add New Story
          </Button>
        </Box>

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 200 }}>
                  Status
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stories.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.title}</TableCell>
                  <TableCell>
                    <StoryStatusPill value={s.status} />
                  </TableCell>
                </TableRow>
              ))}
              {stories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Box
                      sx={{
                        py: 4,
                        textAlign: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      No stories yet.
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      <CreateStoryDialog
        open={open}
        projectId={projectId}
        onClose={() => setOpen(false)}
        onCreated={() => load()}
      />
    </>
  );
}
