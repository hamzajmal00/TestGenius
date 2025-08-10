'use client';

import * as React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  Stack,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  Divider,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

export default function AppHeader({ showSearch = true, onSearch }) {
  const [anchor, setAnchor] = React.useState(null);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      const res = await fetch('/api/me', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setUser(data.user);
    })();
  }, []);

  const open = Boolean(anchor);
  const name = user?.name || user?.email?.split('@')[0] || 'User';
  const initials = (name || 'U')
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function onLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <AppBar
      position='sticky'
      elevation={0}
      sx={{
        bgcolor: '#fff',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ gap: 2, minHeight: 72 }}>
        <Typography variant='h6' sx={{ fontWeight: 800 }}>
          TestGenius
        </Typography>

        <Stack
          direction='row'
          spacing={3}
          sx={{ ml: 2, display: { xs: 'none', md: 'flex' } }}
        >
          <Typography
            component='a'
            href='/dashboard'
            sx={{ cursor: 'pointer' }}
          >
            Dashboard
          </Typography>
          <Typography
            component='a'
            href='/projects'
            sx={{ cursor: 'pointer', fontWeight: 700 }}
          >
            Projects
          </Typography>
          <Typography component='a' href='/settings' sx={{ cursor: 'pointer' }}>
            Settings
          </Typography>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        {/* Profile */}
        <Stack direction='row' spacing={1} alignItems='center'>
          <Typography
            sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 600 }}
          >
            {name}
          </Typography>
          <IconButton size='small' onClick={(e) => setAnchor(e.currentTarget)}>
            <Avatar sx={{ width: 36, height: 36 }}>{initials}</Avatar>
          </IconButton>
        </Stack>

        <Menu
          anchorEl={anchor}
          open={open}
          onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Typography sx={{ px: 2, py: 1, fontWeight: 600 }}>{name}</Typography>
          <Divider />
          <MenuItem onClick={onLogout}>
            <ListItemIcon>
              <LogoutIcon fontSize='small' />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}
