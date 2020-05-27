#ifndef __PXT_PLATFORM_H
#define __PXT_PLATFORM_H

#define OUTPUT_BITS 12

#define PAGE_SIZE 1024 // not really

#define DEV_NUM_PINS 28

#define DEV_PWM_PINS 0xffffffffULL
#define DEV_AIN_PINS 0ULL


// Codal doesn't yet distinguish between PWM and AIN
#define DEV_ANALOG_PINS (DEV_PWM_PINS | DEV_AIN_PINS)

#define CODAL_PIN ZPin
#define CODAL_TIMER ZTimer
#define CODAL_SPI ZSPI
#define CODAL_I2C ZI2C


namespace pxt
{

    class ZPin;
    class AbstractButton;
    class MultiButton;
    class CodalComponent;
    
    
} // pxt

#define IMAGE_BITS 4
#define PXT_GC_THREAD_LIST 1

#define PXT_IN_ISR() false

#define PROGDIR "/sd/prj"
#undef SETTINGSDIR

// #define SETTINGSDIR "/sd/cfg"

#endif
