#include "pxt.h"
#include "pins.h"

#include <stdlib.h>
#include <unistd.h>
#include <stdio.h>
#include <fcntl.h>
#include <linux/fb.h>
#include <linux/kd.h>
#include <sys/mman.h>
#include <sys/ioctl.h>
#include <pthread.h>

namespace pxt {
class WDisplay {
  public:
    uint32_t currPalette[16];
    bool newPalette;
    volatile bool painted;
    volatile bool dirty;

    uint8_t *screenBuf;
    Image_ lastImg;

    int width, height;

    int fb_fd;
    uint32_t *fbuf;
    struct fb_fix_screeninfo finfo;
    struct fb_var_screeninfo vinfo;

    int eventId;

    int is32Bit;

    pthread_mutex_t mutex;

    WDisplay();
    void updateLoop();
    void update(Image_ img);
};

SINGLETON(WDisplay);

static void *updateDisplay(void *wd) {
    ((WDisplay *)wd)->updateLoop();
    return NULL;
}

void WDisplay::updateLoop() {
    int cur_page = 1;
    int frameNo = 0;
    int numPages = vinfo.yres_virtual / vinfo.yres;
    int ledScreen = getConfigInt("LED_SCREEN", 0);

    int sx = vinfo.xres / width;
    int sy = vinfo.yres / height;

    if (ledScreen)
        sx = ledScreen;

    if (sx > sy)
        sx = sy;
    else
        sy = sx;

    if (sx > 1)
        sx &= ~1;

    int offx = (vinfo.xres - width * sx) / 2;
    int offy = (vinfo.yres - height * sy) / 2;

    if (ledScreen) {
        offx = getConfigInt("LED_SCREEN_X", 0);
        offy = getConfigInt("LED_SCREEN_Y", 0);
    }

    int screensize = finfo.line_length * vinfo.yres;
    uint32_t skip = offx;

    if (sx > 1)
        offx &= ~1;

    DMESG("sx=%d sy=%d ox=%d oy=%d 32=%d", sx, sy, offx, offy, is32Bit);
    DMESG("fbuf=%p sz:%d", fbuf, screensize);
    memset(fbuf, 0x00, screensize * numPages);

    if (numPages == 1)
        cur_page = 0;

    dirty = true;

    DMESG("loop");

    for (;;) {
        auto start0 = current_time_us();

        while (!dirty)
            sleep_core_us(2000);

        // auto start = current_time_us();
        // DMESG("update");

        pthread_mutex_lock(&mutex);
        dirty = false;

        if (!is32Bit) {
            uint16_t *dst =
                (uint16_t *)fbuf + cur_page * screensize / 2 + offx + offy * finfo.line_length / 2;
            if (sx == 1 && sy == 1) {
                skip = vinfo.xres - width * sx;
                for (int yy = 0; yy < height; yy++) {
                    auto shift = yy & 1 ? 4 : 0;
                    auto src = screenBuf + yy / 2;
                    for (int xx = 0; xx < width; ++xx) {
                        int c = this->currPalette[(*src >> shift) & 0xf];
                        src += height / 2;
                        *dst++ = c;
                    }
                    dst += skip;
                }
            } else {
                uint32_t *d2 = (uint32_t *)dst;
                for (int yy = 0; yy < height; yy++) {
                    auto shift = yy & 1 ? 4 : 0;
                    for (int i = 0; i < sy; ++i) {
                        auto src = screenBuf + yy / 2;
                        for (int xx = 0; xx < width; ++xx) {
                            int c = this->currPalette[(*src >> shift) & 0xf];
                            src += height / 2;
                            for (int j = 0; j < sx / 2; ++j)
                                *d2++ = c;
                        }
                        d2 += skip;
                    }
                }
            }
        } else {
            uint32_t *d2 =
                (uint32_t *)fbuf + cur_page * screensize / 4 + offx + offy * finfo.line_length / 4;
            skip = vinfo.xres - width * sx;
            for (int yy = 0; yy < height; yy++) {
                auto shift = yy & 1 ? 4 : 0;
                for (int i = 0; i < sy; ++i) {
                    auto src = screenBuf + yy / 2;
                    for (int xx = 0; xx < width; ++xx) {
                        int c = this->currPalette[(*src >> shift) & 0xf];
                        src += height / 2;
                        for (int j = 0; j < sx; ++j)
                            *d2++ = c;
                    }
                    d2 += skip;
                }
            }
        }

        pthread_mutex_unlock(&mutex);

        // auto len = current_time_us() - start;

        painted = true;
        raiseEvent(DEVICE_ID_NOTIFY_ONE, eventId);

        vinfo.yoffset = cur_page * vinfo.yres;
        ioctl(fb_fd, FBIOPAN_DISPLAY, &vinfo);
        ioctl(fb_fd, FBIO_WAITFORVSYNC, 0);
        if (numPages > 1)
            cur_page = !cur_page;
        frameNo++;

        auto fulllen = current_time_us() - start0;
        // throttle it to 40fps (really 30fps)
        if (fulllen < 25000) {
            ioctl(fb_fd, FBIO_WAITFORVSYNC, 0);
        }

        // auto tot = current_time_us() - start;
        // if (frameNo % 37 == 0)
        //    DMESG("copy %d us, tot %d us delay %d us",  (int)len, (int)tot, (int)(start-start0));
    }
}

WDisplay::WDisplay() {
    pthread_mutex_init(&mutex, NULL);

    width = getConfig(CFG_DISPLAY_WIDTH, 160);
    height = getConfig(CFG_DISPLAY_HEIGHT, 128);
    screenBuf = new uint8_t[width * height / 2 + 20];
    lastImg = NULL;
    newPalette = false;

    registerGC((TValue *)&lastImg);

    eventId = allocateNotifyEvent();

    int tty_fd = open("/dev/tty0", O_RDWR);
    ioctl(tty_fd, KDSETMODE, KD_GRAPHICS);

    fb_fd = open("/dev/fb0", O_RDWR);

    if (fb_fd < 0)
        target_panic(PANIC_SCREEN_ERROR);

    ioctl(fb_fd, FBIOGET_FSCREENINFO, &finfo);
    ioctl(fb_fd, FBIOGET_VSCREENINFO, &vinfo);

    DMESG("FB: %s at %dx%d %dx%d bpp=%d", finfo.id, vinfo.xres, vinfo.yres, vinfo.xres_virtual,
          vinfo.yres_virtual, vinfo.bits_per_pixel);

    vinfo.yres_virtual = vinfo.yres * 2;
    vinfo.xres_virtual = vinfo.xres;

    if (vinfo.bits_per_pixel == 32) {
        is32Bit = true;
    } else {
        vinfo.bits_per_pixel = 16;
        is32Bit = false;
    }

    ioctl(fb_fd, FBIOPUT_VSCREENINFO, &vinfo);
    ioctl(fb_fd, FBIOGET_FSCREENINFO, &finfo);
    ioctl(fb_fd, FBIOGET_VSCREENINFO, &vinfo);

    DMESG("FB: %s at %dx%d %dx%d bpp=%d %d", finfo.id, vinfo.xres, vinfo.yres, vinfo.xres_virtual,
          vinfo.yres_virtual, vinfo.bits_per_pixel, finfo.line_length);

    fbuf = (uint32_t *)mmap(0, finfo.line_length * vinfo.yres_virtual, PROT_READ | PROT_WRITE,
                            MAP_SHARED, fb_fd, (off_t)0);

    pthread_t upd;
    pthread_create(&upd, NULL, updateDisplay, this);
    pthread_detach(upd);
}

//%
int setScreenBrightnessSupported() {
    return 0;
}

//%
void setScreenBrightness(int level) {
    // TODO
}

//%
void setPalette(Buffer buf) {
    auto display = getWDisplay();
    if (48 != buf->length)
        target_panic(PANIC_SCREEN_ERROR);
    for (int i = 0; i < 16; ++i) {
        uint8_t r = buf->data[i * 3];
        uint8_t g = buf->data[i * 3 + 1];
        uint8_t b = buf->data[i * 3 + 2];
        if (display->is32Bit) {
            display->currPalette[i] = (r << 16) | (g << 8) | (b << 0);
        } else {
            r >>= 3;
            g >>= 2;
            b >>= 3;
            uint16_t cc = (r << 11) | (g << 5) | (b << 0);
            display->currPalette[i] = (cc << 16) | cc;
        }
    }
    display->newPalette = true;
}

void WDisplay::update(Image_ img) {
    if (img && img != lastImg) {
        lastImg = img;
    }
    img = lastImg;

    if (img) {
        if (img->bpp() != 4 || img->width() != width || img->height() != height)
            target_panic(PANIC_SCREEN_ERROR);

        if (!painted) {
            // race is possible (though very unlikely), but in such case we just
            // wait for next frame paint
            waitForEvent(DEVICE_ID_NOTIFY, eventId);
        }
        painted = false;

        pthread_mutex_lock(&mutex);
        dirty = true;
        if (newPalette) {
            newPalette = false;
        }
        memcpy(screenBuf, img->pix(), img->pixLength());
        pthread_mutex_unlock(&mutex);
    }
}

//%
void updateScreen(Image_ img) {
    getWDisplay()->update(img);
}

//%
void updateStats(String msg) {
    // DMESG("render: %s", msg->data);
}
} // namespace pxt