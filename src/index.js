const fs = require('fs');
const path = require('path');

const Utils = require('./utils');

let Homebridge;
let User;
let Service;
let Characteristic;
let SunricherService;

class SunricherWifi {
    /**
     * Creates an instance of SunricherWifi.
     * @param {function} log Logging function
     * @param {object} config Configuration object
     * @memberof SunricherWifi
     */
    constructor(log, config) {
        this._log = log;

        this.parseConfig(config);
        this.restoreState();
        this.initSunricherService();
        this.initHomebridgeServices();

        Homebridge.on('shutdown', () => {
            this.persistState();
            this.sunricherService.shutdown();
        });
    }

    getStatePath() {
        return path.join(User.persistPath(), 'home-bridge-sunricher-wifi.state.json');
    }

    restoreState() {
        let state = {
            rgb: {
                on: false,
                hue: 120,
                saturation: 100,
                brightness: 50,
                temperature: 333,
                color: {
                    red: 0,
                    green: 255,
                    blue: 0
                },
                lastColorSetTs: 0
            },
            fade: {
                on: false,
                brightness: 50
            },
            white: {
                on: false,
                brightness: 50
            }
        };
        try {
            const text = fs.readFileSync(this.getStatePath(), {encoding: 'utf8'});
            state = JSON.parse(text);
            this._log.info('Got persisted state');
        } catch (err) {
            this._log.info('State not persisted');
        }
        this.state = state;
    }

    persistState() {
        fs.writeFileSync(this.getStatePath(), JSON.stringify(this.state, null, 4), {encoding: 'utf8'});
        this._log.info('State persisted');
    }

    parseConfig(config) {
        this.name = config.name;
        this.ip = config.ip;
        this.port = config.port;
        this.id = config.id;
        this.type = config.type;
        this.powerOnRestoreStateDelay = config.powerOnRestoreStateDelay || 500;
        if (config.clientId) {
            this.clientId = Array.isArray(config.clientId) ? config.clientId : config.clientId.split(',').map(n => Number(n.trim()));
        }
        else {
            this.clientId = [0x99, 0x31, 0x5B];
        }
    }

    initSunricherService() {
        this.sunricherService = new SunricherService(this._log, this.ip, this.port, this.id, this.clientId);
    }

    getState(type) {
        return this.state[type];
    }

    hasRgb() {
        return this.type.indexOf('rgb') > -1;
    }

    hasWhite() {
        return this.type.indexOf('w') > -1;
    }

    formatSourceName(suffix) {
        if (this.hasRgb()) {
            return `${this.name} - ${suffix}`;
        }

        return this.name;
    }

    sendBrightness(type, value, delayAfter = 10) {
        if (this.hasRgb()) {
            if (type === 'rgb') {
                return this.sunricherService.sendRgbBrightness(value, delayAfter);
            } else if (type === 'white') {
                return this.sunricherService.sendRgbWhiteBrightness(value, delayAfter);
            }
        } else if (this.hasWhite()) {
            return this.sunricherService.sendWhiteBrightness(value, delayAfter);
        }
    }

    sendRgbColor(delayAfter = 10) {
        return this.sunricherService.sendRgbColor(this.state.rgb.color, delayAfter);
    }

