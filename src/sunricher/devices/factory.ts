import { ILog, IHomebridgeServices } from 'homebridge/framework';

import { SunricherDeviceBase } from './base';
import { ISunricherPlatformConfig, ISunricherDeviceConfig, SupportedDeviceTypes } from 'platform_config';
import { SunricherWhiteLed } from './white';
import { SunricherRgbLed } from './rgb';
import { SunricherRgbwLed } from './rgbw';
import { ISunricherDeviceStateBase } from 'state';
import { SunricherApi } from 'sunricher/api';

export class SunricherDevicesFactory {
    private readonly log: ILog;
    private readonly hbServices: IHomebridgeServices;
    private readonly config: ISunricherPlatformConfig;
    private readonly sunricherApi: SunricherApi;

    constructor(
        log: ILog, 
        hbServices: IHomebridgeServices, 
        config: ISunricherPlatformConfig, 
        sunricherApi: SunricherApi
    ) {
        this.log = log;
        this.hbServices = hbServices;
        this.config = config;
        this.sunricherApi = sunricherApi;
    }

    public createDevices(
        existingDevices: Array<SunricherDeviceBase<ISunricherDeviceStateBase>>
    ): Array<SunricherDeviceBase<ISunricherDeviceStateBase>> {
        const devices: Array<SunricherDeviceBase<ISunricherDeviceStateBase>> = [];
        this.config.devices.forEach(d => {
            if (!existingDevices.find(ex => ex.id === d.id)) {
                const device = this.createDevice(d);
                if (device) {
                    devices.push(device);
                }
            }
        });

        return existingDevices.concat(devices);
    }

    private createDevice(device: ISunricherDeviceConfig): SunricherDeviceBase<ISunricherDeviceStateBase> {
        let clazz;
        switch(device.type) {
            default:
                throw new Error('Unsupported device type');
            case SupportedDeviceTypes.White:
                clazz = SunricherWhiteLed;
                break;
            case SupportedDeviceTypes.Rgb:
                clazz = SunricherRgbLed;
                break;
            case SupportedDeviceTypes.Rgbw:
                clazz = SunricherRgbwLed;
                break;
        }

        return new clazz(this.log, this.hbServices, this.config, this.sunricherApi, device);
    }
}