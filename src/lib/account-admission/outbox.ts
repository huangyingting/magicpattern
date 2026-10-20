import { prisma } from '@/lib/prisma';

export async function processEmailOutbox(limit = 10): Promise<number> {
  const now = new Date();
  const pending = await prisma.accountEmailOutbox.findMany({
    where: {
      status: 'pending',
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let processed = 0;
  for (const item of pending) {
    try {
      const webhookUrl = process.env.SMTP_WEBHOOK_URL;
      if (webhookUrl) {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: item.payload,
        });
        if (!res.ok) {
          throw new Error(`Webhook HTTP ${res.status}`);
        }
      }

      await prisma.accountEmailOutbox.update({
        where: { id: item.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          lastAttemptAt: new Date(),
          lastError: null,
        },
      });
      processed += 1;
    } catch (err) {
      await prisma.accountEmailOutbox.update({
        where: { id: item.id },
        data: {
          lastAttemptAt: new Date(),
          lastError: err instanceof Error ? err.message : 'Delivery error',
        },
      });
    }
  }

  return processed;
}
