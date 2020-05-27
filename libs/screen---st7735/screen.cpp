#include "pxt.h"
#include "ST7735.h"
#include "ILI9341.h"

#include "SPIScreenIO.h"
#ifdef STM32F4
#include "FSMCIO.h"
#endif

#include "jddisplay.h"

namespace pxt {

class WDisplay {
  public:
    ScreenIO *io;
    ST7735 *lcd;
    JDDisplay *smart;

    uint32_t currPalette[16];
    bool newPalette;
    bool inUpdate;

    uint8_t *screenBuf;
    Image_ lastStatus;

    uint16_t width, height;
    uint16_t displayHeight;
    uint8_t offX, offY;
    bool doubleSize;
    uint32_t palXOR;

    WDisplay() {
        uint32_t cfg2 = getConfig(CFG_DISPLAY_CFG2, 0x0);
        int conn = cfg2 >> 24;

        uint32_t cfg0 = getConfig(CFG_DISPLAY_CFG0, 0x40);
        uint32_t frmctr1 = getConfig(CFG_DISPLAY_CFG1, 0x000603);

        int dispTp = getConfig(CFG_DISPLAY_TYPE, DISPLAY_TYPE_ST7735);

        doubleSize = false;
        smart = NULL;

        auto miso = LOOKUP_PIN(DISPLAY_MISO);

        if (dispTp == DISPLAY_TYPE_SMART) {
            dispTp = smartConfigure(&cfg0, &frmctr1, &cfg2);
        }

        if (dispTp != DISPLAY_TYPE_SMART)
            miso = NULL; // only JDDisplay needs MISO, otherwise leave free

        SPI *spi = NULL;
        if (conn == 0) {
            spi = new CODAL_SPI(*LOOKUP_PIN(DISPLAY_MOSI), *miso, *LOOKUP_PIN(DISPLAY_SCK));
            io = new SPIScreenIO(*spi);
        } else if (conn == 1) {
#ifdef CODAL_CREATE_PARALLEL_SCREEN_IO
            io = CODAL_CREATE_PARALLEL_SCREEN_IO(cfg2 & 0xffffff, PIN(DISPLAY_MOSI),
                                                 PIN(DISPLAY_MISO));
#else
            target_panic(PANIC_SCREEN_ERROR);
#endif
        } else {
            target_panic(PANIC_SCREEN_ERROR);
        }

        if (dispTp == DISPLAY_TYPE_ST7735)
            lcd = new ST7735(*io, *LOOKUP_PIN(DISPLAY_CS), *LOOKUP_PIN(DISPLAY_DC));
        else if (dispTp == DISPLAY_TYPE_ILI9341) {
            lcd = new ILI9341(*io, *LOOKUP_PIN(DISPLAY_CS), *LOOKUP_PIN(DISPLAY_DC));
            doubleSize = true;
        } else if (dispTp == DISPLAY_TYPE_SMART) {
            lcd = NULL;
            smart = new JDDisplay(spi, LOOKUP_PIN(DISPLAY_CS), LOOKUP_PIN(DISPLAY_DC));
        } else
            target_panic(PANIC_SCREEN_ERROR);

        palXOR = (cfg0 & 0x1000000) ? 0xffffff : 0x000000;
        auto madctl = cfg0 & 0xff;
        offX = (cfg0 >> 8) & 0xff;
        offY = (cfg0 >> 16) & 0xff;

        DMESG("configure screen: FRMCTR1=%p MADCTL=%p type=%d", frmctr1, madctl, dispTp);

        if (spi) {
            auto freq = (cfg2 & 0xff);
            if (!freq)
                freq = 15;
            spi->setFrequency(freq * 1000000);
            spi->setMode(0);
            auto cs = LOOKUP_PIN(DISPLAY_CS);
            if (cs)
                cs->setDigitalValue(1);

            // make sure the SPI peripheral is initialized before toggling reset
            spi->write(0);
        }

        auto rst = LOOKUP_PIN(DISPLAY_RST);
        if (rst) {
            rst->setDigitalValue(0);
            fiber_sleep(20);
            rst->setDigitalValue(1);
            fiber_sleep(20);
        }

        if (lcd) {
            auto bl = LOOKUP_PIN(DISPLAY_BL);
            if (bl) {
                bl->setDigitalValue(1);
            }

            lcd->init();
            lcd->configure(madctl, frmctr1);
        }

        width = getConfig(CFG_DISPLAY_WIDTH, 160);
        height = getConfig(CFG_DISPLAY_HEIGHT, 128);
        displayHeight = height;
        setAddrMain();
        DMESG("screen: %d x %d, off=%d,%d", width, height, offX, offY);
        int sz = doubleSize ? (width >> 1) * (height >> 1) : width * height;
        screenBuf = (uint8_t *)app_alloc(sz / 2 + 20);

        lastStatus = NULL;
        registerGC((TValue *)&lastStatus);
        inUpdate = false;
    }

