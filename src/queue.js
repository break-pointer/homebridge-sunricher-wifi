const Utils = require('./utils');

class Queue {
    constructor(log, action) {
        this._log = log;
        this.action = action;
        this.queue = [];

        this.enqueue = (message, delayAfter = 10) => {
            this._log.debug(Utils.FormatTrace('enqueue', {message, delayAfter}));

            let asyncResolve;
            let asyncReject;
            const asyncResult = new Promise((resolve, reject) => {
                asyncResolve = resolve;
                asyncReject = reject;
            });

            this.queue.push({message, delayAfter, asyncResolve, asyncReject});

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
                    result = await this.action(item.message);
                } catch(err) {
                    this._log.error(`Queue: handler error '${err.message || err}'\n`, err);
                    error = err;
                }
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
            this.timeout = setTimeout(this.handler, delayAfter);
        }

        this.timeout = null;
        this.handler();
    }
}

module.exports = Queue;
