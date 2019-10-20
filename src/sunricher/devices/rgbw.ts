import { SunricherDeviceBase } from './base';
import { IHomebridgeAccessory, ILog, IHomebridgeServices } from 'homebridge/framework';
import { ISunricherDeviceConfig, ISunricherPlatformConfig } from 'platform_config';
import { SunricherApi } from 'sunricher/api';
import { ISunricherRgbwLedState } from 'state';
import { Utils } from 'utils';

export class SunricherRgbwLed extends SunricherDeviceBase<ISunricherRgbwLedState> {
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

            whiteOn: false,
            whiteBrightness: 50,
        };
    }

    public createAccessories(): IHomebridgeAccessory[] {
        const ret: IHomebridgeAccessory[] = [];
        const Accessory = this.hbServices.accessoryClass;

        const rgbAccessory: IHomebridgeAccessory = new Accessory(`${this.name} RGB`, this.hbServices.uuid.generate(`${this.uuid}:rgb`));
        rgbAccessory.context = {
            uuid: this.uuid,
        };

        rgbAccessory.on('identify', (paired, callback) => {
            this.log.info(`Identify ${this.id}`);

            callback();
        });

        rgbAccessory
            .getService(this.hbServices.serviceRegistry.AccessoryInformation)
            .setCharacteristic(this.hbServices.characteristicRegistry.Manufacturer, 'Sunricher')
            .setCharacteristic(this.hbServices.characteristicRegistry.Model, 'RGB LED')
            .setCharacteristic(this.hbServices.characteristicRegistry.SerialNumber, `${this.config.ip}:${this.config.port}:${this.id}`);

        rgbAccessory.addService(this.hbServices.serviceRegistry.Lightbulb, `${this.name} RGB`, 'rgb')
            .setCharacteristic(this.hbServices.characteristicRegistry.On, +this.state.on)
            .setCharacteristic(this.hbServices.characteristicRegistry.Brightness, this.state.brightness)
            .setCharacteristic(this.hbServices.characteristicRegistry.Hue, this.state.hue)
            .setCharacteristic(this.hbServices.characteristicRegistry.Saturation, this.state.saturation);

        rgbAccessory.addService(this.hbServices.serviceRegistry.Lightbulb, `${this.name} RGB fade`, 'fade')
            .setCharacteristic(this.hbServices.characteristicRegistry.On, +this.state.fadeOn)
            .setCharacteristic(this.hbServices.characteristicRegistry.Brightness, this.state.fadeType);

        ret.push(rgbAccessory);

        const whiteAccessory: IHomebridgeAccessory = new Accessory(`${this.name} White`, this.hbServices.uuid.generate(`${this.uuid}:white`));
        whiteAccessory.context = {
            uuid: this.uuid,
        };

        whiteAccessory.on('identify', (paired, callback) => {
            this.log.info(`Identify ${this.id}`);

            callback();
        });

        whiteAccessory
            .getService(this.hbServices.serviceRegistry.AccessoryInformation)
            .setCharacteristic(this.hbServices.characteristicRegistry.Manufacturer, 'Sunricher')
            .setCharacteristic(this.hbServices.characteristicRegistry.Model, 'White LED')
            .setCharacteristic(this.hbServices.characteristicRegistry.SerialNumber, `${this.config.ip}:${this.config.port}:${this.id}`);

        whiteAccessory.addService(
            this.hbServices.serviceRegistry.Lightbulb, 
            `${this.name} White`, 
            'white'
            )
            .setCharacteristic(this.hbServices.characteristicRegistry.On, +this.state.on)
            .setCharacteristic(this.hbServices.characteristicRegistry.Brightness, this.state.brightness);

        ret.push(whiteAccessory);

        return ret;
    }

    public addEventHandlers(accessory: IHomebridgeAccessory): void {
        accessory.reachable = true;

        if (this.accessories.find(a => a.UUID === accessory.UUID)) {
            return;
        }

        this.accessories.push(accessory);

        if (this.getServiceBySubtype(accessory, 'rgb')) {
            const ledService = this.getServiceBySubtype(accessory, 'rgb');
            const fadeService = this.getServiceBySubtype(accessory, 'fade');
    
            ledService
                .getCharacteristic(this.hbServices.characteristicRegistry.On)
                .on('get', callback => {
                    callback(null, this.state.on);
                })
                .on('set', async (on, callback) => this.setRgbPowerState(fadeService, on, callback));
    
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
                        
                        if (this.state.on) {
                            if (this.state.fadeOn) {
                                this.updateharacteristic(
                                    ledService, 
                                    this.hbServices.characteristicRegistry.Hue, 
                                    this.state.hue
                                );
                                callback(null);
                                return;
                            }
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
                    callback(null, this.state.on && this.state.fadeOn);
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
        } else if (this.getServiceBySubtype(accessory, 'white')) {
            const ledService = this.getServiceBySubtype(accessory, 'white');
    
            ledService
                .getCharacteristic(this.hbServices.characteristicRegistry.On)
                .on('get', callback => {
                    callback(null, this.state.whiteOn);
                })
                .on('set', async (on, callback) => this.setWhitePowerState(on, callback));
    
            ledService
                .getCharacteristic(this.hbServices.characteristicRegistry.Brightness)
                .on('get', callback => {
                    callback(null, this.state.whiteBrightness);
                })
                .on('set', async (brightness, callback) => {
                    try {
                        if (this.state.whiteOn && brightness > 0) {
                            await this.sunricherApi.sendRgbWhiteBrightness(this.id, brightness);
                            this.state.whiteBrightness = brightness;
                        }
    
                        callback(null);
                    } catch(err) {
                        this.log.error(err);
                        callback(err);
                    }
                });
        } else {
            this.log.error(accessory.services.map(x => x.subtype).join());
            this.log.error(`Unknown service`);
        }
    }
    
    public setRgbPowerState = async (fadeService: any, newPowerState: boolean, callback) => {
        const oldRgbPower = this.state.on;
        const oldWhitePower = this.state.whiteOn;

        const oldPowerState = this.state.on;
        this.state.on = newPowerState;

        const newRgbPower = this.state.on;
        const newFadePower = this.state.fadeOn;
        const newWhitePower = this.state.whiteOn;

        const promises: Array<Promise<any>> = [];

        if ((newRgbPower || newWhitePower) && !(oldRgbPower || oldWhitePower)) {
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

            if (!newWhitePower) {
                promises.push(this.sunricherApi.sendRgbWhiteBrightness(this.id, 0, 100));
            }

            this.updateharacteristic(fadeService, this.hbServices.characteristicRegistry.On, this.state.fadeOn);
        } else if (!newPowerState && oldPowerState) {
            if (newWhitePower) {
                promises.push(this.sunricherApi.sendRgbBrightness(this.id, 0, 100));
            }
            this.updateharacteristic(
                fadeService, 
                this.hbServices.characteristicRegistry.On, 
                this.state.on && this.state.fadeOn
            );
        }
        
        if (!(newRgbPower || newWhitePower)) {
            promises.push(this.sunricherApi.sendPowerState(this.id, false, 1000));
        }

        await Promise.all(promises);

        callback(null);
    }

    public setWhitePowerState = async (newPowerState: boolean, callback) => {
        const oldRgbPower = this.state.on;
        const oldWhitePower = this.state.whiteOn;

        const oldPowerState = this.state.whiteOn;
        this.state.whiteOn = newPowerState;

        const newRgbPower = this.state.on;
        const newWhitePower = this.state.whiteOn;

        const promises: Array<Promise<any>> = [];

        if ((newRgbPower || newWhitePower) && !(oldRgbPower || oldWhitePower)) {
            promises.push(this.sunricherApi.sendPowerState(this.id, true, this.config.powerOnRestoreStateDelay));
        }

        if (newPowerState && !oldPowerState) {
            // restore own state
            promises.push(this.sunricherApi.sendRgbWhiteBrightness(this.id, this.state.whiteBrightness || 1, 100));

            if (!newRgbPower) {
                promises.push(this.sunricherApi.sendRgbFadeState(this.id, false, 100));
                promises.push(this.sunricherApi.sendRgbBrightness(this.id, 0, 100));
            }
        } else if (!newPowerState && oldPowerState) {
            if (newRgbPower) {
                promises.push(this.sunricherApi.sendRgbWhiteBrightness(this.id, 0, 100));
            }
        }

        if (!(newRgbPower || newWhitePower)) {
            promises.push(this.sunricherApi.sendPowerState(this.id, false, 1000));
        }

        await Promise.all(promises);

        callback(null);
    }
}