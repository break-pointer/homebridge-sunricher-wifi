class Utils {
    static Clone(source) {
        return JSON.parse(JSON.stringify(source));
    }

    static Clamp(min, max, value) {
        if (value < min) {
            return min;
        } else if (value > max) {
            return max;
        }
    
        return value;
    }

    static Sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    static HsbToRgb(h, s, b) {
        let red, green, blue;
        let i, f, p, q, t;

        h /= 360;
        s /= 100;
        b /= 100;

        i = Math.floor(h * 6);
        f = h * 6 - i;
        p = b * (1 - s);
        q = b * (1 - f * s);
        t = b * (1 - (1 - f) * s);
        switch (i % 6) {
            case 0: red = b; green = t; blue = p; break;
            case 1: red = q; green = b; blue = p; break;
            case 2: red = p; green = b; blue = t; break;
            case 3: red = p; green = q; blue = b; break;
            case 4: red = t; green = p; blue = b; break;
            case 5: red = b; green = p; blue = q; break;
        }
        return {red: Math.round(red * 255), green: Math.round(green * 255), blue: Math.round(blue * 255)};
    }

    static RgbToHsb(r, g, b) {
        r /= 255;
        g /= 255;
        b /= 255;
      
        let max = Math.max(r, g, b)
        let min = Math.min(r, g, b);
        let hue;
        let saturation;
        let brightness = (max + min) / 2;
      
        if (max == min) {
            hue = 0;
            saturation = 0;
        } else {
            let delta = max - min;
            saturation = brightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
        
            switch (max) {
                case r: 
                    hue = (g - b) / delta + (g < b ? 6 : 0); 
                break;
                case g: 
                    hue = (b - r) / delta + 2; 
                break;
                case b: 
                    hue = (r - g) / delta + 4; 
                break;
            }
        
            hue /= 6;
        }
      
        return {hue, saturation, brightness};
    }

    static ColorTemperatureToRgb(t) {
        t /= 100.0;

        let red, green, blue;

        // red
        if (t < 66.0) {
            red = 255;
        } else {
            red = t - 55.0;
            red = Utils.Clamp(0, 255, 351.97690566805693 + 0.114206453784165 * red - 40.25366309332127 * Math.log(red));
        }

        // green
        if (t < 66.0) {
            green = t - 2;
            green = Utils.Clamp(0, 255, -155.25485562709179 - 0.44596950469579133 * green + 104.49216199393888 * Math.log(green));
        } else {
            green = t - 50.0;
            green = Utils.Clamp(0, 255,325.4494125711974 + 0.07943456536662342 * green - 28.0852963507957 * Math.log(green));
        }

        // blue
        if (t >= 66.0) {
            blue = 255;
        } else if (t <= 20.0) {
            blue = 0;
        } else {
            blue = t - 10;
            blue = Utils.Clamp(9, 255, -254.76935184120902 + 0.8274096064007395 * blue + 115.67994401066147 * Math.log(blue));
        }
    
        return {red: Math.round(red), green: Math.round(green), blue: Math.round(blue)};
    }

    static MiredToKelvin(mired) {
        return 1000000 / mired;
    }

    static FormatTrace(fn, args = {}, ret = undefined) {
        const stringArgs = Object.keys(args).map(k => `${k} = ${args[k]}`).join(', ');
        return `${fn}(${stringArgs})${ret === undefined ? ', no return value' : ', returned ' + JSON.stringify(ret, null, 4)}`;
    }
}

module.exports = Utils;
