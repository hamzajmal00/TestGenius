'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AppBar,
  Toolbar,
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Stack,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ScienceIcon from '@mui/icons-material/Science';
import BoltIcon from '@mui/icons-material/Bolt';
import VerifiedIcon from '@mui/icons-material/Verified';
import ShieldIcon from '@mui/icons-material/Shield';
import PlayCircleIcon from '@mui/icons-material/PlayCircleOutline';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import TimelineIcon from '@mui/icons-material/Timeline';
import CodeIcon from '@mui/icons-material/Code';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudDoneIcon from '@mui/icons-material/CloudDone';

function HomeAppBar() {
  return (
    <AppBar
      position='sticky'
      elevation={0}
      sx={{
        bgcolor: 'transparent',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Toolbar sx={{ minHeight: 72 }}>
        <Stack direction='row' alignItems='center' spacing={1}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: 2,
              background:
                'linear-gradient(135deg, #6d28d9 0%, #2563eb 50%, #06b6d4 100%)',
              boxShadow: 2,
            }}
          />
          <Typography
            variant='h6'
            sx={{ fontWeight: 900, color: 'primary.main' }}
          >
            TestGenie
          </Typography>
          <Chip
            size='small'
            label='beta'
            sx={{ ml: 0.5, fontWeight: 700, bgcolor: 'primary.50' }}
          />
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        <Stack
          direction='row'
          spacing={2}
          sx={{ display: { xs: 'none', md: 'flex' }, mr: 2 }}
        >
          <Button component={Link} href='/dashboard' color='inherit'>
            Dashboard
          </Button>
          <Button component={Link} href='/projects' color='inherit'>
            Projects
          </Button>
          <Button component={Link} href='/docs' color='inherit'>
            Docs
          </Button>
        </Stack>
        <Stack direction='row' spacing={1}>
          <Button component={Link} href='/login' variant='text'>
            Sign in
          </Button>
          <Button
            component={Link}
            href='/projects'
            variant='contained'
            disableElevation
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 800,
            }}
          >
            Get started
          </Button>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}

function GradientHeadline({ children }) {
  return (
    <Typography
      variant='h2'
      sx={{
        fontWeight: 900,
        fontSize: { xs: 36, md: 64 },
        lineHeight: 1.05,
        letterSpacing: '-0.02em',
        background:
          'linear-gradient(90deg,#111827 0%,#111827 40%,#6d28d9 60%,#2563eb 80%,#06b6d4 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        animation: 'shine 6s linear infinite',
        '@keyframes shine': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        backgroundSize: '200% auto',
      }}
    >
      {children}
    </Typography>
  );
}

function HeroGraphic() {
  // pretty code+metrics card
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) =>
          t.palette.mode === 'dark' ? 'grey.900' : 'background.paper',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          inset: -1,
          background:
            'radial-gradient(600px 200px at 80% -20%, rgba(99,102,241,.25), transparent), radial-gradient(400px 160px at -10% 120%, rgba(20,184,166,.25), transparent)',
          pointerEvents: 'none',
        }}
      />
      <Stack direction='row' spacing={1} alignItems='center' sx={{ mb: 1 }}>
        <Chip
          size='small'
          icon={<CodeIcon />}
          label='cypress/e2e/login.spec.cy.js'
        />
        <Chip
          size='small'
          color='success'
          icon={<CheckCircleIcon />}
          label='3 passing'
          variant='outlined'
        />
        <Chip size='small' color='error' variant='outlined' label='0 failing' />
      </Stack>

      <Box
        component='pre'
        sx={{
          m: 0,
          p: 2,
          borderRadius: 2,
          bgcolor: (t) => (t.palette.mode === 'dark' ? 'grey.950' : 'grey.50'),
          border: '1px solid',
          borderColor: 'divider',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 12.5,
          maxHeight: 260,
          overflow: 'auto',
        }}
      >
        {`describe('Login', () => {
  it('allows a user to sign in', () => {
    cy.visit('/login', { failOnStatusCode: false });
    cy.findByPlaceholderText('Email').type('qa@example.com');
    cy.findByPlaceholderText('Password').type('••••••••');
    cy.findByRole('button', { name: /sign in/i }).click();
    cy.findByText(/welcome back/i).should('be.visible');
  });
});`}
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ mt: 2 }}
      >
        <Paper
          variant='outlined'
          sx={{ p: 1.5, borderRadius: 2, flex: 1, display: 'grid', gap: 0.25 }}
        >
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            Pass rate (7d)
          </Typography>
          <Typography sx={{ fontWeight: 900, fontSize: 22 }}>97.4%</Typography>
        </Paper>
        <Paper
          variant='outlined'
          sx={{ p: 1.5, borderRadius: 2, flex: 1, display: 'grid', gap: 0.25 }}
        >
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            Story coverage
          </Typography>
          <Typography sx={{ fontWeight: 900, fontSize: 22 }}>82%</Typography>
        </Paper>
        <Paper
          variant='outlined'
          sx={{ p: 1.5, borderRadius: 2, flex: 1, display: 'grid', gap: 0.25 }}
        >
          <Typography variant='caption' sx={{ color: 'text.secondary' }}>
            Avg. time to test
          </Typography>
          <Typography sx={{ fontWeight: 900, fontSize: 22 }}>18s</Typography>
        </Paper>
      </Stack>
    </Paper>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <Paper
      variant='outlined'
      sx={{
        p: 2,
        height: '100%',
        borderRadius: 2,
        display: 'grid',
        gap: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1.5,
            bgcolor: 'primary.50',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          {icon}
        </Box>
        <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
      </Box>
      <Typography sx={{ color: 'text.secondary' }}>{desc}</Typography>
    </Paper>
  );
}

