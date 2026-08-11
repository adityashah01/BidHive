import { db } from '../db/index.ts';
import { emailOutbox } from '../db/schema.ts';
import { eq, and, or, lt, lte, sql } from 'drizzle-orm';
import { sendTransactionalEmail } from './emailService.ts';

let isWorkerRunning = false;

export async function processEmailOutbox(): Promise<{ processed: number; succeeded: number; failed: number }> {
  if (isWorkerRunning) {
    return { processed: 0, succeeded: 0, failed: 0 };
  }

  isWorkerRunning = true;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    const now = new Date();

    // Find pending items or failed items eligible for retry
    const eligibleItems = await db
      .select()
      .from(emailOutbox)
      .where(
        and(
          lte(emailOutbox.nextAttemptAt, now),
          lt(emailOutbox.attempts, 3),
          or(
            eq(emailOutbox.status, 'PENDING'),
            eq(emailOutbox.status, 'FAILED')
          )
        )
      )
      .limit(10);

    if (eligibleItems.length === 0) {
      isWorkerRunning = false;
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    for (const item of eligibleItems) {
      // Claim item atomically by updating status to PROCESSING
      const claimed = await db
        .update(emailOutbox)
        .set({ status: 'PROCESSING' })
        .where(
          and(
            eq(emailOutbox.id, item.id),
            or(
              eq(emailOutbox.status, 'PENDING'),
              eq(emailOutbox.status, 'FAILED')
            )
          )
        )
        .returning();

      if (claimed.length === 0) {
        // Already claimed by another worker
        continue;
      }

      processed++;

      const sendResult = await sendTransactionalEmail({
        to: item.recipientEmail,
        subject: item.subject,
        htmlContent: item.htmlContent,
        textContent: item.textContent,
        emailType: item.emailType,
      });

      if (sendResult.success) {
        succeeded++;
        await db
          .update(emailOutbox)
          .set({
            status: 'SENT',
            sentAt: new Date(),
            providerMessageId: sendResult.providerMessageId || null,
            lastError: null,
          })
          .where(eq(emailOutbox.id, item.id));
      } else {
        failed++;
        const nextAttempts = item.attempts + 1;
        const delayMinutes = nextAttempts === 1 ? 1 : nextAttempts === 2 ? 5 : 15;
        const nextAttemptAt = new Date(Date.now() + delayMinutes * 60 * 1000);
        const finalStatus = nextAttempts >= 3 ? 'FAILED' : 'PENDING';

        await db
          .update(emailOutbox)
          .set({
            attempts: nextAttempts,
            status: finalStatus,
            lastError: sendResult.error || 'Unknown error during email delivery',
            nextAttemptAt,
          })
          .where(eq(emailOutbox.id, item.id));
      }
    }
  } catch (err: any) {
    console.error('[EMAIL WORKER EXCEPTION]', err.message);
  } finally {
    isWorkerRunning = false;
  }

  return { processed, succeeded, failed };
}
