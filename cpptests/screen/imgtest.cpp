#include "pxt.h"
#include <stdlib.h>

namespace ImageMethods {
int width(Image_ img);
int height(Image_ img);
bool isMono(Image_ img);
void setPixel(Image_ img, int x, int y, int c);
int getPixel(Image_ img, int x, int y);
void fill(Image_ img, int c);
void fillRect(Image_ img, int x, int y, int w, int h, int c);
void _fillRect(Image_ img, int xy, int wh, int c);
Image_ clone(Image_ img);
void flipX(Image_ img);
void flipY(Image_ img);
void scroll(Image_ img, int dx, int dy);
Image_ doubledX(Image_ img);
Image_ doubledY(Image_ img);
void replace(Image_ img, int from, int to);
Image_ doubled(Image_ img);
void drawImage(Image_ img, Image_ from, int x, int y);
void drawTransparentImage(Image_ img, Image_ from, int x, int y);
bool overlapsWith(Image_ img, Image_ other, int x, int y);
void _drawIcon(Image_ img, Buffer icon, int xy, int c);
void _drawLine(Image_ img, int xy, int wh, int c);
void copyFrom(Image_ img, Image_ from);
bool drawImageCore(Image_ img, Image_ from, int x, int y, int color);
} // namespace ImageMethods

int bpp = 4;

void golden_drawTransparentImage(Image_ img, Image_ from, int x, int y, int col = -1) {
    for (int i = 0; i < ImageMethods::width(from); ++i)
        for (int j = 0; j < ImageMethods::height(from); ++j) {
            auto pix = ImageMethods::getPixel(from, i, j);
            if (pix || col == -2)
                ImageMethods::setPixel(img, x + i, y + j, col < 0 ? pix : col);
        }
}

void golden_fillRect(Image_ img, int x, int y, int w, int h, int c) {
    for (int i = 0; i < w; ++i)
        for (int j = 0; j < h; ++j) {
            ImageMethods::setPixel(img, x + i, y + j, c);
        }
}

int randCol() {
    return rand() & ((1<<bpp)-1);
}

void fillRand(Image_ img) {
    auto w = img->width();
    auto h = img->height();
    for (int i = 0; i < w; ++i)
        for (int j = 0; j < h; ++j) {
            ImageMethods::setPixel(img, i, j, randCol());
        }
}

Image_ randomImg(int w, int h) {
    auto screen = mkImage(w, h, bpp);
    ImageMethods::fill(screen, 0);
    fillRand(screen);
    return screen;
}

void dumpBytes(const char *lbl, const uint8_t *ptr) {
    printf("%s:", lbl);
    for (int i = 0; i < 16; ++i) {
        printf(" %02x", *ptr++);
    }
    printf("\n");
}

void assertSame(Image_ a, Image_ b) {
    if (!a || !b) {
        printf("Image null\n");
        abort();
    }

    auto aw = a->width();
    auto bw = b->width();
    auto ah = a->height();
    auto bh = b->height();

    if (aw != bw || ah != bh) {
        printf("Invalid sizes: %dx%d vs %dx%d\n", aw, ah, bw, bh);
        abort();
    }

    for (int i = 0; i < aw; ++i)
        for (int j = 0; j < ah; ++j) {
            auto ap = ImageMethods::getPixel(a, i, j);
            auto bp = ImageMethods::getPixel(b, i, j);
            if (ap != bp) {
                printf("Pixel mismatch at %d,%d: %d vs %d\n", i, j, ap, bp);
                dumpBytes("A", a->pix(i, j) - 2);
                dumpBytes("B", b->pix(i, j) - 2);
                abort();
            }
        }
}

int rr(int min, int max) {
    return rand() % (max - min) + min;
}

Image_ s1, s2;

void refill() {
    fillRand(s1);
    ImageMethods::copyFrom(s2, s1);
}

void testBPP() {
    if (bpp == 1)
        s1 = randomImg(178, 128);
    else
        s1 = randomImg(160, 120);
    s2 = ImageMethods::clone(s1);
    assertSame(s1, s2);
    //auto sprite = randomImg(16, 16);

    for (int i = 0; i < 500; ++i) {
        refill();
        auto x = rr(-30, 200);
        auto y = rr(-30, 200);
        auto w = rr(1, 40);
        auto h = rr(1, 40);        
        auto sprite = randomImg(w, h);
        //ImageMethods::fill(sprite, 12);
        //DMESG("spr sz=%d,%d pos=%d,%d len=%d", w,h,x,y,sprite->length());
        //auto p = sprite->pix();
        //dumpBytes("spr   ", p);
        //dumpBytes("spr+16", p+16);
        //dumpBytes("spr+32", p+32);
        //dumpBytes("spr+48", p+32+16);
        ImageMethods::drawTransparentImage(s1, sprite, x, y);
        //dumpBytes("spr   ", p);
        golden_drawTransparentImage(s2, sprite, x, y);
        //dumpBytes("spr   ", p);
        assertSame(s1, s2);

        refill();
        ImageMethods::drawImage(s1, sprite, x, y);
        //dumpBytes("spr   ", p);
        golden_drawTransparentImage(s2, sprite, x, y, -2);
        //DMESG("spr sz=%d,%d pos=%d,%d len=%d", w,h,x,y,sprite->length());
        //dumpBytes("spr   ", sprite->pix());
        assertSame(s1, s2);

        
        int col = randCol();
        //printf("%d %d %d %d c=%d\n", x, y, w, h, col);
        ImageMethods::fillRect(s1, x, y, w, h, col);
        golden_fillRect(s2, x, y, w, h, col);
        assertSame(s1, s2);

        free(sprite);

        if (bpp == 4) {
            bpp = 1;
            sprite = randomImg(w, h);
            bpp = 4;
            int c = randCol();
            refill();
            //ImageMethods::fill(s1,0);
            //DMESG("%d %d %d %d c=%d", x, y, w, h, c);
            ImageMethods::drawImageCore(s1, sprite, x, y, c);
            golden_drawTransparentImage(s2, sprite, x, y, c);
            assertSame(s1, s2);
            free(sprite);
        }
    }

    printf("OK bpp=%d\n", bpp);

}

extern "C" int main() {
    bpp = 1;    
    testBPP();
    bpp = 4;    
    testBPP();
    return 0;
}

void *operator new(size_t sz) {
    return malloc(sz);
}
void *operator new[](size_t sz) {
    return malloc(sz);
}
void operator delete(void *p) {
    free(p);
}

extern "C" void target_panic(int code) {
    DMESG("PANIC %d", code);
    exit(1);
}