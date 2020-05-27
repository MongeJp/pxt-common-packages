enum MusicOutput {
    AutoDetect = 0,
    Buzzer = 1,
    HeadPhones = 2,
}

namespace music {
    //% whenUsed
    const freqs = hex`
        1f00210023002500270029002c002e003100340037003a003e004100450049004e00520057005c00620068006e00
        75007b0083008b0093009c00a500af00b900c400d000dc00e900f70006011501260137014a015d01720188019f01
        b801d201ee010b022a024b026e029302ba02e40210033f037003a403dc03170455049704dd0427057505c8052006
        7d06e0064907b8072d08a9082d09b9094d0aea0a900b400cfa0cc00d910e6f0f5a1053115b1272139a14d4152017
        8018f519801b231dde1e`

    //% shim=music::queuePlayInstructions
    function queuePlayInstructions(timeDelta: number, buf: Buffer) { }

    //% shim=music::stopPlaying
    function stopPlaying() { }

    //% shim=music::forceOutput
    export function forceOutput(buf: MusicOutput) { }

    let globalVolume: number = null

    const BUFFER_SIZE: number = 12;

    //% shim=music::enableAmp
    function enableAmp(en: number) {
        return // for sim
    }

    function initVolume() {
        if (globalVolume === null) {
            globalVolume = 0
            setVolume(control.getConfigValue(DAL.CFG_SPEAKER_VOLUME, 128))
        }
    }

    /**
     * Set the default output volume of the sound synthesizer.
     * @param volume the volume 0...255
     */
    //% blockId=synth_set_volume block="set volume %volume"
    //% parts="speaker"
    //% volume.min=0 volume.max=255
    //% volume.defl=20
    //% help=music/set-volume
    //% weight=70
    //% group="Volume"
    export function setVolume(volume: number): void {
        globalVolume = Math.clamp(0, 255, volume | 0)
        enableAmp(globalVolume > 0 ? 1 : 0)
    }

    /**
     * Gets the current volume
     */
    //% parts="speaker"
    //% weight=70
    export function volume(): number {
        initVolume()
        return globalVolume;
    }

    function playNoteCore(when: number, frequency: number, ms: number) {
        let buf = control.createBuffer(BUFFER_SIZE)
        addNote(buf, 0, ms, 255, 255, 3, frequency, volume(), frequency)
        queuePlayInstructions(when, buf)
    }

    /**
     * Play a tone through the speaker for some amount of time.
     * @param frequency pitch of the tone to play in Hertz (Hz), eg: Note.C
     * @param ms tone duration in milliseconds (ms), eg: BeatFraction.Half
     */
    //% help=music/play-tone
    //% blockId=mixer_play_note block="play tone|at %note=device_note|for %duration=device_beat"
    //% parts="headphone" async
    //% blockNamespace=music
    //% weight=76 blockGap=8
    //% group="Tone"
    export function playTone(frequency: number, ms: number): void {
        if (ms == 0)
            ms = 86400000 // 1 day

        if (ms <= 2000) {
            playNoteCore(0, frequency, ms)
            pause(ms)
        } else {
            const id = ++playToneID
            control.runInParallel(() => {
                let pos = control.millis()
                while (id == playToneID && ms > 0) {
                    let now = control.millis()
                    let d = pos - now
                    let t = Math.min(ms, 500)
                    ms -= t
                    pos += t
                    playNoteCore(d - 1, frequency, t)
                    if (ms == 0)
                        pause(d + t)
                    else
                        pause(d + t - 100)
                }
            })
        }
    }

    let playToneID = 0

    /**
     * Play a melody from the melody editor.
     * @param melody - string of up to eight notes [C D E F G A B C5] or rests [-] separated by spaces, 
     * which will be played one at a time, ex: "E D G F B A C5 B "
     * @param tempo - number in beats per minute (bpm), dictating how long each note will play for
     */
    //% block="play melody $melody at tempo $tempo|(bpm)" blockId=playMelody
    //% blockNamespace=music
    //% weight=85 blockGap=8 help=music/play-melody
    //% group="Melody"
    //% melody.shadow="melody_editor"
    //% tempo.min=40 tempo.max=500
    //% tempo.defl=120
    export function playMelody(melody: string, tempo: number) {
        let notes: string[] = melody.split(" ").filter(n => !!n);
        let formattedMelody = "";
        let newOctave = false;

        // build melody string, replace '-' with 'R' and add tempo
        // creates format like "C5-174 B4 A G F E D C "
        for (let i = 0; i < notes.length; i++) {
            if (notes[i] === "-") {
                notes[i] = "R";
            } else if (notes[i] === "C5") {
                newOctave = true;
            } else if (newOctave) { // change the octave if necesary
                notes[i] += "4";
                newOctave = false;
            }
            // add tempo after first note
            if (i == 0) {
                formattedMelody += notes[i] + "-" + tempo + " ";
            } else {
                formattedMelody += notes[i] + " ";
            }
        }

        const song = new Melody(formattedMelody);
        song.playUntilDone();
    }


