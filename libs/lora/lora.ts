// Adapted from https://github.com/ElectronicCats/pxt-lora/
// https://www.mouser.com/ds/2/761/sx1276-944191.pdf


/**
 * Reading data of module lora.
 */
//% weight=2 color=#002050 icon="\uf09e"
//% blockGap=8
//% groups='["Sender", "Receiver", "Packet", "Mode", "Configuration"]'
namespace lora {
    export const enum LoRaState {
        None,
        /**
         * Started initialization
         */
        Initializing,
        /**
         * LoRa module initialized and ready to go.
         */
        Ready,
        /**
         * Firmware update is required on the LoRa module
         */
        LoRaIncorrectFirmwareVersion,
        /**
         * Pins are not configured properly
         */
        LoRaInvalidConfiguration
    }

    /**
     * Priority of log messages
     */
    export let consolePriority = ConsolePriority.Log;
    function log(msg: string) {
        console.add(consolePriority, `lora: ${msg}`);
    }

    const FIRMWARE_VERSION = 0x12;
    // registers
    const REG_FIFO = 0x00;
    const REG_OP_MODE = 0x01;
    // unused
    const REG_FRF_MSB = 0x06;
    const REG_FRF_MID = 0x07;
    const REG_FRF_LSB = 0x08;
    const REG_PA_CONFIG = 0x09;
    const REG_PA_RAMP = 0x0a;
    const REG_OCP = 0x0b;
    const REG_LNA = 0x0c;
    const REG_FIFO_ADDR_PTR = 0x0d;
    const REG_FIFO_TX_BASE_ADDR = 0x0e;
    const REG_FIFO_RX_BASE_ADDR = 0x0f;
    const REG_FIFO_RX_CURRENT_ADDR = 0x10;
    const REG_IRQ_FLAGS = 0x12;
    const REG_RX_NB_BYTES = 0x13;
    const REG_RX_HEADER_COUNT_VALUE_MSB = 0x14;
    const REG_RX_HEADER_COUNT_VALUE_LSB = 0x15;
    const REG_RX_PACKET_COUNT_VALUE_MSB = 0x16;
    const REG_RX_PACKET_COUNT_VALUE_LSB = 0x17;
    const REG_MODEM_STAT = 0x18;
    const REG_PKT_SNR_VALUE = 0x19;
    const REG_PKT_RSSI_VALUE = 0x1a;
    const REG_MODEM_CONFIG_1 = 0x1d;
    const REG_MODEM_CONFIG_2 = 0x1e;
    const REG_PREAMBLE_MSB = 0x20;
    const REG_PREAMBLE_LSB = 0x21;
    const REG_PAYLOAD_LENGTH = 0x22;
    const REG_MAX_PAYLOAD_LENGTH = 0x23;
    const REG_HOP_PERIOD = 0x24;
    const REG_FIFO_RX_BYTE_AD = 0x25;
    const REG_MODEM_CONFIG_3 = 0x26;
    // 0x27 reserved
    const REG_FREQ_ERROR_MSB = 0x28;
    const REG_FREQ_ERROR_MID = 0x29;
    const REG_FREQ_ERROR_LSB = 0x2a;
    // 2b reserved
    const REG_RSSI_WIDEBAND = 0x2c;
    // 2d-2f reserved
    const REG_DETECTION_OPTIMIZE = 0x31;
    const REG_INVERT_IQ = 0x33;
    const REG_DETECTION_THRESHOLD = 0x37;
    const REG_SYNC_WORD = 0x39;
    const REG_DIO_MAPPING_1 = 0x40;
    const REG_DIO_MAPPING_2 = 0x40;
    const REG_VERSION = 0x42;
    const REG_TCXO = 0x4b;
    const REG_PA_DAC = 0x4d;
    const REG_FORMER_TEMP = 0x5b;
    const REG_AGC_REF = 0x61;
    const REG_AGC_THRESH_1 = 0x62;
    const REG_AGC_THRESH_2 = 0x63;
    const REG_AGC_THRESH_3 = 0x64;
    const REG_PLL = 0x70;

    // modes
    const MODE_LONG_RANGE_MODE = 0x80;
    const MODE_SLEEP = 0x00;
    const MODE_STDBY = 0x01;
    const MODE_TX = 0x03;
    const MODE_RX_CONTINUOUS = 0x05;
    const MODE_RX_SINGLE = 0x06;

    // PA config
    const PA_BOOST = 0x80;

