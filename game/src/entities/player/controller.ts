import Phaser from 'phaser';
import { DEPTH, hasAnim, type GameContext, type Hurtbox, type PlayerQuery } from '../../core';
import { PLAYER as T } from '../../config/tuning/player';
import { Weapons } from '../weapons';

type ActionState = 'ready' | 'knife' | 'throw' | 'dead' | 'respawn' | 'victory';
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
    private land = 0;
    private recoil = 0;
    private aimAngle = 0;
    private aimTag = 'aim_fwd';
    private metadata: Metadata;
    private muzzlePoint = { x: 0, y: 0 };
    private lastLegs = '';
    private lastPose = '';
    private lastVariant = '';
    private knifeRect = new Phaser.Geom.Rectangle();
    constructor(private ctx: GameContext, x: number, y: number, private index = 0) {
        this.sprite = ctx.scene.physics.add.sprite(x, y, 'knotz_legs').setOrigin(0.5, 1).setDepth(DEPTH.PLAYER).setName('knotz');
        this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
        this.body.setSize(T.standing.width, T.standing.height).setOffset((48 - T.standing.width) / 2, 48 - T.standing.height).setMaxVelocityY(520);
        this.torso = ctx.scene.add.sprite(x, y, 'knotz_torso_pistol').setOrigin(0.5, 1).setDepth(DEPTH.PLAYER + 1);
        this.full = ctx.scene.add.sprite(x, y, 'knotz_full').setOrigin(0.5, 1).setDepth(DEPTH.PLAYER + 1);
        this.metadata = ctx.scene.cache.json.get('knotz_meta') as Metadata;
        this.weapons = new Weapons(ctx);
        this.hp = ctx.state.difficulty === 'casual' ? 3 : 1;
        const collideOff = ctx.physics.collideLevel(this.sprite);
        const hb: Hurtbox = { team: 'player', body: this.body, owner: this.sprite, kind: 'knotz', material: 'flesh',
            alive: () => this.alive(), invulnerable: () => this.invulnerable > 0 || this.state === 'victory',
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
        ctx.debug.register('playerController', () => ({ state: this.state, hp: this.hp, crouch: this.crouch, aim: this.aimAngle, invulnerableMs: this.invulnerable, vx: this.body.velocity.x, vy: this.body.velocity.y }));
        ctx.debug.cheat('give', (w: string, ammo?: number) => this.weapons.equip(w, ammo));
        ctx.debug.cheat('kill', () => this.die());
        ctx.events.emit('player:spawn', { x, y, index });
        this.render();
    }
    private alive(): boolean { return this.state !== 'dead'; }
    private change(state: ActionState): void { this.state = state; this.elapsed = 0; this.actionDone = false; }
    private play(sprite: Phaser.GameObjects.Sprite, key: string): void {
        if (sprite.anims.currentAnim?.key !== key && hasAnim(this.ctx.scene, key)) sprite.play(key);
    }
    private die(): void {
        if (!this.alive() || this.state === 'victory') return;
        this.hp = 0; this.change('dead'); this.weapons.cancel();
        this.body.setVelocity(0, 0); this.body.enable = false;
        this.ctx.events.emit('player:died', { x: this.sprite.x, y: this.sprite.y, index: this.index });
    }
    private revive(x: number, y: number): void {
        this.body.enable = true; this.body.reset(x, y); this.body.setVelocity(0, 0);
        this.hp = this.ctx.state.difficulty === 'casual' ? 3 : 1;
        this.invulnerable = T.respawnMs; this.buffer = this.coyote = 0; this.wasGround = false;
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
        const frames = this.metadata?.muzzles[tag]?.frames;
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
        if (this.state === 'dead') { this.render(); return; }
        if (this.state === 'victory') { this.body.setVelocityX(0); this.render(); return; }
        if (this.state === 'respawn' && this.elapsed > 240) this.change('ready');
        const ctx = this.ctx, input = ctx.inputFor(this.index), aim = input.aim();
        const ground = this.body.blocked.down || this.body.touching.down;
        if (ground && !this.wasGround) {
            this.land = 130; ctx.events.emit('player:land', { x: this.sprite.x, y: this.sprite.y, vy: this.lastVy, index: this.index }); ctx.audio.sfx('land');
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
            this.body.setSize(shape.width, shape.height).setOffset((48 - shape.width) / 2, 48 - shape.height);
            this.body.updateFromGameObject();
        }
        const target = (input.isDown('aimlock') ? 0 : aim.x) * (this.crouch ? T.crouchRun : T.run);
        if (target * this.body.velocity.x < 0) {
            if (ground && this.skid <= 0) ctx.events.emit('fx:emit', { effect: 'dust_skid', x: this.sprite.x, y: this.sprite.y, material: ctx.physics.materialAt(this.sprite.x, this.sprite.y + 1), team: 'player' });
            this.skid = T.skidMs;
        }
        this.dust -= dt;
        if (ground && Math.abs(this.body.velocity.x) > 20 && this.dust <= 0) {
            this.dust = T.dustMs;
            ctx.events.emit('fx:emit', { effect: 'dust_run', x: this.sprite.x - this.facing * 4, y: this.sprite.y, material: ctx.physics.materialAt(this.sprite.x, this.sprite.y + 1), team: 'player', scale: this.crouch ? 0.6 : 1 });
        }
        const vx = this.body.velocity.x, step = T.acceleration * dt / 1000;
        this.body.setVelocityX(vx + Math.sign(target - vx) * Math.min(Math.abs(target - vx), step));
        if (this.buffer > 0 && this.coyote > 0) {
            this.buffer = this.coyote = 0;
            if (aim.y > 0 && ctx.physics.onOneWay(this.sprite)) ctx.physics.dropThrough(this.sprite);
            else {
                this.body.setVelocityY(-T.jump); this.wasGround = false;
                ctx.events.emit('player:jump', { x: this.sprite.x, y: this.sprite.y, vy: -T.jump, index: this.index }); ctx.audio.sfx('jump');
            }
        }
        if (!input.isDown('jump') && this.body.velocity.y < -T.jumpCut) this.body.setVelocityY(-T.jumpCut);
        let dx: number = this.facing, dy = 0;
        if (aim.y < 0 || (aim.y > 0 && !ground)) { dx = aim.x; dy = aim.y; }
        this.aimAngle = Math.atan2(dy, dx);
        this.aimTag = this.crouch ? 'crouch_fwd' : dy < 0 ? (dx ? 'aim_up45' : 'aim_up') : dy > 0 ? (dx ? 'aim_down45' : 'aim_down') : 'aim_fwd';
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
                this.render(true);
                const muzzle = this.muzzle();
                if (this.weapons.fire(muzzle.x, muzzle.y, this.aimAngle, input.justDown('shoot'))) this.recoil = 100;
            }
        }
        this.sync(); this.weapons.update(dt, this.muzzle());
        const cx = ctx.camera.clampX(this.sprite.x, 8);
        if (cx !== this.sprite.x) { this.sprite.x = cx; this.body.updateFromGameObject(); this.body.setVelocityX(0); }
        const hazard = ctx.physics.hazardAt(this.sprite.x, this.sprite.y - 2);
        if (!ctx.cheats.god && hazard === 'water') ctx.events.emit('fx:emit', { effect: 'splash', x: this.sprite.x, y: this.sprite.y, material: 'water', team: 'player' });
        if ((!ctx.cheats.god && hazard) || this.sprite.y > ctx.level.bounds.bottom + 32) this.die();
        this.render();
    }
    private sync(): void {
        const tag = this.sprite.anims.currentAnim?.key;
        const frame = Math.max(0, (this.sprite.anims.currentFrame?.index ?? 1) - 1);
        const bob = tag === 'knotz_legs_run' ? RUN_BOB[frame % 8] : tag === 'knotz_legs_land' && frame === 0 ? 3 : tag === 'knotz_legs_jump_rise' ? -1 : 0;
        const sway = tag === 'knotz_legs_run' ? RUN_SWAY[frame % 8] : 0;
        this.torso.setPosition(this.sprite.x + sway * this.facing, this.sprite.y + bob).setFlipX(this.facing < 0);
        this.full.setPosition(this.sprite.x, this.sprite.y).setFlipX(this.facing < 0);
        this.sprite.setFlipX(this.facing < 0);
    }
    private render(shooting = false): void {
        this.sync();
        const full = this.state === 'dead' || this.state === 'respawn' || this.state === 'victory';
        this.sprite.setVisible(!full); this.torso.setVisible(!full); this.full.setVisible(full);
        const alpha = this.invulnerable > 0 && Math.floor(this.invulnerable / 80) % 2 === 0 ? 0.25 : 1;
        this.sprite.setAlpha(alpha); this.torso.setAlpha(alpha); this.full.setAlpha(this.state === 'dead' ? 1 : alpha);
        if (full) { this.play(this.full, this.state === 'dead' ? 'knotz_death' : this.state === 'victory' ? 'knotz_victory' : 'knotz_respawn_drop'); return; }
        const ground = this.body.blocked.down || this.body.touching.down;
        const moving = Math.abs(this.body.velocity.x) > 5;
        const legs = !ground ? (this.body.velocity.y < 0 ? 'jump_rise' : 'jump_fall') : this.crouch ? (this.crouchEnter > 0 ? 'crouch_enter' : moving ? 'crouch_walk' : 'crouch_idle') : this.skid > 0 ? 'skid' : this.land > 0 ? 'land' : moving ? 'run' : 'idle';
        if (legs !== this.lastLegs) { this.lastLegs = legs; this.play(this.sprite, `knotz_legs_${legs}`); }
        const variant = this.ctx.state.weapon === 'pistol' ? 'pistol' : 'heavy';
        if (variant !== this.lastVariant) { this.torso.stop(); this.torso.setTexture(`knotz_torso_${variant}`); this.lastVariant = variant; this.lastPose = ''; }
        let renderedAim = this.aimTag;
        
        if (this.crouchEnter > 55) renderedAim = 'aim_fwd';
        const pose = this.state === 'knife' ? 'knife' : this.state === 'throw' ? 'grenade_throw' : shooting || this.recoil > 0 ? renderedAim + '_shoot' : renderedAim;
        if (pose !== this.lastPose) { this.lastPose = pose; this.play(this.torso, `knotz_${variant}_${pose}`); }
        this.sync();
    }
}
