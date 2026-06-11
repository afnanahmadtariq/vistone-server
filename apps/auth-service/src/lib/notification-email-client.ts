import axios from 'axios';

const INTERNAL_SERVICE_KEY_HEADER = 'x-internal-service-key';
const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3008';

export async function postNotificationEmail(body: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const internalKey = process.env.INTERNAL_SERVICE_KEY?.trim();
  if (internalKey) {
    headers[INTERNAL_SERVICE_KEY_HEADER] = internalKey;
  }

  try {
    await axios.post(
      `${NOTIFICATION_SERVICE_URL.replace(/\/$/, '')}/emails/send`,
      body,
      { headers },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const data = error.response?.data as { error?: string } | undefined;
      const status = error.response?.status;
      if (status === 401 && !internalKey) {
        throw new Error(
          'Email service rejected the request. Set INTERNAL_SERVICE_KEY in vistone-server/.env and restart auth-service and notification.',
        );
      }
      throw new Error(data?.error || error.message || 'Failed to send email');
    }
    throw error;
  }
}
