// tslint:disable: no-string-literal

import {TcpClient} from '../src/tcp_client';
import { Utils } from '../src/utils';
import * as Mocks from './mocks';

describe('Test TCP client', () => {
    test('It should connect and send message', async () => {
        const tcpClient = new TcpClient(Mocks.Log, '10.1.1.4', 8899);
        expect(tcpClient['ip']).toBe('10.1.1.4');
        expect(tcpClient['port']).toBe(8899);
        expect(tcpClient['state']).toBe('idle');
        expect(tcpClient['socket']).toBeUndefined();

        await tcpClient.connect();
        expect(tcpClient['state']).toBe('connected');
        expect(tcpClient['socket']).toBeDefined();

        const bytesWritten = await tcpClient.send(Uint8Array.from([0x55, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xAA, 0xAA]));
        expect(bytesWritten).toBeTruthy();
        // @ts-ignore
        expect(tcpClient['socket'].bytesWritten).toBe(12);

        await tcpClient.shutdown();
        expect(tcpClient['state']).toBe('idle');
        expect(tcpClient['socket']).toBeUndefined();
    });

    test('It should throw when cant connect', async () => {
        const tcpClient = new TcpClient(Mocks.Log, '127.0.0.1', 1);
        expect(tcpClient['ip']).toBe('127.0.0.1');
        expect(tcpClient['port']).toBe(1);
        expect(tcpClient['state']).toBe('idle');
        expect(tcpClient['socket']).toBeUndefined();

        await expect(tcpClient.connect()).rejects.toThrow('connect ECONNREFUSED 127.0.0.1:1');
        expect(tcpClient['state']).toBe('idle');
        expect(tcpClient['socket']).toBeUndefined();
    });

    test('It should timeout when timeout is set', async () => {
        const tcpClient = new TcpClient(Mocks.Log, '10.1.1.4', 8899, 1000);
        expect(tcpClient['ip']).toBe('10.1.1.4');
        expect(tcpClient['port']).toBe(8899);
        expect(tcpClient['state']).toBe('idle');
        expect(tcpClient['socket']).toBeUndefined();

        await tcpClient.connect();
        expect(tcpClient['state']).toBe('connected');
        expect(tcpClient['socket']).toBeDefined();

        await Utils.Sleep(1100);

        expect(tcpClient['state']).toBe('idle');
        expect(tcpClient['socket']).toBeUndefined();
    });
});
