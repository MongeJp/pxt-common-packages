/**
 * Image manipulation blocks
 */
//% weight=70 icon="\uf03e" color="#a5b1c2"
//% advanced=true
namespace images {
    //% blockId=screen_image_picker block="%img"
    //% shim=TD_ID
    //% img.fieldEditor="sprite"
    //% img.fieldOptions.taggedTemplate="img"
    //% img.fieldOptions.decompileIndirectFixedInstances="true"
    //% img.fieldOptions.filter="!tile !dialog !background"
    //% weight=100 group="Create" duplicateShadowOnDrag
    export function _spriteImage(img: Image) {
        return img
    }

    //% blockId=background_image_picker block="%img"
    //% shim=TD_ID
    //% img.fieldEditor="sprite"
    //% img.fieldOptions.taggedTemplate="img"
    //% img.fieldOptions.decompileIndirectFixedInstances="true"
    //% img.fieldOptions.sizes="-1,-1"
    //% img.fieldOptions.filter="background"
    //% weight=100 group="Create"
    //% blockHidden=1 duplicateShadowOnDrag
    export function _screenImage(img: Image) {
        return img
    }

    //% blockId=tilemap_image_picker block="%img"
    //% shim=TD_ID
    //% img.fieldEditor="sprite"
    //% img.fieldOptions.taggedTemplate="img"
    //% img.fieldOptions.decompileIndirectFixedInstances="true"
    //% img.fieldOptions.sizes="10,8;16,16;32,32;48,48;64,64;16,32;32,48;32,8;64,8;20,15;40,15"
    //% weight=100 group="Create"
    //% blockHidden=1 duplicateShadowOnDrag
    export function _tileMapImage(img: Image) {
        return img
    }

    //% blockId=tile_image_picker block="%img"
    //% shim=TD_ID
    //% img.fieldEditor="sprite"
    //% img.fieldOptions.taggedTemplate="img"
    //% img.fieldOptions.decompileIndirectFixedInstances="true"
    //% img.fieldOptions.sizes="16,16;32,32;8,8"
    //% img.fieldOptions.filter="tile"
    //% weight=100 group="Create"
    //% blockHidden=1 duplicateShadowOnDrag
    export function _tileImage(img: Image) {
        return img
    }

    //% blockId=tileset_tile_picker block="%tile"
    //% shim=TD_ID
    //% tile.fieldEditor="tileset"
    //% tile.fieldOptions.decompileIndirectFixedInstances="true"
    //% weight=10 blockNamespace="scene" group="Tiles"
    //% blockHidden=1 duplicateShadowOnDrag
    export function _tile(tile: Image) {
        return tile
    }

    //% blockId=dialog_image_picker block="%img"
    //% shim=TD_ID
    //% img.fieldEditor="sprite"
    //% img.fieldOptions.taggedTemplate="img"
    //% img.fieldOptions.decompileIndirectFixedInstances="true"
    //% img.fieldOptions.sizes="15,15;18,18;21,21;24,24;9,9;12,12"
    //% img.fieldOptions.filter="dialog"
    //% weight=100 group="Create"
    //% blockHidden=1 duplicateShadowOnDrag
    export function _dialogImage(img: Image) {
        return img
    }

    /**
     * An image
     * @param image the image
     */
    //% blockId=image_picker block="%image" shim=TD_ID
    //% image.fieldEditor="images"
    //% image.fieldOptions.columns=6
    //% image.fieldOptions.width=600
    //% weight=0 group="Create"
    export function _image(image: Image): Image {
        return image;
    }

    //% blockId=colorindexpicker block="%index" blockHidden=true shim=TD_ID
    //% index.fieldEditor="colornumber"
    //% index.fieldOptions.valueMode="index"
    //% index.fieldOptions.decompileLiterals="true"
    export function __colorIndexPicker(index: number) {
        return index;
    }

    /**
     * A position picker
     */
    //% blockId=positionPicker block="%index" blockHidden=true shim=TD_ID
    //% index.fieldEditor="position" color="#ffffff" colorSecondary="#ffffff"
    //% index.fieldOptions.decompileLiterals="true"
    export function __positionPicker(index: number) {
        return index;
    }
}
