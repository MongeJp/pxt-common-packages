type color = number

namespace image {
    export function repeatY(count: number, image: Image) {
        let arr = [image]
        while (--count > 0)
            arr.push(image)
        return concatY(arr)
    }

    export function concatY(images: Image[]) {
        let w = 0
        let h = 0
        for (let img of images) {
            w = Math.max(img.width, w)
            h += img.height
        }
        let r = image.create(w, h)
        let y = 0
        for (let img of images) {
            let x = (w - img.width) >> 1
            r.drawImage(img, x, y)
            y += img.height
        }
        return r
    }
}


//% snippet='img` `'
//% pySnippet='img(""" """)'
//% fixedInstances
interface Image {
    /**
     * Draw an icon (monochromatic image) using given color
     */
    //% helper=imageDrawIcon
    drawIcon(icon: Buffer, x: number, y: number, c: color): void;

    /**
     * Fill a rectangle
     */
    //% helper=imageFillRect
    fillRect(x: number, y: number, w: number, h: number, c: color): void;

    /**
     * Draw a line
     */
    //% helper=imageDrawLine
    drawLine(x0: number, y0: number, x1: number, y1: number, c: color): void;

    /**
     * Draw an empty rectangle
     */
    //% helper=imageDrawRect
    drawRect(x: number, y: number, w: number, h: number, c: color): void;

    /**
     * Draw a circle
     */
    //% helper=imageDrawCircle
    drawCircle(cx: number, cy: number, r: number, c: color): void;

    /**
     * Fills a circle
     */
    //% helper=imageFillCircle
    fillCircle(cx: number, cy: number, r: number, c: color): void;

    /**
     * Returns an image rotated by -90, 0, 90, 180, 270 deg clockwise
     */
    //% helper=imageRotated
    rotated(deg: number): Image;

    /**
     * Scale and copy a row of pixels from a texture.
     */
    //% helper=imageBlitRow
    blitRow(dstX: number, dstY: number, from: Image, fromX: number, fromH: number): void;
}

interface ScreenImage extends Image {
    /**
     * Sets the screen backlight brightness (10-100)
     */
    //% helper=setScreenBrightness
    setBrightness(deg: number): Image;

    /**
     * Gets current screen backlight brightness (0-100)
     */
    //% helper=screenBrightness
    brightness(): number;
}

// pxt compiler currently crashes on non-functions in helpers namespace; will fix
namespace _helpers_workaround {
    export let brightness = 100
}

namespace helpers {
    //% shim=ImageMethods::_drawLine
    function _drawLine(img: Image, xy: number, wh: number, c: color): void { }

    //% shim=ImageMethods::_fillRect
    function _fillRect(img: Image, xy: number, wh: number, c: color): void { }

    //% shim=ImageMethods::_mapRect
    function _mapRect(img: Image, xy: number, wh: number, m: Buffer): void { }

    //% shim=ImageMethods::_drawIcon
    function _drawIcon(img: Image, icon: Buffer, xy: number, c: color): void { }

    //% shim=ImageMethods::_fillCircle
    declare function _fillCircle(img: Image, cxy: number, r: number, c: color): void;

    //% shim=ImageMethods::_blitRow
    declare function _blitRow(img: Image, xy: number, from: Image, xh: number): void;

    function pack(x: number, y: number) {
        return (Math.clamp(-30000, 30000, x | 0) & 0xffff) | (Math.clamp(-30000, 30000, y | 0) << 16)
    }

    export function imageBlitRow(img: Image, dstX: number, dstY: number, from: Image, fromX: number, fromH: number): void {
        _blitRow(img, pack(dstX, dstY), from, pack(fromX, fromH))
    }

    export function imageDrawIcon(img: Image, icon: Buffer, x: number, y: number, c: color): void {
        _drawIcon(img, icon, pack(x, y), c)
    }
    export function imageFillRect(img: Image, x: number, y: number, w: number, h: number, c: color): void {
        _fillRect(img, pack(x, y), pack(w, h), c)
    }
    export function imageMapRect(img: Image, x: number, y: number, w: number, h: number, m: Buffer): void {
        _mapRect(img, pack(x, y), pack(w, h), m)
    }
    export function imageDrawLine(img: Image, x: number, y: number, w: number, h: number, c: color): void {
        _drawLine(img, pack(x, y), pack(w, h), c)
    }
    export function imageDrawRect(img: Image, x: number, y: number, w: number, h: number, c: color): void {
        if (w == 0 || h == 0) return
        w--
        h--
        imageDrawLine(img, x, y, x + w, y, c)
        imageDrawLine(img, x, y, x, y + h, c)
        imageDrawLine(img, x + w, y + h, x + w, y, c)
        imageDrawLine(img, x + w, y + h, x, y + h, c)
    }

    export function imageDrawCircle(img: Image, cx: number, cy: number, r: number, col: number) {
        cx = cx | 0;
        cy = cy | 0;
        r = r | 0;
        // short cuts
        if (r < 0)
            return;

        // Bresenham's algorithm
        let x = 0
        let y = r
        let d = 3 - 2 * r

        while (y >= x) {
            img.setPixel(cx + x, cy + y, col)
            img.setPixel(cx - x, cy + y, col)
            img.setPixel(cx + x, cy - y, col)
            img.setPixel(cx - x, cy - y, col)
            img.setPixel(cx + y, cy + x, col)
            img.setPixel(cx - y, cy + x, col)
            img.setPixel(cx + y, cy - x, col)
            img.setPixel(cx - y, cy - x, col)
            x++
            if (d > 0) {
                y--
                d += 4 * (x - y) + 10
            } else {
                d += 4 * x + 6
            }
        }
    }

    export function imageFillCircle(img: Image, cx: number, cy: number, r: number, col: number) {
        _fillCircle(img, pack(cx, cy), r, col);
    }

    /**
     * Returns an image rotated by 90, 180, 270 deg clockwise
     */
    export function imageRotated(img: Image, deg: number) {
        if (deg == -90 || deg == 270) {
            let r = img.transposed();
            r.flipY();
            return r;
        } else if (deg == 180 || deg == -180) {
            let r = img.clone();
            r.flipX();
            r.flipY();
            return r;
        } else if (deg == 90) {
            let r = img.transposed();
            r.flipX();
            return r;
        } else {
            return null;
        }
    }

    //% shim=pxt::setScreenBrightness
    function _setScreenBrightness(brightness: number) { }

    export function setScreenBrightness(img: Image, b: number) {
        b = Math.clamp(10, 100, b | 0);
        _helpers_workaround.brightness = b
        _setScreenBrightness(_helpers_workaround.brightness)
    }

    export function screenBrightness(img: Image) {
        return _helpers_workaround.brightness
    }
}
