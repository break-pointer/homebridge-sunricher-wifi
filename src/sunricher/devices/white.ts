import { SunricherDeviceBase } from './base';
import { IHomebridgeAccessory, ILog, IHomebridgeServices } from 'homebridge/framework';
import { ISunricherDeviceConfig, ISunricherPlatformConfig } from 'platform_config';
import { SunricherApi } from 'sunricher/api';
import { ISunricherDeviceStateBase } from 'state';

export class SunricherWhiteLed extends SunricherDeviceBase<ISunricherDeviceStateBase> {
    constructor(
        log: ILog, 
        hbServices: IHomebridgeServices, 
        config: ISunricherPlatformConfig, 
        sunricherApi: SunricherApi, 
        device: ISunricherDeviceConfig
    ) {
        super(log, hbServices, config, sunricherApi, device);

        this.state = {
            on: false,
            brightness: 50,
        };
    }

    public createAccessories(): IHomebridgeAccessory[] {
        const ret: IHomebridgeAccessory[] = [];
        const Accessory = this.hbServices.accessoryClass;

        const accessory: IHomebridgeAccessory = new Accessory(this.name, this.hbServices.uuid.generate(this.uuid));
        accessory.context = {
            uuid: this.uuid,
        };

        accessory.on('identify', (paired, callback) => {
            this.log.info(`Identify ${this.id}`);

            callback();
        });

        accessory
            .getService(this.hbServices.serviceRegistry.AccessoryInformation)
            .setCharacteristic(this.hbServices.characteristicRegistry.Manufacturer, 'Sunricher')
            .setCharacteristic(this.hbServices.characteristicRegistry.Model, 'White LED')
            .setCharacteristic(this.hbServices.characteristicRegistry.SerialNumber, `${this.config.ip}:${this.config.port}:${this.id}`);

        accessory.addService(this.hbServices.serviceRegistry.Lightbulb, this.name)
            .setCharacteristic(this.hbServices.characteristicRegistry.On, this.state.on)
            .setCharacteristic(this.hbServices.characteristicRegistry.Brightness, this.state.brightness);

        ret.push(accessory);

        return ret;
    }

    public addEventHandlers(accessory: IHomebridgeAccessory): void {
        accessory.reachable = true;

        if (this.accessories.find(a => a.UUID === accessory.UUID)) {
            return;
        }

        this.accessories.push(accessory);

        accessory.getService(this.hbServices.serviceRegistry.Lightbulb)
            .getCharacteristic(this.hbServices.characteristicRegistry.On)
            .on('get', callback => {
                callback(null, this.state.on);
            })
            .on('set', async (on, callback) => {
                try {
                    const oldOn = this.state.on;
                    on = Boolean(on);
    
                    if (on && !oldOn) {
                        await this.sunricherApi.sendPowerState(this.id, true, this.config.powerOnRestoreStateDelay);
                    } else if (!on && oldOn) {
                        await this.sunricherApi.sendPowerState(this.id, false, 1000);
                    }

                    this.state.on = on;
    
                    callback(null);
                } catch (err) {
                    this.log.error(err);
                    callback(err);
                }
            });

        accessory.getService(this.hbServices.serviceRegistry.Lightbulb)
            .getCharacteristic(this.hbServices.characteristicRegistry.Brightness)
            .on('get', callback => {
                callback(null, this.state.brightness);
            })
            .on('set', async (brightness, callback) => {
                try {
                    if (this.state.on && brightness > 0) {
                        await this.sunricherApi.sendWhiteBrightness(this.id, brightness);
                        this.state.brightness = brightness;
                    }

                    callback(null);
                } catch(err) {
                    this.log.error(err);
                    callback(err);
                }
            });
    }
}