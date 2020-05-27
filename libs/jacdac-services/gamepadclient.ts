enum JDGamepadButton {
    //% enumval=0
    B = 0,
    //% enumval=1
    A = 1,
    //% enumval=2
    Y = 2,
    //% enumval=3
    X = 3,
    //% block="left bumper"
    //% enumval=4
    LeftBumper = 4,
    //% block="right bumper"
    //% enumval=5
    RightBumper = 5,
    //% block="left trigger"
    //% enumval=6
    LeftTrigger = 6,
    //% block="right trigger"
    //% enumval=7
    RightTrigger = 7,
    //% block="select"
    //% enumval=8
    Select = 8,
    //% block="start"
    //% enumval=9
    Start = 9,
    //% block="left stick"
    //% enumval=10
    LeftStick = 10,
    //% block="right stick"
    //% enumval=11
    RightStick = 11,
    //% block="up"
    //% enumval=12
    Up = 12,
    //% block="down"
    //% enumval=13
    Down = 13,
    //% block="left"
    //% enumval=14
    Left = 14,
    //% block="right"
    //% enumval=15
    Right = 15
}

namespace jacdac {
    /**
     * Maps to a standard layout button to the button index
     * @param button the name of the button
     */
    //% blockId=jdjoystickStandardButton block="%button"
    //% shim=TD_ID blockHidden=1
    export function gamepadButton(button: JDGamepadButton): number {
        return button;
    }

    //% fixedInstances
    export class GamepadClient extends Client {
        constructor(requiredDevice: string = null) {
            super("gpad", jd_class.GAMEPAD, requiredDevice);
        }

        /** 
         * Sets the button state to down
         */
        //% blockId=jdjoystickSetButton block="%gamepad button %index=jdjoystickStandardButton|%down=toggleDownUp"
        //% weight=100 group="Gamepad"
        setButton(index: number, down: boolean): void {
            this.sendPackedCommand(JDGamepadCommand.Button, "Bb", [index, down ? 1 : 0])
        }

        /**
         * Sets the current move on the gamepad
         **/
        //% blockId=gamepadMove block="%gamepad %index|move by x %x|y %y"
        //% help=gamepad/move
        //% index.min=0 index.max=1
        //% blockGap=8 group="Gamepad"
        move(index: number, x: number, y: number): void {
            this.sendPackedCommand(JDGamepadCommand.Move, "Bbb", [index, x, y])
        }

        /** 
         * Sets the throttle state
         */
        //% blockId=gamepadSetThrottle block="%gamepad set throttle %index|to %value"
        //% gamepad/set-throttle blockHidden=1
        //% index.min=0 index.max=1
        //% value.min=0 value.max=31
        //% group="Gamepad"
        setThrottle(index: number, value: number): void {
            this.sendPackedCommand(JDGamepadCommand.Throttle, "Bb", [index, value])
        }
    }

    //% fixedInstance whenUsed block="gamepad client"
    export const gamepadClient = new GamepadClient();
}