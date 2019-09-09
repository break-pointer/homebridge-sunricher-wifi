const Utils = require('./utils');
const TcpClient = require('./tcp_client');
const Queue = require('./queue');

class SunricherService {
    constructor(log, ip, port, id, clientId) {
        this._log = log;
        this.ip = ip;
        this.port = port;
        this.id = id;
        this.clientId = clientId;
        this.lastMessageTs = 0;

        this.sendPowerState = (on, delayAfter = 10) => {
            return this.enqueue(this.getMessage(0x02, 0x0A, 0x92 + ((this.id - 1) * 3 + on)), delayAfter);
        };

        this.sendRgbColor = (color, delayAfter = 10) => {
            return Promise.all([
                this.enqueue(this.getMessage(0x08, 0x48, color.red), 10),
                this.enqueue(this.getMessage(0x08, 0x49, color.green), 10),
                this.enqueue(this.getMessage(0x08, 0x4A, color.blue), delayAfter)
            ]);
        };

        this.sendRgbBrightness = (brightness, delayAfter = 10) => {
            if (brightness !== 0) {
                brightness = Utils.Clamp(1, 10, 1 + Math.trunc(brightness / 12.5));
            }

            return this.enqueue(this.getMessage(0x08, 0x23, brightness), delayAfter);
        };

        this.sendRgbWhiteBrightness = (brightness, repeatCount, delayAfter = 10) => {
            brightness = Math.trunc(brightness * 2.55);

            return this.enqueue(this.getMessage(0x08, 0x4B, brightness), delayAfter);
        };

        this.sendRgbFadeState = (on, delayAfter = 10) => {
            return this.enqueue(this.getMessage(0x02, on ? 0x4E : 0x4F, 0x15), delayAfter);
        };

        this.sendRgbFadeType = (fadeType, delayAfter = 10) => {
            fadeType = Utils.Clamp(1, 8, 1 + Math.trunc(fadeType / 12.5));

            return this.enqueue(this.getMessage(0x08, 0x22, fadeType), delayAfter);
        };

        this.sendWhiteBrightness = (brightness, delayAfter = 10) => {
            brightness = Math.trunc(brightness * 2.55);

            return this.enqueue(this.getMessage(0x08, 0x38, brightness), delayAfter);
        };

        this.sendMessage = async message => {
            let result = false;
            let retryCount = 0;
            const maxRetryCount = 3;
            while (!result && retryCount < maxRetryCount) {
                ++retryCount;
                
                try {
                    result = await this.tcpClient.send(message);
                } catch (err) {
                    this._log.error(`SunricherService: send message error '${err.message || err}'\n`, err);
                    result = false;
                    if (retryCount < maxRetryCount) {
                        await Utils.Sleep(10);
                    }
                }
            }

            return result;
        };

        this.enqueue = (message, delayAfter) => {
            const now = new Date().getTime();
            if (now - this.lastMessageTs > 300000) {
                this.lastMessageTs = now;
                this.queue.enqueue(this.getWakeupMessage(), 100)
            }

            return this.queue.enqueue(message, delayAfter);
        };

        this.getWakeupMessage = () => this.getMessage(this.id, 0, 0, 0);

        this.getMessage = (category, subCategory, value) => {
            const result = new Uint8Array(12);

            // marker
            result[0] = 0x55;
            // identifier
            result[1] = this.clientId[0];
            result[2] = this.clientId[1];
            result[3] = this.clientId[2];
            result[4] = 0x01;
            // zone
            result[5] = 1 << (this.id - 1);
            // category
            result[6] = category;
            // sub-category
            result[7] = subCategory;
            // value
            result[8] = value;
            // checksum
            result[9] = result[8] + result[7] + result[6] + result[5] + result[4];
            // marker
            result[10] = 0xAA;
            result[11] = 0xAA;

            this._log.debug(Utils.FormatTrace(this.getMessage,{category, subCategory, value}, result));

            return result;
        };

        this.tcpClient = new TcpClient(log, ip, port);
        this.queue = new Queue(log, this.sendMessage);
    }
}

module.exports = SunricherService;
