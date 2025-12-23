import puppeteer, { Browser, Page } from "puppeteer";
import type { DgisFirmData } from "../types.js";

export interface VKMessageResult {
    firmName: string;
    vkLink: string;
    isSuccessful: boolean;
    error?: string;
}

export class VkClient {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private initialized = false;
    private readonly login: string;
    private readonly password: string;

    constructor(login: string, password: string) {
        this.password = password;
        this.login = login;
    }
    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async init() {
        if (this.initialized) return;

        console.log("🌐 Запуск браузера...");

        this.browser = await puppeteer.launch({
            headless: false,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage", // Уменьшает использование памяти
                "--disable-accelerated-2d-canvas", // Отключает 2D canvas для ускорения
                "--no-first-run",
                "--no-zygote",
                "--disable-gpu", // Отключает GPU для стабильности
                "--disable-background-networking",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-breakpad",
                "--disable-client-side-phishing-detection",
                "--disable-component-update",
                "--disable-default-apps",
                "--disable-domain-reliability",
                "--disable-extensions",
                "--disable-features=AudioServiceOutOfProcess",
                "--disable-hang-monitor",
                "--disable-ipc-flooding-protection",
                "--disable-notifications",
                "--disable-offer-store-unmasked-wallet-cards",
                "--disable-popup-blocking",
                "--disable-print-preview",
                "--disable-prompt-on-repost",
                "--disable-renderer-backgrounding",
                "--disable-sync",
                "--disable-translate",
                "--disable-windows10-custom-titlebar",
                "--metrics-recording-only",
                "--mute-audio",
                "--no-default-browser-check",
                "--safebrowsing-disable-auto-update",
                "--enable-automation",
                "--password-store=basic",
                "--use-mock-keychain",
                "--enable-features=NetworkService,NetworkServiceInProcess",
                "--ignore-certificate-errors",
                "--window-size=1280,720",
            ],
            ignoreDefaultArgs: ["--enable-automation"],
        });

        this.page = await this.browser.newPage();