    // IRQ masks
    const IRQ_TX_DONE_MASK = 0x08;
    const IRQ_PAYLOAD_CRC_ERROR_MASK = 0x20;
    const IRQ_RX_DONE_MASK = 0x40;

    const MAX_PKT_LENGTH = 255;

    const PA_OUTPUT_RFO_PIN = 0;
    const PA_OUTPUT_PA_BOOST_PIN = 1;

    // Arduino hacks
    function bitSet(value: number, bit: number) {
        return value |= 1 << bit;
        // return ((value) |= (1UL << (bit)));
    }
    function bitClear(value: number, bit: number) {
        return value &= ~(1 << bit);
        // return ((value) &= ~(1UL << (bit)));
    }
    function bitWrite(value: number, bit: number, bitvalue: number) {
        return (bitvalue ? bitSet(value, bit) : bitClear(value, bit));
    }

    /**
     * State of the driver
     */
    export let state: LoRaState = LoRaState.None;
    let _version: number;
    let _frequency = 915E6;
    let _packetIndex = 0;
    let _implicitHeaderMode = 0;
    let _implicitHeader = false;
    let _outputPin = PA_OUTPUT_PA_BOOST_PIN;
    let _spi: SPI;
    let _cs: DigitalInOutPin;
    let _boot: DigitalInOutPin;
    let _rst: DigitalInOutPin;


    export function setPins(spiDevice: SPI,
        csPin: DigitalInOutPin,
        bootPin: DigitalInOutPin,
        rstPin: DigitalInOutPin) {
        _spi = spiDevice;
        _cs = csPin;
        _boot = bootPin;
        _rst = rstPin;
        // force reset
        state = LoRaState.None;
    }

    function init() {
        if (state != LoRaState.None) return; // already inited

        log(`init`);
        state = LoRaState.Initializing;
        if (!_spi) {
            log(`init using builtin lora pins`);
            const mosi = pins.pinByCfg(DAL.CFG_PIN_LORA_MOSI);
            const miso = pins.pinByCfg(DAL.CFG_PIN_LORA_MISO);
            const sck = pins.pinByCfg(DAL.CFG_PIN_LORA_SCK);
            // make sure pins are ok
            if (!mosi || !miso || !sck) {
                log(`missing SPI pins (MOSI ${!!mosi} MISO ${!!miso} SCK ${!!sck})`)
                state = LoRaState.LoRaInvalidConfiguration;
                return;
            }
            _spi = pins.createSPI(mosi, miso, sck);
            _cs = pins.pinByCfg(DAL.CFG_PIN_LORA_CS);
            _boot = pins.pinByCfg(DAL.CFG_PIN_LORA_BOOT);
            _rst = pins.pinByCfg(DAL.CFG_PIN_LORA_RESET);
        }

        // final check for pins
        if (!_cs || !_boot || !_rst) {
            log(`missing pins (CS ${!!_cs} BOOT ${!!_boot} RST ${!!_rst})`)
            state = LoRaState.LoRaInvalidConfiguration;
            return;
        }

        _cs.digitalWrite(false);

        // Hardware reset
        log('hw reset')
        _boot.digitalWrite(false);
        _rst.digitalWrite(true);
        pause(200);
        _rst.digitalWrite(false);
        pause(200);
        _rst.digitalWrite(true);
        pause(50);

        // init spi
        _cs.digitalWrite(true);
        _spi.setFrequency(250000);
        _spi.setMode(0);

        _version = readRegister(REG_VERSION);
        log(`version v${version()}, required v${FIRMWARE_VERSION}`);

        if (_version != FIRMWARE_VERSION) {
            log(`firmware upgrade required`);
            state = LoRaState.LoRaIncorrectFirmwareVersion;
            return;
        }

        //Sleep
        writeRegister(REG_OP_MODE, MODE_LONG_RANGE_MODE | MODE_SLEEP);

        // set frequency
        setFrequencyRegisters(_frequency);

        // set base addresses
        writeRegister(REG_FIFO_TX_BASE_ADDR, 0);
        writeRegister(REG_FIFO_RX_BASE_ADDR, 0);

        // set LNA boost
        writeRegister(REG_LNA, readRegister(REG_LNA) | 0x03);

        // set auto AGC
        writeRegister(REG_MODEM_CONFIG_3, 0x04);

        // set output power to 17 dBm
        setTxPowerRegisters(17);

        // put in standby mode
        writeRegister(REG_OP_MODE, MODE_LONG_RANGE_MODE | MODE_STDBY);

        state = LoRaState.Ready;
        log(`ready`);
    }

