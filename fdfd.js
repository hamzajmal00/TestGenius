'use client';

import * as React from 'react';
import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
  Link,
  Alert,
} from '@mui/material';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [err, setErr] = React.useState('');
  const router = useRouter();

  async function onSubmit(e) {
    e.preventDefault();
    setErr('');
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) return setErr(data.error || 'Register failed');
    router.push('/projects');
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background:
          'radial-gradient(60rem 60rem at -10% -20%, #eef2ff 0%, transparent 60%), radial-gradient(60rem 60rem at 120% 120%, #ecfeff 0%, transparent 55%)',
        display: 'grid',
        placeItems: 'center',
        p: 2,
      }}
    >
      <Container maxWidth='xs'>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant='h5' sx={{ fontWeight: 800, mb: 1 }}>
            Create your account
          </Typography>
          <Typography sx={{ color: 'text.secondary', mb: 3 }}>
            Join TestGenius
          </Typography>

          <form onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField
                label='Name'
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <TextField
                label='Email'
                fullWidth
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <TextField
                label='Password'
                type='password'
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {err && <Alert severity='error'>{err}</Alert>}
              <Button
                type='submit'
                variant='contained'
                size='large'
                disableElevation
                sx={{ textTransform: 'none' }}
              >
                Create account
              </Button>
            </Stack>
          </form>

          <Typography
            sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}
          >
            Already have an account?{' '}
            <Link href='/login' underline='hover'>
              Sign in
            </Link>
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
}