        await this.page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        );

        await this.page.setViewport({ width: 1280, height: 720 });

        console.log("🔐 Авторизация VK...");

        await this.page.goto("https://vk.com", {
            waitUntil: "domcontentloaded",
            timeout: 30000,
        });

        await this.delay(3000);

        try {
            const switchButton = await this.page.$(
                'button[data-testid="enter-another-way"]'
            );

            if (switchButton) {
                await switchButton.click();
                await this.delay(2000);
            }

            await this.page.waitForSelector('input[name="login"]', {
                timeout: 10000,
            });
            await this.page.click('input[name="login"]');
            await this.delay(500);
            await this.page.type('input[name="login"]', this.login, {
                delay: 100,
            });

            await this.delay(1000);

            const continueButtons = await this.page.$$('button[type="submit"]');
            if (continueButtons.length > 0 ) {
                await continueButtons[0].click();
            }

            await this.delay(3000);

            // Проверка на капчу после ввода номера
            const urlAfterPhone = this.page.url();
            if (urlAfterPhone.includes("captcha")) {
                console.log(
                    "⚠️ КАПЧА! Пройдите капчу в браузере и нажмите Enter..."
                );
                await new Promise((resolve) => {
                    process.stdin.once("data", () => resolve(null));
                });
                await this.delay(2000);
            }

            try {
                await this.page.waitForSelector(
                    'button[data-test-id="other-verification-methods"]',
                    { timeout: 5000 }
                );
                await this.page.click(
                    'button[data-test-id="other-verification-methods"]'
                );
                await this.delay(2000);
            } catch (e) {
                // Не требуется
            }

            await this.delay(1000);

            try {
                const elements = await this.page.$$(
                    'button, div[role="button"], div[class*="Cell"]'
                );

                for (const el of elements) {
                    const text = await this.page.evaluate(
                        (element: any) => element.textContent || "",
                        el
                    );

                    if (
                        text.includes("Password") &&
                        text.includes("Enter your account password")
                    ) {
                        await el.click();
                        await this.delay(2000);
                        break;
                    }
                }
            } catch (e) {
                // Ничего не делаем
            }

            await this.page.waitForSelector('input[name="password"]', {
                timeout: 15000,
            });
            await this.page.click('input[name="password"]');
            await this.delay(500);
            await this.page.type('input[name="password"]', this.password, {
                delay: 100,
            });

            await this.delay(1000);

            const submitButtons = await this.page.$$('button[type="submit"]');
            if (submitButtons.length > 0) {
                await submitButtons[submitButtons.length - 1].click();
            }

            await this.delay(5000);

            const currentUrl = this.page.url();

            if (
                currentUrl.includes("act=authcheck") ||
                currentUrl.includes("2fa")
            ) {
                console.log(
                    "⚠️ 2FA! Введите код в браузере и нажмите Enter..."
                );
                await new Promise((resolve) => {
                    process.stdin.once("data", () => resolve(null));
                });
                await this.delay(2000);
            }

            if (currentUrl.includes("captcha")) {
                console.log(
                    "⚠️ КАПЧА! Пройдите капчу в браузере и нажмите Enter..."
                );
                await new Promise((resolve) => {
                    process.stdin.once("data", () => resolve(null));
                });
                await this.delay(2000);
            }

            const finalUrl = this.page.url();

            if (
                finalUrl.includes("vk.com/feed") ||
                finalUrl.includes("vk.com/im") ||
                finalUrl === "https://vk.com/" ||
                (!finalUrl.includes("login") && !finalUrl.includes("id.vk.com"))
            ) {
                this.initialized = true;
                console.log("✅ Вход выполнен!\n");
            } else {
                throw new Error(`Не удалось войти. URL: ${finalUrl}`);
            }
        } catch (error: any) {
            console.error("❌ Ошибка входа:", error.message);
            console.log("💡 Войдите в аккаунт вручную и нажмите Enter...");

            await new Promise((resolve) => {
                process.stdin.once("data", () => resolve(null));
            });

            this.initialized = true;
            console.log("✅ Продолжение работы...\n");
        }
    }

    async sendMessage(
        vkLink: string,
        message: string
    ): Promise<VKMessageResult> {
        if (!this.initialized) {
            throw new Error("VK браузер не инициализирован");
        }

        const screenName = vkLink
            .replace(/https?:\/\/(www\.|m\.)?vk\.com\//i, "")
            .replace(/\?.*$/, "");

        try {
            await this.page.goto(`https://vk.com/${screenName}`, {
                waitUntil: "domcontentloaded",
                timeout: 30000,
            });

            await this.delay(2500);

            // ШАГ 1: Ищем и кликаем "Write message"
            const correctSelector =
                'a[data-testid="group_action_send_message"]';

            try {
                await this.page.waitForSelector(correctSelector, {
                    timeout: 8000,
                    visible: true,
                });
            } catch (e) {
                const btnExists = await this.page.$(correctSelector);
                if (!btnExists) {
                    return {
                        firmName: screenName,
                        vkLink: vkLink,
                        isSuccessful: false,
                        error: "Кнопка 'Write message' не найдена",
                    };
                }
            }

            const clicked = await this.page.evaluate((selector) => {
                const button = document.querySelector(
                    selector
                ) as HTMLAnchorElement;
                if (button) {
                    button.click();
                    return true;
                }
                return false;
            }, correctSelector);

            if (!clicked) {
                const href = await this.page.evaluate((selector) => {
                    const button = document.querySelector(
                        selector
                    ) as HTMLAnchorElement;
                    return button ? button.href : null;
                }, correctSelector);

                if (href) {
                    await this.page.goto(href, {
                        waitUntil: "domcontentloaded",
                    });
                } else {
                    return {
                        firmName: screenName,
                        vkLink: vkLink,
                        isSuccessful: false,
                        error: "Не удалось открыть мессенджер",
                    };
                }
            }

            // ШАГ 2: Ждем мессенджер (уменьшили задержку)
            await this.delay(2000); // Было 5000

            // ШАГ 3: Ищем поле ввода
            let inputField = null;
            const inputSelectors = [
                'div[contenteditable="true"][role="textbox"]',
                'div.im-page--textarea-wrap div[contenteditable="true"]',
                'div[contenteditable="true"]',
            ];

            for (const selector of inputSelectors) {
                try {
                    await this.page.waitForSelector(selector, {
                        timeout: 3000,
                        visible: true,
                    }); // Уменьшили с 5000
                    const fields = await this.page.$$(selector);
                    if (fields.length > 0) {
                        inputField = fields[fields.length - 1];
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!inputField) {
                return {
                    firmName: screenName,
                    vkLink: vkLink,
                    isSuccessful: false,
                    error: "Поле ввода не найдено",
                };
            }

            // ШАГ 4: Вводим текст
            await inputField.click();
            await this.delay(300); // Уменьшили с 500

            await this.page.evaluate(
                (el: any, text: string) => {
                    el.textContent = text;
                    el.innerHTML = text;
                    const event = new Event("input", { bubbles: true });
                    el.dispatchEvent(event);
                },
                inputField,
                message
            );

            await this.delay(800); // Уменьшили с 1500

            // ШАГ 5: Отправляем
            const sendButtonSelectors = [
                'button[data-testid="mail_box_send_button"]',
                "button#mail_box_send",
                "button.mail_box_send_btn",
            ];

            let sentSuccessfully = false;

            for (const selector of sendButtonSelectors) {
                try {
                    const sendBtn = await this.page.$(selector);

                    if (sendBtn) {
                        await this.page.evaluate((sel) => {
                            const btn = document.querySelector(
                                sel
                            ) as HTMLButtonElement;
                            if (btn) btn.click();
                        }, selector);
                        sentSuccessfully = true;
                        break;
                    }
                } catch (e) {
                    continue;
                }
            }

            if (!sentSuccessfully) {
                await inputField.click();
                await this.delay(200);
                await this.page.keyboard.press("Enter");
            }

            await this.delay(1500); // Уменьшили с 2000

            return {
                firmName: screenName,
                vkLink: vkLink,
                isSuccessful: true
            };
        } catch (error: any) {
            return {
                firmName: screenName,
                vkLink: vkLink,
                isSuccessful: false,
                error: error.message,
            };
        }
    }

    async sendBulkMessages(
        firms: DgisFirmData[],
        messageTemplate: (firm: DgisFirmData) => string
    ): Promise<VKMessageResult[]> {
        const results: VKMessageResult[] = [];
        const firmsWithVk = firms.filter((f) => f.vkLink);

        console.log(`📨 Отправка сообщений: ${firmsWithVk.length} шт.\n`);

        for (let i = 0; i < firmsWithVk.length; i++) {
            const firm = firmsWithVk[i];
            const message = messageTemplate(firm);

            console.log(`[${i + 1}/${firmsWithVk.length}] ${firm.name}`);

            const result = await this.sendMessage(firm.vkLink!, message);
            results.push(result);

            if (result.isSuccessful === true) {
                console.log(`✅ Отправлено\n`);
            } else {
                console.log(`❌ Ошибка: ${result.error}\n`);
            }

            if (i < firmsWithVk.length - 1) {
                const delayTime = 5000 + Math.random() * 3000;
                console.log(`⏳ Ожидание ${Math.round(delayTime / 1000)} сек...\n`);
                await this.delay(delayTime);
            }
        }

        const successCount = results.filter(
            (r) => r.isSuccessful === true
        ).length;
        const errorCount = results.filter((r) => r.isSuccessful === false).length;

        console.log(
            `\n✅ Завершено! Успешно: ${successCount} | Ошибок: ${errorCount}`
        );

        return results;
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log("🔒 Браузер закрыт");
        }
    }
}