    // Write Register of SX. 
    function writeRegister(address: number, value: number) {
        _cs.digitalWrite(false);

        _spi.write(address | 0x80);
        _spi.write(value);

        _cs.digitalWrite(true);
    }

    // Read register of SX 
    function readRegister(address: number): number {
        _cs.digitalWrite(false);
        _spi.write(address & 0x7f);
        const response = _spi.write(0x00);

        _cs.digitalWrite(true);

        return response;
    }

    function explicitHeaderMode() {
        _implicitHeaderMode = 0;
        writeRegister(REG_MODEM_CONFIG_1, readRegister(REG_MODEM_CONFIG_1) & 0xfe);
    }

    function implicitHeaderMode() {
        _implicitHeaderMode = 1;

        writeRegister(REG_MODEM_CONFIG_1, readRegister(REG_MODEM_CONFIG_1) | 0x01);
    }

    /**
     * Indicates the LoRa module is correctly initialized
     */
    //% group="Configuration"
    //% blockId=loraeady block="lora is ready"
    export function isReady(): boolean {
        init();
        return state == LoRaState.Ready;
    }

    /**
    * Read Version of firmware
    **/
    //% parts="lora"
    export function version(): number {
        init();
        return _version;
    }

    /**
    * Parse a packet as a string
    **/
    //% group="Receiver"
    //% parts="lora"
    //% blockId=lorareadstring block="lora read string"
    export function readString(): string {
        if (!isReady()) return "";

        const buf = readBuffer();
        return buf.toString();
    }

    /**
    * Parse a packet as a buffer
    **/
    //% group="Receiver"
    //% parts="lora"
    //% blockId=lorareadbuffer block="lora read buffer"
    export function readBuffer(): Buffer {
        if (!isReady()) return control.createBuffer(0);

        let length = parsePacket(0);
        if (length <= 0)
            return control.createBuffer(0); // nothing to read

        // allocate buffer to store data
        let buf = control.createBuffer(length);
        let i = 0;
        // read all bytes
        for (let i = 0; i < buf.length; ++i) {
            const c = read();
            if (c < 0) break;
            buf[i] = c;
        }
        if (i != buf.length)
            buf = buf.slice(0, i);
        return buf;
    }

    /**
    * Parse Packet to send
    **/
    //% group="Packet"
    //% parts="lora"
    //% weight=45 blockGap=8 blockId=loraparsepacket block="lora parse packet %size"
    export function parsePacket(size: number): number {
        if (!isReady()) return 0;

        let packetLength = 0;
        let irqFlags = readRegister(REG_IRQ_FLAGS);

        if (size > 0) {
            implicitHeaderMode();
            writeRegister(REG_PAYLOAD_LENGTH, size & 0xff);
        } else {
            explicitHeaderMode();
        }

        // clear IRQ's
        writeRegister(REG_IRQ_FLAGS, irqFlags);

        if ((irqFlags & IRQ_RX_DONE_MASK) && (irqFlags & IRQ_PAYLOAD_CRC_ERROR_MASK) == 0) {
            // received a packet
            _packetIndex = 0;

            // read packet length
            if (_implicitHeaderMode) {
                packetLength = readRegister(REG_PAYLOAD_LENGTH);
            } else {
                packetLength = readRegister(REG_RX_NB_BYTES);
            }

            // set FIFO address to current RX address
            writeRegister(REG_FIFO_ADDR_PTR, readRegister(REG_FIFO_RX_CURRENT_ADDR));

            // put in standby mode
            idle();
        } else if (readRegister(REG_OP_MODE) != (MODE_LONG_RANGE_MODE | MODE_RX_SINGLE)) {
            // not currently in RX mode

            // reset FIFO address
            writeRegister(REG_FIFO_ADDR_PTR, 0);

            // put in single RX mode
            writeRegister(REG_OP_MODE, MODE_LONG_RANGE_MODE | MODE_RX_SINGLE);
        }

        return packetLength;
    }

    /**
    * Packet RSSI
    **/
    //% group="Packet"
    //% parts="lora"
    //% weight=45 blockGap=8 blockId=lorapacketRssi block="lora packet RSSI"
    export function packetRssi(): number {
        if (!isReady()) return -1;

        return (readRegister(REG_PKT_RSSI_VALUE) - (_frequency < 868E6 ? 164 : 157));
    }

