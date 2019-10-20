import { IHomebridgeAccessory, ILog, IHomebridgeServices } from 'homebridge/framework';
import { ISunricherPlatformConfig, ISunricherDeviceConfig } from 'platform_config';
import { ISunricherState, ISunricherDeviceStateBase } from 'state';
import { SunricherApi } from 'sunricher/api';

export abstract class SunricherDeviceBase<T extends ISunricherDeviceStateBase> {
    public readonly uuid: string;
    public readonly id: number;
    public readonly type: string;
    public readonly name: string;

    protected readonly log: ILog;
    protected readonly hbServices: IHomebridgeServices;
    protected readonly config: ISunricherPlatformConfig;
    protected readonly sunricherApi: SunricherApi;

    protected state: T;

    protected readonly accessories: IHomebridgeAccessory[];

    constructor(
        log: ILog, 
        hbServices: IHomebridgeServices, 
        config: ISunricherPlatformConfig, 
        sunricherApi: SunricherApi, 
        device: ISunricherDeviceConfig
    ) {
        this.log = log;
        this.hbServices = hbServices;
        this.config = config;
        this.sunricherApi = sunricherApi;

        this.uuid = `${config.ip}-${config.port}-${device.id}-${device.type}`;
        this.id = device.id;
        this.type = device.type;
        this.name = device.name;

        this.accessories = [];
    }

    public loadState(storage: ISunricherState): void {
        const myState = storage[this.id];
        if (myState) {
            Object.assign(this.state, myState);
        }
    }

    public saveState(storage: ISunricherState): void {
        storage[this.id] = this.state;
    }

    public abstract createAccessories(): IHomebridgeAccessory[];
    public abstract addEventHandlers(accessory: IHomebridgeAccessory): void;

    protected updateharacteristic(service: any, characteristic: any, value: string | number | boolean) {
        setTimeout(() => {
            service.updateCharacteristic(
                characteristic, 
                value
            );
        }, 100);
    }

    protected getServiceBySubtype(accessory: IHomebridgeAccessory, subtype: string): any {
        return accessory.services.find(s => s.subtype === subtype);
    }
}