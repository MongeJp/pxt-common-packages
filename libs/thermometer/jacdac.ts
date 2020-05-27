namespace jacdac {
    export class ThermometerService extends jacdac.SensorHost {
        constructor(name: string) {
            super(name, jd_class.THERMOMETER);
            input.onTemperatureConditionChanged(TemperatureCondition.Cold, 10, TemperatureUnit.Celsius, () => this.raiseHostEvent(TemperatureCondition.Cold));
            input.onTemperatureConditionChanged(TemperatureCondition.Cold, 30, TemperatureUnit.Celsius, () => this.raiseHostEvent(TemperatureCondition.Hot));
        }

        protected serializeState(): Buffer {
            const buf = control.createBuffer(4);
            buf.setNumber(NumberFormat.Int32LE, 0, input.temperature(TemperatureUnit.Celsius));
            return buf;
        }
    }

    //% fixedInstance whenUsed block="thermometer service"
    export const thermometerService = new ThermometerService("therm");
}