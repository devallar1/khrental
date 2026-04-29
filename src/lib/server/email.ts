// Email sender abstraction.
//
// Better-Auth's magicLink plugin calls EmailSender.send() with the
// sign-in URL. Today we only ship ConsoleEmailSender (logs to stdout).
// Real SMTP / SES / Postmark / Resend integration is a follow-up.

export interface EmailSender {
    send(to: string, subject: string, body: string): Promise<EmailSendResult>;
}

export interface EmailSendResult {
    ok: boolean;
    providerId?: string;
    error?: string;
}

class ConsoleEmailSender implements EmailSender {
    async send(to: string, subject: string, body: string): Promise<EmailSendResult> {
        const banner = '─'.repeat(60);
        console.log(`\n${banner}\n[Email dev stub] -> ${to}\nSubject: ${subject}\n\n${body}\n${banner}\n`);
        return { ok: true, providerId: 'console' };
    }
}

let cached: EmailSender | null = null;

export const pickEmailSender = (): EmailSender => {
    if (cached) return cached;

    const provider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase();
    switch (provider) {
        case 'console':
            cached = new ConsoleEmailSender();
            break;
        // Add future providers here (smtp, ses, postmark, resend, ...).
        default:
            console.warn(`[email] unknown EMAIL_PROVIDER='${provider}', falling back to console.`);
            cached = new ConsoleEmailSender();
    }

    return cached;
};
