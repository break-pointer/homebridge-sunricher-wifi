import { ILog } from 'homebridge/framework';
import {Utils, IRgb} from '../utils';
import {TcpClient} from '../tcp_client';
import {Queue} from '../queue';
import { ISunricherPlatformConfig } from 'platform_config';

export class SunricherApi {
    private readonly log: ILog;
    private readonly config: ISunricherPlatformConfig;
    private readonly networkClient: TcpClient;
    private readonly queue: Queue;
    
    private lastMessageTs: number;

    constructor(log: ILog, config: ISunricherPlatformConfig, networkClient: TcpClient) {
        this.log = log;
        this.config = config;
        this.networkClient = networkClient;

        this.lastMessageTs = 0;

        this.queue = new Queue(log, this.sendMessage);
        this.queue.start();
    }

    public shutdown() {
        this.queue.stop();
        this.networkClient.shutdown();
    } 

    public sendPowerState (roomId: number, on: boolean, delayAfter = 10): Promise<any> {
        return this.enqueue(roomId, this.getMessage(roomId, 0x02, 0x0A, 0x92 + ((roomId - 1) * 3 + (+on))), delayAfter);
    }

    public sendRgbColor (roomId: number, color: IRgb, delayAfter = 10): Promise<any> {
        return Promise.all([
            this.enqueue(roomId, this.getMessage(roomId, 0x08, 0x48, color.red), 10),
            this.enqueue(roomId, this.getMessage(roomId, 0x08, 0x49, color.green), 10),
            this.enqueue(roomId, this.getMessage(roomId, 0x08, 0x4A, color.blue), delayAfter),
        ]);
    }

    public sendRgbBrightness(roomId: number, brightness: number, delayAfter = 10): Promise<any> {
        if (brightness > 0) {
            // source value is from 0 to 100, target value is from 1 to 15
            brightness = Utils.Clamp(1, 10, 1 + Math.trunc(brightness * 0.15)); 
        }

        return this.enqueue(roomId, this.getMessage(roomId, 0x08, 0x23, brightness), delayAfter);
    }

    public sendRgbWhiteBrightness(roomId: number, brightness: number, delayAfter = 10): Promise<any> {
        brightness = Math.trunc(brightness * 2.55);

        return this.enqueue(roomId, this.getMessage(roomId, 0x08, 0x4B, brightness), delayAfter);
    }

    public sendRgbFadeState(roomId: number, on: boolean, delayAfter = 10): Promise<any> {
        return this.enqueue(roomId, this.getMessage(roomId, 0x02, on ? 0x4E : 0x4F, 0x15), delayAfter);
    }

    public sendRgbFadeType (roomId: number, fadeType: number, delayAfter = 10): Promise<any> {
        // source value is from 0 to 100, target value is from 1 to 8
        fadeType = Utils.Clamp(1, 8, 1 + Math.trunc(fadeType * 0.08)); 

        return this.enqueue(roomId, this.getMessage(roomId, 0x08, 0x22, fadeType), delayAfter);
    }

    public sendWhiteBrightness(roomId: number, brightness: number, delayAfter = 10): Promise<any> {
        brightness = Math.trunc(brightness * 2.55);

        return this.enqueue(roomId, this.getMessage(roomId, 0x08, 0x38, brightness), delayAfter);
    }

    public enqueue(roomId: number, message: Uint8Array, delayAfter?: number): Promise<any> {
        const now = new Date().getTime();
        if (now - this.lastMessageTs > 300000) {
            this.lastMessageTs = now;
            this.queue.enqueue(this.getWakeupMessage(roomId), 100);
        }

        return this.queue.enqueue(message, delayAfter);
    }

    private sendMessage = async message => {
        let result = false;
        let retryCount = 0;
        const maxRetryCount = 3;
        while (!result && retryCount < maxRetryCount) {
            ++retryCount;
            
            try {
                result = await this.networkClient.send(message);
            } catch (err) {
                this.log.error(`SunricherService: send message error '${err.message || err}'\n`, err);
                result = false;
                if (retryCount < maxRetryCount) {
                    await Utils.Sleep(10);
                }
            }
        }

        return result;
    }

    private getWakeupMessage(roomId: number): Uint8Array {
        return this.getMessage(roomId, 0, 0, 0);
    } 

    private getMessage(roomId: number, category: number, subCategory: number, value: number): Uint8Array {
        const result = new Uint8Array(12);

        // marker
        result[0] = 0x55;
        // identifier
        result[1] = this.config.clientId[0];
        result[2] = this.config.clientId[1];
        result[3] = this.config.clientId[2];
        result[4] = 0x01;
        // zone
        // tslint:disable-next-line: no-bitwise
        result[5] = 1 << (roomId - 1);
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

        this.log.debug(Utils.FormatTrace('getMessage',{category, subCategory, value}, Utils.FormatByteArray(result)));

        return result;
    }

}