    /**
     * Create a melody with the melody editor.
     * @param melody
     */
    //% block="$melody" blockId=melody_editor
    //% blockNamespace=music
    //% blockHidden = true
    //% weight=85 blockGap=8
    //% group="Melody" duplicateShadowOnDrag
    //% melody.fieldEditor="melody"
    //% melody.fieldOptions.decompileLiterals=true
    //% melody.fieldOptions.decompileIndirectFixedInstances="true"
    //% melody.fieldOptions.onParentBlock="true"
    //% shim=TD_ID
    export function melodyEditor(melody: string): string {
        return melody;
    }

    /**
     * Stop all sounds from playing.
     */
    //% help=music/stop-all-sounds
    //% blockId=music_stop_all_sounds block="stop all sounds"
    //% weight=10
    //% group="Sounds"
    export function stopAllSounds() {
        Melody.stopAll();
        stopPlaying();
    }

    //% fixedInstances
    export class Melody {
        _text: string;
        private _player: MelodyPlayer;

        private static playingMelodies: Melody[];

        static stopAll() {
            if (Melody.playingMelodies) {
                const ms = Melody.playingMelodies.slice(0, Melody.playingMelodies.length);
                ms.forEach(p => p.stop());
            }
        }

        constructor(text: string) {
            this._text = text
        }

        get text() {
            return this._text;
        }

        /**
         * Stop playing a sound
         */
        //% blockId=mixer_stop block="stop sound %sound"
        //% help=music/melody/stop
        //% parts="headphone"
        //% weight=92 blockGap=8
        //% group="Sounds"
        stop() {
            if (this._player) {
                this._player.stop()
                this._player = null
            }
            this.unregisterMelody();
        }

        private registerMelody() {
            // keep track of the active players
            if (!Melody.playingMelodies) Melody.playingMelodies = [];
            // stop and pop melodies if too many playing
            if (Melody.playingMelodies.length > 4) {
                // stop last player (also pops)
                Melody.playingMelodies[Melody.playingMelodies.length - 1].stop();
            }
            // put back the melody on top of the melody stack
            Melody.playingMelodies.removeElement(this);
            Melody.playingMelodies.push(this);
        }
        private unregisterMelody() {
            // remove from list
            if (Melody.playingMelodies) {
                Melody.playingMelodies.removeElement(this); // remove self
            }
        }

        private playCore(volume: number, loop: boolean) {
            this.stop()
            const p = this._player = new MelodyPlayer(this)
            this.registerMelody();
            control.runInParallel(() => {
                while (this._player == p) {
                    p.play(volume)
                    if (!loop)
                        break
                }
                this.unregisterMelody();
            })
        }

        /**
         * Start playing a sound in a loop and don't wait for it to finish.
         * @param sound the melody to play
         */
        //% help=music/melody/loop
        //% blockId=mixer_loop_sound block="loop sound %sound"
        //% parts="headphone"
        //% weight=93 blockGap=8
        //% group="Sounds"
        loop(volume = 255) {
            this.playCore(volume, true)
        }

        /**
         * Start playing a sound and don't wait for it to finish.
         * @param sound the melody to play
         */
        //% help=music/melody/play
        //% blockId=mixer_play_sound block="play sound %sound"
        //% parts="headphone"
        //% weight=95 blockGap=8
        //% group="Sounds"
        play(volume = 255) {
            this.playCore(volume, false)
        }


        /**
         * Play a sound and wait until the sound is done.
         * @param sound the melody to play
         */
        //% help=music/melody/play-until-done
        //% blockId=mixer_play_sound_until_done block="play sound %sound|until done"
        //% parts="headphone"
        //% weight=94 blockGap=8
        //% group="Sounds"
        playUntilDone(volume = 255) {
            this.stop()
            const p = this._player = new MelodyPlayer(this)
            this._player.onPlayFinished = () => {
                if (p == this._player)
                    this.unregisterMelody();
            }
            this.registerMelody();
            this._player.play(volume)
        }

        toString() {
            return this._text;
        }
    }

