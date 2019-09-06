const net = require('net');

const Utils = require('./utils');

class TcpClient {
    constructor(log, ip, port ) {
        this._log = log;
        this.ip = ip;
        this.port = port;

        this.state = 'idle';
        this.socket = null;

        this.connect = async () => {
            this._log.debug(`Connect: connecting to ${this.ip}:${this.port}`);

            if (this.state !== 'idle') {
                this._log.debug(`Connect: socket is connected`);
                return;
            }
    
            this.socket = new net.Socket({writable: true});
            this.socket.setKeepAlive(true);
            this.socket.setNoDelay(true);
            await new Promise((resolve, reject) => {
                try {
                    this.socket.once('error', err => {
                        this._log.debug(`Connect: can't connect to ${this.ip}:${this.port}`);
                        this.onError(err);
                        reject(err);
                    });
                    this.socket.connect(this.port, this.ip, () => {
                        this._log.debug(`Connect: connected to ${this.ip}:${this.port}`);
                        resolve();
                    });
                } catch(err) {
                    reject(err);
                }
            });
            this.socket.on('timeout', this.onTimeout);
            this.socket.on('error', this.onError);
   
            this.state = 'connected';
        };
    
        this.send = async (data) => {
            this._log.debug(`Send: sending ${data.length} bytes to ${this.ip}:${this.port}`);

            if (this.state === 'idle') {
                this._log.debug(`Send: socket is idle, connecting`);

                await this.connect();
                await Utils.Sleep(10);
            }

            return new Promise((resolve, reject) => {
                try {
                    const buffer = Buffer.from(data.buffer || data);
                    let allBytesWritten = false;
                    allBytesWritten = this.socket.write(buffer, err => {
                        if (err) {
                            this._log.debug(`Send: error sending ${data.length} bytes to ${this.ip}:${this.port}`);
                            reject(err);
                        } else {
                            this._log.debug(`Send: sent ${data.length} bytes to ${this.ip}:${this.port}`);
                            resolve(allBytesWritten);
                        }
                    });
                } catch (err) {
                    reject(err);
                }
            });
        };
    
        this.disconnect = async () => {
            this._log.debug(`Disconnect: disconnecting from ${this.ip}:${this.port}`);

            if (this.state === 'connected') {
                await new Promise((resolve, reject) => {
                    try {
                        this.socket.end(err => {
                            if (err) {
                                this._log.debug(`Disconnect: error disconnecting from ${this.ip}:${this.port}`);
                                reject(err);
                            } else {
                                this._log.debug(`Disconnect: disconnected from ${this.ip}:${this.port}`);
                                resolve();
                            }
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
            } else {
                this._log.debug(`Disconnect: socket is idle`);
                return;
            }
    
            this.state = 'idle';
            this.socket = null;
        };

        this.onTimeout = () => {
            this._log.error(`TcpClient: connection to ${this.ip}:${this.port} timed out`);
            this.disconnect();
        };
        
        this.onError = err => {
            this._log.error(`TcpClient: connection to ${this.ip}:${this.port} got error '${err.message || err}'\n`, err);
            this.socket = null;
            this.state = 'idle';
        }
    }
}

module.exports = TcpClient;
