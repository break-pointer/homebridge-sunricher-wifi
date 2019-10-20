import {IHomebridgeAccessory, IHomebridgeApi, ILog, IHomebridgeServices} from './homebridge/framework';
import { PluginName, PlatformName } from 'platform_config';
import { SunricherDeviceBase } from 'sunricher/devices/base';
import { SunricherDevicesFactory } from 'sunricher/devices/factory';
import { ISunricherDeviceStateBase, ISunricherStateStorage, ISunricherState } from 'state';

export class SunricherPlatform {
    private readonly log: ILog;
    private readonly hbApi: IHomebridgeApi;
    private readonly sunricherDevicesFactory: SunricherDevicesFactory;
    private readonly sunricherStateStorage: ISunricherStateStorage;

    private sunricherDevices: Array<SunricherDeviceBase<ISunricherDeviceStateBase>>;
    private hbAccessories: IHomebridgeAccessory[];

    constructor(
        log: ILog,
        hbApi: IHomebridgeApi,
        sunricherDevicesFactory: SunricherDevicesFactory,
        sunricherStateStorage: ISunricherStateStorage
    ) {
        this.log = log;
        this.hbApi = hbApi;
        this.sunricherDevicesFactory = sunricherDevicesFactory;
        this.sunricherStateStorage = sunricherStateStorage;

        this.sunricherDevices = [];
        this.hbAccessories = [];

        hbApi.on('didFinishLaunching', this.init);
        hbApi.on('shutdown', this.shutdown);
    }

    public loadCachedAccessory = (accessory: IHomebridgeAccessory) => {
        this.log.debug(`Received accessory for ${accessory.context.uuid}`);

        if (!this.hbAccessories.find(a => a.UUID === accessory.UUID)) {
            this.hbAccessories.push(accessory);
        }
    }

    private init = async () => {
        this.log.debug('Initializing');
        try {
            this.sunricherDevices = this.sunricherDevicesFactory.createDevices([]);
            this.mergeAccessories();
            const state = await this.sunricherStateStorage.load();
            this.sunricherDevices.forEach(d => d.loadState(state));
        } catch (err) {
            this.log.error('Initialization error');
            this.log.error(err);
        }
    }

    private shutdown = async () => {
        this.log.debug('Shutting down');
        const state: ISunricherState = {};
        this.sunricherDevices.forEach(d => d.saveState(state));
        this.sunricherStateStorage.save(state);
    }

    private mergeAccessories(): void {
        this.log.debug(`Merging ${this.sunricherDevices.length} devices and ${this.hbAccessories.length} accessories`);
        // create new devices
        this.sunricherDevices.forEach(device => {
            const registeredAccessories = this.hbAccessories.filter(a => a.context.uuid === device.uuid);
            if (registeredAccessories.length) {
                registeredAccessories.forEach(a => device.addEventHandlers(a));
            } else {
                const newAccessories = device.createAccessories();
                this.hbAccessories.push.apply(this.hbAccessories, newAccessories);
                newAccessories.forEach(a => device.addEventHandlers(a));

                this.hbApi.registerPlatformAccessories(PluginName, PlatformName, newAccessories);
            }
        });

        this.log.debug(`Got ${this.hbAccessories.length} accessories after creating new`);

        // remove outdated accessories
        const byId = this.hbAccessories.reduce((all, cur) => {
            if (!all[cur.context.uuid]) {
                all[cur.context.uuid] = [];
            }
            all[cur.context.uuid].push(cur);
            return all;
        }, {});

        const toRemove: IHomebridgeAccessory[] = [];
        Object.keys(byId).forEach(id => {
            const device = this.sunricherDevices.find(d => d.uuid === id);
            if (!device) {
                toRemove.push.apply(toRemove, byId[id]);
            }
        });

        if (toRemove.length) {
            this.hbApi.unregisterPlatformAccessories(PluginName, PlatformName, toRemove);
            this.hbAccessories = this.hbAccessories.filter(a => !toRemove.find(b => b.context.uuid === a.context.uuid));
        }

        this.log.debug(
            `Got ${this.hbAccessories.length} accessories after removing ${toRemove.length} outdated accessories`
        );
    }
}
