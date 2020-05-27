#include "pxt.h"

#if defined(NRF52_SERIES)
#define _estack __StackTop 
#endif
extern uint32_t _estack;

namespace control {

/**
 * Announce that an event happened to registered handlers.
 * @param src ID of the MicroBit Component that generated the event
 * @param value Component specific code indicating the cause of the event.
 */
//% weight=21 blockGap=12 blockId="control_raise_event"
//% help=control/raise-event
//% block="raise event|from %src|with value %value" blockExternalInputs=1
void raiseEvent(int src, int value) {
    Event evt(src, value);
}

/**
* Determine the version of system software currently running.
*/
//% blockId="control_device_dal_version" block="device dal version"
//% help=control/device-dal-version
String deviceDalVersion() {
    return mkString(device.getVersion());
}

/**
* Allocates the next user notification event
*/
//% help=control/allocate-notify-event
int allocateNotifyEvent() {
    return ::allocateNotifyEvent();
}

/** Write a message to DMESG debugging buffer. */
//%
void dmesg(String s) {
    DMESG("# %s", s->getUTF8Data());
}

/** Write a message and value (pointer) to DMESG debugging buffer. */
//%
void dmesgPtr(String str, Object_ ptr) {
    DMESG("# %s: %p", str->getUTF8Data(), ptr);
}

//%
uint32_t _ramSize()
{
    return (uint32_t)&_estack & 0x1fffffff;
}

}
