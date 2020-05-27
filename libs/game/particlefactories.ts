namespace particles {
    let cachedSin: Fx8[];
    let cachedCos: Fx8[];

    const NUM_SLICES = 100;
    const galois = new Math.FastRandom();
    let angleSlice = 2 * Math.PI / NUM_SLICES;

    /**
     * Initialize sin and cos values for each slice to minimize recomputation
     */
    function initTrig() {
        if (!cachedSin) {
            cachedSin = cacheSin(NUM_SLICES);
            cachedCos = cacheCos(NUM_SLICES);
        }
    }

    /**
     * @param slices number of cached sin values to make
     * @returns array of cached sin values between 0 and 360 degrees
     */
    export function cacheSin(slices: number): Fx8[] {
        let sin: Fx8[] = [];
        let anglePerSlice = 2 * Math.PI / slices;
        for (let i = 0; i < slices; i++) {
            sin.push(Fx8(Math.sin(i * anglePerSlice)));
        }
        return sin;
    }

    /**
     * @param slices number of cached cos values to make
     * @returns array of cached cos values between 0 and 360 degrees
     */
    export function cacheCos(slices: number): Fx8[] {
        let cos: Fx8[] = [];
        let anglePerSlice = 2 * Math.PI / slices;
        for (let i = 0; i < slices; i++) {
            cos.push(Fx8(Math.cos(i * anglePerSlice)));
        }
        return cos;
    }

    const ratio = Math.PI / 180;
    function toRadians(degrees: number) {
        if (degrees < 0)
            degrees = 360 - (Math.abs(degrees) % 360);
        else
            degrees = degrees % 360;

        return degrees * ratio;
    }

    /**
     * A factory for generating particles
     */
    export class ParticleFactory {

        constructor() {
            // Compiler errors if this doesn't exist
        }

        /**
         * Generate a particle at the position of the given anchor
         * @param anchor 
         */
        createParticle(anchor: ParticleAnchor): Particle {
            const p = new Particle();

            p._x = Fx8(anchor.x);
            p._y = Fx8(anchor.y);
            p.vx = Fx.zeroFx8;
            p.vy = Fx.zeroFx8;
            p.lifespan = 500;

            return p;
        }

        /**
         * Draw the given particle at the given location
         * @param particle 
         * @param x 
         * @param y 
         */
        drawParticle(particle: Particle, x: Fx8, y: Fx8) {
            screen.setPixel(Fx.toInt(x), Fx.toInt(y), 1);
        }
    }

    /**
     * A factory for creating a spray of particles
     */
    export class SprayFactory extends ParticleFactory {
        protected speed: Fx8;
        protected minAngle: number;
        protected spread: number;

        constructor(speed: number, centerDegrees: number, arcDegrees: number) {
            super();
            initTrig();
            this.setSpeed(speed);
            this.setDirection(centerDegrees, arcDegrees);
        }

        createParticle(anchor: ParticleAnchor) {
            const p = super.createParticle(anchor);

            const angle = (this.minAngle + galois.randomRange(0, this.spread)) % NUM_SLICES;
            p.vx = Fx.mul(cachedSin[angle], this.speed);
            p.vy = Fx.mul(cachedCos[angle], this.speed);

            return p;
        }

        drawParticle(particle: Particle, x: Fx8, y: Fx8) {
            screen.setPixel(Fx.toInt(x), Fx.toInt(y), 1);
        }

        setSpeed(pixelsPerSecond: number) {
            this.speed = Fx8(pixelsPerSecond);
        }

        setDirection(centerDegrees: number, arcDegrees: number) {
            this.minAngle = (toRadians(centerDegrees - (arcDegrees >> 1)) / angleSlice) | 0;
            this.spread = (toRadians(arcDegrees) / angleSlice) | 0;
        }
    }

    /**
     * A factory for creating particles within rectangular area
     */
    export class AreaFactory extends SprayFactory {
        xRange: number;
        yRange: number;
        minLifespan: number;
        maxLifespan: number;
        protected galois: Math.FastRandom;

        constructor(xRange: number, yRange: number, minLifespan?: number, maxLifespan?: number) {
            super(40, 0, 90);
            this.xRange = xRange;
            this.yRange = yRange;
            this.minLifespan = minLifespan ? minLifespan : 150;
            this.maxLifespan = maxLifespan ? maxLifespan : 850;
            this.galois = new Math.FastRandom();
        }

        createParticle(anchor: ParticleAnchor) {
            const p = super.createParticle(anchor);

            p.lifespan = this.galois.randomRange(this.minLifespan, this.maxLifespan);
            p._x = Fx.iadd(this.galois.randomRange(0, this.xRange) - (this.xRange >> 1), p._x);
            p._y = Fx.iadd(this.galois.randomRange(0, this.yRange) - (anchor.height ? anchor.height >> 1 : 0), p._y);

            return p;
        }

        drawParticle(p: Particle, x: Fx8, y: Fx8) {
            const col = p.lifespan > 500 ?
                4 : p.lifespan > 250 ?
                    5 : 1;
            screen.setPixel(Fx.toInt(x), Fx.toInt(y), col);
        }
    }

    /**
     * A factory for creating a trail that is emitted by sprites.
     */
    export class TrailFactory extends ParticleFactory {
        minLifespan: number;
        maxLifespan: number;
        xRange: number;
        yRange: number;
        protected galois: Math.FastRandom;

        constructor(sprite: ParticleAnchor, minLifespan: number, maxLifespan: number) {
            super();
            this.xRange = sprite.width ? sprite.width >> 1 : 8;
            this.yRange = sprite.height ? sprite.height >> 1 : 8;
            this.minLifespan = minLifespan;
            this.maxLifespan = maxLifespan;
            this.galois = new Math.FastRandom();
        }

        createParticle(anchor: ParticleAnchor) {
            const p = super.createParticle(anchor);

            p.lifespan = this.galois.randomRange(this.minLifespan, this.maxLifespan);
            p._x = Fx.iadd(this.galois.randomRange(0, this.xRange) - (this.xRange >> 1), p._x);
            p._y = Fx.iadd(this.galois.randomRange(0, this.yRange) - (this.yRange >> 1), p._y);
            p.color = this.galois.randomRange(0x1, 0xF);

            return p;
        }

        drawParticle(p: Particle, x: Fx8, y: Fx8) {
            screen.setPixel(Fx.toInt(x), Fx.toInt(y), p.color);
        }
    }

    /**
     * A factory for creating particles with the provided shapes fall down the screen.
     * 
     * Any pixels assigned to 0xF (black) in the provided shape will be replaced with a
     * random color for each particle.
     */
    export class ShapeFactory extends AreaFactory {
        protected sources: Image[];
        protected ox: Fx8;
        protected oy: Fx8;

        constructor(xRange: number, yRange: number, source: Image) {
            super(xRange, yRange);
            this.sources = [source];

            // Base offsets off of initial shape
            this.ox = Fx8(source.width >> 1);
            this.oy = Fx8(source.height >> 1);
        }

        /**
         * Add another possible shape for a particle to display as
         * @param shape 
         */
        addShape(shape: Image) {
            if (shape) this.sources.push(shape);
        }

        drawParticle(p: Particle, x: Fx8, y: Fx8) {
            const pImage = this.galois.pickRandom(this.sources).clone();
            pImage.replace(0xF, p.color);

            screen.drawTransparentImage(pImage,
                Fx.toInt(Fx.sub(x, this.ox)),
                Fx.toInt(Fx.sub(y, this.oy))
            );
        }

        createParticle(anchor: ParticleAnchor) {
            const p = super.createParticle(anchor);
            p.color = this.galois.randomRange(1, 14);
            return p;
        }
    }

    export class ConfettiFactory extends ShapeFactory {
        constructor(xRange: number, yRange: number) {
            const confetti = [
                img`
                    F
                `,
                img`
                    F
                    F
                `,
                img`
                    F F
                `,
                img`
                    F F
                    F .
                `,
                img`
                    F F
                    . F
            `];
            super(xRange, yRange, confetti[0]);
            for (let i = 1; i < confetti.length; i++) {
                this.addShape(confetti[i]);
            }

            this.minLifespan = 1000;
            this.maxLifespan = 4500;
        }
    }

    export class FireFactory extends ParticleFactory {
        protected galois: Math.FastRandom;
        protected minRadius: number;
        protected maxRadius: number;
    
        constructor(radius: number) {
            super();
            initTrig();
            this.galois = new Math.FastRandom();
            this.minRadius = radius >> 1;
            this.maxRadius = radius;
        }

        createParticle(anchor: ParticleAnchor) {
            const p = super.createParticle(anchor);
            p.color = this.galois.randomBool() ?
                2 : this.galois.randomBool() ?
                    4 : 5;

            const i = this.galois.randomRange(0, cachedCos.length);
            const r = this.galois.randomRange(this.minRadius, this.maxRadius);

            p._x = Fx.iadd(anchor.x, Fx.mul(Fx8(r), cachedCos[i]));
            p._y = Fx.iadd(anchor.y, Fx.mul(Fx8(r), cachedSin[i]));
            p.vy = Fx8(Math.randomRange(0, 10));
            p.vx = Fx8(Math.randomRange(-5, 5));
            p.lifespan = 1500;

            return p;
        }

        drawParticle(p: Particle, x: Fx8, y: Fx8) {
            screen.setPixel(
                Fx.toInt(x),
                Fx.toInt(y),
                p.color
            );
        }
    }

    export class RadialFactory extends ParticleFactory {
        protected r: Fx8;
        protected speed: Fx8;
        protected t: number;
        protected spread: number;
        protected galois: Math.FastRandom;
        protected colors: number[];

        constructor(radius: number, speed: number, spread: number, colors?: number[]) {
            super();
            initTrig();

            if (colors && colors.length != 0)
                this.colors = colors;
            else
                this.colors = [0x2, 0x3, 0x4, 0x5];

            this.setRadius(radius)
            this.speed = Fx8(-speed);
            this.spread = spread;
            this.t = 0;
            this.galois = new Math.FastRandom();
        }

        createParticle(anchor: ParticleAnchor) {
            const p = super.createParticle(anchor);
            const time = ++this.t % cachedCos.length;
            const offsetTime = (time + this.galois.randomRange(0, this.spread)) % cachedCos.length;

            p._x = Fx.iadd(anchor.x, Fx.mul(this.r, cachedCos[time]));
            p._y = Fx.iadd(anchor.y, Fx.mul(this.r, cachedSin[time]));
            p.vx = Fx.mul(this.speed, Fx.neg(cachedSin[offsetTime]));
            p.vy = Fx.mul(this.speed, cachedCos[offsetTime]);

            p.lifespan = this.galois.randomRange(200, 1500);
            p.color = this.galois.pickRandom(this.colors);

            return p;
        }

        drawParticle(p: Particle, x: Fx8, y: Fx8) {
            screen.setPixel(
                Fx.toInt(x),
                Fx.toInt(y),
                p.color
            );
        }

        setRadius(r: number) {
            this.r = Fx8(r >> 1);
        }

        setSpeed(s: number) {
            this.speed = Fx8(-s);
        }

        setSpread(s: number) {
            this.spread = s;
        }
    }

    class ColorCount {
        constructor(public color: number, public count: number) { }
    }

    export class AshFactory extends AreaFactory {
        private colors: ColorCount[];
        
        constructor(anchor: ParticleAnchor, updateImage?: boolean, percentKept: number = 20) {
            super(anchor.width ? anchor.width : 8, anchor.height ? anchor.height >> 1 : 8, 300, 700);

            if (!anchor.image) {
                this.colors = [new ColorCount(1, 20)];
                return;
            }

            let counts: number[] = [];
            for (let i = 0x0; i <= 0xF; i++) {
                counts[i] = 0;
            }
            let result: Image = anchor.image.clone();

            for (let x = 0; x < result.width; x++) {
                for (let y = 0; y < result.height; y++) {
                    const c = result.getPixel(x, y);
                    if (c && this.galois.percentChance(percentKept)) {
                        counts[c]++;
                        result.setPixel(x, y, 0x0);
                    }
                }
            }

            /** TODO: The following should be:
             * if (updateImage && anchor.setImage) {
             *     anchor.setImage(result);
             * }
             * but this fails due to https://github.com/Microsoft/pxt-arcade/issues/515 .
             * This is a temporary workaround.
             */
            if (updateImage) {
                (anchor as Sprite).setImage(result);
            }

            this.colors = counts
                .map((value: number, index: number) => new ColorCount(index, value))
                .filter(v => v.count != 0);
        }

        createParticle(anchor: ParticleAnchor) {
            if (this.colors.length === 0) return undefined;

            const index = this.galois.randomRange(0, this.colors.length - 1);
            const choice = this.colors[index];
            const p = super.createParticle(anchor);

            choice.count--;
            if (choice.count === 0) this.colors.removeAt(index);

            p.color = choice.color;

            p._y = Fx.iadd(this.galois.randomRange(this.yRange >> 1, this.yRange), p._y);
            p.vx = anchor.vx ? Fx.neg(Fx8(anchor.vx >> 2)): Fx.zeroFx8;
            p.vy = Fx8(this.galois.randomRange(-150, -50));

            return p;
        }

        drawParticle(p: Particle, x: Fx8, y: Fx8) {
            screen.setPixel(Fx.toInt(x), Fx.toInt(y), p.color);
        }
    }

    export class BubbleFactory extends ParticleFactory {
        minLifespan: number;
        maxLifespan: number;
        xRange: number;
        yRange: number;
        protected galois: Math.FastRandom;
        protected states: Image[];
    
        constructor(sprite: ParticleAnchor, minLifespan: number, maxLifespan: number) {
            super();
            initTrig();
            this.galois = new Math.FastRandom();

            this.xRange = sprite.width ? sprite.width : 16;
            this.yRange = 8;
            this.minLifespan = minLifespan;
            this.maxLifespan = maxLifespan;

            this.states = [
                img`
                    F
                `, img`
                    F F
                `, img`
                    F F
                    F F
                `, img`
                    F F F
                    F . F
                    F F F
                `, img`
                    . F F .
                    F . . F
                    F . . F
                    . F F .
                `, img`
                    . F F F .
                    F . . . F
                    F . . . F
                    . F F F .
                `
            ];
        }

        get stateCount(): number {
            return this.states.length;
        }

        createParticle(anchor: ParticleAnchor) {
            const p = super.createParticle(anchor);

            p.lifespan = this.galois.randomRange(this.minLifespan, this.maxLifespan);
            p._x = Fx.iadd(this.galois.randomRange(0, this.xRange) - (this.xRange >> 1), p._x);
            p._y = Fx.iadd(this.galois.randomRange(-this.yRange, 0) + (anchor.height ? anchor.height >> 1 : 0), p._y);

            p.vy = Fx8(Math.randomRange(-30, -5));
            p.vx = Fx8(Math.randomRange(-10, 10));

            p.data = this.galois.percentChance(80) ? 0 : 2;
            p.color = this.galois.percentChance(90) ?
                0x9 : (this.galois.percentChance(50) ?
                    0x6 : 0x8);

            return p;
        }

        drawParticle(p: Particle, x: Fx8, y: Fx8) {
            const toDraw = this.states[p.data].clone();
            toDraw.replace(0xF, p.color);
            screen.drawTransparentImage(toDraw, Fx.toInt(x), Fx.toInt(y));
        }
    }

    export class StarFactory extends ParticleFactory {
        protected galois: Math.FastRandom;
        protected possibleColors: number[]
        minRate: number;
        maxRate: number;
        images: Image[];

        constructor(possibleColors?: number[], minRate: number = 15, maxRate: number = 25) {
            super();
            this.galois = new Math.FastRandom();
            this.minRate = minRate;
            this.maxRate = maxRate;
            this.images = [
                img`
                    1
                `,
                img`
                    1 . 1
                    . 1 .
                    1 . 1
                `, img`
                    . 1 .
                    1 1 1
                    . 1 .
                `
            ];

            if (possibleColors && possibleColors.length)
                this.possibleColors = possibleColors
            else
                this.possibleColors = [1];
        }

        createParticle(anchor: ParticleAnchor) {
            const p = super.createParticle(anchor);
            const xRange = anchor.width ? anchor.width >> 1 : 8;

            p._x = Fx8(this.galois.randomRange(anchor.x - xRange, anchor.x + xRange));
            p._y = Fx8(anchor.height ? anchor.y - (anchor.height >> 1) : anchor.y);
            p.vy = Fx8(this.galois.randomRange(this.minRate, this.maxRate));

            // set lifespan based off velocity and screen height (plus a little to make sure it doesn't disappear early)
            p.lifespan = Fx.toInt(Fx.mul(Fx.div(Fx8(screen.height + 20), p.vy), Fx8(1000)));

            const length = this.possibleColors.length - 1;
            p.color = this.possibleColors[this.possibleColors.length - 1];
            for (let i = 0; i < length; ++i) {
                if (this.galois.percentChance(80 - (i * 10))) {
                    p.color = this.possibleColors[i];
                    break;
                }
            }

            // images besides the first one are only used on occasion
            p.data = this.galois.percentChance(15) ? this.galois.randomRange(1, this.images.length - 1) : 0;

            return p;
        }

        drawParticle(p: Particle, x: Fx8, y: Fx8) {
            // on occasion, twinkle from white to yellow
            const twinkleFlag = 0x8000;
            const rest = 0x7FFF;
            if (twinkleFlag && p.data) {
                if (this.galois.percentChance(10)) {
                    p.color = 1;
                    p.data &= rest;
                }
            } else if (p.color === 1 && this.galois.percentChance(1)) {
                p.color = 5;
                p.data |= twinkleFlag;
            }

            const selected = this.images[rest & p.data].clone();
            selected.replace(0x1, p.color);
            screen.drawTransparentImage(selected, Fx.toInt(x), Fx.toInt(y));
        }
    }

    export class CloudFactory extends ParticleFactory {
        minRate: number;
        maxRate: number;
        clouds: Image[];
        camera: scene.Camera;

        constructor(minRate: number = 8, maxRate: number = 12) {
            super();

            this.minRate = minRate;
            this.maxRate = maxRate;
            this.camera = game.currentScene().camera;

            this.clouds = [
                img`
                    . . . . . . . . . . f f f . . .
                    . . . . . . . . . f f 9 f f . .
                    . f f f . f f f . f 9 9 9 f f .
                    f f 1 f f f 1 f f f 1 1 1 9 f f
                    f 1 9 1 9 9 1 9 9 1 1 1 1 9 9 f
                    f 9 1 9 9 1 9 1 1 9 1 1 1 1 1 f
                    f f 1 1 1 1 1 1 1 1 1 1 1 1 1 f
                    . f 1 1 1 1 9 9 1 f f f 1 1 1 f
                    . f 1 f f f 9 f f f . f f 1 f f
                    . f f f . f f f . . . . f f f .
                `, img`
                    . . . . . f f f f f . .
                    . . f f . f 1 1 1 f f .
                    f f f 1 f f 9 9 1 1 f .
                    f 9 9 1 1 1 1 1 9 9 f f
                    . f 1 9 9 1 9 1 1 1 1 f
                    f 1 f f f 1 1 1 1 9 9 f
                    f f f . f f f f 9 f f f
                    . . . . . . . f f f . .
                `, img`
                    . . . . . . . . f f f . .
                    . . . . . . . f f 1 f . .
                    . f f f . . . f 1 9 f f .
                    f f 1 f f . f f 1 1 1 f f
                    f 1 9 1 f f f 1 9 1 1 1 f
                    f f 1 9 1 1 1 9 1 1 1 1 f
                    . f f 9 1 1 9 9 1 1 1 f f
                    . . f 1 1 9 9 1 1 1 f f .
                    . . f f 1 1 1 1 1 f f . .
                    . . . f f 1 f f f f . . .
                    . . . . f f f . . . . . .
                `, img`
                    . f f f .
                    f 1 9 1 f
                    f 9 1 1 f
                    f f 1 f f
                    . f f f .
                `, img`
                    . . . . . f f f f f f .
                    . . . f f f 1 1 1 1 f f
                    . f f f 1 9 1 1 9 1 1 f
                    f f 1 1 9 1 1 1 9 1 1 f
                    f 1 1 9 1 1 1 9 1 1 1 f
                    f f 1 9 1 1 1 1 1 1 1 f
                    . f f 1 1 1 1 1 1 1 f f
                    . . f f f f f f f f f .
                `, img`
                    . f f f . .
                    f f 1 f . .
                    f 1 1 f f f
                    f 1 9 9 1 f
                    f 9 1 1 1 f
                    f f 1 1 1 f
                    . f 1 1 1 f
                    . f f f f f
                `, img`
                    . . . . . . . . . . . . f f f
                    . . . . . . . . . . f f f 1 f
                    f f f f f . f f f . f 1 1 1 f
                    f 1 1 1 f f f 1 f . f 1 1 1 f
                    f f 1 1 1 f 1 1 f f f 1 1 1 f
                    . f f 1 9 1 1 9 1 1 1 1 1 1 f
                    . . f 9 1 1 1 9 1 1 1 1 1 f f
                    . . f 1 1 1 9 9 1 1 1 1 1 f .
                    . . f 1 1 9 9 1 1 1 1 1 f f .
                    . . f f f 1 1 1 1 f f f f . .
                    . . . . f f 1 f f f . . . . .
                    . . . . . f f f . . . . . . .
                `
            ];
        }

        createParticle(anchor: ParticleAnchor) {
            const p = super.createParticle(anchor);
            const yRange = anchor.height ? anchor.height >> 1 : 8;
            p.data = Math.randomRange(0, this.clouds.length - 1);
            p._x = Fx8(anchor.width ? anchor.x + (anchor.width >> 1) : anchor.x)
            p._y = Fx.add(
                Fx8(Math.randomRange(anchor.y - yRange, anchor.y + yRange)),
                Fx8(this.clouds[p.data].width >> 1)
            );
            p.vx = Fx8(-Math.randomRange(this.minRate, this.maxRate));

            // p.color stores information on conjoined clouds
            p.color = 0;
            if (Math.percentChance(30)) {
                const isConjoined = 1 << 0;
                const isOffsetX = Math.randomRange(0, 1) << 1;
                const isOffsetY = Math.randomRange(0, 1) << 2;
                const selection = Math.randomRange(0, this.clouds.length - 1) << 3;

                p.color = isConjoined | isOffsetX | isOffsetY | selection;
            }

            p.lifespan = Fx.toInt(
                Fx.mul(
                    Fx.div(
                        Fx8(screen.width + 30),
                        Fx.abs(p.vx)
                    ),
                    Fx8(1000)
                )
            );

            return p;
        }

        drawParticle(p: particles.Particle, x: Fx8, y: Fx8) {
            const mainImage = this.clouds[p.data];
            screen.drawTransparentImage(
                mainImage,
                Fx.toInt(x),
                Fx.toInt(y)
            );

            if (p.color & 1) {
                const isOffsetX = (p.color >> 1) & 1;
                const isOffsetY = (p.color >> 2) & 1;
                const selection = this.clouds[p.color >> 3];

                const xOffset = isOffsetX ? Fx8(mainImage.width >> 2) : Fx.zeroFx8;
                const yOffset = isOffsetY ? Fx8(mainImage.height >> 2) : Fx.zeroFx8;

                screen.drawTransparentImage(
                    selection,
                    Fx.toInt(Fx.add(x, xOffset)),
                    Fx.toInt(Fx.add(y, yOffset))
                );
            }
        }
    }
}
