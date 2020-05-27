#include "pxt.h"
#include "pulse.h"
#include "SAMDTCTimer.h"
#include "SAMDTCCTimer.h"

namespace network {

class IrWrap : public PulseBase {
  public:
    IrWrap()
        : PulseBase(PULSE_IR_COMPONENT_ID, PIN(IR_OUT), PIN(IR_IN),
                    new SAMDTCTimer(TC4, TC4_IRQn)) {
        setupGapEvents();
    }
};
SINGLETON(IrWrap);
/**
 * Send data over IR.
 */
//% parts="ir"
void infraredSendPacket(Buffer buf) {
    auto w = getIrWrap();
    w->send(buf);
}

/**
 * Get most recent packet received over IR.
 */
//% parts="ir"
Buffer infraredPacket() {
    auto w = getIrWrap();
    return w->getBuffer();
}

/**
 * Run action after a packet is recieved over IR.
 */
//% parts="ir"
void onInfraredPacket(Action body) {
    getIrWrap(); // attach events
    registerWithDal(PULSE_IR_COMPONENT_ID, PULSE_PACKET_EVENT, body);
}

/**
 * Run action after there's an error recieving packet over IR.
 */
//%
void onInfraredError(Action body) {
    getIrWrap();
    registerWithDal(PULSE_IR_COMPONENT_ID, PULSE_PACKET_ERROR_EVENT, body);
}
} // namespace network
