/** 
 * File storage operations
*/
//% weight=5 color=#00c0c0 icon="\uf07b"
namespace storage {
    export let NEW_LINE = "\n";

    //% shim=storage::init
    function init() { }

    // init() needs to be called at the beginning of the program, so it gets a chance
    // to register its USB handler
    init();

    /**
     * Appends a new line to the file
    * @param filename name of the file, eg: "log.txt"
     */
    //% parts="storage" 
    //% blockId="storage_append_line" block="append file $filename with line $data"
    export function appendLine(filename: string, data: string): void {
        append(filename, data + NEW_LINE);
    }

    /** 
    * Append string data to a new or existing file. 
    * @param filename name of the file, eg: "log.txt"
    */
    //% parts="storage" 
    //% blockId="storage_append" block="append file $filename with $data"
    export function append(filename: string, data: string) {
        appendBuffer(filename, control.createBufferFromUTF8(data));
    }

    /** 
    * Overwrite file with string data. 
    * @param filename name of the file, eg: "log.txt"
    */
    //% parts="storage"
    //% blockId="storage_overwrite" block="overwrite file $filename with $data"
    export function overwrite(filename: string, data: string) {
        overwriteWithBuffer(filename, control.createBufferFromUTF8(data));
    }

    /** 
    * Read contents of file as a string. 
    * @param filename name of the file, eg: "log.txt"
    */
    //% parts="storage"
    //% blockId="storage_read" block="read file $filename"
    export function read(filename: string) {
        const buf = readAsBuffer(filename);
        if (!buf)
            return null;
        return buf.toString();
    }
}