    uint32_t smartConfigure(uint32_t *cfg0, uint32_t *cfg1, uint32_t *cfg2) {
        uint32_t hc;

        DMESG("74HC: waiting...");

        // wait while nothing is connected
        for (;;) {
            auto rst = LOOKUP_PIN(DISPLAY_RST);
            if (rst) {
                rst->setDigitalValue(0);
                target_wait_us(10);
                rst->setDigitalValue(1);
                fiber_sleep(3); // in reality we need around 1.2ms
            }

            hc = readButtonMultiplexer(17);
            if (hc != 0)
                break;

            fiber_sleep(100);
        }

        DMESG("74HC: %x", hc);

        // is the line forced up? if so, assume JDDisplay
        if (hc == 0x1FFFF) {
            disableButtonMultiplexer();
            return DISPLAY_TYPE_SMART;
        }

        // SER pin (or first bit of second HC) is orientation
        if (hc & 0x100)
            *cfg0 = 0x80;
        else
            *cfg0 = 0x40;

        uint32_t configId = (hc >> 14) & 0x7;

        switch (configId) {
        case 1:
            *cfg1 = 0x0603; // ST7735
            break;
        case 2:
            *cfg1 = 0xe14ff; // ILI9163C
            *cfg0 |= 0x08;   // BGR colors
            break;
        case 3:
            *cfg1 = 0x0603;     // ST7735
            *cfg0 |= 0x1000000; // inverted colors
            break;
        default:
            target_panic(PANIC_SCREEN_ERROR);
            break;
        }

        DMESG("config type: %d; cfg0=%x cfg1=%x", configId, *cfg0, *cfg1);

        *cfg2 = 32; // Damn the torpedoes! 32MHz

        return DISPLAY_TYPE_ST7735;
    }

    void setAddrStatus() {
        if (lcd)
            lcd->setAddrWindow(offX, offY + displayHeight, width, height - displayHeight);
        else
            smart->setAddrWindow(offX, offY + displayHeight, width, height - displayHeight);
    }
    void setAddrMain() {
        if (lcd)
            lcd->setAddrWindow(offX, offY, width, displayHeight);
        else
            smart->setAddrWindow(offX, offY, width, displayHeight);
    }
    void waitForSendDone() {
        if (lcd)
            lcd->waitForSendDone();
        else
            smart->waitForSendDone();
    }
    int sendIndexedImage(const uint8_t *src, unsigned width, unsigned height, uint32_t *palette) {
        if (lcd)
            return lcd->sendIndexedImage(src, width, height, palette);
        else
            return smart->sendIndexedImage(src, width, height, palette);
    }
};

SINGLETON_IF_PIN(WDisplay, DISPLAY_MOSI);

//%
int setScreenBrightnessSupported() {
    auto display = getWDisplay();
    if (display && display->smart)
        return 1;

    auto bl = LOOKUP_PIN(DISPLAY_BL);
    if (!bl)
        return 0;
#ifdef SAMD51
    if (bl->name == PA06)
        return 0;
#endif
#ifdef NRF52_SERIES
    // PWM not implemented yet
    return 0;
#else
    return 1;
#endif
}

//%
void setScreenBrightness(int level) {
    if (level < 0)
        level = 0;
    if (level > 100)
        level = 100;

    auto display = getWDisplay();
    if (display && display->smart) {
        display->smart->brightness = level;
        return;
    }

    auto bl = LOOKUP_PIN(DISPLAY_BL);
    if (!bl)
        return;

    if (level == 0)
        bl->setDigitalValue(0);
    else if (level == 100)
        bl->setDigitalValue(1);
    else {
        if (setScreenBrightnessSupported()) {
            bl->setAnalogPeriodUs(1000);
            bl->setAnalogValue(level * level * 1023 / 10000);
        }
    }
}

//%
void setPalette(Buffer buf) {
    auto display = getWDisplay();
    if (!display)
        return;

    if (48 != buf->length)
        target_panic(PANIC_SCREEN_ERROR);
    for (int i = 0; i < 16; ++i) {
        display->currPalette[i] =
            (buf->data[i * 3] << 16) | (buf->data[i * 3 + 1] << 8) | (buf->data[i * 3 + 2] << 0);
        display->currPalette[i] ^= display->palXOR;
    }
    display->newPalette = true;
}

//%
void setupScreenStatusBar(int barHeight) {
    auto display = getWDisplay();
    if (!display)
        return;
    if (!display->doubleSize) {
        display->displayHeight = display->height - barHeight;
        display->setAddrMain();
    }
}

//%
void updateScreenStatusBar(Image_ img) {
    auto display = getWDisplay();
    if (!display)
        return;

    if (!img)
        return;
    display->lastStatus = img;
}

//%
void updateScreen(Image_ img) {
    auto display = getWDisplay();
    if (!display)
        return;

    if (display->inUpdate)
        return;

    display->inUpdate = true;

    auto mult = display->doubleSize ? 2 : 1;

    if (img) {
        if (img->bpp() != 4 || img->width() * mult != display->width ||
            img->height() * mult != display->displayHeight)
            target_panic(PANIC_SCREEN_ERROR);

        // DMESG("wait for done");
        display->waitForSendDone();

        auto palette = display->currPalette;

        if (display->newPalette) {
            display->newPalette = false;
        } else {
            // smart mode always sends palette
            if (!display->smart)
                palette = NULL;
        }

        memcpy(display->screenBuf, img->pix(), img->pixLength());

        // DMESG("send");
        display->sendIndexedImage(display->screenBuf, img->width(), img->height(), palette);
    }

    if (display->lastStatus && !display->doubleSize) {
        display->waitForSendDone();
        img = display->lastStatus;
        auto barHeight = display->height - display->displayHeight;
        if (img->bpp() != 4 || barHeight != img->height() || img->width() != display->width)
            target_panic(PANIC_SCREEN_ERROR);
        memcpy(display->screenBuf, img->pix(), img->pixLength());
        display->setAddrStatus();
        display->sendIndexedImage(display->screenBuf, img->width(), img->height(), NULL);
        display->waitForSendDone();
        display->setAddrMain();
        display->lastStatus = NULL;
    }

    display->inUpdate = false;
}

//%
void updateStats(String msg) {
    // ignore...
}

} // namespace pxt