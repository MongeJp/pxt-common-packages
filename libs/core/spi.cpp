#include "pxt.h"
#include "ErrorNo.h"

namespace pins {

class CodalSPIProxy {
private:
    DevicePin* mosi; 
    DevicePin* miso; 
    DevicePin* sck;
    CODAL_SPI spi;
public:
    CodalSPIProxy* next;

public:
    CodalSPIProxy(DevicePin* _mosi, DevicePin* _miso, DevicePin* _sck)
        : mosi(_mosi)
        , miso(_miso)
        , sck(_sck)
        , spi(*_mosi, *_miso, *_sck) 
        , next(NULL)
    {
    }

#ifdef CODAL_SPI_SLAVE_SUPPORTED
    CodalSPIProxy(DevicePin* _mosi, DevicePin* _miso, DevicePin* _sck, DevicePin* _cs)
        : mosi(_mosi)
        , miso(_miso)
        , sck(_sck)
        , spi(*_mosi, *_miso, *_sck, _cs) 
        , next(NULL)
    {
    }
#endif

    CODAL_SPI* getSPI() {
        return &spi;
    }

    bool matchPins(DevicePin* mosi, DevicePin* miso, DevicePin* sck) {
        return this->mosi == mosi && this->miso == miso && this->sck == sck;
    }

    int write(int value) {
        return spi.write(value);
    }

    void transfer(Buffer command, Buffer response) {
        auto cdata = NULL == command ? NULL : command->data;
        auto clength = NULL == command ? 0 : command->length;
        auto rdata = NULL == response ? NULL : response->data;
        auto rlength = NULL == response ? 0 : response->length;
        spi.transfer(cdata, clength, rdata, rlength);
    }

    void setFrequency(int frequency) {
        spi.setFrequency(frequency);
    }

    void setMode(int mode) {
        spi.setMode(mode);
    }
};

SPI_ spis(NULL);

/**
* Opens a SPI driver
*/
//% help=pins/create-spi
//% parts=spi
SPI_ createSPI(DigitalInOutPin mosiPin, DigitalInOutPin misoPin, DigitalInOutPin sckPin) {
  auto dev = spis;
  while(dev) {
    if (dev->matchPins(mosiPin, misoPin, sckPin))
      return dev;
    dev = dev->next;
  }

  auto ser = new CodalSPIProxy(mosiPin, misoPin, sckPin);
  ser->next = spis;
  spis = ser;
  return ser;
}

/**
* Opens a slave SPI driver
*/
//% parts=spi
SPI_ createSlaveSPI(DigitalInOutPin mosiPin, DigitalInOutPin misoPin, DigitalInOutPin sckPin, DigitalInOutPin csPin) {
#ifdef CODAL_SPI_SLAVE_SUPPORTED
  auto dev = spis;
  if (!csPin)
    target_panic(PANIC_CODAL_HARDWARE_CONFIGURATION_ERROR);
  while(dev) {
    if (dev->matchPins(mosiPin, misoPin, sckPin))
      return dev;
    dev = dev->next;
  }

  auto ser = new CodalSPIProxy(mosiPin, misoPin, sckPin, csPin);
  ser->next = spis;
  spis = ser;
  return ser;
#else
  target_panic(PANIC_CODAL_HARDWARE_CONFIGURATION_ERROR);
  return NULL;
#endif
}

}

namespace pxt {

CODAL_SPI* getSPI(DigitalInOutPin mosiPin, DigitalInOutPin misoPin, DigitalInOutPin sckPin) {
    auto spi = pins::createSPI(mosiPin, misoPin, sckPin);
    return spi->getSPI();
}

}

namespace SPIMethods {

/**
* Write to the SPI bus
*/
//%
int write(SPI_ device, int value) {
    return device->write(value);
}

/**
* Transfer buffers over the SPI bus
*/
//% argsNullable
void transfer(SPI_ device, Buffer command, Buffer response) {
    if (!device)
        target_panic(PANIC_CAST_FROM_NULL);
    if (!command && !response)
        return;
    device->transfer(command, response);
}

/**
* Sets the SPI clock frequency
*/
//%
void setFrequency(SPI_ device, int frequency) {
    device->setFrequency(frequency);
}

/**
* Sets the SPI bus mode
*/
//%
void setMode(SPI_ device, int mode) {
    device->setMode(mode);
}

}