    function addNote(sndInstr: Buffer, sndInstrPtr: number, ms: number, beg: number, end: number, soundWave: number, hz: number, volume: number, endHz: number) {
        if (ms > 0) {
            sndInstr.setNumber(NumberFormat.UInt8LE, sndInstrPtr, soundWave)
            sndInstr.setNumber(NumberFormat.UInt8LE, sndInstrPtr + 1, 0)
            sndInstr.setNumber(NumberFormat.UInt16LE, sndInstrPtr + 2, hz)
            sndInstr.setNumber(NumberFormat.UInt16LE, sndInstrPtr + 4, ms)
            sndInstr.setNumber(NumberFormat.UInt16LE, sndInstrPtr + 6, (beg * volume) >> 6)
            sndInstr.setNumber(NumberFormat.UInt16LE, sndInstrPtr + 8, (end * volume) >> 6)
            sndInstr.setNumber(NumberFormat.UInt16LE, sndInstrPtr + 10, endHz);
            sndInstrPtr += BUFFER_SIZE;
        }
        sndInstr.setNumber(NumberFormat.UInt8LE, sndInstrPtr, 0) // terminate
        return sndInstrPtr
    }


    class MelodyPlayer {
        melody: Melody;

        onPlayFinished: () => void;

        constructor(m: Melody) {
            this.melody = m
        }

        stop() {
            this.melody = null
        }

        play(volume: number) {
            if (!this.melody)
                return
            volume = Math.clamp(0, 255, (volume * music.volume()) >> 8)

            let notes = this.melody._text
            let pos = 0;
            let duration = 4; //Default duration (Crotchet)
            let octave = 4; //Middle octave
            let tempo = 120; // default tempo

            let hz = 0
            let endHz = -1
            let ms = 0
            let timePos = 0
            let startTime = control.millis()
            let now = 0

            let envA = 0
            let envD = 0
            let envS = 255
            let envR = 0
            let soundWave = 1 // triangle
            let sndInstr = control.createBuffer(5 * BUFFER_SIZE)
            let sndInstrPtr = 0

            const addForm = (formDuration: number, beg: number, end: number, msOff: number) => {
                let freqStart = hz;
                let freqEnd = endHz;

                const envelopeWidth = ms > 0 ? ms : duration * Math.idiv(15000, tempo) + envR;
                if (endHz != hz && envelopeWidth != 0) {
                    const slope = (freqEnd - freqStart) / envelopeWidth;
                    freqStart = hz + slope * msOff;
                    freqEnd = hz + slope * (msOff + formDuration);
                }
                sndInstrPtr = addNote(sndInstr, sndInstrPtr, formDuration, beg, end, soundWave, freqStart, volume, freqEnd);
            }

            const scanNextWord = () => {
                if (!this.melody)
                    return ""

                // eat space
                while (pos < notes.length) {
                    const c = notes[pos];
                    if (c != ' ' && c != '\r' && c != '\n' && c != '\t')
                        break;
                    pos++;
                }

                // read note
                let note = "";
                while (pos < notes.length) {
                    const c = notes[pos];
                    if (c == ' ' || c == '\r' || c == '\n' || c == '\t')
                        break;
                    note += c;
                    pos++;
                }
                return note;
            }

            enum Token {
                Note,
                Octave,
                Beat,
                Tempo,
                Hz,
                EndHz,
                Ms,
                WaveForm,
                EnvelopeA,
                EnvelopeD,
                EnvelopeS,
                EnvelopeR
            }

            let token: string = "";
            let tokenKind = Token.Note;

            // [ABCDEFG] (\d+)  (:\d+)  (-\d+)
            // note      octave length  tempo
            // R (:\d+) - rest
            // !\d+,\d+ - sound at frequency with given length (Hz,ms); !\d+ and !\d+,:\d+ also possible
            // @\d+,\d+,\d+,\d+ - ADSR envelope - ms,ms,volume,ms; volume is 0-255
            // ~\d+ - wave form:
            //   1 - triangle
            //   2 - sawtooth
            //   3 - sine
            //   5 - noise
            //   11 - square 10%
            //   12 - square 20%
            //   ...
            //   15 - square 50%
            //

            const consumeToken = () => {
                if (token && tokenKind != Token.Note) {
                    const d = parseInt(token);
                    switch (tokenKind) {
                        case Token.Octave: octave = d; break;
                        case Token.Beat:
                            duration = Math.max(1, Math.min(16, d));
                            ms = -1;
                            break;
                        case Token.Tempo: tempo = Math.max(1, d); break;
                        case Token.Hz: hz = d; tokenKind = Token.Ms; break;
                        case Token.Ms: ms = d; break;
                        case Token.WaveForm: soundWave = Math.clamp(1, 15, d); break;
                        case Token.EnvelopeA: envA = d; tokenKind = Token.EnvelopeD; break;
                        case Token.EnvelopeD: envD = d; tokenKind = Token.EnvelopeS; break;
                        case Token.EnvelopeS: envS = Math.clamp(0, 255, d); tokenKind = Token.EnvelopeR; break;
                        case Token.EnvelopeR: envR = d; break;
                        case Token.EndHz: endHz = d; break;
                    }
                    token = "";
                }
            }

            while (true) {
                let currNote = scanNextWord();
                let prevNote: boolean = false;
                if (!currNote) {
                    let timeLeft = timePos - now
                    if (timeLeft > 0)
                        pause(timeLeft)
                    if (this.onPlayFinished)
                        this.onPlayFinished();
                    return;
                }

                hz = -1;

                let note: number = 0;
                token = "";
                tokenKind = Token.Note;

                for (let i = 0; i < currNote.length; i++) {
                    let noteChar = currNote.charAt(i);
                    switch (noteChar) {
                        case 'c': case 'C': note = 1; prevNote = true; break;
                        case 'd': case 'D': note = 3; prevNote = true; break;
                        case 'e': case 'E': note = 5; prevNote = true; break;
                        case 'f': case 'F': note = 6; prevNote = true; break;
                        case 'g': case 'G': note = 8; prevNote = true; break;
                        case 'a': case 'A': note = 10; prevNote = true; break;
                        case 'B': note = 12; prevNote = true; break;
                        case 'r': case 'R': hz = 0; prevNote = false; break;
                        case '#': note++; prevNote = false; break;
                        case 'b': if (prevNote) note--; else { note = 12; prevNote = true; } break;
                        case ',':
                            consumeToken();
                            prevNote = false;
                            break;
                        case '!':
                            tokenKind = Token.Hz;
                            prevNote = false;
                            break;
                        case '@':
                            consumeToken();
                            tokenKind = Token.EnvelopeA;
                            prevNote = false;
                            break;
                        case '~':
                            consumeToken();
                            tokenKind = Token.WaveForm;
                            prevNote = false;
                            break;
                        case ':':
                            consumeToken();
                            tokenKind = Token.Beat;
                            prevNote = false;
                            break;
                        case '-':
                            consumeToken();
                            tokenKind = Token.Tempo;
                            prevNote = false;
                            break;
                        case '^':
                            consumeToken();
                            tokenKind = Token.EndHz;
                            break;
                        default:
                            if (tokenKind == Token.Note)
                                tokenKind = Token.Octave;
                            token += noteChar;
                            prevNote = false;
                            break;
                    }
                }
                consumeToken();

                if (note && hz < 0) {
                    const keyNumber = note + (12 * (octave - 1));
                    hz = freqs.getNumber(NumberFormat.UInt16LE, keyNumber * 2) || 0;
                }

                let currMs = ms

                if (currMs <= 0) {
                    const beat = Math.idiv(15000, tempo);
                    currMs = duration * beat
                }

                if (hz < 0) {
                    // no frequency specified, so no duration
                } else if (hz == 0) {
                    timePos += currMs
                } else {
                    if (endHz < 0) {
                        endHz = hz;
                    }

                    sndInstrPtr = 0
                    addForm(envA, 0, 255, 0)
                    addForm(envD, 255, envS, envA)
                    addForm(currMs - (envA + envD), envS, envS, envD + envA)
                    addForm(envR, envS, 0, currMs)

                    queuePlayInstructions(timePos - now, sndInstr.slice(0, sndInstrPtr))
                    endHz = -1;
                    timePos += currMs // don't add envR - it's supposed overlap next sound
                }

                let timeLeft = timePos - now
                if (timeLeft > 200) {
                    pause(timeLeft - 100)
                    now = control.millis() - startTime
                }
            }
        }
    }

