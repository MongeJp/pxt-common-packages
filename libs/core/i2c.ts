namespace pins {
    /**
     * Read one number from an I2C address.
     */
    //% help=pins/i2c-read-number weight=5 group="i2c" inlineInputMode="external"
    //% blockId=pins_i2c_readnumber block="i2c read number at address %address|of format %format|repeated %repeated"
    export function i2cReadNumber(address: number, format: NumberFormat, repeated?: boolean): number {
        const buf = pins.i2cReadBuffer(address, pins.sizeOf(format), repeated)
        if (!buf)
            return undefined
        return buf.getNumber(format, 0)
    }

    /**
     * Write one number to an I2C address.
     */
    //% help=pins/i2c-write-number weight=4 group="i2c"
    //% blockId=i2c_writenumber block="i2c write number|at address %address|with value %value|of format %format|repeated %repeated"
    export function i2cWriteNumber(address: number, value: number, format?: NumberFormat, repeated?: boolean): void {
        if (format == undefined)
            format = NumberFormat.UInt8LE;
        const buf = control.createBuffer(pins.sizeOf(format))
        buf.setNumber(format, 0, value)
        pins.i2cWriteBuffer(address, buf, repeated)
    }

    /**
     * Write a value in a I2C register.
     * @param address I2c address of the device
     * @param register register index
     * @param value value to write
     * @param valueFormat format of the value, default is UInt8LE
     */
    //% weight=3 group="i2c"
    //% help=pins/i2c-write-register
    //% blockId=i2c_writereg block="i2c write register|at address $address|at register $register|value $value"
    export function i2cWriteRegister(address: number, register: number, value: number, valueFormat?: NumberFormat): void {
        if (valueFormat === undefined)
            valueFormat = NumberFormat.UInt8LE;
        const valueSize = pins.sizeOf(valueFormat);
        const buf = control.createBuffer(1 + valueSize);
        buf.setNumber(NumberFormat.UInt8LE, 0, register);
        buf.setNumber(valueFormat, 1, value);
        pins.i2cWriteBuffer(address, buf);
    }

    /**
     * Read the value from a I2C register.
     * @param address I2c address of the device
     * @param register register index
     * @param valueFormat format of the value, default is UInt8LE
     */
    //% weight=3 group="i2c"
    //% help=pins/i2c-read-register
    //% blockId=i2c_readreg block="i2c read register|at address $address|at register $register"
    export function i2cReadRegister(address: number, register: number, valueFormat?: NumberFormat): number {
        if (valueFormat === undefined)
            valueFormat = NumberFormat.UInt8LE;
        pins.i2cWriteNumber(address, register, NumberFormat.UInt8LE);
        return pins.i2cReadNumber(address, valueFormat);
    }

    /**
     * Read `size` bytes from a 7-bit I2C `address`.
     */
    //%
    export function i2cReadBuffer(address: number, size: number, repeat: boolean = false): Buffer {
        return pins.i2c().readBuffer(address, size, repeat);
    }

    /**
     * Write bytes to a 7-bit I2C `address`.
     */
    //%
    export function i2cWriteBuffer(address: number, buf: Buffer, repeat: boolean = false): number {
        return pins.i2c().writeBuffer(address, buf, repeat);
    }

    let _i2c: I2C;
    /**
     * Gets the default I2C bus
     */
    //%
    export function i2c(): I2C {
        if (!_i2c) {
            const sda = pins.pinByCfg(DAL.CFG_PIN_SDA);
            const scl = pins.pinByCfg(DAL.CFG_PIN_SCL);
            _i2c = pins.createI2C(sda, scl);    
        }
        return _i2c;        
    }

    export class I2CDevice {
        public address: number;
        public bus: I2C;
        private _hasError: boolean;
        constructor(address: number, bus?: I2C) {
            this.address = address;
            this.bus = bus || i2c();
        }
        public readInto(buf: Buffer, repeat = false, start = 0, end: number = null) {
            if (end === null)
                end = buf.length
            if (start >= end)
                return
            let res = this.bus.readBuffer(this.address, end - start, repeat)
            if (!res) {
                this._hasError = true
                return
            }
            buf.write(start, res)
        }
        public write(buf: Buffer, repeat = false) {
            let res = this.bus.writeBuffer(this.address, buf, repeat)
            if (res) {
                this._hasError = true
            }
        }
        public begin(): I2CDevice {
            this._hasError = false;
            return this;
        }
        public end() {
        }
        public ok() {
            return !this._hasError
        }

        public transfer(command: Buffer, response: Buffer, responseStart?: number, responseEnd?: number) {
            this.begin();
            if (command)
                this.write(command);
            if (response)
                this.readInto(response, false, responseStart, responseEnd);
            this.end();
        }    
    }
}
