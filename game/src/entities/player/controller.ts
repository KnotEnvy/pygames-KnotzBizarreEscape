import Phaser from 'phaser';
import { DEPTH, hasAnim, type GameContext, type Hurtbox, type PlayerQuery } from '../../core';
import { PLAYER as T } from '../../config/tuning/player';
import { Weapons } from '../weapons';

export type Entry = 'walk' | 'jump_down' | 'tumble' | 'skiff_dock' | 'skiff_barge' | 'wreck_crawl';
type ActionState = 'entrance' | 'ready' | 'knife' | 'throw' | 'sinking' | 'dead' | 'respawn' | 'victory';
interface Socket { offsetFromFeet: [number, number]; direction: [number, number] }
interface Metadata { muzzles: Record<string, { frames: Socket[] }> }
const RUN_BOB = [1, 0, -1, 0, 1, 0, -1, 0] as const;
const RUN_SWAY = [0, 1, 1, 0, 0, -1, -1, 0] as const;
const HEADROOM = [-5, 0, 5] as const;
const MUZZLE_FALLBACK = [15, -21] as const;

export class Knotz {
    readonly sprite: Phaser.Physics.Arcade.Sprite;
    readonly weapons: Weapons;
    private torso: Phaser.GameObjects.Sprite;
    private full: Phaser.GameObjects.Sprite;
    private body: Phaser.Physics.Arcade.Body;
    private facing: 1 | -1 = 1;
    private state: ActionState = 'respawn';
    private hp = 1;
    private invulnerable: number = T.respawnMs;
    private elapsed = 0;
    private actionDone = false;
    private coyote = 0;
    private buffer = 0;
    private wasGround = false;
    private lastVy = 0;
    private crouch = false;
    private crouchEnter = 0;
    private skid = 0;
    private dust = 0;
    private iceSpark = 0;
    private onIce = false;
    private surface: string | null = null;
    private surfaceStep = 0;
    private surfaceJump = 1;
    private sinkDeath = false;
    private sinkY = 0;
    private sinkBubble = 0;
    private entryX = 0;
    private entryY = 0;
    private entryLanded = false;
    private lastPumping = false;
    private land = 0;
    private recoil = 0;
    private aimAngle = 0;
    private aimLocked = false;
    private aimTag = 'aim_fwd';
    private metadata: Metadata;
    private missionMetadata: Metadata | undefined;
    private muzzlePoint = { x: 0, y: 0 };
    private lastLegs = '';
    private lastPose = '';
    private lastRenderedAim = '';
    private lastAction: ActionState | '' = '';
    private lastShooting = false;
    private lastVariant = '';
    private knifeRect = new Phaser.Geom.Rectangle();
    constructor(private ctx: GameContext, x: number, y: number, private index = 0, private entry?: Entry) {
        this.sprite = ctx.scene.physics.add.sprite(x, y, 'knotz_legs').setOrigin(0.5, 1).setDepth(DEPTH.PLAYER).setName('knotz');
        this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
        this.body.setSize(T.standing.width, T.standing.height).setOffset((48 - T.standing.width) / 2, 48 - T.standing.height).setMaxVelocityY(520);
        this.torso = ctx.scene.add.sprite(x, y, 'knotz_torso_pistol').setOrigin(0.5, 1).setDepth(DEPTH.PLAYER + 1);
        this.full = ctx.scene.add.sprite(x, y, 'knotz_full').setOrigin(0.5, 1).setDepth(DEPTH.PLAYER + 1);
        this.metadata = ctx.scene.cache.json.get('knotz_meta') as Metadata;
        this.missionMetadata = ctx.scene.cache.json.get('knotz_m2_meta') as Metadata | undefined;
        this.weapons = new Weapons(ctx);
        // RunState has already been restored by Engine before factories run. Publish it for HUD listeners.
        this.weapons.equip(ctx.state.weapon, ctx.state.ammo);
        if (entry) {
            this.change('entrance');
            if (this.bayouEntry()) {
                this.entryX = x; this.entryY = y; this.body.enable = false;
                this.sprite.setPosition(x - (entry === 'wreck_crawl' ? 28 : 44), y + (entry === 'wreck_crawl' ? 4 : 12));
            }
            else if (entry === 'jump_down') { this.body.reset(x, y - 48); this.body.setVelocity(45, 80); }
            else if (entry === 'tumble') { this.body.reset(x, y - 24); this.body.setVelocity(85, -100); }
            else this.body.setVelocityX(50);
        }
        this.hp = ctx.state.difficulty === 'casual' ? 3 : 1;
        const collideOff = ctx.physics.collideLevel(this.sprite);
        const hb: Hurtbox = { team: 'player', body: this.body, owner: this.sprite, kind: 'knotz', material: 'flesh',
            alive: () => this.alive(), invulnerable: () => this.invulnerable > 0 || this.state === 'victory' || this.state === 'entrance',
            hit: info => {
                this.hp -= info.damage;
                if (this.hp <= 0) this.die();
                else { this.invulnerable = T.hurtMs; this.body.setVelocityX(-this.facing * 70); }
            } };
        const unregister = ctx.damage.register(hb);
        const self = this;
        const query: PlayerQuery = {
            get x() { return self.sprite.x; }, get y() { return self.sprite.y; },
            get centerY() { return self.sprite.y - (self.crouch ? 10 : 16); }, get facing() { return self.facing; },
            sprite: this.sprite, alive: () => this.alive(), teleport: (nx, ny) => { this.body.reset(nx, ny); this.sync(); },
        };
        ctx.setPlayer(query, index);
        const offRespawn = ctx.events.on('game:respawn', e => { if ((e.index ?? 0) === index) this.revive(e.x, e.y); });
        const offVictory = ctx.events.on('stage:clear', () => { if (this.alive()) { this.change('victory'); this.weapons.cancel(); } });
        const offUpdate = ctx.onUpdate(dt => this.update(dt));
        // Arcade applies its final body-to-sprite correction after update; composite on POST_UPDATE to avoid a frame of seam jitter.
        const sync = (): void => this.sync();
        ctx.scene.events.on(Phaser.Scenes.Events.POST_UPDATE, sync);
        this.sprite.once('destroy', () => {
            offUpdate(); offRespawn(); offVictory(); collideOff(); unregister();
            ctx.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, sync);
            this.torso.destroy(); this.full.destroy();
            if (ctx.player(index) === query) ctx.setPlayer(null, index);
        });
        ctx.debug.register('shotsFired', () => this.weapons.shotsFired);
        ctx.debug.register('playerController', () => ({ state: this.state, hp: this.hp, crouch: this.crouch, aim: this.aimAngle, aimTag: this.aimTag, aimLocked: this.aimLocked, facing: this.facing, muzzle: { ...this.muzzle() }, invulnerableMs: this.invulnerable, vx: this.body.velocity.x, vy: this.body.velocity.y, onIce: this.onIce, surface: this.surface, pumping: this.weapons.pumping, entry: this.entry, hurtboxTop: this.body.top, hurtboxHeight: this.body.height }));
        ctx.debug.cheat('give', (w: string, ammo?: number) => this.weapons.equip(w, ammo));
        ctx.debug.cheat('kill', () => this.die());
        ctx.events.emit('player:spawn', { x, y, index });
        this.render();
    }
    private alive(): boolean { return this.state !== 'dead' && this.state !== 'sinking'; }
    private bayouEntry(): boolean { return this.entry === 'skiff_dock' || this.entry === 'skiff_barge' || this.entry === 'wreck_crawl'; }
    private change(state: ActionState): void { this.state = state; this.elapsed = 0; this.actionDone = false; }
    private play(sprite: Phaser.GameObjects.Sprite, key: string): void {
        if (sprite.anims.currentAnim?.key !== key && hasAnim(this.ctx.scene, key)) sprite.play(key);
    }
    private die(hazard?: string | null): void {
        if (!this.alive() || this.state === 'victory') return;
        this.hp = 0; this.weapons.cancel();
        const water = hazard === 'water' || (!hazard && this.ctx.physics.hazardAt(this.sprite.x, this.body.bottom + 1) === 'water');
        if (water && this.ctx.scene.textures.exists('knotz_sink')) {
            this.sinkDeath = true; this.sinkY = this.sprite.y; this.sinkBubble = 0;
            this.change('sinking'); this.body.setVelocity(0, 0); this.body.enable = false;
            this.ctx.events.emit('water:splash', { x: this.sprite.x, y: this.sinkY, size: 'l', kind: 'sink' });
            return;
        }
        this.change('dead');
        this.body.setVelocity(0, 0); this.body.enable = false;
        this.ctx.events.emit('player:died', { x: this.sprite.x, y: this.sprite.y, index: this.index });
    }
    private revive(x: number, y: number): void {
        this.body.enable = true; this.body.reset(x, y); this.body.setVelocity(0, 0);
        this.hp = this.ctx.state.difficulty === 'casual' ? 3 : 1;
        this.invulnerable = T.respawnMs; this.buffer = this.coyote = 0; this.wasGround = false;
        this.full.setRotation(0).setOrigin(0.5, 1).setCrop();
        this.sinkDeath = false; this.surface = null; this.surfaceStep = 0; this.surfaceJump = 1;
        this.change('respawn'); this.weapons.equip('pistol');
        this.ctx.events.emit('player:respawn', { x, y, index: this.index });
    }
    private knifeTargets(): readonly Hurtbox[] {
        this.knifeRect.setTo(this.facing > 0 ? this.sprite.x : this.sprite.x - T.knifeRange - 7,
            this.sprite.y - (this.crouch ? 20 : 30), T.knifeRange + 7, this.crouch ? 18 : 28);
        return this.ctx.damage.queryRect(this.knifeRect, 'player');
    }
    private muzzle(): { x: number; y: number } {
        const tag = this.torso.anims.currentAnim?.key ?? `knotz_pistol_${this.aimTag}`;
        const frames = (this.missionMetadata?.muzzles[tag] ?? this.metadata?.muzzles[tag])?.frames;
        const frame = frames?.[Math.min(frames.length - 1, Math.max(0, (this.torso.anims.currentFrame?.index ?? 1) - 1))];
        const offset = frame?.offsetFromFeet ?? MUZZLE_FALLBACK;
        this.muzzlePoint.x = this.torso.x + this.facing * offset[0];
        this.muzzlePoint.y = this.torso.y + offset[1];
        return this.muzzlePoint;
    }
    private update(dt: number): void {
        if (dt <= 0) return;
        this.elapsed += dt; this.invulnerable = Math.max(0, this.invulnerable - dt);
        this.crouchEnter = Math.max(0, this.crouchEnter - dt);
        this.recoil = Math.max(0, this.recoil - dt); this.skid = Math.max(0, this.skid - dt); this.land = Math.max(0, this.land - dt);
        if (this.state === 'sinking') {
            this.sinkBubble -= dt;
            if (this.sinkBubble <= 0) {
                this.sinkBubble = 150;
                this.ctx.events.emit('fx:emit', { effect: 'bubbles', x: this.sprite.x + this.facing * 4, y: this.sinkY - 9, count: 2, material: 'water', team: 'player' });
            }
            this.sprite.y = this.sinkY + Math.min(42, this.elapsed * 0.045);
            if (this.elapsed >= T.sinkMs) {
                this.change('dead');
                this.ctx.events.emit('player:died', { x: this.sprite.x, y: this.sinkY, index: this.index });
            }
            this.render(); return;
        }
        if (this.state === 'dead') { this.render(); return; }
        if (this.state === 'victory') { this.body.setVelocityX(0); this.render(); return; }
        if (this.state === 'entrance' && this.bayouEntry()) {
            const progress = Math.min(1, this.elapsed / T.bayouEntranceMs);
            const crawl = this.entry === 'wreck_crawl';
            const travel = crawl ? progress : Math.min(1, progress / 0.78);
            const arc = this.entry === 'skiff_barge' ? 48 : 33;
            this.sprite.setPosition(this.entryX - (crawl ? 28 : 44) * (1 - travel),
                this.entryY + (crawl ? (1 - progress) * 4 : 12 * (1 - travel) - Math.sin(travel * Math.PI) * arc));
            if (!this.entryLanded && (crawl ? progress >= 0.85 : progress >= 0.78)) {
                this.entryLanded = true;
                this.ctx.events.emit('player:land', { x: this.entryX, y: this.entryY, vy: 150, index: this.index });
                if (this.ctx.physics.surfaceAt(this.entryX, this.entryY + 1) === 'shallow' || crawl) this.ctx.events.emit('water:splash', { x: this.entryX, y: this.entryY, size: 'm', kind: 'enter' });
            }
            if (progress < 1) { this.render(); return; }
            this.body.enable = true; this.body.reset(this.entryX, this.entryY); this.body.setVelocity(0, 0);
            this.full.setRotation(0).setOrigin(0.5, 1); this.wasGround = true; this.change('ready'); this.render(); return;
        }
        if (this.state === 'entrance') {
            const grounded = this.body.blocked.down || this.body.touching.down;
            if (this.elapsed >= T.entranceMaxMs || (this.entry === 'walk' ? this.elapsed >= T.entranceWalkMs : grounded && this.elapsed >= T.entranceMinMs)) {
                this.body.setVelocityX(0); this.full.setRotation(0).setOrigin(0.5, 1); this.change('ready');
            } else { this.render(); return; }
        }
        if (this.state === 'respawn' && this.elapsed > 240) this.change('ready');
        const ctx = this.ctx, input = ctx.inputFor(this.index), aim = input.aim();
        const ground = this.body.blocked.down || this.body.touching.down;
        this.aimLocked = input.isDown('aimlock');
        this.surface = ground ? ctx.physics.surfaceAt(this.sprite.x, this.body.bottom + 1) : null;
        const wet = this.surface === 'shallow', muddy = this.surface === 'mud';
        const surfaceTuning = wet ? T.surface.shallow : muddy ? T.surface.mud : null;
        if (ground) this.surfaceJump = surfaceTuning?.jump ?? 1;
        if (ground && !this.wasGround) {
            this.land = 130; ctx.events.emit('player:land', { x: this.sprite.x, y: this.sprite.y, vy: this.lastVy, index: this.index });
            if (wet) ctx.events.emit('water:splash', { x: this.sprite.x, y: this.body.bottom, size: 'm', kind: 'enter' });
            else if (muddy) this.mudStep(true);
            else ctx.audio.sfx('land');
        }
        this.wasGround = ground; this.lastVy = this.body.velocity.y;
        this.coyote = ground ? T.coyoteMs : this.coyote - dt;
        this.buffer = input.justDown('jump') ? T.bufferMs : this.buffer - dt;
        if (aim.x) this.facing = aim.x;
        let crouch = ground && aim.y > 0;
        if (this.crouch && !crouch) {
            for (const dx of HEADROOM) if (ctx.physics.solidAt(this.sprite.x + dx, this.sprite.y - 30)) crouch = true;
        }
        if (crouch !== this.crouch) {
            this.crouch = crouch;
            this.crouchEnter = crouch ? 110 : 0;
            const shape = crouch ? T.crouching : T.standing;
            const ox = this.body.offset.x, oy = this.body.offset.y;
            this.body.setSize(shape.width, shape.height, false).setOffset((48 - shape.width) / 2, 48 - shape.height);
            const dx = this.body.offset.x - ox, dy = this.body.offset.y - oy;
            // Resize around the feet without counting the offset change as Arcade movement.
            // Keep the actual physics displacement pending for POST_UPDATE intact.
            this.body.position.x += dx; this.body.position.y += dy;
            this.body.prev.x += dx; this.body.prev.y += dy;
            this.body.prevFrame.x += dx; this.body.prevFrame.y += dy;
            this.body.updateCenter();
        }
        this.onIce = this.surface === 'ice';
        const target = (this.aimLocked ? 0 : aim.x) * (this.crouch ? T.crouchRun : T.run) * (surfaceTuning?.speed ?? 1);
        this.surfaceStep -= dt;
        if (ground && (wet || muddy) && Math.abs(this.body.velocity.x) > 12 && this.surfaceStep <= 0) {
            this.surfaceStep = T.surfaceStepMs;
            if (wet) ctx.events.emit('water:splash', { x: this.sprite.x, y: this.body.bottom, size: 's', kind: 'step' });
            else this.mudStep(false);
        }
        if (target * this.body.velocity.x < 0) {
            if (ground && !this.onIce && !wet && !muddy && this.skid <= 0) ctx.events.emit('fx:emit', { effect: 'dust_skid', x: this.sprite.x, y: this.sprite.y, material: ctx.physics.materialAt(this.sprite.x, this.sprite.y + 1), team: 'player' });
            this.skid = T.skidMs;
        }
        this.iceSpark -= dt;
        if (this.onIce && Math.abs(this.body.velocity.x) > 20 && (target === 0 || target * this.body.velocity.x < 0) && this.iceSpark <= 0) {
            this.iceSpark = T.iceSkidMs;
            ctx.events.emit('fx:emit', { effect: 'ice_skid', x: this.sprite.x, y: this.body.bottom });
        }
        this.dust -= dt;
        if (ground && !this.onIce && !wet && !muddy && Math.abs(this.body.velocity.x) > 20 && this.dust <= 0) {
            this.dust = T.dustMs;
            ctx.events.emit('fx:emit', { effect: 'dust_run', x: this.sprite.x - this.facing * 4, y: this.sprite.y, material: ctx.physics.materialAt(this.sprite.x, this.sprite.y + 1), team: 'player', scale: this.crouch ? 0.6 : 1 });
        }
        const vx = this.body.velocity.x, step = (this.onIce ? (this.aimLocked || this.crouch ? T.iceBrake : target === 0 ? T.iceDeceleration : T.iceAcceleration) : muddy ? T.mudAcceleration : T.acceleration) * dt / 1000;
        this.body.setVelocityX(vx + Math.sign(target - vx) * Math.min(Math.abs(target - vx), step));
        if (this.buffer > 0 && this.coyote > 0) {
            this.buffer = this.coyote = 0;
            if (aim.y > 0 && ctx.physics.onOneWay(this.sprite)) ctx.physics.dropThrough(this.sprite);
            else {
                this.body.setVelocityY(-T.jump * this.surfaceJump); this.wasGround = false;
                ctx.events.emit('player:jump', { x: this.sprite.x, y: this.sprite.y, vy: -T.jump * this.surfaceJump, index: this.index }); ctx.audio.sfx('jump');
            }
        }
        if (!input.isDown('jump') && this.body.velocity.y < -T.jumpCut) this.body.setVelocityY(-T.jumpCut);
        let dx: number = this.facing, dy = 0;
        if (aim.y < 0 || (aim.y > 0 && (!ground || this.aimLocked))) { dx = aim.x; dy = aim.y; }
        this.aimAngle = Math.atan2(dy, dx);
        this.aimTag = this.crouch ? (dy > 0 ? (dx ? 'crouch_down45' : 'crouch_down') : 'crouch_fwd') : dy < 0 ? (dx ? 'aim_up45' : 'aim_up') : dy > 0 ? (dx ? 'aim_down45' : 'aim_down') : 'aim_fwd';
        if (this.state === 'knife' || this.state === 'throw') {
            const knife = this.state === 'knife';
            if (!this.actionDone && this.elapsed >= (knife ? T.knifeWindupMs : T.throwReleaseMs)) {
                this.actionDone = true;
                if (knife) {
                    let connected = false;
                    // Damage callbacks can query again; snapshot only on the actual strike.
                    for (const h of [...this.knifeTargets()]) if (h.team === 'enemy') connected = ctx.damage.deal(h, { damage: T.knifeDamage, source: 'player', x: this.sprite.x + this.facing * 12, y: this.sprite.y - 18, dirX: this.facing, dirY: 0, kind: 'melee', weapon: 'knife' }) || connected;
                    if (connected) ctx.fx.hitstop(T.knifeHitstopMs);
                } else this.weapons.grenade(this.sprite.x + this.facing * 10, this.sprite.y - 33, this.facing);
            }
            if (this.elapsed >= (knife ? T.knifeMs : T.throwMs)) this.change('ready');
        } else if (this.state === 'ready') {
            if (input.justDown('grenade') && ctx.state.bombs > 0) { ctx.state.bombs--; this.change('throw'); }
            else if (input.justDown('shoot') && this.knifeTargets().some(h => h.team === 'enemy')) {
                this.change('knife'); ctx.events.emit('player:melee', { x: this.sprite.x, y: this.sprite.y - 18, facing: this.facing }); ctx.audio.sfx('knife');
            } else if (input.isDown('shoot')) {
                this.render();
                const muzzle = this.muzzle();
                if (this.weapons.fire(muzzle.x, muzzle.y, this.aimAngle, input.justDown('shoot'))) {
                    this.recoil = 100;
                    this.render(true);
                    // Each accepted round kicks again, including when FIRE stays held.
                    if (this.torso.anims.currentAnim?.key.endsWith('_shoot')) this.torso.anims.restart();
                }
            }
        }
        this.sync(); this.weapons.update(dt, this.muzzle());
        const cx = ctx.camera.clampX(this.sprite.x, 8);
        if (cx !== this.sprite.x) { this.sprite.x = cx; this.body.updateFromGameObject(); this.body.setVelocityX(0); }
        const hazard = ctx.physics.hazardAt(this.sprite.x, this.sprite.y - 2);
        if ((!ctx.cheats.god && hazard) || this.sprite.y > ctx.level.bounds.bottom + 32) this.die(hazard);
        this.render();
    }
    private mudStep(landing: boolean): void {
        this.ctx.events.emit('fx:emit', { effect: 'mud_splat', x: this.sprite.x, y: this.body.bottom, scale: landing ? 1.5 : 0.65, count: landing ? 8 : 3, material: 'mud', team: 'player' });
        this.ctx.audio.sfx('mud_step', { x: this.sprite.x, volume: landing ? 1 : 0.65, detune: landing ? -350 : 0 });
    }
    private sync(): void {
        const tag = this.sprite.anims.currentAnim?.key;
        const frame = Math.max(0, (this.sprite.anims.currentFrame?.index ?? 1) - 1);
        const bob = tag === 'knotz_legs_run' ? RUN_BOB[frame % 8] : tag === 'knotz_legs_land' && frame === 0 ? 3 : tag === 'knotz_legs_jump_rise' ? -1 : 0;
        const sway = tag === 'knotz_legs_run' ? RUN_SWAY[frame % 8] : 0;
        this.torso.setPosition(this.sprite.x + sway * this.facing, this.sprite.y + bob).setFlipX(this.facing < 0);
        this.full.setPosition(this.sprite.x, this.sprite.y - (this.state === 'entrance' && this.entry === 'tumble' ? 17 : 0)).setFlipX(this.facing < 0);
        this.sprite.setFlipX(this.facing < 0);
    }
    private render(shooting = false): void {
        this.sync();
        const full = this.state === 'sinking' || this.state === 'dead' || this.state === 'respawn' || this.state === 'victory' || (this.state === 'entrance' && (this.entry === 'tumble' || this.entry === 'wreck_crawl'));
        this.sprite.setVisible(!full); this.torso.setVisible(!full); this.full.setVisible(full);
        const alpha = this.state !== 'entrance' && this.invulnerable > 0 && Math.floor(this.invulnerable / 80) % 2 === 0 ? 0.25 : 1;
        this.sprite.setAlpha(alpha); this.torso.setAlpha(alpha); this.full.setAlpha(this.state === 'dead' ? 1 : alpha);
        if (this.state === 'entrance' && this.entry === 'tumble') {
            this.full.setOrigin(0.5, 0.65).setPosition(this.sprite.x, this.sprite.y - 17).setRotation(this.elapsed / T.entranceMinMs * Math.PI * 2);
        }
        if (this.state === 'sinking' || (this.state === 'dead' && this.sinkDeath)) {
            if (this.full.texture.key !== 'knotz_sink') this.full.setTexture('knotz_sink');
            this.full.setCrop(0, 0, 48, Math.max(0, 48 - (this.sprite.y - this.sinkY))).setAlpha(this.state === 'dead' ? 0 : 1);
            this.play(this.full, 'knotz_sink_flail'); return;
        }
        const fullTexture = this.state === 'entrance' && this.entry === 'wreck_crawl' ? 'knotz_crawl' : 'knotz_full';
        if (this.full.texture.key !== fullTexture) this.full.setTexture(fullTexture).setCrop();
        if (this.state === 'entrance' && this.entry === 'wreck_crawl') { this.play(this.full, 'knotz_crawl_emerge'); return; }
        if (full) { this.play(this.full, this.state === 'dead' ? 'knotz_death' : this.state === 'victory' ? 'knotz_victory' : 'knotz_respawn_drop'); return; }
        const ground = this.body.blocked.down || this.body.touching.down;
        const moving = Math.abs(this.body.velocity.x) > 5;
        const entryAir = this.state === 'entrance' && this.bayouEntry() && !this.entryLanded;
        const entryLanding = this.state === 'entrance' && this.bayouEntry() && this.entryLanded;
        const legs = entryLanding ? 'land' : entryAir ? (this.elapsed < 390 ? 'jump_rise' : 'jump_fall') : !ground ? (this.body.velocity.y < 0 ? 'jump_rise' : 'jump_fall') : this.crouch ? (this.crouchEnter > 0 ? 'crouch_enter' : moving ? 'crouch_walk' : 'crouch_idle') : this.skid > 0 ? 'skid' : this.land > 0 ? 'land' : moving ? 'run' : 'idle';
        if (legs !== this.lastLegs) { this.lastLegs = legs; this.play(this.sprite, `knotz_legs_${legs}`); }
        const weaponVariant = this.ctx.state.weapon === 'hmg' ? 'heavy' : this.ctx.state.weapon;
        const variant = this.ctx.scene.textures.exists(`knotz_torso_${weaponVariant}`) ? weaponVariant : 'spread';
        if (variant !== this.lastVariant) { this.torso.stop(); this.torso.setTexture(`knotz_torso_${variant}`); this.lastVariant = variant; this.lastPose = ''; }
        let renderedAim = this.aimTag;

        if (this.crouchEnter > 55 && renderedAim === 'crouch_fwd') renderedAim = 'aim_fwd';
        const firing = shooting || this.recoil > 0;
        const pumping = variant === 'shotgun' && this.weapons.pumping && this.state === 'ready';
        if (!this.lastPose || renderedAim !== this.lastRenderedAim || this.state !== this.lastAction || firing !== this.lastShooting || pumping !== this.lastPumping) {
            const pose = this.state === 'knife' ? 'knife' : this.state === 'throw' ? 'grenade_throw' : pumping ? renderedAim + '_pump' : firing ? renderedAim + '_shoot' : renderedAim;
            this.lastPose = pose; this.lastRenderedAim = renderedAim; this.lastAction = this.state; this.lastShooting = firing; this.lastPumping = pumping;
            this.play(this.torso, `knotz_${variant}_${pose}`);
        }
        this.sync();
    }
}
