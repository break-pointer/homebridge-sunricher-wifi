import {ILog} from 'homebridge/framework';
import {Utils} from './utils';

interface IQueueItem {
    message: any;
    delayAfter: number;
    asyncResolve: (result: any) => any;
    asyncReject: (err: Error) => any;
    isRunning: boolean;
}

export class Queue {
    private readonly log: ILog;
    private readonly action: (message: any) => any;
    private queue: IQueueItem[];
    private stopped: boolean;
    private timeout?: NodeJS.Timeout;

    constructor(log: ILog, action: (message: any) => any) {
        this.log = log;
        this.action = action;
        this.queue = [];
        this.stopped = false;
    }

    public enqueue(message: any, delayAfter = 10): Promise<any> {
        this.log.debug(Utils.FormatTrace('enqueue', {message, delayAfter}));

        let asyncResolve: any;
        let asyncReject: any;
        const asyncResult = new Promise((resolve, reject) => {
            asyncResolve = resolve;
            asyncReject = reject;
        });

        this.queue.push({message, delayAfter, asyncResolve, asyncReject, isRunning: false});

        return asyncResult;
    }

    public handler = async () => {
        let delayAfter = 10;
        if (this.queue.length) {
            const item = this.queue.splice(0, 1)[0];
            delayAfter = item.delayAfter || 10;
            let error;
            let result;
            try {
                item.isRunning = true;
                result = await this.action(item.message);
            } catch (err) {
                this.log.error(`Queue: handler error '${err.message || err}'\n`, err);
                error = err;
            }
            item.isRunning = false;
            try {
                if (error) {
                    item.asyncReject(error);
                } else {
                    item.asyncResolve(result);
                }
            } catch (err) {
                this.log.error(`Queue: result notify error '${err.message || err}'\n`, err);
            }
        }
        if (!this.stopped) {
            this.timeout = setTimeout(this.handler, delayAfter);
        }
    }

    public start() {
        this.log.info('Starting queue');
        this.stopped = false;
        this.handler();
    }

    public stop() {
        this.log.info(`Stopping queue with ${this.queue.length} items to process`);

        this.stopped = true;
        this.queue.forEach(item => !item.isRunning && item.asyncReject(new Error('Exit')));
        this.queue = [];
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }

        this.log.info('Queue stopped');
    }
}
