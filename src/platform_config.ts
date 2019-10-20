import {IHomebridgePlatformConfig, ILog} from 'homebridge/framework';
import { Utils } from 'utils';

export const PluginName = 'homebridge-sunricher-wifi';
export const PlatformName = 'SunricherWifi';

export enum SupportedDeviceTypes {
    Rgb = 'rgb',
    Rgbw = 'rgbw',
    White = 'w',
}

export interface ISunricherDeviceConfig {
    id: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; 
    type: SupportedDeviceTypes;
    name: string;
}

export interface ISunricherPlatformConfig extends IHomebridgePlatformConfig {
    name: string;
    ip: string;
    port: number;
    devices: ISunricherDeviceConfig[];
    powerOnRestoreStateDelay: number;
    clientId: number[];
}

export function validate(log: ILog, config: ISunricherPlatformConfig): boolean {
    if (!('ip' in config) || typeof config.ip !== 'string' || Utils.IsValidIp(config.ip)) {
        log.error(`config.ip is invalid`);
        return false;
    }
    if (!('port' in config) || typeof config.port !== 'number' || config.port < 1 || config.port > 65535) {
        log.error(`config.port is invalid`);
        return false;
    }
    if (!('powerOnRestoreStateDelay' in config) || 
        typeof config.powerOnRestoreStateDelay !== 'number' || 
        config.powerOnRestoreStateDelay < 0 || config.powerOnRestoreStateDelay > 2000
    ) {
        log.error(`config.port is invalid`);
        return false;
    }
    if (!('clientId' in config) || 
        !Array.isArray(config.clientId) || 
        config.clientId.length !== 3 ||
        !config.clientId.every(x => typeof x === 'number' && x >= 0 && x < 255)
    ) {
        log.error(`config.clientId is invalid`);
        return false;
    }

    return true;
}

export function sanitize(log: ILog, config: ISunricherPlatformConfig): ISunricherPlatformConfig {
    if (!config.name || typeof config.name !== 'string') {
        log.warn(`config.name has incompatible value, setting "SunricherWifi"`);
        Object.assign(config, {name: 'SunricherWifi'});
    }
    if (!('powerOnRestoreStateDelay' in config)) {
        Object.assign(config, {powerOnRestoreStateDelay: 500});
    }
    if (!('clientId' in config)) {
        Object.assign(config, {clientId: [0x99, 0x31, 0x5B]});
    } else if (typeof config.clientId === 'string') {
        const s = config.clientId as string;
        Object.assign(config, {clientId: s.split(',').map(x => parseInt(x, 10))});
    }
 
    return config;
}
