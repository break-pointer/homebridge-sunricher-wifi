const Queue = require('../src/queue');
const Mocks = require('./mocks');

describe('Test queue', () => {
    test('It should deliver messages in order', async () => {
        const action = jest.fn(message => message);
        const queue = new Queue(Mocks.Log, action)

        queue.enqueue(1);
        queue.enqueue(2);
        queue.enqueue(3);

        await new Promise((resolve) => setTimeout(()=> resolve(), 100));

        expect(action.mock.calls[0][0]).toBe(1);
        expect(action.mock.calls[1][0]).toBe(2);
        expect(action.mock.calls[2][0]).toBe(3);
    });

    test('It handles async results', async () => {
        const action = jest.fn(message => message[message.prop].length);
        const queue = new Queue(Mocks.Log, action);

        await expect(queue.enqueue({text: '123', prop: 'text'})).resolves.toBe(3);
        await expect(queue.enqueue({text: '', prop: 'text1'})).rejects.toThrow(`Cannot read property 'length' of undefined`);
        await expect(queue.enqueue({text: '1234', prop: 'text'})).resolves.toBe(4);
    });
});
