const plugin = require('../src/index');
const Mocks = require('./mocks')

function getMocks() {
    return {
        isUnderTest: true,
        Service: {
            AccessoryInformation: Mocks.AccessoryInformation,
            Lightbulb: Mocks.Lightbulb
        },
        Characteristic: {
            Manufacturer: 'Manufacturer',
            Model: 'Model',
            SerialNumber: 'SerialNumber',

            On: Mocks.On,
            Brightness: Mocks.Brightness,
            Hue: Mocks.Hue,
            Saturation: Mocks.Saturation,
            ColorTemperature: Mocks.ColorTemperature
        },
        SunricherService: Mocks.SunricherService,
        registerAccessory: jest.fn((plugin, name, object) => true)
    }
}

describe('Test plugin registration', () => {
    const mocks = getMocks();
    plugin({}, mocks);

    test('It should add accessory', () => {
        expect(mocks.registerAccessory).toHaveBeenCalled();

        expect(mocks.registerAccessory.mock.calls[0][0]).toBe('homebridge-sunricher-wifi');

        expect(mocks.registerAccessory.mock.calls[0][1]).toBe('SunricherWifi');

        expect(mocks.registerAccessory.mock.calls[0][2].prototype.constructor.toString()).toMatch(/.*SunricherWifi.*/);
    });
});

describe('Test plugin', () => {
    const mocks = getMocks();
    plugin({}, mocks);
    const SunricherWifi = mocks.registerAccessory.mock.calls[0][2];
    const config = {
        name: 'Test name',
        ip: '10.1.1.1',
        port: 8899,
        id: 1,
        type: 'rgbw',
    };

    test('It parses config', () => {
        const instance = new SunricherWifi(Mocks.Log, config);
        expect(instance.name).toBe('Test name');
        expect(instance.ip).toBe('10.1.1.1');
        expect(instance.port).toBe(8899);
        expect(instance.id).toBe(1);
        expect(instance.type).toBe('rgbw');
        expect(instance.powerOnRestoreStateDelay).toBe(500);
        expect(instance.clientId).toEqual([0x99, 0x31, 0x5B]);
        expect(instance.state).toBeDefined();
        expect(instance.sunricherService).toBeDefined();
    });

    test('It responds to identify', () => {
        const instance = new SunricherWifi(Mocks.Log, config);

        const identifyCallbackMock = jest.fn(() => undefined);
        instance.identify(identifyCallbackMock);
        expect(identifyCallbackMock).toHaveBeenCalledWith(null);
    });

    test('It creates services', () => {
        const instance = new SunricherWifi(Mocks.Log, config);

        const services = instance.getServices();

        expect(services).toHaveLength(4);

        const informationService = services.find(s => s instanceof Mocks.AccessoryInformation);
        expect(informationService).toBeDefined();

        expect(informationService.characteristics.Manufacturer).toBe('Ilya Ruzakov');
        expect(informationService.characteristics.Model).toBe('Wifi Led Controller');
        expect(informationService.characteristics.SerialNumber).toBe(`${config.ip}:${config.port}:${config.id}`);

        const rgbStrip = services.find(s => s.name === 'Test name (RGB)');
        expect(rgbStrip.characteristics).toHaveLength(5);

        const rgbFade = services.find(s => s.name === 'Test name (RGB Fade)');
        expect(rgbFade.characteristics).toHaveLength(2);

        const white = services.find(s => s.name === 'Test name (White)');
        expect(white.characteristics).toHaveLength(2);
    });

    test('It gets and sets state', async () => {
        const instance = new SunricherWifi(Mocks.Log, config);

        const services = instance.getServices();

        const rgbStrip = services.find(s => s.name === 'Test name (RGB)');

        // On
        const on = rgbStrip.characteristics.find(c => c instanceof Mocks.On);
        const onGetMock = jest.fn((err, ret) => ret);
        on.get(onGetMock);
        expect(onGetMock).toHaveBeenCalledWith(null, false);

        const onSetMock = jest.fn((err) => undefined);
        await on.set(true, onSetMock);
        expect(onSetMock).toHaveBeenCalledWith(null);

        on.get(onGetMock);
        expect(onGetMock).toHaveBeenCalledWith(null, true);

        // Hue
        const hue = rgbStrip.characteristics.find(c => c instanceof Mocks.Hue);
        const hueGetMock = jest.fn((err, ret) => ret);
        hue.get(hueGetMock);
        expect(hueGetMock).toHaveBeenCalledWith(null, 120);

        const hueSetMock = jest.fn((err) => undefined);
        await hue.set(11, hueSetMock);
        expect(hueSetMock).toHaveBeenCalledWith(null);

        hue.get(hueGetMock);
        expect(hueGetMock).toHaveBeenCalledWith(null, 11);

        // Saturation
        const saturation = rgbStrip.characteristics.find(c => c instanceof Mocks.Saturation);
        const saturationGetMock = jest.fn((err, ret) => ret);
        saturation.get(saturationGetMock);
        expect(saturationGetMock).toHaveBeenCalledWith(null, 100);

        const saturationSetMock = jest.fn((err) => undefined);
        await saturation.set(22, saturationSetMock);
        expect(saturationSetMock).toHaveBeenCalledWith(null);

        saturation.get(saturationGetMock);
        expect(saturationGetMock).toHaveBeenCalledWith(null, 22);

        // Brightness
        const brightness = rgbStrip.characteristics.find(c => c instanceof Mocks.Brightness);
        const brightnessGetMock = jest.fn((err, ret) => ret);
        brightness.get(brightnessGetMock);
        expect(brightnessGetMock).toHaveBeenCalledWith(null, 50);

        const brightnessSetMock = jest.fn((err) => undefined);
        await brightness.set(33, brightnessSetMock);
        expect(brightnessSetMock).toHaveBeenCalledWith(null);

        brightness.get(brightnessGetMock);
        expect(brightnessGetMock).toHaveBeenCalledWith(null, 33);

        instance.state.rgb.lastColorSetTs = 0;

        // ColorTemperature
        const colorTemperature = rgbStrip.characteristics.find(c => c instanceof Mocks.ColorTemperature);
        const colorTemperatureGetMock = jest.fn((err, ret) => ret);
        colorTemperature.get(colorTemperatureGetMock);
        expect(colorTemperatureGetMock).toHaveBeenCalledWith(null, 333);

        const colorTemperatureSetMock = jest.fn((err) => undefined);
        await colorTemperature.set(250, colorTemperatureSetMock);
        expect(colorTemperatureSetMock).toHaveBeenCalledWith(null);

        colorTemperature.get(colorTemperatureGetMock);
        expect(colorTemperatureGetMock).toHaveBeenCalledWith(null, 250);
    });

});
