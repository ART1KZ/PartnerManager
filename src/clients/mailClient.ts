import nodemailer, { Transporter } from "nodemailer";

export class MailClient {
    private transporter: Transporter;

    constructor(userMail: string, userPassword: string) {
        this.transporter = nodemailer.createTransport({
            host: "smtp.mail.ru",
            port: 465,
            secure: true,
            auth: {
                user: userMail,
                pass: userPassword
            },
        });
    }

    async send(to: string, subject: string, html: string) {
        try {
            await this.transporter.sendMail({
                from: this.transporter.options.auth?.user,
                to,
                subject,
                html,
            });
            return true;
        } catch (error) {
            console.error(`❌ Ошибка отправки email:`, error);
            return false;
        }
    }
}
