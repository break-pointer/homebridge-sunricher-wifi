import {Socket} from 'net';

import { ILog } from 'homebridge/framework';
import {Utils} from './utils';

export class TcpClient {
    private readonly log: ILog;
    private readonly ip: string;
    private readonly port: number;
    private readonly timeout: number;
    private state: 'idle' | 'connected';
    private socket?: Socket;
    
    constructor(log: ILog, ip: string, port: number, timeout = 300000) {
        this.log = log;
        this.ip = ip;
        this.port = port;
        this.timeout = timeout;

        this.state = 'idle';
    }

    public onTimeout = () => {
        this.log.debug(`Timeout: connection to ${this.ip}:${this.port} timed out`);
        this.shutdown();
    }
    
    public onError = (err: Error) => {
        this.log.error(`TcpClient: connection to ${this.ip}:${this.port} got error '${err.message || err}'\n`, err);

        this.socket = undefined;
        this.state = 'idle';
    }

    public onClose = () => {
        this.log.debug(`Close: socket closing`);

        this.socket = undefined;
        this.state = 'idle';
    }

    public async connect () {
        this.log.debug(`Connect: connecting to ${this.ip}:${this.port}`);

        if (this.state !== 'idle') {
            this.log.debug(`Connect: socket is connected`);
            return;
        }

        this.socket = new Socket({writable: true});
        this.socket.setNoDelay(true);
        this.socket.setTimeout(this.timeout);
        await new Promise((resolve, reject) => {
            try {
                if (!this.socket) {
                    return reject();
                }
                this.socket.once('error', err => {
                    this.log.debug(`Connect: can't connect to ${this.ip}:${this.port}`);
                    this.onError(err);
                    reject(err);
                });
                this.socket.connect(this.port, this.ip, () => {
                    this.log.debug(`Connect: connected to ${this.ip}:${this.port}`);
                    resolve();
                });
            } catch(err) {
                reject(err);
            }
        });
        this.socket.on('data', data => {
            const formatted = typeof data === 'string' ? data : Utils.FormatByteArray(data);
            this.log.info(`TcpClient: data receieved ${formatted}`);
        });
        this.socket.on('close', this.onClose);
        this.socket.on('timeout', this.onTimeout);
        this.socket.on('error', this.onError);

        this.state = 'connected';
    }

    public async send(data: Uint8Array): Promise<boolean> {
        this.log.debug(`Send: sending ${data.length} bytes to ${this.ip}:${this.port}`);

        if (this.state === 'idle') {
            this.log.debug(`Send: socket is idle, connecting`);

            await this.connect();
            await Utils.Sleep(10);
        }

        return new Promise((resolve, reject) => {
            try {
                const buffer = Buffer.from(data.buffer || data);
                let allBytesWritten = false;
                if (!this.socket) {
                    return reject();
                }
                allBytesWritten = this.socket.write(buffer, err => {
                    if (err) {
                        this.log.debug(`Send: error sending ${data.length} bytes to ${this.ip}:${this.port}`);
                        reject(err);
                    } else {
                        this.log.debug(`Send: sent ${data.length} bytes to ${this.ip}:${this.port}`);
                        resolve(allBytesWritten);
                    }
                });
            } catch (err) {
                reject(err);
            }
        });
    }

    public async shutdown() {
        this.log.debug(`Disconnect: disconnecting from ${this.ip}:${this.port}`);

        if (this.state === 'connected') {
            await new Promise((resolve, reject) => {
                try {
                    if (!this.socket) {
                        return reject();
                    }
                    this.socket.end(() => {
                        this.log.debug(`Disconnect: disconnected from ${this.ip}:${this.port}`);
                        resolve();
                    });
                } catch (err) {
                    reject(err);
                }
            });
        } else {
            this.log.debug(`Disconnect: socket is idle`);
            return;
        }

        this.state = 'idle';
        this.socket = undefined;
    }
}
