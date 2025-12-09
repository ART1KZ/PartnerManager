import easyvk from "easyvk";
import type { DgisFirmData } from "../types.js";

export interface VKMessageResult {
    firmName: string;
    vkLink: string;
    status: "success" | "error" | "skipped";
    error?: string;
    messageId?: number;
}

export class VKClient {
    private vk: any;
    private initialized = false;

    // Настройки антиспама
    private readonly DELAY_BETWEEN_MESSAGES = 3000; 
    private readonly MAX_RETRIES = 3;

    constructor() {}

    /**
     * Инициализация VK клиента
     */
    async init(username: string, password: string, appId?: number) {
        if (this.initialized) return;

        try {
            this.vk = await easyvk({
                username: username,
                password: password,
                reauth: true,
                ...(appId && { appId }) // Опционально: ID вашего VK приложения
            });

            this.initialized = true;
            console.log("✓ VK клиент успешно инициализирован");
        } catch (error: any) {
            throw new Error(`Ошибка инициализации VK: ${error.message}`);
        }
    }

    /**
     * Проверка инициализации
     */
    private ensureInitialized() {
        if (!this.initialized) {
            throw new Error("VK клиент не инициализирован. Вызовите init() сначала.");
        }
    }

    /**
     * Извлечь screen_name из VK ссылки
     * https://vk.com/maslenica.perm -> maslenica.perm
     * https://vk.com/club123456 -> club123456
     */
    private extractScreenName(vkLink: string): string {
        return vkLink
            .replace(/https?:\/\/(www\.)?vk\.com\//i, "")
            .replace(/\?.*$/, "") // Убирает query параметры
            .trim();
    }

    /**
     * Получить peer_id для отправки сообщения
     * Поддерживает как группы (club/public), так и пользователей
     */
    private async getPeerId(screenName: string): Promise<number> {
        try {
            // Если это численный ID группы (club123456)
            if (/^club\d+$/.test(screenName)) {
                const groupId = parseInt(screenName.replace("club", ""));
                return -groupId; // Для групп отрицательный ID
            }

            // Если это численный ID паблика (public123456)
            if (/^public\d+$/.test(screenName)) {
                const groupId = parseInt(screenName.replace("public", ""));
                return -groupId;
            }

            // Если это screen_name, резолвим через API
            const resolved = await this.vk.call("utils.resolveScreenName", {
                screen_name: screenName
            });

            if (!resolved || !resolved.object_id) {
                throw new Error(`Не удалось найти объект с screen_name: ${screenName}`);
            }

            // type: "group" или "user"
            if (resolved.type === "group") {
                return -resolved.object_id; // Для групп отрицательный
            } else if (resolved.type === "user") {
                return resolved.object_id;
            }

            throw new Error(`Неизвестный тип объекта: ${resolved.type}`);
        } catch (error: any) {
            throw new Error(`Ошибка получения peer_id для ${screenName}: ${error.message}`);
        }
    }

    /**
     * Отправить сообщение одному партнёру
     */
    async sendMessage(
        vkLink: string,
        message: string,
        attachments?: string[]
    ): Promise<VKMessageResult> {
        this.ensureInitialized();

        const screenName = this.extractScreenName(vkLink);

        try {
            const peerId = await this.getPeerId(screenName);

            const params: any = {
                peer_id: peerId,
                message: message,
                random_id: easyvk.randomId()
            };

            // Добавляем вложения если есть (например, фото)
            if (attachments && attachments.length > 0) {
                params.attachment = attachments.join(",");
            }

            const response = await this.vk.call("messages.send", params);

            return {
                firmName: screenName,
                vkLink: vkLink,
                status: "success",
                messageId: response
            };
        } catch (error: any) {
            return {
                firmName: screenName,
                vkLink: vkLink,
                status: "error",
                error: error.message
            };
        }
    }

    /**
     * Массовая отправка сообщений партнёрам с задержками
     */
    async sendBulkMessages(
        firms: DgisFirmData[],
        messageTemplate: (firm: DgisFirmData) => string
    ): Promise<VKMessageResult[]> {
        this.ensureInitialized();

        const results: VKMessageResult[] = [];
        const firmsWithVk = firms.filter((f) => f.vkLink);

        console.log(`📨 Начинаем отправку ${firmsWithVk.length} сообщений...`);

        for (let i = 0; i < firmsWithVk.length; i++) {
            const firm = firmsWithVk[i];
            const message = messageTemplate(firm);

            console.log(`[${i + 1}/${firmsWithVk.length}] Отправка: ${firm.name}`);

            const result = await this.sendMessageWithRetry(
                firm.vkLink!,
                message
            );

            results.push(result);

            // Задержка между сообщениями (антиспам)
            if (i < firmsWithVk.length - 1) {
                await this.delay(this.DELAY_BETWEEN_MESSAGES);
            }
        }

        const successCount = results.filter((r) => r.status === "success").length;
        console.log(`✓ Отправлено успешно: ${successCount}/${firmsWithVk.length}`);

        return results;
    }

    /**
     * Отправка с повторными попытками при ошибках
     */
    private async sendMessageWithRetry(
        vkLink: string,
        message: string,
        attempt = 1
    ): Promise<VKMessageResult> {
        try {
            return await this.sendMessage(vkLink, message);
        } catch (error: any) {
            // Flood control (слишком много запросов)
            if (error.error_code === 9 && attempt < this.MAX_RETRIES) {
                console.warn(`⚠️ Flood control, ждём 60 секунд...`);
                await this.delay(60000);
                return this.sendMessageWithRetry(vkLink, message, attempt + 1);
            }

            // Капча
            if (error.error_code === 14) {
                console.error(`❌ Требуется капча: ${error.captcha_img}`);
                return {
                    firmName: vkLink,
                    vkLink: vkLink,
                    status: "error",
                    error: "Требуется капча"
                };
            }

            // Другие ошибки
            return {
                firmName: vkLink,
                vkLink: vkLink,
                status: "error",
                error: error.message
            };
        }
    }

    /**
     * Задержка (для антиспама)
     */
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Получить информацию о текущем пользователе
     */
    async getCurrentUser() {
        this.ensureInitialized();
        const user = await this.vk.call("users.get", {});
        return user[0];
    }
}
