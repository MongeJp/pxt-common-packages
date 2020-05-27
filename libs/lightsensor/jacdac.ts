namespace jacdac {
    //% fixedInstances
    export class LightSensorService extends jacdac.SensorHost {
        constructor(name: string) {
            super(name, jd_class.LIGHT_SENSOR);
            input.onLightConditionChanged(LightCondition.Bright, () => this.raiseHostEvent(LightCondition.Bright));
            input.onLightConditionChanged(LightCondition.Dark, () => this.raiseHostEvent(LightCondition.Dark));
        }

        protected serializeState(): Buffer {
            const buf = control.createBuffer(1);
            buf.setNumber(NumberFormat.UInt8LE, 0, input.lightLevel());
            return buf;
        }
    }

    //% fixedInstance whenUsed block="light sensor service"
    export const lightSensorService = new LightSensorService("lis");
}