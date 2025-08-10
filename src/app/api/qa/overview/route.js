// app/api/qa/overview/route.js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  const errors = [];
  try {
    // Totals
    const [totalProjects, totalStories, totalGenerations, totalRuns] =
      await Promise.all([
        prisma.project.count().catch(() => {
          errors.push('project.count');
          return 0;
        }),
        prisma.userStory.count().catch(() => {
          errors.push('story.count');
          return 0;
        }),
        prisma.testGeneration.count().catch(() => {
          errors.push('gen.count');
          return 0;
        }),
        prisma.testRun.count().catch(() => {
          errors.push('run.count');
          return 0;
        }),
      ]);

    // Coverage: count distinct storyId via groupBy (more stable than distinct in some envs)
    const coveredRows = await prisma.testGeneration
      .groupBy({
        by: ['storyId'],
        _count: { _all: true },
      })
      .catch(() => {
        errors.push('gen.groupBy');
        return [];
      });

    const coveredStories = coveredRows.length;
    const coveragePct = totalStories
      ? Math.round((coveredStories / totalStories) * 100)
      : 0;

    // Recent runs
    const recentRunsRaw = await prisma.testRun
      .findMany({
        orderBy: { startedAt: 'desc' },
        take: 30,
        select: {
          id: true,
          passed: true,
          status: true,
          startedAt: true,
          finishedAt: true,
          generation: {
            select: {
              id: true,
              story: {
                select: {
                  id: true,
                  title: true,
                  project: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      })
      .catch(() => {
        errors.push('run.findMany.recent');
        return [];
      });

    const recentRuns = recentRunsRaw
      .filter((r) => r?.generation?.story) // guard nulls
      .map((r) => ({
        id: r.id,
        passed: !!r.passed,
        status: r.status,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        storyId: r.generation.story.id,
        storyTitle: r.generation.story.title,
        projectId: r.generation.story.project.id,
        projectName: r.generation.story.project.name,
        generationId: r.generation.id,
      }));

    const passCount = recentRuns.filter((r) => r.passed).length;
    const failCount = recentRuns.filter((r) => !r.passed).length;
    const passRate =
      passCount + failCount
        ? Math.round((passCount / (passCount + failCount)) * 100)
        : 0;

    // Flakiness last 7d
    const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const lastWeek = await prisma.testRun
      .findMany({
        where: { startedAt: { gte: since } },
        select: { generationId: true, passed: true },
      })
      .catch(() => {
        errors.push('run.findMany.week');
        return [];
      });

    const byGen = new Map();
    lastWeek.forEach((r) => {
      if (!byGen.has(r.generationId)) byGen.set(r.generationId, { p: 0, f: 0 });
      const g = byGen.get(r.generationId);
      if (r.passed) g.p++;
      else g.f++;
    });
    const flakyCount = Array.from(byGen.values()).filter(
      (v) => v.p > 0 && v.f > 0
    ).length;

    // Projects (+ mini metrics)
    const projects = await prisma.project
      .findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          testStatus: true,
          createdAt: true,
        },
      })
      .catch(() => {
        errors.push('project.findMany');
        return [];
      });

    const projectsEnriched = await Promise.all(
      projects.map(async (p) => {
        try {
          const storyTotal = await prisma.userStory.count({
            where: { projectId: p.id },
          });
          const withRows = await prisma.testGeneration.groupBy({
            by: ['storyId'],
            where: { story: { projectId: p.id } },
            _count: { _all: true },
          });
          const withTests = withRows.length;
          const covPct = storyTotal
            ? Math.round((withTests / storyTotal) * 100)
            : 0;

          const recentProjectRuns = await prisma.testRun.findMany({
            where: { generation: { story: { projectId: p.id } } },
            orderBy: { startedAt: 'desc' },
            take: 6,
            select: { id: true, passed: true },
          });

          const failingStories = await prisma.userStory.count({
            where: {
              projectId: p.id,
              generations: { some: { runs: { some: { passed: false } } } },
            },
          });

          return {
            id: p.id,
            name: p.name,
            description: p.description,
            testStatus: p.testStatus,
            createdAt: p.createdAt,
            stories: { total: storyTotal, withTests, coveragePct: covPct },
            recentRuns: recentProjectRuns.map((r) => !!r.passed),
            failingStories,
          };
        } catch (e) {
          errors.push(`project.metrics.${p.id}`);
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            testStatus: p.testStatus,
            createdAt: p.createdAt,
            stories: { total: 0, withTests: 0, coveragePct: 0 },
            recentRuns: [],
            failingStories: 0,
          };
        }
      })
    );

    // Top failing stories (7d)
    const recentFails = await prisma.testRun
      .findMany({
        where: { passed: false, startedAt: { gte: since } },
        orderBy: { startedAt: 'desc' },
        take: 200,
        select: {
          generation: {
            select: {
              story: {
                select: {
                  id: true,
                  title: true,
                  project: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
      })
      .catch(() => {
        errors.push('run.findMany.fail');
        return [];
      });

    const failAgg = new Map();
    recentFails.forEach((r) => {
      const st = r?.generation?.story;
      if (!st) return;
      const key = st.id;
      if (!failAgg.has(key))
        failAgg.set(key, {
          storyId: st.id,
          title: st.title,
          projectId: st.project.id,
          projectName: st.project.name,
          fails: 0,
        });
      failAgg.get(key).fails++;
    });
    const topFailingStories = Array.from(failAgg.values())
      .sort((a, b) => b.fails - a.fails)
      .slice(0, 8);

    return NextResponse.json({
      summary: {
        totalProjects,
        totalStories,
        totalGenerations,
        totalRuns,
        coveragePct,
        passRate,
        flakyCount,
        passCount,
        failCount,
      },
      projects: projectsEnriched,
      recentRuns,
      topFailingStories,
      generatedAt: new Date().toISOString(),
      warnings: errors, // helps you debug in dev; remove later if you want
    });
  } catch (e) {
    console.error('overview fatal', e);
    // Still return a shape so the UI doesn’t crash
    return NextResponse.json(
      {
        summary: {
          totalProjects: 0,
          totalStories: 0,
          totalGenerations: 0,
          totalRuns: 0,
          coveragePct: 0,
          passRate: 0,
          flakyCount: 0,
          passCount: 0,
          failCount: 0,
        },
        projects: [],
        recentRuns: [],
        topFailingStories: [],
        generatedAt: new Date().toISOString(),
        error: 'Failed to load overview',
      },
      { status: 200 }
    );
  }
}
