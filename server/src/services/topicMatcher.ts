import { PrismaClient, Subject } from '@prisma/client'

const prisma = new PrismaClient()

const SUBJECT_MAP: Record<string, Subject> = {
  math:    Subject.math,
  russian: Subject.russian,
  english: Subject.english,
}

export async function findTopic(subject: string, taskText: string) {
  const subjectEnum = SUBJECT_MAP[subject]
  if (!subjectEnum) return null

  const topics = await prisma.topic.findMany({
    where: { subject: subjectEnum, grade: 3 },
    orderBy: { order: 'asc' },
  })

  if (topics.length === 0) return null

  const haystack = taskText.toLowerCase()
  let bestTopic = topics[0]
  let bestScore = -1

  for (const topic of topics) {
    let score = 0
    for (const kw of topic.keywords) {
      if (haystack.includes(kw.toLowerCase())) score++
    }
    // также проверяем совпадение с названием темы
    if (haystack.includes(topic.title.toLowerCase())) score += 2
    if (score > bestScore) {
      bestScore = score
      bestTopic = topic
    }
  }

  return bestTopic
}
