import nodemailer, { Transporter } from "nodemailer";

export interface MailMessageResult {
    email: string;
    isSuccessful: boolean;
    error?: string;
}

export class MailClient {
    private transporter: Transporter;

    constructor(userMail: string, userPassword: string) {
        this.transporter = nodemailer.createTransport({
            host: "smtp.mail.ru",
            port: 465,
            secure: true,
            auth: {
                user: userMail,
                pass: userPassword,
            },
        });
    }

    async sendMessage(
        to: string,
        subject: string,
        html: string
    ): Promise<MailMessageResult> {
        try {
            const message = await this.transporter.sendMail({
                from: this.transporter.options.auth?.user,
                to,
                subject,
                html,
            });

            return {
                email: to,
                isSuccessful: true,
            };
        } catch (error: any) {
            console.error(`❌ Ошибка отправки email:`, error);
            return {
                email: to,
                isSuccessful: false,
                error: error.message,
            };
        }
    }
}