function Step({ n, title, desc }) {
  return (
    <Stack direction='row' spacing={2} alignItems='flex-start'>
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'grid',
          placeItems: 'center',
          fontWeight: 800,
          mt: 0.25,
          flexShrink: 0,
        }}
      >
        {n}
      </Box>
      <Box>
        <Typography sx={{ fontWeight: 800 }}>{title}</Typography>
        <Typography sx={{ color: 'text.secondary' }}>{desc}</Typography>
      </Box>
    </Stack>
  );
}

export default function HomePage() {
  return (
    <>
      <HomeAppBar />

      {/* HERO */}
      <Box
        sx={{
          pt: { xs: 6, md: 10 },
          pb: { xs: 6, md: 10 },
          background:
            'linear-gradient(180deg, rgba(99,102,241,.08), transparent 60%), radial-gradient(600px 200px at 20% -10%, rgba(59,130,246,.15), transparent 60%)',
        }}
      >
        <Container maxWidth='lg'>
          <Grid container spacing={4} alignItems='center'>
            <Grid item xs={12} md={6}>
              <Chip
                color='primary'
                icon={<AutoAwesomeIcon />}
                label='Ship quality. Automatically.'
                sx={{ mb: 2, fontWeight: 700 }}
              />
              <GradientHeadline>
                From user story to green tests — in minutes.
              </GradientHeadline>
              <Typography
                sx={{ color: 'text.secondary', mt: 2, mb: 3, fontSize: 18 }}
              >
                Paste a URL and a user story. TestGenie extracts data, generates
                Cypress, runs it in CI, and tracks results across your projects.
              </Typography>

              <Stack direction='row' spacing={1.5}>
                <Button
                  component={Link}
                  href='/projects'
                  size='large'
                  variant='contained'
                  disableElevation
                  startIcon={<RocketLaunchIcon />}
                  sx={{
                    borderRadius: 2,
                    fontWeight: 900,
                    textTransform: 'none',
                  }}
                >
                  Get started free
                </Button>
                <Button
                  component={Link}
                  href='/dashboard'
                  size='large'
                  variant='outlined'
                  startIcon={<PlayCircleIcon />}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 800,
                  }}
                >
                  View dashboard
                </Button>
              </Stack>

              <Stack
                direction='row'
                spacing={2}
                sx={{ mt: 3 }}
                alignItems='center'
              >
                <Stack direction='row' spacing={1} alignItems='center'>
                  <VerifiedIcon fontSize='small' color='success' />
                  <Typography variant='caption'>
                    OpenRouter + Neon + GitHub Actions
                  </Typography>
                </Stack>
                <Stack direction='row' spacing={1} alignItems='center'>
                  <CloudDoneIcon fontSize='small' color='primary' />
                  <Typography variant='caption'>Serverless friendly</Typography>
                </Stack>
              </Stack>
            </Grid>

            <Grid item xs={12} md={6}>
              <HeroGraphic />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* FEATURES */}
      <Container maxWidth='lg' sx={{ py: 6 }}>
        <Typography variant='h5' sx={{ fontWeight: 900, mb: 2 }}>
          Why teams love TestGenie
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Feature
              icon={<BoltIcon color='primary' />}
              title='Blazing speed'
              desc='Go from user story to runnable Cypress spec in a single flow.'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Feature
              icon={<ScienceIcon color='primary' />}
              title='Smart extraction'
              desc='We infer required fields and selectors, then auto-wire test data.'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Feature
              icon={<TimelineIcon color='primary' />}
              title='Live reporting'
              desc='Super View reports and a global dashboard keep quality visible.'
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Feature
              icon={<ShieldIcon color='primary' />}
              title='Safe by default'
              desc='No risky commands. Runs isolated in CI with secure callbacks.'
            />
          </Grid>
        </Grid>
      </Container>

      {/* HOW IT WORKS */}
      <Box
        sx={{
          py: 6,
          background: (t) =>
            t.palette.mode === 'dark'
              ? 'rgba(255,255,255,.02)'
              : 'rgba(0,0,0,.02)',
        }}
      >
        <Container maxWidth='lg'>
          <Typography variant='h5' sx={{ fontWeight: 900, mb: 2 }}>
            How it works
          </Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Step
                n={1}
                title='Describe the scenario'
                desc='Add a user story and URL. We’ll scrape the page to understand the DOM.'
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Step
                n={2}
                title='Generate Cypress'
                desc='We produce clean, maintainable tests following best practices.'
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Step
                n={3}
                title='Run & report'
                desc='Kick off a run in CI and see pass/fail, logs and trends in your project.'
              />
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* STATS STRIP */}
      <Container maxWidth='lg' sx={{ py: 6 }}>
        <Paper
          variant='outlined'
          sx={{
            p: 3,
            borderRadius: 3,
            background:
              'linear-gradient(180deg, rgba(37,99,235,.05), transparent 70%)',
          }}
        >
          <Grid container spacing={2}>
            {[
              { label: 'Projects', value: '12' },
              { label: 'Stories tested', value: '248' },
              { label: 'Pass rate (7d)', value: '96.8%' },
              { label: 'Avg. time saved / story', value: '25 min' },
            ].map((k) => (
              <Grid key={k.label} item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                    {k.label}
                  </Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 24 }}>
                    {k.value}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>

      {/* TESTIMONIALS */}
      <Container maxWidth='lg' sx={{ pb: 6 }}>
        <Typography variant='h5' sx={{ fontWeight: 900, mb: 2 }}>
          Loved by builders
        </Typography>
        <Grid container spacing={2}>
          {[
            {
              quote:
                'We turned acceptance criteria into passing tests the same day. Massive win.',
              name: 'Ava, Product Lead',
            },
            {
              quote: 'Selectors were spot on. No more brittle tests.',
              name: 'Sam, QA Engineer',
            },
            {
              quote:
                'The Super View report gave us instant visibility across squads.',
              name: 'Ibrahim, Engineering Manager',
            },
          ].map((t, i) => (
            <Grid key={i} item xs={12} md={4}>
              <Paper
                variant='outlined'
                sx={{ p: 2, borderRadius: 2, height: '100%' }}
              >
                <Typography sx={{ fontStyle: 'italic' }}>
                  "{t.quote}"
                </Typography>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant='body2' sx={{ color: 'text.secondary' }}>
                  {t.name}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA */}
      <Box
        sx={{
          py: 8,
          background:
            'linear-gradient(135deg, rgba(109,40,217,.08), rgba(37,99,235,.08))',
        }}
      >
        <Container maxWidth='lg'>
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 4 },
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              display: 'grid',
              gap: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant='h4' sx={{ fontWeight: 900 }}>
              Ready to make flaky tests a thing of the past?
            </Typography>
            <Typography sx={{ color: 'text.secondary', mb: 2 }}>
              Start free. Connect your repo later—no credit card required.
            </Typography>
            <Stack direction='row' spacing={1.5} justifyContent='center'>
              <Button
                component={Link}
                href='/projects'
                variant='contained'
                disableElevation
                startIcon={<RocketLaunchIcon />}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 900 }}
              >
                Create your first project
              </Button>
              <Button
                component={Link}
                href='/dashboard'
                variant='outlined'
                startIcon={<ScienceIcon />}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 800 }}
              >
                Explore the dashboard
              </Button>
            </Stack>
          </Paper>
        </Container>
      </Box>

      {/* FOOTER */}
      <Container maxWidth='lg' sx={{ py: 4 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems='center'
          justifyContent='space-between'
        >
          <Typography variant='body2' sx={{ color: 'text.secondary' }}>
            © {new Date().getFullYear()} TestGenie. All rights reserved.
          </Typography>
          <Stack direction='row' spacing={2}>
            <Button component={Link} href='/privacy' size='small'>
              Privacy
            </Button>
            <Button component={Link} href='/terms' size='small'>
              Terms
            </Button>
            <Button component={Link} href='/contact' size='small'>
              Contact
            </Button>
          </Stack>
        </Stack>
      </Container>
    </>
  );
}
