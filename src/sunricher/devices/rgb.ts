import { SunricherDeviceBase } from './base';
import { IHomebridgeAccessory, ILog, IHomebridgeServices } from 'homebridge/framework';
import { ISunricherDeviceConfig, ISunricherPlatformConfig } from 'platform_config';
import { SunricherApi } from 'sunricher/api';
import { ISunricherRgbLedState } from 'state';
import { Utils } from 'utils';

export class SunricherRgbLed extends SunricherDeviceBase<ISunricherRgbLedState> {
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

            hue: 120,
            saturation: 100,

            fadeOn: false,
            fadeType: 5,
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
            .setCharacteristic(this.hbServices.characteristicRegistry.Model, 'RGB LED')
            .setCharacteristic(this.hbServices.characteristicRegistry.SerialNumber, `${this.config.ip}:${this.config.port}:${this.id}`);

        accessory.addService(this.hbServices.serviceRegistry.Lightbulb, `${this.name} RGB`, 'led')
            .setCharacteristic(this.hbServices.characteristicRegistry.On, +this.state.on)
            .setCharacteristic(this.hbServices.characteristicRegistry.Brightness, this.state.brightness)
            .setCharacteristic(this.hbServices.characteristicRegistry.Hue, this.state.hue)
            .setCharacteristic(this.hbServices.characteristicRegistry.Saturation, this.state.saturation);

        accessory.addService(this.hbServices.serviceRegistry.Lightbulb, `${this.name} RGB fade`, 'fade')
            .setCharacteristic(this.hbServices.characteristicRegistry.On, +this.state.fadeOn)
            .setCharacteristic(this.hbServices.characteristicRegistry.Brightness, this.state.fadeType);

        ret.push(accessory);

