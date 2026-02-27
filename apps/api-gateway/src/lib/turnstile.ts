
export async function verifyTurnstileToken(token: string, ip?: string): Promise<boolean> {
    const secretKey = process.env.TURNSTILE_SECRET_KEY;

    // If no secret key is configured, log warning and fail open (allow request)
    // This prevents blocking legitimate users if env var is missing in dev
    if (!secretKey) {
        console.warn('TURNSTILE_SECRET_KEY is not defined. CAPTCHA verification skipped.');
        return true;
    }

    if (!token) {
        return false;
    }

    try {
        const formData = new URLSearchParams();
        formData.append('secret', secretKey);
        formData.append('response', token);
        if (ip) {
            formData.append('remoteip', ip);
        }

        const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            body: formData,
        });

        const data = await response.json() as { success: boolean; 'error-codes'?: string[] };

        if (!data.success) {
            console.warn('Turnstile verification failed:', data['error-codes']);
        }

        return data.success;
    } catch (error) {
        console.error('Error verifying Turnstile token:', error);
        return false;
    }
}
