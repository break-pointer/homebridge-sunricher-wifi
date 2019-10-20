export interface IRgb {
    red: number;
    green: number;
    blue: number;
}

export interface IHsb {
    hue: number;
    saturation: number; 
    brightness: number;
}

export class Utils {
    public static IpRegExp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;

    public static IsValidIp(ip: string): boolean {
        return Utils.IpRegExp.test(ip);
    }

    public static Clamp(min, max, value) {
        if (value < min) {
            return min;
        } else if (value > max) {
            return max;
        }
    
        return value;
    }

    public static Sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    public static HsbToRgb(h: number, s: number, b: number): IRgb {
        let red = 0;
        let green = 0;
        let blue = 0;
        let i = 0; 
        let f = 0; 
        let p = 0; 
        let q = 0; 
        let t = 0;

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

    public static RgbToHsb(r: number, g: number, b: number): IHsb {
        r /= 255;
        g /= 255;
        b /= 255;
      
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let hue = 0;
        let saturation = 0;
        const brightness = (max + min) / 2;
      
        if (max === min) {
            hue = 0;
            saturation = 0;
        } else {
            const delta = max - min;
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

    public static FormatTrace(fn: string, args: any = {}, ret?: any) {
        const stringArgs = Object.keys(args).map(k => `${k} = ${args[k]}`).join(', ');
        return `${fn}(${stringArgs})${ret === undefined ? ', no return value' : ', returned ' + JSON.stringify(ret, null, 4)}`;
    }

    public static FormatByteArray(arr: Uint8Array): string {
        const mapped: string[] = [];
        arr.forEach(x =>{
            mapped.push(`0x${x.toString(16)}`);
        });

        return arr.join(', ');
    }
}