    /**
     * Packet SNR
     */
    //% group="Packet"
    //% parts="lora"
    //% blockId=lorapacketsnr block="lora packet SNR"
    export function packetSnr(): number {
        if (!isReady()) return -1;

        return (readRegister(REG_PKT_SNR_VALUE)) * 0.25;
    }

    // Begin Packet Frecuency Error
    function packetFrequencyError(): number {
        init();
        let freqError = 0;
        freqError = readRegister(REG_FREQ_ERROR_MSB) & 0xb111; //TODO Covert B111 to c++
        freqError <<= 8;
        freqError += readRegister(REG_FREQ_ERROR_MID) | 0;
        freqError <<= 8;
        freqError += readRegister(REG_FREQ_ERROR_LSB) | 0;

        if (readRegister(REG_FREQ_ERROR_MSB) & 0xb1000) { // Sign bit is on //TODO Covert B1000 to c++
            freqError -= 524288; // B1000'0000'0000'0000'0000
        }

        const fXtal = 32E6; // FXOSC: crystal oscillator (XTAL) frequency (2.5. Chip Specification, p. 14)
        const fError = ((freqError * (1 << 24)) / fXtal) * (signalBandwidth() / 500000.0); // p. 37

        return fError | 0;
    }

    // Begin Packet to send
    function beginPacket(): void {
        log(`begin packet`)
        // put in standby mode
        idle();

        if (_implicitHeader) {
            implicitHeaderMode();
        } else {
            explicitHeaderMode();
        }

        // reset FIFO address and payload length
        writeRegister(REG_FIFO_ADDR_PTR, 0);
        writeRegister(REG_PAYLOAD_LENGTH, 0);
    }

    function endPacket(): number {
        log(`end packet`)
        // put in TX mode
        writeRegister(REG_OP_MODE, MODE_LONG_RANGE_MODE | MODE_TX);

        // wait for TX done
        // TODO interupts!
        let k = 0;
        while ((readRegister(REG_IRQ_FLAGS) & IRQ_TX_DONE_MASK) == 0) {
            if (k++ % 100 == 0)
                log(`wait tx`)
            pause(10);
        }

        // clear IRQ's
        writeRegister(REG_IRQ_FLAGS, IRQ_TX_DONE_MASK);

        return 1;
    }

    /**
     * Write string to send
     **/
    //% parts="lora"
    //% group="Sender"
    //% blockId=lorasendstring block="lora send string $text"
    export function sendString(text: string) {
        if (!text) return;
        if (!isReady()) return;
        const buf = control.createBufferFromUTF8(text);
        sendBuffer(buf);
    }

    /**
     * Write buffer to send
     **/
    //% parts="lora"
    //% group="Sender"
    //% blockId=lorasendbuffer block="lora send buffer $buffer"
    export function sendBuffer(buffer: Buffer) {
        if (!buffer || buffer.length == 0) return;
        if (!isReady()) return;
        log('send')
        beginPacket();
        log(`write payload (${buffer.length} bytes)`)
        writeRaw(buffer);
        endPacket();
    }

    function writeRaw(buffer: Buffer) {
        const currentLength = readRegister(REG_PAYLOAD_LENGTH);
        let size = buffer.length;
        log(`current payload length: ${currentLength}`)

        // check size
        if ((currentLength + size) > MAX_PKT_LENGTH) {
            size = MAX_PKT_LENGTH - currentLength;
        }

        log(`write raw ${buffer.length} -> ${size} bytes`)

        // write data
        for (let i = 0; i < size; i++) {
            writeRegister(REG_FIFO, buffer[i]);
        }

        // update length
        writeRegister(REG_PAYLOAD_LENGTH, currentLength + size);
        log(`updated payload length: ${readRegister(REG_PAYLOAD_LENGTH)}`)
    }

    /**
    * Available Packet
    **/
    //% parts="lora"
    //% group="Packet"
    //% weight=45 blockGap=8 
    //% blockId=loraavailable block="lora available"
    export function available(): number {
        if (!isReady()) return 0;
        return readRegister(REG_RX_NB_BYTES) - _packetIndex;
    }

    /**
    * Read Packet
    **/
    //% parts="lora"
    //% group="Packet"
    //% blockId=loraread block="lora read"
    export function read(): number {
        if (!isReady()) return -1;
        if (!available())
            return -1;
        _packetIndex++;

        return readRegister(REG_FIFO);
    }

