# homebridge-sunricher-wifi

[![NPM](https://nodei.co/npm/homebridge-sunricher-wifi.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/homebridge-sunricher-wifi/)

[![npm](https://img.shields.io/npm/dm/homebridge-sunricher-wifi.svg)](https://www.npmjs.com/package/homebridge-sunricher-wifi)
[![npm](https://img.shields.io/npm/v/homebridge-sunricher-wifi.svg)](https://www.npmjs.com/package/homebridge-sunricher-wifi)

[Homebridge](https://github.com/nfarina/homebridge) plugin to control [Sunricher](https://www.sunricher.com/wifi-rf-convertor-sr-2818witr.html) (also known as [Arlight](https://arlight.ru/catalog/product/konverter-sr-2818witr-020413/)) family of WiFi-RF controllers.

## Installation

1. Install the plugin using:

    ```shell
    $ npm install -g homebridge-sunricher-wifi --production
    ```

2. Setup your controller with EasyLight application:

   Download app for [iOS](https://apps.apple.com/us/app/easylighting-easylife/id844148255) or [Android](https://play.google.com/store/apps/details?id=com.sunricher.easylighting_pro&hl=en) and follow its instructions

3. Update the Homebridge configuration:

    Add *each* zone  configuration as single accessory to the `accessories` node with valid values (see description below):

    ```json
    "accessories": [
        {
            "accessory": "SunricherWifi",
            "name": "Ambient light",
            "ip": CONTROLLER_IP_ADDRESS,
            "port": CONTROLLER_PORT,
            "id": ZONE_ID,
            "type": ZONE_LED_TYPE
        },
        {
            "accessory": "SunricherWifi",
            "name": "Ambient light",
            "ip": CONTROLLER_IP_ADDRESS,
            "port": CONTROLLER_PORT,
            "id": ANOTHER_ZONE_ID,
            "type": ANOTHER_ZONE_LED_TYPE
        }
    ]
    ```

4. Restart Homebridge

## Plugin config

| Config | Type | Description | Required | Default value |
|--------|------|-------------|----------|---------------|
| `ip` | `string` | IP address of your controller | Yes | |
| `port` | `number` | TCP port on controller | Yes |  |
| `id` | `number` | Zone ID in controller (from `1` to `8`) | Yes |  |
| `type` | `string` | Let type (`rgbw` or `rgb` or `w`) | Yes |  |
| `powerOnRestoreStateDelay` | number | Number of millseconds to wait after power on before sending other commands to LED. Normally you don't need to change default value, use it only if LED blinks during power on. | No | `500` |
| `clientId` | Array of three bytes | Added to every packet sent to controller. Normally you don't need to change default value, pick something only if your controller doesn't respond to commands at all. The default value is something that worked for my device :) | No | `[0x99, 0x31, 0x5B]` |

## Supported controllers

| Model | Tested |
|-------|--------|
| SR-2818WiTR ([Arlight](https://arlight.ru/catalog/product/konverter-sr-2818witr-020413/), [Sunricher](https://www.sunricher.com/wifi-rf-convertor-sr-2818witr.html)) | Yes |
| SR-2818WiN ([Arlight](https://arlight.ru/catalog/product/konverter-sr-2818win-white-020748/), [Sunricher](https://www.sunricher.com/wifi-rf-convertor-sr-2818win.html)) | No |

## Supported LEDs

- Single channel
- Three-channel RGB 
- Four-channel RGB+W

## Disclaimer

> This plugin is not the replacement for official EasyLighting app. The app has functionality that this plugin will never have.

> I'm not an employee or in any other relation with Sunricher Technology Limited or Arlight.

> I just use their awesome LEDs and want to have smooth UX on my Apple devices.

## Author

Ilya Ruzakov

[t.me/break-pointer](https://t.me/break-pointer)