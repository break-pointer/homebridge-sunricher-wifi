const TcpClient = require('../src/tcp_client');
const Mocks = require('./mocks');

describe('Test TCP client', () => {
    test('It should connect and send message', async () => {
        const tcpClient = new TcpClient(Mocks.Log, '10.1.1.4', 8899);
        expect(tcpClient.ip).toBe('10.1.1.4');
        expect(tcpClient.port).toBe(8899);
        expect(tcpClient.state).toBe('idle');
        expect(tcpClient.socket).toBe(null);

        await tcpClient.connect();
        expect(tcpClient.state).toBe('connected');
        expect(tcpClient.socket).toBeDefined();

        const bytesWritten = await tcpClient.send(Uint8Array.from([0x55, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xAA, 0xAA]));
        expect(bytesWritten).toBeTruthy();
        expect(tcpClient.socket.bytesWritten).toBe(12);

        await tcpClient.disconnect();
        expect(tcpClient.state).toBe('idle');
        expect(tcpClient.socket).toBe(null);
    });

    test('It should throw when cant connect', async () => {
        const tcpClient = new TcpClient(Mocks.Log, '127.0.0.1', 1);
        expect(tcpClient.ip).toBe('127.0.0.1');
        expect(tcpClient.port).toBe(1);
        expect(tcpClient.state).toBe('idle');
        expect(tcpClient.socket).toBe(null);

        await expect(tcpClient.connect()).rejects.toThrow('connect ECONNREFUSED 127.0.0.1:1');
    });

});
