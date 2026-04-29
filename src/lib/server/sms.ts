// SMS sender abstraction.
//
// Better-Auth's phoneNumber plugin calls SmsSender.send() with the OTP
// message. Today we only ship ConsoleSmsSender (logs to stdout in dev).
// Adding NotifyLkSender / TwilioSender / etc. is a new file implementing
// the same interface and a switch in pickSmsSender().

export interface SmsSender {
    send(toE164: string, message: string): Promise<SmsSendResult>;
}

export interface SmsSendResult {
    ok: boolean;
    providerId?: string;
    error?: string;
}

class ConsoleSmsSender implements SmsSender {
    async send(toE164: string, message: string): Promise<SmsSendResult> {
        const banner = '─'.repeat(60);
        console.log(`\n${banner}\n[SMS dev stub] -> ${toE164}\n${message}\n${banner}\n`);
        return { ok: true, providerId: 'console' };
    }
}

let cached: SmsSender | null = null;

export const pickSmsSender = (): SmsSender => {
    if (cached) return cached;

    const provider = (process.env.SMS_PROVIDER || 'console').toLowerCase();
    switch (provider) {
        case 'console':
            cached = new ConsoleSmsSender();
            break;
        // Add future providers here:
        // case 'notifylk': cached = new NotifyLkSender(...); break;
        default:
            console.warn(`[sms] unknown SMS_PROVIDER='${provider}', falling back to console.`);
            cached = new ConsoleSmsSender();
    }

    return cached;
};

// Sri Lanka E.164 normaliser. Accepts:
//   0771234567, 771234567, +94771234567, 94771234567
// Returns +94771234567. SMS_DEFAULT_COUNTRY can override (LK by default).
export const normalisePhone = (raw: string): string => {
    const stripped = raw.replace(/[\s\-()]/g, '');
    if (stripped.startsWith('+')) return stripped;

    const country = (process.env.SMS_DEFAULT_COUNTRY || 'LK').toUpperCase();
    const cc = country === 'LK' ? '94' : country === 'KH' ? '855' : '94';

    if (stripped.startsWith('00')) return `+${stripped.slice(2)}`;
    if (stripped.startsWith(cc)) return `+${stripped}`;
    if (stripped.startsWith('0')) return `+${cc}${stripped.slice(1)}`;
    return `+${cc}${stripped}`;
};
