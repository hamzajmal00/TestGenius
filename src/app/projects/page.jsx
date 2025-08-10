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
import { useRouter } from 'next/navigation';

// --- Mock data (replace with API data) ---

function StatusPill({ value }) {
  const map = {
    Passing: { bg: '#f1f5f9', color: 'text.primary' },
    Failing: { bg: '#fee2e2', color: '#b91c1c' },
    Pending: { bg: '#fef3c7', color: '#92400e' },
  };
  const { bg, color } = map[value] || map.Passing;
  return (
    <Chip
      label={value}
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
  const [open, setOpen] = React.useState(false);
  const [projects, setProjects] = React.useState([]);

  const router = useRouter();

  const filtered = projects.filter(
    (r) =>
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.desc.toLowerCase().includes(query.toLowerCase())
  );
  const load = React.useCallback(async () => {
    const res = await fetch('/api/projects', { cache: 'no-store' });
    const data = await res.json();
    if (!res.ok) {
      /* handle error */ return;
    }
    setProjects(data.projects);
  }, []);
  React.useEffect(() => {
    load();
  }, [load]);
  return (
    <>
      <AppHeader onSearch={setQuery} />

      <Container maxWidth='lg' sx={{ py: 6 }}>
        {/* Title + New Project */}
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
            onClick={() => setOpen(true)}
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

        {/* Page search (big field under the title) */}
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
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              bgcolor: '#f5f7fb',
            },
          }}
        />

        {/* Table */}
        <TableContainer
          component={Paper}
          elevation={0}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
          }}
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
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((r) => (
                <TableRow
                  key={r.name}
                  hover
                  onClick={() => router.push(`/projects/${r.id}`)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{r.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {r.description}
                  </TableCell>
                  <TableCell>{r._count.stories}</TableCell>
                  <TableCell>
                    <StatusPill value={r.testStatus} />
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
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
        open={open}
        onClose={() => setOpen(false)}
        onCreated={() => load()}
      />
    </>
  );
}