    initHomebridgeServices() {
        this.identify = callback => {
            this._log.info('Identify');
            this._log.debug(Utils.FormatTrace('identify'));
    
            callback(null);
        };
    
        this.getServices = () => {
            const informationService = new Service.AccessoryInformation();
    
            informationService
                .setCharacteristic(Characteristic.Manufacturer, 'Ilya Ruzakov')
                .setCharacteristic(Characteristic.Model, 'Wifi Led Controller')
                .setCharacteristic(Characteristic.SerialNumber, `${this.ip}:${this.port}:${this.id}`);
    
            const ret = [informationService];

            if (this.hasRgb()) {
                // RGB light
                const rgbLightService = new Service.Lightbulb(this.formatSourceName('RGB'), `rgb${this.id}`);

                rgbLightService
                    .getCharacteristic(Characteristic.On)
                    .on('get', (callback) => this.getPowerState('rgb', callback))
                    .on('set', (on, callback) => this.setPowerState('rgb', on, callback));

                rgbLightService
                    .addCharacteristic(new Characteristic.Hue())
                    .on('get', (callback) => this.getHue('rgb', callback))
                    .on('set', (hue, callback) => this.setHue('rgb', hue, callback));

                rgbLightService
                    .addCharacteristic(new Characteristic.Saturation())
                    .on('get', (callback) => this.getSaturation('rgb', callback))
                    .on('set', (saturation, callback) => this.setSaturation('rgb', saturation, callback));

                rgbLightService
                    .addCharacteristic(new Characteristic.ColorTemperature())
                    .on('get', (callback) => this.getColorTemperature('rgb', callback))
                    .on('set', (temperature, callback) => this.setColorTemperature('rgb', temperature, callback));

                rgbLightService
                    .addCharacteristic(new Characteristic.Brightness())
                    .on('get', (callback) => this.getBrightness('rgb', callback))
                    .on('set', (brightness, callback) => this.setBrightness('rgb', brightness, callback));

                ret.push(rgbLightService);

                // RGB Fade
                const rgbFadeService = new Service.Lightbulb(this.formatSourceName('RGB Fade'), `fade${this.id}`);
                rgbFadeService
                    .getCharacteristic(Characteristic.On)
                    .on('get', (callback) => this.getPowerState('fade', callback))
                    .on('set', (on, callback) => this.setPowerState('fade', on, callback));

                rgbFadeService
                    .addCharacteristic(new Characteristic.Brightness())
                    .on('get', (callback) => this.getBrightness('fade', callback))
                    .on('set', (brightness, callback) => this.setBrightness('fade', brightness, callback));

                ret.push(rgbFadeService);
            }

            if (this.hasWhite()) {
                // White light
                const whiteLightService = new Service.Lightbulb(this.formatSourceName('White'), `white${this.id}`);
                whiteLightService
                    .getCharacteristic(Characteristic.On)
                    .on('get', (callback) => this.getPowerState('white', callback))
                    .on('set', (on, callback) => this.setPowerState('white', on, callback));

                whiteLightService
                    .addCharacteristic(new Characteristic.Brightness())
                    .on('get', (callback) => this.getBrightness('white', callback))
                    .on('set', (brightness, callback) => this.setBrightness('white', brightness, callback));

                ret.push(whiteLightService);
            }
    
            this._log.debug(Utils.FormatTrace('getServices', {}, ret));
    
            return ret;
        };
    
        this.getPowerState = (type, callback) => {
            const state = this.getState(type);

            this._log.debug(Utils.FormatTrace('getPowerState', {id: this.id, type}, state.on));

            callback(null, state.on);
        };

        this.setPowerState = async (type, newPowerState, callback) => {
            this._log.debug(Utils.FormatTrace('setPowerState', {id: this.id, type, newPowerState}));

            const state = this.getState(type);

            const oldRgbPower = this.state.rgb.on;
            const oldFadePower = this.state.fade.on;
            const oldWhitePower = this.state.white.on;

            const oldPowerState = state.on;
            state.on = newPowerState;

            const newRgbPower = this.state.rgb.on;
            const newFadePower = this.state.fade.on;
            const newWhitePower = this.state.white.on;

            const promises = [];

            if (this.hasRgb() && this.hasWhite()) {
                if ((newRgbPower || newFadePower || newWhitePower) && !(oldRgbPower || oldFadePower || oldWhitePower)) {
                    promises.push(this.sunricherService.sendPowerState(true, this.powerOnRestoreStateDelay));
                }

                if (newPowerState && !oldPowerState) {
                    if (type === 'rgb') {
                        // restore own state
                        promises.push(this.sendBrightness(type, state.brightness || 1, 100));
                        if (!newFadePower) {
                            promises.push(this.sendRgbColor(100));
                        }

                        if (!(newFadePower || newWhitePower)) {
                            promises.push(this.sunricherService.sendRgbFadeState(false, 100));
                            promises.push(this.sendBrightness('white', 0, 100));
                        }
                    } else if (type === 'fade') {
                        // restore own state
                        promises.push(this.sunricherService.sendRgbFadeState(state.on, 100));
                        promises.push(this.sunricherService.sendRgbFadeType(state.brightness, 100));

                        if (!(newRgbPower || newWhitePower)) {
                            promises.push(this.sendBrightness('rgb', this.state.rgb.brightness || 1, 100));
                            promises.push(this.sendBrightness('white', 0, 100));
                        }
                    } else if (type === 'white') {
                        // restore own state
                        promises.push(this.sendBrightness(type, state.brightness || 1, 100));

                        if (!(newRgbPower || newFadePower)) {
                            promises.push(this.sunricherService.sendRgbFadeState(false, 100));
                            promises.push(this.sendBrightness('rgb', 0, 100));
                        }
                    }
                } else if (!newPowerState) {
                    if (type === 'rgb') {
                        if (!newFadePower && newWhitePower) {
                            promises.push(this.sendBrightness(type, 0, 100));
                        }
                    } else if (type === 'fade') {
                        if (newRgbPower || newWhitePower) {
                            promises.push(this.sunricherService.sendRgbFadeState(state.on, 100));
                        }
                    } else if (type === 'white') {
                        if (newRgbPower || newFadePower) {
                            promises.push(this.sendBrightness(type, 0, 100));
                        }
                    }
                }

                if (!(newRgbPower || newFadePower || newWhitePower)) {
                    promises.push(this.sunricherService.sendPowerState(false, 1000));
                }
            } else if (this.hasRgb() && !this.hasWhite()) {
                if ((newRgbPower || newFadePower) && !(oldRgbPower || oldFadePower)) {
                    promises.push(this.sunricherService.sendPowerState(true, this.powerOnRestoreStateDelay));
                } 

                if (newPowerState && !oldPowerState) {
                    if (type === 'rgb') {
                        // restore own state
                        promises.push(this.sendBrightness(type, state.brightness || 1, 100));

                        if (!newFadePower) {
                            promises.push(this.sendRgbColor(100));
                            promises.push(this.sunricherService.sendRgbFadeState(false, 100));
                        }
                    } else if (type === 'fade') {
                        // restore own state
                        promises.push(this.sunricherService.sendRgbFadeState(state.on, 100));
                        promises.push(this.sunricherService.sendRgbFadeType(state.brightness, 100));

                        if (!newRgbPower) {
                            promises.push(this.sendBrightness('rgb', this.state.rgb.brightness || 1, 100));
                        }
                    }
                } else if (!newPowerState) {
                    if (type === 'rgb') {
                        // do nothing
                    } else if (type === 'fade') {
                        if (newRgbPower) {
                            promises.push(this.sunricherService.sendRgbFadeState(state.on, 100));
                        }
                    }
                }

                if (!(newRgbPower || newFadePower)) {
                    promises.push(this.sunricherService.sendPowerState(false, 1000));
                }
            } else if (!this.hasRgb() && this.hasWhite()) {
                if (newWhitePower && !oldWhitePower) {
                    promises.push(this.sunricherService.sendPowerState(true, this.powerOnRestoreStateDelay));
                    promises.push(this.sendBrightness(type, state.brightness));
                }

                if (!newWhitePower && oldWhitePower) {
                    promises.push(this.sunricherService.sendPowerState(false, 1000));
                }
            }

            await Promise.all(promises);

            callback(null);
        };
    
        this.getBrightness = (type, callback) => {
            const state = this.getState(type);
    
            this._log.debug(Utils.FormatTrace('getBrightness', {id: this.id, type}, state.brightness));

            callback(null, state.brightness);
        };
    
        this.setBrightness = async (type, brightness, callback) => {
            const state = this.getState(type);
    
            this._log.debug(Utils.FormatTrace('setBrightness', {id: this.id, type, brightness}));
    
            if (brightness > 0) {
                state.brightness = brightness;
            }

            if (state.on) {
                if (type === 'fade') {
                    await this.sunricherService.sendRgbFadeType(brightness);
                } else {
                    await this.sendBrightness(type, brightness);
                }
            }

            callback(null);
        };
    
        this.getHue = (type, callback) => {
            const state = this.getState(type);
    
            this._log.debug(Utils.FormatTrace('getHue', {id: this.id, type}, state.hue));
    
            callback(null, state.hue);
        };
    
        this.setHue = async (type, hue, callback) => {
            const state = this.getState(type);
    
            this._log.debug(Utils.FormatTrace('setHue', {id: this.id, type, hue}));
    
            state.lastColorSetTs = new Date().getTime();
            state.hue = hue;
            state.color = Utils.HsbToRgb(state.hue, state.saturation, state.brightness);

            if (state.on) {
                await this.sendRgbColor();
            }
    
            callback(null);
        }

        this.getSaturation = (type, callback) => {
            const state = this.getState(type);

            this._log.debug(Utils.FormatTrace('getSaturation', {id: this.id, type}, state.saturation));

            callback(null, state.saturation);
        }

        this.setSaturation = async (type, saturation, callback) => {
            const state = this.getState(type);
    
            this._log.debug(Utils.FormatTrace('setSaturation', {id: this.id, type, saturation}));

            state.lastColorSetTs = new Date().getTime();
            state.saturation = saturation;
            state.color = Utils.HsbToRgb(state.hue, state.saturation, state.brightness);

            if (state.on) {
                await this.sendRgbColor();
            }

            callback(null);
        }

        this.getColorTemperature = (type, callback) => {
            const state = this.getState(type);

            this._log.debug(Utils.FormatTrace('getColorTemperature', {id: this.id, type}, state.temperature));

            callback(null, state.temperature);
        }

        this.setColorTemperature = async (type, temperature, callback) => {
            const state = this.getState(type);
    
            this._log.debug(Utils.FormatTrace('setColorTemperature', {id: this.id, type, temperature}));

            await Utils.Sleep(10);

            if (new Date().getTime() - state.lastColorSetTs < 1000) {
                callback(null);
                return;
            }

            const rgb = Utils.ColorTemperatureToRgb(Utils.MiredToKelvin(temperature));
            const hsb = Utils.RgbToHsb(rgb.red, rgb.green, rgb.blue);

            state.temperature = temperature;
            state.hue = hsb.hue;
            state.saturation = hsb.saturation;
            state.color = rgb;
            
            if (state.on) {
                await this.sendRgbColor();
            }

            callback(null);
        }
    }
}

/**
 * @module homebridge
 * @param {object} homebridge Export functions required to create a new instance of this plugin.
 */
module.exports = function(homebridge, mocks) {
    if (mocks && mocks.isUnderTest) {
        SunricherService = mocks.SunricherService;

        Homebridge = mocks.Homebridge;
        User = mocks.user;
        Service = mocks.Service;
        Characteristic = mocks.Characteristic;
        mocks.registerAccessory('homebridge-sunricher-wifi', 'SunricherWifi', SunricherWifi);
    } else {
        SunricherService = require('./sunricher_service');

        Homebridge = homebridge;
        User = homebridge.user;
        Service = homebridge.hap.Service;
        Characteristic = homebridge.hap.Characteristic;
        homebridge.registerAccessory('homebridge-sunricher-wifi', 'SunricherWifi', SunricherWifi);
    }
};
