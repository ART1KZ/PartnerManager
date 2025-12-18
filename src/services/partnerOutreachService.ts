import type { DgisFirmData, UniquePartnerDatasInSheet } from "../types.js";
import { regions } from "../config/regions.js";
import { DgisClient } from "../clients/dgisClient.js";
import { GoogleSheetsClient } from "../clients/googleSheetsClient.js";
import { VkClient } from "../clients/vkClient.js";
import { MailClient } from "../clients/mailClient.js";

export class PartnerOutreachService {
    private readonly mailClient: MailClient;
    private readonly dgisClient: DgisClient;
    private readonly vkClient: VkClient;
    constructor(
        _mailClient: MailClient,
        _dgisClient: DgisClient,
        _vkClient: VkClient
    ) {
        this.mailClient = _mailClient;
        this.dgisClient = _dgisClient;
        this.vkClient = _vkClient;
    }

    // async start() {
    //     const mailClient = new MailClient(env.mail.user, env.mail.password);
    //     const dgisClient = new DgisClient();
    //     const googleSheetsClient = new GoogleSheetsClient();
    //     const vkClient = new VkClient(env.vk.username, env.vk.password);
    // }
}
