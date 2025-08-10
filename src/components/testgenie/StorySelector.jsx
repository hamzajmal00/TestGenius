'use client';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedStories } from '@/store/testAuthoringSlice';
import { Box, Chip, Stack, Typography } from '@mui/material';

async function fetchStories(projectId) {
  const res = await fetch(`/api/userstories?projectId=${projectId || ''}`);
  const json = await res.json();
  return json.stories || [];
}

export default function StorySelector({ projectId }) {
  const { data: stories = [] } = useQuery({
    queryKey: ['stories', projectId],
    queryFn: () => fetchStories(projectId),
  });
  const dispatch = useDispatch();
  const selected = useSelector((s) => s.authoring.selectedStories);

  const toggle = (id) => {
    const set = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    dispatch(setSelectedStories(set));
  };

  return (
    <Stack spacing={1}>
      <Typography variant='subtitle2'>User Stories</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {stories.map((s) => (
          <Chip
            key={s.id}
            label={s.title}
            variant={selected.includes(s.id) ? 'filled' : 'outlined'}
            onClick={() => toggle(s.id)}
          />
        ))}
      </Box>
    </Stack>
  );
}
