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
  Stack,
} from '@mui/material';
import AppHeader from '@/components/AppHeader';
import StoryStatusPill from '@/components/StoryStatusPill';
import CreateStoryDialog from '@/components/CreateStoryDialog';
import { useParams } from 'next/navigation';
import StoryTestPanel from '@/components/StoryTestPanel';
import EditStoryDialog from '@/components/EditStoryDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params?.id;

  const [project, setProject] = React.useState(null);
  const [stories, setStories] = React.useState([]);
  const [openCreate, setOpenCreate] = React.useState(false);

  // Panel state
  const [selectedStory, setSelectedStory] = React.useState(null);
  const [panelOpen, setPanelOpen] = React.useState(false);

  // Edit/Delete dialogs
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!projectId) return;
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
    load();
  }, [load]);

  const handleOpenPanel = (story) => {
    setSelectedStory(story);
    setPanelOpen(true);
  };

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
            variant='outlined'
            sx={{ mr: 2 }}
            href={`/projects/${projectId}/report`}
          >
            Super View Report
          </Button>
          <Button
            variant='contained'
            onClick={() => setOpenCreate(true)}
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
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 160 }}>
                  Status
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 220 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stories.map((s) => (
                <TableRow
                  key={s.id}
                  hover
                  onClick={(e) => {
                    if (e.target.closest('[data-row-action]')) return;
                    handleOpenPanel(s);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{s.title}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {s.description && s.description.length > 80
                      ? s.description.slice(0, 80) + '...'
                      : s.description || '—'}
                  </TableCell>
                  <TableCell>
                    <StoryStatusPill value={s.status} />
                  </TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={1}>
                      <Button
                        size='small'
                        variant='outlined'
                        data-row-action
                        onClick={() => handleOpenPanel(s)}
                      >
                        Open Tester
                      </Button>
                      <Button
                        size='small'
                        variant='outlined'
                        data-row-action
                        onClick={() => {
                          setSelectedStory(s);
                          setEditOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size='small'
                        color='error'
                        variant='outlined'
                        data-row-action
                        onClick={() => {
                          setSelectedStory(s);
                          setDeleteOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {stories.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
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
        open={openCreate}
        projectId={projectId}
        onClose={() => setOpenCreate(false)}
        onCreated={() => load()}
      />

      <EditStoryDialog
        open={editOpen}
        story={selectedStory}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          load();
        }}
        projectId={projectId}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        title='Delete User Story'
        description='This will remove the story and its generated tests/runs. This action cannot be undone.'
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!selectedStory) return;
          await fetch(
            `/api/projects/${projectId}/stories/${selectedStory.id}`,
            { method: 'DELETE' }
          );
          setDeleteOpen(false);
          setSelectedStory(null);
          load();
        }}
      />

      <StoryTestPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        story={selectedStory}
        projectId={projectId}
        onRefreshProject={() => load()}
      />
    </>
  );
}
