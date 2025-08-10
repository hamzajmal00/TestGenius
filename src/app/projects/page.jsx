'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Chip,
  Container,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AppHeader from '@/components/AppHeader';
import CreateProjectDialog from '@/components/CreateProjectDialog';
import EditProjectDialog from '@/components/EditProjectDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { useRouter } from 'next/navigation';

function StatusPill({ value }) {
  const v = (value || '').toString().toUpperCase(); // backend: PASSING|FAILING|PENDING
  const map = {
    PASSING: { label: 'Passing', bg: '#f1f5f9', color: '#0f172a' },
    FAILING: { label: 'Failing', bg: '#fee2e2', color: '#b91c1c' },
    PENDING: { label: 'Pending', bg: '#fef3c7', color: '#92400e' },
  };
  const { label, bg, color } = map[v] || map.PASSING;
  return (
    <Chip
      label={label}
      size='small'
      sx={{
        bgcolor: bg,
        color,
        fontWeight: 600,
        borderRadius: '999px',
        px: 1.5,
      }}
    />
  );
}

export default function ProjectsPage() {
  const [query, setQuery] = React.useState('');
  const [openCreate, setOpenCreate] = React.useState(false);
  const [projects, setProjects] = React.useState([]);

  // edit/delete
  const [selected, setSelected] = React.useState(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const router = useRouter();

  const load = React.useCallback(async () => {
    const res = await fetch('/api/projects', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) return;
    setProjects(data.projects || []);
  }, []);
  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = projects.filter((r) => {
    const name = (r.name || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();
    const q = query.toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  return (
    <>
      <AppHeader onSearch={setQuery} />

      <Container maxWidth='lg' sx={{ py: 6 }}>
        <Stack
          direction='row'
          justifyContent='space-between'
          alignItems='center'
          sx={{ mb: 3 }}
        >
          <Typography
            variant='h3'
            sx={{ fontWeight: 800, fontSize: { xs: 28, md: 36 } }}
          >
            Projects
          </Typography>
          <Button
            onClick={() => setOpenCreate(true)}
            variant='contained'
            disableElevation
            sx={{
              textTransform: 'none',
              borderRadius: 2,
              bgcolor: '#e6eefc',
              color: '#1d4ed8',
              '&:hover': { bgcolor: '#dbe8fb' },
              fontWeight: 700,
            }}
          >
            New Project
          </Button>
        </Stack>

        <TextField
          fullWidth
          placeholder='Search'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position='start'>
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{
            mb: 3,
            '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#f5f7fb' },
          }}
        />

        <TableContainer
          component={Paper}
          elevation={0}
          sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3 }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Project Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>
                  User Stories
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 140 }}>
                  Test Status
                </TableCell>
                <TableCell sx={{ fontWeight: 700, width: 200 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.id}
                  hover
                  onClick={(e) => {
                    if (e.target.closest('[data-row-action]')) return;
                    router.push(`/projects/${r.id}`);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{r.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {r.description || '—'}
                  </TableCell>
                  <TableCell>
                    {r?._count?.stories ?? r?.userStories ?? 0}
                  </TableCell>
                  <TableCell>
                    <StatusPill value={r.testStatus} />
                  </TableCell>
                  <TableCell>
                    <Stack direction='row' spacing={1}>
                      <Button
                        size='small'
                        variant='outlined'
                        data-row-action
                        onClick={() => router.push(`/projects/${r.id}`)}
                      >
                        Open
                      </Button>
                      <Button
                        size='small'
                        variant='outlined'
                        data-row-action
                        onClick={() => {
                          setSelected(r);
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
                          setSelected(r);
                          setDeleteOpen(true);
                        }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Box
                      sx={{
                        py: 4,
                        textAlign: 'center',
                        color: 'text.secondary',
                      }}
                    >
                      No projects found.
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      <CreateProjectDialog
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => load()}
      />

      <EditProjectDialog
        open={editOpen}
        project={selected}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          setEditOpen(false);
          load();
        }}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        title='Delete Project'
        description='This will delete the project, its stories, and all generated tests/runs. This cannot be undone.'
        onClose={() => setDeleteOpen(false)}
        onConfirm={async () => {
          if (!selected) return;
          await fetch(`/api/projects/${selected.id}`, { method: 'DELETE' });
          setDeleteOpen(false);
          setSelected(null);
          load();
        }}
      />
    </>
  );
}
