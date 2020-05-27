namespace jacdac {

    /**
     * A driver that listens for message bus events
     */
    export class MessageBusService extends Broadcast {
        suppressForwarding: boolean;

        static NAME = "bus";
        constructor() {
            super(MessageBusService.NAME, jd_class.MESSAGE_BUS);
            this.suppressForwarding = false;
        }

        raiseEvent(id: number, value: number) {
            this.start();
            this.sendReport(
                JDPacket.packed(CMD_EVENT,  "II", [id, value]))
        }

        broadcastEvent(id: number, value: number) {
            this.start();
            //control.dmesg(`jd> msgbus> listen event ${id} ${value}`)        
            control.onEvent(id, value, () => {
                if (this.suppressForwarding) return;
                this.raiseEvent(id, value);
            })
        }

        handlePacket(packet: JDPacket) {
            if (packet.service_command == CMD_EVENT) {
                const [id, value] = packet.data.unpack("II")
                this.suppressForwarding = true;
                control.raiseEvent(id, value);
                this.suppressForwarding = false;
            }
        }
    }

    //% fixedInstance whenUsed block="message bus service"
    export const messageBusService = new MessageBusService();

    /**
     * Pipes specific events through JACDAC
     */
    //% block="broadcast events|from %src|with value %value" weight=5
    //% group="Control"
    export function broadcastEvent(src: number, value: number) {
        messageBusService.broadcastEvent(src, value);
    }

    /**
     * Gets the message code
     */
    //% blockHidden=1 shim=ENUM_GET
    //% blockId=jacdacMessageCode block="$msg" enumInitialMembers="message1"
    //% enumName=JacDacMessage enumMemberName=msg enumPromptHint="e.g. Start, Stop, Jump..."
    //% group="Broadcast"
    //% enumIsHash
    export function __message(msg: number): number {
        return msg;
    }

    /**
     * Sends an event over JacDac
     * @param id 
     * @param value 
     */
    //% blockid=jacdacraisevent
    //% block="raise event|from %src|with value %value" weight=5
    //% group="Control"
    export function raiseEvent(src: number, value: number) {
        messageBusService.raiseEvent(src, value);
    }

    /**
     * Broadcasts a message over JacDac
     * @param msg 
     */
    //% blockId=jacdacBroadcastMessage block="jacdac send $msg"
    //% msg.shadow=jacdacMessageCode draggableParameters
    //% weight=200
    //% blockGap=8
    //% help=jacdac/send-message
    //% group="Broadcast"
    export function sendMessage(msg: number): void {
        // 0 is MICROBIT_EVT_ANY, shifting by 1
        messageBusService.raiseEvent(JD_MESSAGE_BUS_ID, msg + 1);
    }

    /**
     * Registers code to run for a particular message
     * @param msg 
     * @param handler 
     */
    //% blockId=jacdacOnMessageReceived block="on jacdac $msg received"
    //% msg.shadow=jacdacMessageCode draggableParameters
    //% weight=199
    //% help=jacdac/on-received-message
    //% group="Broadcast"
    export function onReceivedMessage(msg: number, handler: () => void) {
        messageBusService.start();
        control.onEvent(JD_MESSAGE_BUS_ID, msg + 1, handler);
    }
}