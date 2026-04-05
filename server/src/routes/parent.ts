import { Router, Response } from 'express'
import { PrismaClient, Subject, Prisma } from '@prisma/client'
import Anthropic from '@anthropic-ai/sdk'
import { authMiddleware, requireParent, AuthRequest } from '../middleware/authMiddleware'

const prisma = new PrismaClient()

// ── Helpers ───────────────────────────────────────────────────────────────────

function apiError(status: number, message: string): never {
  const err = new Error(message) as Error & { status: number }
  err.status = status
  throw err
}

async function assertChildAccess(parentId: string, childId: string) {
  const child = await prisma.child.findUnique({ where: { id: childId } })
  if (!child) apiError(404, 'Ребёнок не найден')
  if (child!.parent_id !== parentId) apiError(403, 'Нет доступа')
  return child!
}

function handleError(res: Response, e: unknown) {
  const err = e as { status?: number; message?: string }
  res.status(err.status ?? 500).json({ error: err.message ?? 'Ошибка сервера' })
}

// ─────────────────────────────────────────────────────────────────────────────
// PARENT ROUTER  (mounted at /api/parent)
// ─────────────────────────────────────────────────────────────────────────────

export const parentRouter = Router()

// GET /api/parent/children/:id/sessions — последние 20 сессий
parentRouter.get(
  '/children/:id/sessions',
  authMiddleware, requireParent,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await assertChildAccess(req.user!.id, req.params['id'] as string)
      const sessions = await prisma.session.findMany({
        where: { child_id: req.params['id'] as string },
        include: { topic: { select: { title: true } } },
        orderBy: { started_at: 'desc' },
        take: 20,
      })
      res.json(sessions.map((s) => ({
        id:           s.id,
        subject:      s.subject,
        topic:        s.topic?.title ?? null,
        started_at:   s.started_at,
        ended_at:     s.ended_at,
        xp_earned:    s.xp_earned,
        coins_earned: s.coins_earned,
        completed:    s.completed,
      })))
    } catch (e) { handleError(res, e) }
  },
)

// GET /api/parent/children/:id/sessions/:session_id/messages
parentRouter.get(
  '/children/:id/sessions/:session_id/messages',
  authMiddleware, requireParent,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await assertChildAccess(req.user!.id, req.params['id'] as string)
      const session = await prisma.session.findUnique({
        where: { id: req.params['session_id'] as string },
        include: {
          messages: { orderBy: { created_at: 'asc' } },
          topic:    { select: { title: true } },
        },
      })
      if (!session || session.child_id !== req.params['id']) apiError(404, 'Сессия не найдена')
      res.json({
        session: {
          id:         session!.id,
          subject:    session!.subject,
          topic:      session!.topic?.title ?? null,
          task_text:  session!.task_text,
          started_at: session!.started_at,
          ended_at:   session!.ended_at,
          completed:  session!.completed,
          xp_earned:  session!.xp_earned,
        },
        messages: session!.messages,
      })
    } catch (e) { handleError(res, e) }
  },
)

// GET /api/parent/children/:id/progress
parentRouter.get(
  '/children/:id/progress',
  authMiddleware, requireParent,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const child = await assertChildAccess(req.user!.id, req.params['id'] as string)
      const subjectProgress = await prisma.subjectProgress.findMany({
        where: { child_id: child.id },
        include: {
          topic_progress: {
            include: { topic: { select: { id: true, title: true } } },
            orderBy:  { mastery_level: 'desc' },
          },
        },
      })

      const result: Record<string, unknown> = {
        math:    { overall: 0, sessions_count: 0, topics: [] },
        russian: { overall: 0, sessions_count: 0, topics: [] },
        english: { overall: 0, sessions_count: 0, topics: [] },
      }

      for (const sp of subjectProgress) {
        result[sp.subject] = {
          overall:        sp.mastery_level,
          sessions_count: sp.sessions_count,
          topics: sp.topic_progress.map((tp) => ({
            id:             tp.topic.id,
            title:          tp.topic.title,
            mastery_level:  tp.mastery_level,
            sessions_count: tp.sessions_count,
          })),
        }
      }

      const totalSessions = await prisma.session.count({
        where: { child_id: child.id, completed: true },
      })

      res.json({ ...result, total_sessions: totalSessions, total_xp: child.xp })
    } catch (e) { handleError(res, e) }
  },
)

