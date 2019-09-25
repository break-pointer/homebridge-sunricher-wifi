const Utils = require('./utils');

class Queue {
    constructor(log, action) {
        this._log = log;
        this.action = action;
        this.queue = [];
        this.stopped = false;
        this.timeout = null;

        this.enqueue = (message, delayAfter = 10) => {
            this._log.debug(Utils.FormatTrace('enqueue', {message, delayAfter}));

            let asyncResolve;
            let asyncReject;
            const asyncResult = new Promise((resolve, reject) => {
                asyncResolve = resolve;
                asyncReject = reject;
            });

            this.queue.push({message, delayAfter, asyncResolve, asyncReject, isRunning: false});

            return asyncResult;
        }

        this.handler = async () => {
            let delayAfter = 10;
            if (this.queue.length) {
                const item = this.queue.splice(0,1)[0];
                delayAfter = item.delayAfter || 10;
                let error;
                let result;
                try {
                    item.isRunning = true;
                    result = await this.action(item.message);
                } catch(err) {
                    this._log.error(`Queue: handler error '${err.message || err}'\n`, err);
                    error = err;
                }
                item.isRunning = false;
                try {
                    if (error) {
                        item.asyncReject(error);
                    } else {
                        item.asyncResolve(result);
                    }
                } catch(err){
                    this._log.error(`Queue: result notify error '${err.message || err}'\n`, err);
                }
            }
            if (!this.stopped) {
                this.timeout = setTimeout(this.handler, delayAfter);
            }
        }

        this.start = () => {
            this._log.info('Staring queue');
            this.stopped = false;
            this.handler();
        }

        this.stop = () => {
            this._log.info(`Stopping queue with ${this.queue.length} items to process`);

            this.stopped = true;
            this.queue.forEach(item => !item.isRunning && item.asyncReject(new Error('Exit')));
            this.queue = [];
            clearTimeout(this.timeout);
            this.timeout = null;

            this._log.info('Queue stopped')
        }
    }
}

module.exports = Queue;
