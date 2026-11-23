import { Client, Receiver } from "@upstash/qstash";

const qstashToken = process.env.QSTASH_TOKEN;

export const qstash = qstashToken
  ? new Client({
      token: qstashToken,
      baseUrl: process.env.QSTASH_URL,
    })
  : null;

export const qstashReceiver =
  process.env.QSTASH_CURRENT_SIGNING_KEY && process.env.QSTASH_NEXT_SIGNING_KEY
    ? new Receiver({
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY,
      })
    : null;

export async function scheduleDunningMessageWithQStash(params: {
  eventId: string;
  stage: 2 | 3;
  scheduledFor: Date;
  dunningMessageId?: string;
}) {
  if (!qstash) {
    console.log(
      `[QStash Queue] QSTASH_TOKEN not set. Message scheduled in DB table (will be swept by Cron).`
    );
    return { queued: false, reason: "no_token" };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://dunnify.com";
  const destinationUrl = `${appUrl}/api/scheduler/dunning`;
  const delaySeconds = Math.max(
    0,
    Math.floor((params.scheduledFor.getTime() - Date.now()) / 1000)
  );

  try {
    const res = await qstash.publishJSON({
      url: destinationUrl,
      body: {
        eventId: params.eventId,
        stage: params.stage,
        dunningMessageId: params.dunningMessageId,
      },
      delay: delaySeconds,
      headers: {
        "Upstash-Retries": "3",
      },
    });

    console.log(
      `[QStash Queue] Successfully queued Stage ${params.stage} for event ${params.eventId} (delay: ${delaySeconds}s, id: ${res.messageId})`
    );
    return { queued: true, messageId: res.messageId };
  } catch (err: any) {
    console.error(`[QStash Queue Error] Failed to publish message:`, err);
    return { queued: false, error: err.message };
  }
}
