namespace pxsim {
    export class CapacitiveSensorState {
        capacity: number[] = [];
        reading: boolean[] = [];
        mapping: Map<number>;

        constructor(mapping: Map<number>) {
            this.mapping = mapping;
        }

        private getCap(pinId: number): number {
            return this.mapping[pinId];
        }

        readCap(pinId: number, samples: number): number {
            let capId = this.getCap(pinId);
            return this.capacitiveSensor(capId, samples);
        }

        isReadingPin(pinId: number, pin: Pin) {
            let capId = this.getCap(pinId);
            return this.reading[capId];
        }

        isReading(capId: number) {
            return this.reading[capId];
        }

        startReading(pinId: number, pin: Pin) {
            let capId = this.getCap(pinId);
            this.reading[capId] = true;
            pin.mode = PinFlags.Analog | PinFlags.Input;
            pin.mode |= PinFlags.Analog;
        }

        capacitiveSensor(capId: number, samples: number): number {
            return this.capacity[capId] || 0;
        }

        reset(capId: number): void {
            this.capacity[capId] = 0;
            this.reading[capId] = false;
        }
    }

    export class TouchButton extends CommonButton {
        _threshold: number = 200;
        constructor(pin: number) {
            super(pin);
        }

        setThreshold(value: number) {
            this._threshold = value;
        }

        threshold() {
            return this._threshold;
        }

        value() : number {
            return 0;
        }

        calibrate(): void {
        }
    }

    export class TouchButtonState {
        buttons: TouchButton[];

        constructor (pins: number[]) {
            this.buttons = pins.map(pin => new TouchButton(pin));
        }
    }
}

namespace pxsim.pxtcore {
    export function getTouchButton(id: number): TouchButton {
        const state = (board() as CapTouchBoard).touchButtonState;
        const btn = state.buttons.filter(b => b.id == id)[0]
        // simulator done somewhere else
        const io = (board() as EdgeConnectorBoard).edgeConnectorState;
        if (io) {
            const pin = io.pins.filter(p => p.id == id)[0];
            pins.markUsed(pin);
        }
        return btn;
    }
}

namespace pxsim.TouchButtonMethods {
    export function setThreshold(button: pxsim.TouchButton, value: number) {
        button.setThreshold(value);
    }

    export function threshold(button: pxsim.TouchButton) {
        return button.threshold();
    }

    export function value(button: pxsim.TouchButton): number {
        return button.value();
    }

    export function calibrate(button: pxsim.TouchButton): void {
        button.calibrate();
    }
}

namespace pxsim.AnalogInOutPinMethods {

    export function touchButton(name: pins.AnalogInOutPin): TouchButton {
        return pxsim.pxtcore.getTouchButton(name.id);
    }
}