    //% fixedInstance whenUsed block="ba ding"
    export const baDing = new Melody('b5:1 e6:3')

    //% fixedInstance whenUsed block="wawawawaa"
    export const wawawawaa = new Melody('~15 e3:3 r:1 d#:3 r:1 d:4 r:1 c#:8')

    //% fixedInstance whenUsed block="jump up"
    export const jumpUp = new Melody('c5:1 d e f g')

    //% fixedInstance whenUsed block="jump down"
    export const jumpDown = new Melody('g5:1 f e d c')

    //% fixedInstance whenUsed block="power up"
    export const powerUp = new Melody('g4:1 c5 e g:2 e:1 g:3')

    //% fixedInstance whenUsed block="power down"
    export const powerDown = new Melody('g5:1 d# c g4:2 b:1 c5:3')

    //% fixedInstance whenUsed block="magic wand"
    export const magicWand = new Melody('F#6:1-300 G# A# B C7# D# F F# G# A# B:6')
    //A#7:1-200 A:1 A#7:1 A:1 A#7:2

    //% fixedInstance whenUsed block="siren"
    export const siren = new Melody('a4 d5 a4 d5 a4 d5')

    //% fixedInstance whenUsed block="pew pew"
    export const pewPew = new Melody('!1200,200^50')
}
