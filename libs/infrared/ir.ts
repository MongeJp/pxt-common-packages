class InfraredPacket {
    /**
     * The first number in the payload.
     */
    public receivedNumber: number;
    /**
     * The array of numbers of received.
     */
    public receivedNumbers: number[];
    /**
     * The raw buffer of data received
     */
    public receivedBuffer: Buffer;
}

namespace network {
    /**
     * Send a number over the infrared transmitter.
     * @param value number to send
     */
    //% blockId="ir_send_number" block="infrared send number %value"
    //% help=network/infrared-send-number
    //% parts="ir" weight=90 group="Infrared"
    export function infraredSendNumber(value: number) {
        infraredSendNumbers([value]);
    }

    /**
     * Send an array of numbers over infrared. The array size has to be 32 bytes or less.
     * @param values 
     */
    //% parts="ir" group="Infrared"
    export function infraredSendNumbers(values: number[]) {
        let buf = msgpack.packNumberArray(values);
        if (buf.length % 2) {
            const buf2 = control.createBuffer(buf.length + 1);
            buf2.write(0, buf);
            buf2[buf2.length - 1] = 0xc1;
            buf = buf2;
        }
        infraredSendPacket(buf);
    }

    /**
     * Run some code when the infrared receiver gets a number.
     */
    //% blockId=ir_on_infrared_received block="on infrared received" blockGap=8
    //% help=network/on-infrared-received-number
    //% parts="ir" group="Infrared"
    export function onInfraredReceivedNumber(handler: (num: number) => void) {
        onInfraredPacket(() => {
            const buf: Buffer = infraredPacket();
            const nums: number[] = msgpack.unpackNumberArray(buf) || [];
            const num = nums[0] || 0;
            handler(num);
        });
    }

    /**
     * Run some code when the infrared receiver gets a list of numbers.
     */
    export function onInfraredReceivedNumbers(handler: (nums: number[]) => void) {
        onInfraredPacket(() => {
            const buf: Buffer = infraredPacket();
            const nums: number[] = msgpack.unpackNumberArray(buf) || [];
            handler(nums);
        });
    }
    
    /**
     * Run some code when the infrared receiver gets a buffer.
     */
    export function onInfraredReceivedBuffer(handler: (buf: Buffer) => void) {
        onInfraredPacket(() => {
            const buf: Buffer = infraredPacket();
            handler(buf);
        });
    }
    
    /**
     * Run some code when the infrared receiver gets a packet.
     */
    //% mutate=objectdestructuring
    //% mutateText=InfraredPacket
    //% mutateDefaults="receivedNumber"
    //% blockId=ir_on_packet_received block="on infrared received" blockGap=8
    //% parts="ir" group="Infrared" blockHidden=1 deprecated=1
    export function onInfraredPacketReceived(cb: (p: InfraredPacket) => void) {
        onInfraredPacket(() => {
            const buf: Buffer = infraredPacket();
            const nums: number[] = msgpack.unpackNumberArray(buf) || [];
            const num = nums[0] || 0;

            const packet = new InfraredPacket();
            packet.receivedBuffer = buf;
            packet.receivedNumbers = nums;
            packet.receivedNumber = num;
            cb(packet)
        });
    }
}