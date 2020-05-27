/**
 * Power and sleep management
 */
//% advanced=true icon="\uf011" color="#898989"
//% weight=1 blockGap=8
namespace power {
    let _poked: number;
    let _timeout: number;

    /**
     * Set the no-activity duration after which the device should go to deep sleep.
     * @param seconds duration in seconds until the device should be put in lower power mode
     */
    //% blockId=powersetdeepsleeptimout block="power set deep sleep timeout to %seconds s"
    //% seconds.defl=60
    //% help=/power/set-deep-sleep-timeout
    export function setDeepSleepTimeout(seconds: number) {
        init();
        _timeout = seconds * 1000;
    }

    /**
     * Poke the activity watcher to keep the device awake.
     */
    //% blockId=powerpke block="power poke"
    //% help=/power/poke
    export function poke() {
        init();
        _poked = control.millis();
    }

    /**
     * Check if the device has had any "pokes" and needs to go into deep sleep mode.
     */
    //% blockId=powercheckdeepsleep block="power check deep sleep"
    //% help=/power/check-deep-sleep
    export function checkDeepSleep() {
        init();
        const p = _poked || 0;
        const to = _timeout || 0;
        if (to > 0 && 
            control.millis() - p > to &&
            !control.isUSBInitialized()) {
            // going to deep sleep
            deepSleep();
        }
    }

    /**
     * Put the device into a deep sleep state.
     */
    //% blockId=powerdeepsleep block="power deep sleep"
    //% shim=pxt::deepSleep
    //% help=/power/deep-sleep
    export function deepSleep() {
    }

    function init() {
        if (_timeout !== undefined) return;

        // read default value
        _timeout = control.getConfigValue(DAL.CFG_POWER_DEEPSLEEP_TIMEOUT, -1) * 1000;
        // ensure deepsleep is long enough
        const minDeepSleepTimeout = 300000;
        if (_timeout > 0 && _timeout < minDeepSleepTimeout)
            _timeout = minDeepSleepTimeout;
    }
}