    /**
    * Peek Packet to send
    **/
    //% parts="lora"
    //% group="Packet"
    //% blockId=lorapeek block="lora peek"
    export function peek(): number {
        if (!isReady()) return -1;
        if (!available())
            return -1;

        // store current FIFO address
        const currentAddress = readRegister(REG_FIFO_ADDR_PTR);

        // read
        const b = readRegister(REG_FIFO);

        // restore FIFO address
        writeRegister(REG_FIFO_ADDR_PTR, currentAddress);

        return b;
    }

    function flush() {
        //TODO
    }

    /**
     * Put LoRa in idle mode
     */
    //% parts="lora"
    //% group="Mode"
    //% blockId=loraidle block="lora idle"
    export function idle() {
        if (!isReady()) return;
        log('idle')
        writeRegister(REG_OP_MODE, MODE_LONG_RANGE_MODE | MODE_STDBY);
    }

    /**
    * Sleep Mode
    **/
    //% parts="lora"
    //% group="Mode"
    //% blockId=lorasleep block="lora sleep"
    export function sleep() {
        if (!isReady()) return;
        writeRegister(REG_OP_MODE, MODE_LONG_RANGE_MODE | MODE_SLEEP);
    }


    function setTxPowerRegisters(level: number, rfo?: boolean) {
        level = level | 0;
        if (rfo) {
            // RFO
            if (level < 0) {
                level = 0;
            } else if (level > 14) {
                level = 14;
            }

            writeRegister(REG_PA_CONFIG, 0x70 | level);
        } else {
            // PA BOOST
            if (level < 2) {
                level = 2;
            } else if (level > 17) {
                level = 17;
            }

            writeRegister(REG_PA_CONFIG, PA_BOOST | (level - 2));
        }
    }

    /**
    * Set Tx Power
    **/
    //% parts="lora"
    //% group="Configuration"
    //% blockId=lorasettxpower block="lora set tx power to $level dBm"
    export function setTxPower(level: number, rfo?: boolean) {
        if (!isReady()) return;
        setTxPowerRegisters(level, rfo);
    }

    function setFrequencyRegisters(frequency: number) {
        _frequency = frequency;
        const frf = ((frequency * (1 << 19)) / 32000000) | 0;
        log(`frequency ${_frequency} -> ${frf}`);

        writeRegister(REG_FRF_MSB, (frf >> 16) & 0xff);
        writeRegister(REG_FRF_MID, (frf >> 8) & 0xff);
        writeRegister(REG_FRF_LSB, (frf >> 0) & 0xff);
    }

    /**
    * Set Frecuency of LoRa
    **/
    //% parts="lora"
    //% group="Configuration"
    //% blockId=lorasetsetfrequency block="lora set frequency to $frequency"
    export function setFrequency(frequency: number) {
        if (!isReady()) return;
        setFrequencyRegisters(_frequency);
    }

    /**
    * Get Spreading Factor of LoRa
    **/
    //% parts="lora"
    //% group="Configuration"
    //% blockId=loraspreadingfactor block="lora spreading factor"
    export function spreadingFactor(): number {
        if (!isReady()) return -1;
        return readRegister(REG_MODEM_CONFIG_2) >> 4;
    }

    /**
     * Sets the spreading factoring
     * @param factor spreading factor
     */
    //% parts="lora"
    //% blockId=lorasetspreadingfactor block="lora set spreading factor $factor"
    //% factor.min=6 factor.max=12
    //% factor.defl=8
    //% group="Configuration"
    export function setSpreadingFactor(factor: number) {
        if (!isReady()) return;
        factor = factor | 0;
        if (factor < 6) {
            factor = 6;
        } else if (factor > 12) {
            factor = 12;
        }

        if (factor == 6) {
            writeRegister(REG_DETECTION_OPTIMIZE, 0xc5);
            writeRegister(REG_DETECTION_THRESHOLD, 0x0c);
        } else {
            writeRegister(REG_DETECTION_OPTIMIZE, 0xc3);
            writeRegister(REG_DETECTION_THRESHOLD, 0x0a);
        }

        writeRegister(REG_MODEM_CONFIG_2, (readRegister(REG_MODEM_CONFIG_2) & 0x0f) | ((factor << 4) & 0xf0));
        setLdoFlag();
    }

