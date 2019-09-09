class SunricherService {
    constructor(log, ip, port, id, clientId) {
        this._log = log;
        this.ip = ip;
        this.port = port;
        this.id = id;
        this.clientId = clientId;

        this.sendPowerState = (on, delayAfter = 10) => {
        };
    
        this.sendRgbColor = (color, delayAfter = 10) => {
        }    
        
        this.sendRgbBrightness = (brightness, delayAfter = 10) => {
        };
    
        this.sendRgbWhiteBrightness = (brightness, repeatCount, delayAfter = 10) => {
        };
    
        this.sendRgbFadeState = (on, delayAfter = 10) => {
        };
    
        this.sendRgbFadeType = (fadeType, delayAfter = 10) => {
        };
    
        this.sendWhiteBrightness = (brightness, delayAfter = 10) => {
        };
    }

}

class Characteristic {
    constructor(name) {
        this.name = name;
    }

    on(direction, fn) {
        this[direction] = fn;
        return this;
    }
}

class On extends Characteristic {
    constructor() {
        super('On');
    }
}

class Brightness extends Characteristic {
    constructor() {
        super('Brightness');
    }
}

class Hue extends Characteristic {
    constructor() {
        super('Hue');
    }
}

class Saturation extends Characteristic {
    constructor() {
        super('Saturation');
    }
}

class ColorTemperature extends Characteristic {
    constructor() {
        super('ColorTemperature');
    }
}

class Lightbulb {
    constructor(name, subtype) {
        this.name = name;
        this.subtype = subtype;
        this.characteristics = [new On()];
    }

    getCharacteristic(chClass) {
        return this.characteristics.find(ch => ch instanceof chClass);
    }

    addCharacteristic(ch) {
        this.characteristics.push(ch);
        return ch;
    }
}

class AccessoryInformation {
    characteristics = {};

    setCharacteristic(key, value) {
        this.characteristics[key] = value;
        return this;
    }
}

const Log = (...args) => console.log(...args);
Log.debug  = Log;
Log.info = Log;
Log.warn = Log;
Log.error = Log;
Log.log = Log;

module.exports = {
    SunricherService,
    Lightbulb,
    AccessoryInformation,
    On,
    Brightness,
    Hue,
    Saturation,
    ColorTemperature,
    Log
}