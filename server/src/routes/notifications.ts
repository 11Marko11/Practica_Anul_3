import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { requireUser } from '../auth/guards.js'
import { prisma } from '../db.js'

// The signed-in user's notification box.
export async function notificationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', requireUser)

  app.get('/notifications', async request => {
    const userId = request.user!.id
    const [items, unread] = await Promise.all([
      prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ])
    return {
      unread,
      notifications: items.map(n => ({ id: n.id, type: n.type, data: n.data, link: n.link, read: !!n.readAt, createdAt: n.createdAt.toISOString() })),
    }
  })

  // For the bell in the menu.
  app.get('/notifications/unread', async request => ({ unread: await prisma.notification.count({ where: { userId: request.user!.id, readAt: null } }) }))

  // Mark some (ids) or all notifications as read.
  app.post('/notifications/read', async request => {
    const { ids } = z.object({ ids: z.array(z.uuid()).max(100).optional() }).parse(request.body ?? {})
    await prisma.notification.updateMany({ where: { userId: request.user!.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) }, data: { readAt: new Date() } })
    return { ok: true }
  })
}