    /**
    * Get Signal Bandwidth of LoRa
    **/
    //% parts="lora"
    //% group="Configuration"
    //% blockId=lorasignalbandwith block="signal bandwidth"
    export function signalBandwidth(): number {
        if (!isReady()) return 0;
        const bw = (readRegister(REG_MODEM_CONFIG_1) >> 4);
        switch (bw) {
            case 0: return 7.8E3;
            case 1: return 10.4E3;
            case 2: return 15.6E3;
            case 3: return 20.8E3;
            case 4: return 31.25E3;
            case 5: return 41.7E3;
            case 6: return 62.5E3;
            case 7: return 125E3;
            case 8: return 250E3;
            case 9: return 500E3;
        }
        // unknown
        return 0;
    }

    /**
    * Set Signal Bandwidth of LoRa
    **/
    //% parts="lora"
    //% group="Configuration"
    //% blockId=lorasetsignalbandwith block="set signal bandwidth to $value"
    export function setSignalBandwidth(value: number) {
        if (!isReady()) return;
        let bw;

        if (value <= 7.8E3) {
            bw = 0;
        } else if (value <= 10.4E3) {
            bw = 1;
        } else if (value <= 15.6E3) {
            bw = 2;
        } else if (value <= 20.8E3) {
            bw = 3;
        } else if (value <= 31.25E3) {
            bw = 4;
        } else if (value <= 41.7E3) {
            bw = 5;
        } else if (value <= 62.5E3) {
            bw = 6;
        } else if (value <= 125E3) {
            bw = 7;
        } else if (value <= 250E3) {
            bw = 8;
        } else /*if (sbw <= 250E3)*/ {
            bw = 9;
        }

        writeRegister(REG_MODEM_CONFIG_1, (readRegister(REG_MODEM_CONFIG_1) & 0x0f) | (bw << 4));
        setLdoFlag();
    }

    function setLdoFlag() {
        // Section 4.1.1.5
        const symbolDuration = 1000 / (signalBandwidth() / (1 << spreadingFactor()));

        // Section 4.1.1.6
        const ldoOn = symbolDuration > 16 ? 1 : 0;

        const config3 = readRegister(REG_MODEM_CONFIG_3);
        bitWrite(config3, 3, ldoOn);
        writeRegister(REG_MODEM_CONFIG_3, config3);
    }

    function setCodingRate4(denominator: number) {
        if (denominator < 5) {
            denominator = 5;
        } else if (denominator > 8) {
            denominator = 8;
        }

        const cr = denominator - 4;
        writeRegister(REG_MODEM_CONFIG_1, (readRegister(REG_MODEM_CONFIG_1) & 0xf1) | (cr << 1));
    }

    function setPreambleLength(length: number) {
        writeRegister(REG_PREAMBLE_MSB, (length >> 8) & 0xff);
        writeRegister(REG_PREAMBLE_LSB, (length >> 0) & 0xff);
    }

    function setSyncWord(sw: number) {
        writeRegister(REG_SYNC_WORD, sw);
    }

    //% parts="lora"
    //% group="Configuration"
    //% blockId=lorasetcrc block="lora set crc $on"
    //% on.shadow=toggleOnOff
    export function setCrc(on: boolean) {
        if (!isReady()) return;
        let v = readRegister(REG_MODEM_CONFIG_2);
        if (on) v = v | 0x04; else v = v & 0xfb;
        writeRegister(REG_MODEM_CONFIG_2, v);
    }

