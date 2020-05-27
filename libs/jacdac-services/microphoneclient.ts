namespace jacdac {
    //% fixedInstances
    export class MicrophoneClient extends SensorClient {
        constructor(requiredDevice: string = null) {
            super("mic", jd_class.MICROPHONE, requiredDevice);
        }

        /**
         * Reads the current x value from the sensor
         */
        //% blockId=jacdacmicrophonevent block="jacdac %microphone sound level"
        //% group="Microphone"
        get soundLevel(): number {
            const s = this.state;
            if (!s || s.length < 1) return 0;
            return s.getNumber(NumberFormat.UInt8LE, 0);
        }

        /**
         * Runs code when an event happens on the sensor
         * @param gesture 
         * @param handler 
         */
        //% blockId=jacadacmicrophoneonevent block="jacdac %microphone on loud sound"
        //% group="Microphone"
        onLoudSound(handler: () => void) {
            this.registerEvent(DAL.SENSOR_THRESHOLD_HIGH, handler);
        }

        /**
         * Sets the threshold value for the event
         * @param level 
         * @param value 
         */
        //% blockId=jacdacmicrophonesetthreshold block="jacdac %microphone set loud sound threshold to %value"
        //% group="Microphone"
        setLoudSoundThreshold(value: number) {
            this.setThreshold(false, value);
        }
    }

    //% fixedInstance whenUsed block="microphone client"
    export const microphoneClient = new MicrophoneClient();
}