// GET /api/parent/children/:id/weak-spots
parentRouter.get(
  '/children/:id/weak-spots',
  authMiddleware, requireParent,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await assertChildAccess(req.user!.id, req.params['id'] as string)
      const weakTopics = await prisma.topicProgress.findMany({
        where: {
          mastery_level:  { lt: 30 },
          sessions_count: { gte: 2 },
          subject_progress: { child_id: req.params['id'] as string },
        },
        include: {
          topic:            { select: { id: true, title: true } },
          subject_progress: { select: { subject: true } },
        },
        orderBy: { mastery_level: 'asc' },
      })
      res.json(weakTopics.map((tp) => ({
        topic_id:       tp.topic.id,
        title:          tp.topic.title,
        subject:        tp.subject_progress.subject,
        mastery_level:  tp.mastery_level,
        sessions_count: tp.sessions_count,
      })))
    } catch (e) { handleError(res, e) }
  },
)

// ─────────────────────────────────────────────────────────────────────────────
// CURRICULA ROUTER  (mounted at /api/curricula)
// ─────────────────────────────────────────────────────────────────────────────

export const curriculaRouter = Router()

// POST /api/curricula
curriculaRouter.post(
  '/',
  authMiddleware, requireParent,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { name, grade, subject, text_content } = req.body as {
      name: string; grade?: number; subject: string; text_content: string
    }

    if (!name?.trim() || !subject || !text_content?.trim()) {
      res.status(400).json({ error: 'Заполните все поля' })
      return
    }

    const subjectLabels: Record<string, string> = {
      math: 'математике', russian: 'русскому языку', english: 'английскому языку',
    }

    try {
      const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: `Ты анализируешь учебную программу для ${grade ?? 3} класса по ${subjectLabels[subject] ?? subject}.
Извлеки список тем в JSON массив:
[{"id":"уникальный_slug","title":"название темы","description":"краткое описание","order":1,"enabled":true}]
Верни ТОЛЬКО JSON массив, без пояснений и markdown-блоков.
Программа: ${text_content}`,
        }],
      })

      const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
      const match = raw.match(/\[[\s\S]*\]/)
      if (!match) { res.status(422).json({ error: 'Не удалось извлечь темы из программы' }); return }

      const topics = JSON.parse(match[0]) as Prisma.InputJsonValue
      const curriculum = await prisma.curriculum.create({
        data: {
          parent_id: req.user!.id,
          name:      name.trim(),
          grade:     grade ?? 3,
          subject:   subject as Subject,
          is_system: false,
          topics,
        },
      })

      res.status(201).json(curriculum)
    } catch (e) { handleError(res, e) }
  },
)

// GET /api/curricula
curriculaRouter.get(
  '/',
  authMiddleware, requireParent,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const curricula = await prisma.curriculum.findMany({
        where: {
          OR: [{ parent_id: req.user!.id }, { is_system: true }],
        },
        orderBy: [{ is_system: 'desc' }, { created_at: 'desc' }],
      })
      res.json(curricula)
    } catch (e) { handleError(res, e) }
  },
)

// PUT /api/curricula/:id/topics/:topic_id
curriculaRouter.put(
  '/:id/topics/:topic_id',
  authMiddleware, requireParent,
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { id, topic_id } = req.params as { id: string; topic_id: string }
    const { enabled } = req.body as { enabled: boolean }

    try {
      const curriculum = await prisma.curriculum.findUnique({ where: { id } })
      if (!curriculum || curriculum.parent_id !== req.user!.id) {
        res.status(404).json({ error: 'Программа не найдена' })
        return
      }

      const topics = (curriculum.topics as Array<{ id: string; enabled?: boolean; [k: string]: unknown }>)
        .map((t) => (t.id === topic_id ? { ...t, enabled } : t)) as Prisma.InputJsonValue

      await prisma.curriculum.update({ where: { id }, data: { topics } })
      res.json({ ok: true })
    } catch (e) { handleError(res, e) }
  },
)