        return ret;
    }

    public addEventHandlers(accessory: IHomebridgeAccessory): void {
        accessory.reachable = true;

        if (this.accessories.find(a => a.UUID === accessory.UUID)) {
            return;
        }

        this.accessories.push(accessory);

        const ledService = this.getServiceBySubtype(accessory, 'led');
        const fadeService = this.getServiceBySubtype(accessory, 'fade');

        ledService
            .getCharacteristic(this.hbServices.characteristicRegistry.On)
            .on('get', callback => {
                callback(null, this.state.on);
            })
            .on('set', (on, callback) => this.setPowerState(fadeService, on, callback));

        ledService
            .getCharacteristic(this.hbServices.characteristicRegistry.Brightness)
            .on('get', callback => {
                callback(null, this.state.brightness);
            })
            .on('set', async (brightness, callback) => {
                try {
                    if (this.state.on && brightness > 0) {
                        await this.sunricherApi.sendRgbBrightness(this.id, brightness);
                        this.state.brightness = brightness;
                    }

                    callback(null);
                } catch(err) {
                    this.log.error(err);
                    callback(err);
                }
            });

        ledService
            .getCharacteristic(this.hbServices.characteristicRegistry.Hue)
            .on('get', callback => {
                callback(null, this.state.hue);
            })
            .on('set', async (hue, callback) => {
                try {
                    if (this.state.fadeOn) {
                        this.updateharacteristic(
                            ledService, 
                            this.hbServices.characteristicRegistry.Hue, 
                            this.state.hue
                        );
                        callback(null);
                        return;
                    }

                    if (this.state.on) {
                        const rgb = Utils.HsbToRgb(hue, this.state.saturation, this.state.brightness);
                        await this.sunricherApi.sendRgbColor(this.id, rgb);
                        this.state.hue = hue;
                    }

                    callback(null);
                } catch(err) {
                    this.log.error(err);
                    callback(err);
                }
            });

        ledService
            .getCharacteristic(this.hbServices.characteristicRegistry.Saturation)
            .on('get', callback => {
                callback(null, this.state.saturation);
            })
            .on('set', async (saturation, callback) => {
                try {
                    if (this.state.on) {
                        if (this.state.fadeOn) {
                            this.updateharacteristic(
                                ledService, 
                                this.hbServices.characteristicRegistry.Saturation, 
                                this.state.saturation
                            );
                            callback(null);
                            return;
                        }

                        const rgb = Utils.HsbToRgb(this.state.hue, saturation, this.state.brightness);
                        await this.sunricherApi.sendRgbColor(this.id, rgb);
                        this.state.saturation = saturation;
                    }

                    callback(null);
                } catch(err) {
                    this.log.error(err);
                    callback(err);
                }
            });

        fadeService
            .getCharacteristic(this.hbServices.characteristicRegistry.On)
            .on('get', callback => {
                callback(null, this.state.fadeOn);
            })
            .on('set', async (fadeOn, callback) => {
                try {
                    if (!this.state.on) {
                        this.updateharacteristic(fadeService, this.hbServices.characteristicRegistry.On, 0);
                        callback(null);
                        return;
                    }

                    const oldFadeOn = this.state.fadeOn;
                    fadeOn = Boolean(fadeOn);

                    if (fadeOn && !oldFadeOn) {
                        await this.sunricherApi.sendRgbFadeState(this.id, true);
                    } else if (!fadeOn && oldFadeOn) {
                        await this.sunricherApi.sendRgbFadeState(this.id, false, 100);
                        const rgb = Utils.HsbToRgb(this.state.hue, this.state.saturation, this.state.brightness);
                        await this.sunricherApi.sendRgbColor(this.id, rgb);
                    }

                    this.state.fadeOn = fadeOn;
    
                    callback(null);
                } catch (err) {
                    this.log.error(err);
                    callback(err);
                }
            });

        fadeService
            .getCharacteristic(this.hbServices.characteristicRegistry.Brightness)
            .on('get', callback => {
                callback(null, this.state.fadeType);
            })
            .on('set', async (fadeType, callback) => {
                try {
                    if (!this.state.on) {
                        this.updateharacteristic(
                            fadeService, 
                            this.hbServices.characteristicRegistry.Brightness, 
                            this.state.fadeType
                        );
                        callback(null);
                        return;
                    }

                    if (this.state.fadeOn && fadeType > 0) {
                        await this.sunricherApi.sendRgbFadeType(this.id, fadeType);
                        this.state.fadeType = fadeType;
                    }

                    callback(null);
                } catch(err) {
                    this.log.error(err);
                    callback(err);
                }
            });

    }

    public setPowerState = async (fadeService: any, newPowerState: boolean, callback) => {
        const oldRgbPower = this.state.on;

        const oldPowerState = this.state.on;
        this.state.on = newPowerState;

        const newRgbPower = this.state.on;
        const newFadePower = this.state.fadeOn;

        const promises: Array<Promise<any>> = [];

        if ((newRgbPower) && !(oldRgbPower)) {
            promises.push(this.sunricherApi.sendPowerState(this.id, true, this.config.powerOnRestoreStateDelay));
        }

        if (newPowerState && !oldPowerState) {
            // restore own state
            promises.push(this.sunricherApi.sendRgbBrightness(this.id, this.state.brightness || 1, 100));
            if (!newFadePower) {
                promises.push(this.sunricherApi.sendRgbFadeState(this.id, false, 100));

                const rgb = Utils.HsbToRgb(this.state.hue, this.state.saturation, this.state.brightness);
                promises.push(this.sunricherApi.sendRgbColor(this.id, rgb, 100));
            }

            this.updateharacteristic(fadeService, this.hbServices.characteristicRegistry.On, this.state.fadeOn);
        } else if (!newPowerState && oldPowerState) {
            this.updateharacteristic(
                fadeService, 
                this.hbServices.characteristicRegistry.On, 
                this.state.on && this.state.fadeOn
            );
        }
        
        if (!newRgbPower) {
            promises.push(this.sunricherApi.sendPowerState(this.id, false, 1000));
        }

        await Promise.all(promises);

        callback(null);
    }
}