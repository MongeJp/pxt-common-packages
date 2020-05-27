namespace jacdac {
    //% fixedInstances
    export class PixelClient extends ActuatorClient {
        constructor(requiredDevice: string = null) {
            super("pixel", jd_class.PIXEL, 4, requiredDevice);
        }

        /**
         * Set the brightness of the neopixel. This flag only applies to future operations.
         * @param brightness a measure of LED brightness in 0-255. eg: 20
         */
        //% blockId="jacdacpixelsetbrightess" block="set %pixel brightness %brightness"
        //% weight=98
        //% brightness.min=0 brightness.max=255
        //% group="Pixel"
        setBrightness(value: number) {
            this.state.setNumber(NumberFormat.UInt8LE, 0, value & 0xff);
            this.notifyChange();
        }

        /**
         * Set the on-board pixel to a given color.
         * @param color RGB color of the LED
         */
        //% blockId="jadacpixelsetcolor" block="jacdac set %pixel color %rgb=colorNumberPicker"
        //% weight=99
        //% blockGap=8
        //% group="Pixel"
        setColor(value: number) {
            this.state.setNumber(NumberFormat.UInt8BE, 1, (value >> 16) & 0xff)
            this.state.setNumber(NumberFormat.UInt8BE, 2, (value >> 8) & 0xff)
            this.state.setNumber(NumberFormat.UInt8BE, 3, (value >> 0) & 0xff)
            this.notifyChange();
        }
    }

    //% fixedInstance whenUsed block="pixel client"
    export const pixelClient = new PixelClient();
}