    export function dumpRegisters() {
        init();
        log(`state: ${["none", "initializing", "ready", "incorrect firmware", "invalid config"][state]}`)
        if (!isReady()) return;
        log(`registers:`)
        const buf = control.createBuffer(1);
        const regNames: any = {};
        regNames[REG_FIFO] = "REG_FIFO";
        regNames[REG_OP_MODE] = "REG_OP_MODE";
        // unused
        regNames[REG_FRF_MSB] = "REG_FRF_MSB";
        regNames[REG_FRF_MID] = "REG_FRF_MID";
        regNames[REG_FRF_LSB] = "REG_FRF_LSB";
        regNames[REG_PA_CONFIG] = "REG_PA_CONFIG";
        regNames[REG_PA_RAMP] = "REG_PA_RAMP";
        regNames[REG_OCP] = "REG_OCP";
        regNames[REG_LNA] = "REG_LNA";
        regNames[REG_FIFO_ADDR_PTR] = "REG_FIFO_ADDR_PTR";
        regNames[REG_FIFO_TX_BASE_ADDR] = "REG_FIFO_TX_BASE_ADDR";
        regNames[REG_FIFO_RX_BASE_ADDR] = "REG_FIFO_RX_BASE_ADDR";
        regNames[REG_FIFO_RX_CURRENT_ADDR] = "REG_FIFO_RX_CURRENT_ADDR";
        regNames[REG_IRQ_FLAGS] = "REG_IRQ_FLAGS";
        regNames[REG_RX_NB_BYTES] = "REG_RX_NB_BYTES";
        regNames[REG_RX_HEADER_COUNT_VALUE_MSB] = "REG_RX_HEADER_COUNT_VALUE_MSB";
        regNames[REG_RX_HEADER_COUNT_VALUE_LSB] = "REG_RX_HEADER_COUNT_VALUE_LSB";
        regNames[REG_RX_PACKET_COUNT_VALUE_MSB] = "REG_RX_PACKET_COUNT_VALUE_MSB";
        regNames[REG_RX_PACKET_COUNT_VALUE_LSB] = "REG_RX_PACKET_COUNT_VALUE_LSB";
        regNames[REG_MODEM_STAT] = "REG_MODEM_STAT";
        regNames[REG_PKT_SNR_VALUE] = "REG_PKT_SNR_VALUE";
        regNames[REG_PKT_RSSI_VALUE] = "REG_PKT_RSSI_VALUE";
        regNames[REG_MODEM_CONFIG_1] = "REG_MODEM_CONFIG_1";
        regNames[REG_MODEM_CONFIG_2] = "REG_MODEM_CONFIG_2";
        regNames[REG_PREAMBLE_MSB] = "REG_PREAMBLE_MSB";
        regNames[REG_PREAMBLE_LSB] = "REG_PREAMBLE_LSB";
        regNames[REG_PAYLOAD_LENGTH] = "REG_PAYLOAD_LENGTH";
        regNames[REG_MAX_PAYLOAD_LENGTH] = "REG_MAX_PAYLOAD_LENGTH";
        regNames[REG_HOP_PERIOD] = "REG_HOP_PERIOD";
        regNames[REG_FIFO_RX_BYTE_AD] = "REG_FIFO_RX_BYTE_AD";
        regNames[REG_MODEM_CONFIG_3] = "REG_MODEM_CONFIG_3";
        // 0x27 reserved
        regNames[REG_FREQ_ERROR_MSB] = "REG_FREQ_ERROR_MSB";
        regNames[REG_FREQ_ERROR_MID] = "REG_FREQ_ERROR_MID";
        regNames[REG_FREQ_ERROR_LSB] = "REG_FREQ_ERROR_LSB";
        // 2b reserved
        regNames[REG_RSSI_WIDEBAND] = "REG_RSSI_WIDEBAND";
        // 2d-2f reserved
        regNames[REG_DETECTION_OPTIMIZE] = "REG_DETECTION_OPTIMIZE";
        regNames[REG_INVERT_IQ] = "REG_INVERT_IQ";
        regNames[REG_DETECTION_THRESHOLD] = "REG_DETECTION_THRESHOLD";
        regNames[REG_SYNC_WORD] = "REG_SYNC_WORD";
        regNames[REG_DIO_MAPPING_1] = "REG_DIO_MAPPING_1";
        regNames[REG_DIO_MAPPING_2] = "REG_DIO_MAPPING_2";
        regNames[REG_VERSION] = "REG_VERSION";
        regNames[REG_TCXO] = "REG_TCXO";
        regNames[REG_PA_DAC] = "REG_PA_DAC";
        regNames[REG_FORMER_TEMP] = "REG_FORMER_TEMP";
        regNames[REG_AGC_REF] = "REG_AGC_REF";
        regNames[REG_AGC_THRESH_1] = "REG_AGC_THRESH_1";
        regNames[REG_AGC_THRESH_2] = "REG_AGC_THRESH_2";
        regNames[REG_AGC_THRESH_3] = "REG_AGC_THRESH_3";
        regNames[REG_PLL] = "REG_PLL";

        for (let i = 0; i < 128; i++) {
            let r: string = regNames[i];
            if (!!r) {
                r += " (0x";
                buf[0] = i;
                r += buf.toHex();
                r += "): 0x";
                buf[0] = readRegister(i);
                r += buf.toHex();
                log(r);
            }
        }
    }
}
