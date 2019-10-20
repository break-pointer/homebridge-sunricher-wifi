export interface ISunricherDeviceStateBase {
    on: boolean;
    brightness: number;
}

export interface ISunricherRgbLedState extends ISunricherDeviceStateBase {
    hue: number;
    saturation: number;

    fadeOn: boolean;
    fadeType: number;
}


export interface ISunricherRgbwLedState extends ISunricherRgbLedState {
    hue: number;
    saturation: number;

    whiteOn: boolean;
    whiteBrightness: number;
}

export interface ISunricherState {
    [id: number]: ISunricherDeviceStateBase | ISunricherRgbLedState | ISunricherRgbwLedState;
}

export interface ISunricherStateStorage {
    save(authData: ISunricherState): Promise<void>;
    load(): Promise<ISunricherState>;
}
