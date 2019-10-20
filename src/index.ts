import fs from 'fs';
import path from 'path';

import {
    HomebridgePlatform,
    IHomebridgeAccessory,
    ILog,
    IHomebridgeApi,
    IHomebridge,
    IHomebridgeServices
} from 'homebridge/framework';
import {SunricherPlatform} from 'platform';
import {ISunricherPlatformConfig, PluginName, PlatformName, sanitize, validate} from 'platform_config';
import { SunricherApi } from 'sunricher/api';
import { TcpClient } from 'tcp_client';
import { SunricherDevicesFactory } from 'sunricher/devices/factory';
import { ISunricherState, ISunricherStateStorage } from 'state';

let homebridgeServices: IHomebridgeServices;


export class SunricherFilesystemStateStorage implements ISunricherStateStorage {
    private basePath: string;
    private log: ILog;

    constructor(log: ILog, basePath: string) {
        this.log = log;
        this.basePath = basePath;
    }

    public async save(authData: ISunricherState): Promise<void> {
        fs.writeFileSync(this.getStatePath(), JSON.stringify(authData, null, 4), {encoding: 'utf8'});
        this.log.info('State persisted');
    }

    public async load(): Promise<ISunricherState> {
        try {
            const text = fs.readFileSync(this.getStatePath(), {encoding: 'utf8'});
            const ret = JSON.parse(text);
            this.log.info('Got persisted State');
            return ret;
        } catch (err) {
            this.log.info('State not persisted');
            return {};
        }
    }

    private getStatePath(): string {
        return path.join(this.basePath, `${PluginName}.json`);
    }
}

class SunricherPlatformWrapper extends HomebridgePlatform {
    private readonly instance: SunricherPlatform;

    constructor(log: ILog, config: ISunricherPlatformConfig, hbApi: IHomebridgeApi) {
        super(log, config, hbApi);

        if (!log) {
            throw new Error(`${PlatformName}: log service not found. Probably incompatible Homebridge version`);
        }
        if (!config || typeof config !== 'object') {
            log.error('config not set, stopping platform');
            return;
        }
        if (!hbApi) {
            log.error('api service not found, probably incompatible Homebridge version, stopping platform');
            return;
        }
        if (!validate(log, sanitize(log, config))) {
            this.log.error('config invalid, stopping platform');
            return;
        }

        const tcpClient = new TcpClient(log, config.ip, config.port);
        const sunricherApi = new SunricherApi(log, config, tcpClient);
        const sunricherDevicesFactory = new SunricherDevicesFactory(log, homebridgeServices, config, sunricherApi);
        const sunricherStateStorage = new SunricherFilesystemStateStorage(log, homebridgeServices.user.persistPath());

        this.instance = new SunricherPlatform(log, hbApi, sunricherDevicesFactory, sunricherStateStorage);
    }

    public configureAccessory = (accessory: IHomebridgeAccessory) => {
        return this.instance && this.instance.loadCachedAccessory(accessory);
    }
}

export default (homebridge: IHomebridge): void => {
    homebridgeServices = {
        uuid: homebridge.hap.uuid,
        serviceRegistry: homebridge.hap.Service,
        characteristicRegistry: homebridge.hap.Characteristic,
        accessoryClass: homebridge.platformAccessory,
        user: homebridge.user,
    };

    homebridge.registerPlatform(PluginName, PlatformName, SunricherPlatformWrapper, true);
};
