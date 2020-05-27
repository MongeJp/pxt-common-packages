//% fixedInstances decompileIndirectFixedInstances
interface Image {
    /**
     * Fill a rectangle
     */
    //% helper=imageFillRect blockNamespace="images" inlineInputMode="inline" group="Drawing"
    //% block="fill rectangle in %picture=variables_get at x %x y %y width %w height %h %c=colorindexpicker"
    //% help=images/image/fill-rect
    fillRect(x: number, y: number, w: number, h: number, c: color): void;

    /**
     * Replace colors in a rectangle
     */
    //% helper=imageMapRect
    mapRect(x: number, y: number, w: number, h: number, colorMap: Buffer): void;

    /**
     * Draw a line
     */
    //% helper=imageDrawLine blockNamespace="images" inlineInputMode="inline" group="Drawing"
    //% block="draw line in %picture=variables_get from x %x0 y %y0 to x %x1 y %y1 %c=colorindexpicker"
    //% help=images/image/draw-line
    drawLine(x0: number, y0: number, x1: number, y1: number, c: color): void;

    /**
     * Draw an empty rectangle
     */
    //% helper=imageDrawRect blockNamespace="images" inlineInputMode="inline" group="Drawing"
    //% block="draw rectangle in %picture=variables_get at x %x y %y width %w height %h %c=colorindexpicker"
    //% help=images/image/draw-rect
    drawRect(x: number, y: number, w: number, h: number, c: color): void;

    /**
     * Set pixel color
     */
    //% shim=ImageMethods::setPixel blockNamespace="images" group="Drawing"
    //% block="set %picture=variables_get color at x %x y %y to %c=colorindexpicker"
    //% help=images/image/set-pixel
    setPixel(x: int32, y: int32, c: int32): void;

    /**
     * Get a pixel color
     */
    //% shim=ImageMethods::getPixel blockNamespace="images" group="Drawing"
    //% block="%picture=variables_get color at x %x y %y"
    //% help=images/image/get-pixel
    getPixel(x: int32, y: int32): int32;

    /**
     * Fill entire image with a given color
     */
    //% shim=ImageMethods::fill blockNamespace="images" group="Drawing"
    //% block="fill %picture=variables_get with %c=colorindexpicker"
    //% help=images/image/fill
    fill(c: int32): void;

    /**
     * Return a copy of the current image
     */
    //% shim=ImageMethods::clone blockNamespace="images" group="Create"
    //% block="clone %picture=variables_get"
    //% help=images/image/clone
    clone(): Image;

    /**
     * Flips (mirrors) pixels horizontally in the current image
     */
    //% shim=ImageMethods::flipX blockNamespace="images" group="Transformations"
    //% block="flip %picture=variables_get horizontally"
    //% help=images/image/flip-x
    flipX(): void;

    /**
     * Flips (mirrors) pixels vertically in the current image
     */
    //% shim=ImageMethods::flipY blockNamespace="images" group="Transformations"
    //% block="flip %picture=variables_get vertically"
    //% help=images/image/flip-y
    flipY(): void;

    /**
     * Every pixel in image is moved by (dx,dy)
     */
    //% shim=ImageMethods::scroll blockNamespace="images" group="Transformations"
    //% help=images/image/scroll
    scroll(dx: int32, dy: int32): void;

    /**
     * Replaces one color in an image with another
     */
    //% shim=ImageMethods::replace blockNamespace="images" group="Transformations"
    //% block="change color in %picture=variables_get from %from=colorindexpicker to %to=colorindexpicker"
    //% help=images/image/replace
    replace(from: int32, to: int32): void;

    /**
     * Returns true if the provided image is the same as this image,
     * otherwise returns false.
     */
    //% shim=ImageMethods::equals
    equals(other: Image): boolean;
}

declare namespace image {
    //% blockNamespace="images"
    //% block="create image width %width height %height" group="Create"
    //% help=images/create
    function create(width: number, height: number): Image;
}