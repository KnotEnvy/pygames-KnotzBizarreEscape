#!/usr/bin/env node
// Evidence-oriented integration probes. Factory/damage fixtures are explicitly separate
// from physical section runs; neither is a claim of human/gamepad balance acceptance.
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { options, numeric, artifactDirectory, openSession, requireReady, resetTelemetry,
  collectTelemetry, saveReport, newReport } from '../helpers/runtime.mjs';

const args = options();
const mode = String(args.mode ?? 'systems');
const directory = await artifactDirectory(`phase-c-${mode}`);
const report = newReport(`Phase C ${mode}`, args);
report.checks = []; report.cases = [];
let session; let caseName = ''; let serial = 0;
const state = () => session.page.evaluate(() => window.__KBE.state());
const wait = ms => session.page.waitForTimeout(ms);
async function check(name, ok, detail) {
  report.checks.push({ case: caseName, name, ok: Boolean(ok), detail });
  if (!ok) { report.status = 'failed'; report.problems.push(`${caseName}: ${name}`); }
}
async function shot(name) {
  const file = `${String(serial++).padStart(3, '0')}-${name}.png`;
  await session.page.screenshot({ path: path.join(directory, file) });
  report.captures.push({ label: name, file, state: await state() });
}
async function boot(name, query = '') {
  caseName = name;
  const params = new URLSearchParams('scene=Game&fast=1&mute=1&seed=731');
  for (const [key,value] of new URLSearchParams(query)) params.set(key,value);
  if (!session) session = await openSession(params.toString(), report);
  else {
    const base = new URL(session.page.url()).origin;
    await session.page.goto(`${base}/?${params}`);
  }
  if(params.get('scene')==='Game') await requireReady(session.page);
  else await session.page.waitForFunction(()=>window.__KBE?.ready,{},{timeout:6000});
  await session.page.evaluate(() => {
    // Read the running context without importing or modifying gameplay modules.
    window.__QACTX = window.__KBE.game.scene.getScene('Game').ctx;
    window.__QAEVENTS = [];
    if(!window.__QACTX) return;
    for (const key of ['player:died','player:respawn','player:shoot','player:melee','player:grenade',
      'enemy:shoot','enemy:killed','entity:hurt','explosion','pickup:collected','pow:freed',
      'camera:lock','camera:unlock','boss:spawn','boss:phase','boss:defeated','stage:clear','game:over','game:continue']) {
      window.__QACTX.events.on(key, payload => window.__QAEVENTS.push({ key, at: performance.now(), ...payload }));
    }
  });
  await wait(400);
  console.log(`CASE ${name} ${session.page.url()}`);
}
async function finishCase(detail = {}) {
  const events = await session.page.evaluate(() => window.__QAEVENTS);
  report.cases.push({ name: caseName, url: session.page.url(), final: await state(), events, ...detail });
}
async function clearActors() {
  await session.page.evaluate(() => {
    const c = window.__QACTX;
    const owners = []; c.damage.forEach(h => { if (h.team === 'enemy' && h.owner) owners.push(h.owner); });
    for (const o of owners) o.destroy();
    c.projectiles.clear('enemy');
  });
}
async function press(key, ms = 100) { await session.page.keyboard.press(key, { delay: ms }); }

async function systems() {
  await boot('weapons-eight-way', 'god=1&x=5800');
  await clearActors();
  await wait(2100);
  for (const weapon of ['pistol', 'hmg', 'spread', 'rocket', 'flame']) {
    const observed = [];
    for (const [dx, dy] of [[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1],[0,1],[1,1]]) {
      await session.page.evaluate(({ weapon, dy }) => {
        const c = window.__QACTX, p = c.player();
        p.teleport(5800, dy > 0 ? 270 : 336);
        window.__KBE.cheats.give(weapon, 50);
      }, { weapon, dy });
      await session.page.keyboard.down('Shift');
      if (dx) await session.page.keyboard.down(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
      if (dy) await session.page.keyboard.down(dy > 0 ? 'ArrowDown' : 'ArrowUp');
      const before = await session.page.evaluate(() => window.__QAEVENTS.length);
      await press('x', 150);
      const sample = await session.page.evaluate(before => ({
        shots: window.__QAEVENTS.slice(before).filter(e => e.key === 'player:shoot'),
        projectiles: (() => { const result = []; window.__QACTX.projectiles.forEach(p => { if (p.team === 'player') result.push({ vx:p.vx,vy:p.vy,texture:p.sprite?.texture?.key }); }); return result; })(),
        state: window.__KBE.state()
      }), before);
      const actual = sample.shots.at(-1)?.angle;
      const expected = Math.atan2(dy, dx);
      await check(`${weapon} aim ${dx},${dy}`, actual !== undefined && Math.abs(Math.atan2(Math.sin(actual-expected),Math.cos(actual-expected))) < .05, { actual, expected });
      observed.push({ dx, dy, ...sample });
      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) await shot(`${weapon}-aim-${dx}-${dy}`);
      for (const key of ['Shift','ArrowRight','ArrowLeft','ArrowDown','ArrowUp']) await session.page.keyboard.up(key);
      await wait(650);
    }
    if (weapon !== 'pistol') {
      await session.page.evaluate(weapon => { window.__QACTX.player().teleport(5800,336); window.__KBE.cheats.give(weapon,1); }, weapon);
      await press('x', 180); await wait(700);
      const depleted = await state();
      await check(`${weapon} depletion to pistol`, depleted.player.weapon === 'pistol' && depleted.player.ammo === -1, depleted.player);
    }
    report.cases.push({ name: weapon, directions: observed });
  }
  await finishCase();

  await boot('grenade-knife-crouch', 'god=1&x=5800'); await clearActors(); await wait(500);
  await press('ArrowDown', 180);
  await session.page.keyboard.down('ArrowDown'); await wait(120);
  await check('crouch lowers hitbox', (await state()).playerController.crouch && await session.page.evaluate(() => window.__QACTX.player().sprite.body.height === 20), await state());
  await shot('crouch'); await session.page.keyboard.up('ArrowDown');
  const bombs = (await state()).player.bombs;
  await press('c', 70); await wait(300); await shot('grenade-flight'); await wait(2300);
  await check('grenade consumes one bomb and explodes', (await state()).player.bombs === bombs-1 && await session.page.evaluate(() => window.__QAEVENTS.some(e => e.key === 'explosion' && e.team === 'player')), await state());
  await session.page.evaluate(() => { const c=window.__QACTX,p=c.player(); c.spawn('enemy','grunt',{patrol:0,facing:-1},p.x+15,p.y); });
  await press('x', 80); await wait(350);
  await check('close shoot knives and kills grunt', await session.page.evaluate(() => window.__QAEVENTS.some(e => e.key === 'enemy:killed' && e.cause === 'melee')), await state());
  await shot('knife-result'); await finishCase();

  await boot('pickups-pow-props', 'god=1&x=5800'); await clearActors();
  for (const kind of ['hmg','spread','rocket','flame','bombs','points','life']) {
    const before = await state();
    await session.page.evaluate(kind => { const c=window.__QACTX,p=c.player(); c.spawn('pickup',kind,{},p.x,p.y); }, kind);
    await wait(420);
    const after = await state();
    await check(`pickup ${kind}`, ['hmg','spread','rocket','flame'].includes(kind) ? after.player.weapon===kind : kind==='bombs' ? after.player.bombs===Math.min(30,before.player.bombs+10) : kind==='life' ? after.player.lives===before.player.lives+1 : after.score>before.score, { before, after });
  }
  const beforePow = await state();
  await session.page.evaluate(() => { const c=window.__QACTX,p=c.player(); c.spawn('pow','hmg',{},p.x+65,p.y); c.damage.applyRadial(p.x+65,p.y-14,30,99,'player','explosion'); });
  await wait(100);
  await check('POW unaffected by explosions', (await state()).rescued===beforePow.rescued);
  await session.page.evaluate(() => { const c=window.__QACTX,p=c.player(); p.teleport(p.x+65,p.y); });
  await wait(850); await shot('pow-salute-gift'); await wait(1000);
  await check('POW rescue rewards once', (await state()).rescued===beforePow.rescued+1 && (await state()).score===beforePow.score+100, { beforePow, after:await state() });
  const propResult = await session.page.evaluate(() => {
    const c=window.__QACTX,p=c.player();
    c.spawn('prop','crate',{contains:'bombs'},p.x+65,p.y);
    c.spawn('prop','explosive_barrel',{},p.x+105,p.y);
    c.spawn('prop','explosive_barrel',{},p.x+125,p.y);
    const owners=c.scene.children.list.filter(o=>o.active&&o.name==='prop:crate'&&o.x===p.x+65 || o.active&&o.name==='prop:explosive_barrel'&&[p.x+105,p.x+125].includes(o.x));
    c.damage.applyRadial(p.x+65,p.y-8,10,10,'player','bullet');
    c.damage.applyRadial(p.x+105,p.y-8,10,10,'player','bullet');
    window.__QAPROPS=owners;
    return owners.length;
  });
  await wait(700); await shot('crate-barrel-chain');
  await check('crate and chained barrels removed', propResult===3 && await session.page.evaluate(()=>window.__QAPROPS.every(p=>!p.active)), { propResult });
  await finishCase();

  for (const difficulty of ['arcade','casual']) {
    await boot(`damage-${difficulty}`, `god=1&difficulty=${difficulty}&x=5800`); await clearActors(); await wait(2200);
    const initial=await state();
    await session.page.evaluate(()=>window.__KBE.cheats.hurt(1)); await wait(80);
    await check('god blocks normal hurt', (await state()).playerController.hp===initial.playerController.hp);
    await session.page.evaluate(()=>{window.__KBE.cheats.god(false);window.__KBE.cheats.hurt(1);}); await wait(80);
    await check('normal hit respects difficulty', difficulty==='arcade' ? !(await state()).player.alive : (await state()).playerController.hp===2, await state());
    if(difficulty==='casual') {
      await session.page.evaluate(()=>window.__KBE.cheats.hurt(1));
      await check('casual i-frames reject immediate second hit', (await state()).playerController.hp===2);
      await wait(1100); await session.page.evaluate(()=>window.__KBE.cheats.hurt(1)); await wait(80);
      await check('casual second separated hit leaves 1HP', (await state()).playerController.hp===1);
      await wait(1100); await session.page.evaluate(()=>window.__KBE.cheats.hurt(1)); await wait(80);
      await check('casual third hit kills', !(await state()).player.alive);
    }
    await shot(`death-${difficulty}`); await wait(1600);
    await check('one death consumes one life', (await state()).player.lives===initial.player.lives-1 && (await state()).player.alive, await state());
    await finishCase();
  }

  await boot('water-spikes-dropthrough', 'god=1&x=2800'); await clearActors();
  const hazards = await session.page.evaluate(()=>{
    const c=window.__QACTX,result={};
    for(let x=0;x<6720;x+=8)for(let y=150;y<384;y+=8){const h=c.physics.hazardAt(x,y);if(h&&!result[h])result[h]={x,y};}
    return result;
  });
  for(const [kind,point] of Object.entries(hazards)){
    await session.page.evaluate(({x,y})=>{const c=window.__QACTX;window.__KBE.cheats.god(false);c.camera.snapTo(x,y-18);c.player().teleport(x,y+2);},point);
    await wait(120); await shot(`hazard-${kind}`);
    await check(`${kind} kills player`, !(await state()).player.alive, {point,state:await state()});
    await wait(1600); await session.page.evaluate(()=>window.__KBE.cheats.god(true));
  }
  const platform = await session.page.evaluate(()=>{
    const c=window.__QACTX, l=c.level.groundLayer;
    for(const row of l.layer.data)for(const tile of row)if(tile.index>=0&&tile.properties.oneway&&tile.pixelX>1000&&tile.pixelX<2700)return {x:tile.pixelX+8,y:tile.pixelY};
    return null;
  });
  if(platform){
    await session.page.evaluate(p=>{const c=window.__QACTX;c.camera.unlock();c.camera.snapTo(p.x,p.y-18);c.player().teleport(p.x,p.y);},platform);
    await wait(300); const before=await state();
    await session.page.keyboard.down('ArrowDown'); await press('z',100); await session.page.keyboard.up('ArrowDown'); await wait(300);
    await check('down+jump drops through one-way', (await state()).player.y>before.player.y+10,{platform,before,after:await state()}); await shot('drop-through');
  } else await check('one-way fixture found', false);
  await finishCase({hazards,platform});

  await boot('animations-fx-shake', 'god=1&fxtest=1&x=1900');
  const anims=await session.page.evaluate(()=>Object.values(window.__KBE.game.anims.anims.entries).filter(a=>!a.frames.length).map(a=>a.key));
  report.emptyAnimations=anims;
  await check('no zero-frame animations',anims.length===0,anims);
  await wait(5600); await shot('fx-gallery');
  await session.page.evaluate(()=>{window.__KBE.cheats.warp(32);window.__QACTX.fx.shake(4);}); await wait(40); await shot('shake-world-left');
  await session.page.evaluate(()=>{window.__KBE.cheats.warp(6680);window.__QACTX.fx.shake(4);}); await wait(40); await shot('shake-world-right');
  await finishCase();
}

async function enemies(){
  for(const kind of ['grunt','grenadier','shield','turret','drone','paratrooper']){
    await boot(`enemy-${kind}`,`god=1&enemytest=${kind}&x=5800`);
    // Remove map actors, retain the known test target at player+110.
    await session.page.evaluate(kind=>{const c=window.__QACTX,p=c.player(),remove=[];c.damage.forEach(h=>{if(h.team==='enemy'&&h.owner&&(h.kind!==kind||Math.abs(h.owner.x-(p.x+110))>45))remove.push(h.owner);});for(const o of new Set(remove))o.destroy();},kind);
    const samples=[];
    for(let i=0;i<24;i++){await wait(250);samples.push(await state());if([2,8,20].includes(i))await shot(`${kind}-cycle-${i}`);}
    if(kind==='shield'){
      const block=await session.page.evaluate(()=>{const c=window.__QACTX;let h;c.damage.forEach(b=>{if(b.kind==='shield'&&b.alive())h=b;});const e=h.owner; e.state='patrol';e.facing=-1;const before=e.hp;const result=window.__KBE_ENEMYTEST.hitAt(e.x-4,e.y-20,1,'bullet',1,0);const middle=e.hp;window.__KBE_ENEMYTEST.hitAt(e.x+4,e.y-20,1,'bullet',-1,0);return {before,middle,after:e.hp,result};});
      await check('shield blocks front but rear damages',block.before===block.middle&&block.after===block.before-1,block);
    }
    if(kind==='paratrooper')await check('paratrooper lands or advances below spawn',samples.at(-1).enemyAI.some(e=>e.kind===kind&&e.state!=='descent'),{first:samples[0].enemyAI,last:samples.at(-1).enemyAI});
    await session.page.evaluate(kind=>window.__KBE_ENEMYTEST.hit(kind,99,'explosion'),kind);await wait(300);await shot(`${kind}-death`);
    await check(`${kind} death awards score once`,await session.page.evaluate(kind=>window.__QAEVENTS.filter(e=>e.key==='enemy:killed'&&e.kind===kind).length===1,kind),await state());
    await finishCase({samples});
  }
  await boot('bridge-paratrooper-dormancy','god=1&x=3080');
  await session.page.keyboard.down('ArrowRight');await wait(2000);await session.page.keyboard.up('ArrowRight');
  const samples=[];for(let i=0;i<12;i++){await wait(500);samples.push(await state());}
  await shot('bridge-hanging-paratrooper');await finishCase({samples});
}

async function sections(){
  const requested=String(args.difficulty??'arcade');
  const routes=[['camp',64,960],['forest',960,2720],['bridge',2720,4000],['outpost',4032,5760],['pen',5760,6490]];
  if(args.full){routes.splice(0,routes.length,['full-physical',64,6490]);}
  for(const [name,start,end] of routes){
    await boot(`${name}-${requested}-${args.god?'god':'normal'}`,`god=${args.god?1:0}&difficulty=${requested}&x=${start}`);
    const initial=await state(),samples=[];let maxX=initial.player.x,lastJump=0,lastBomb=0,lastX=initial.player.x,stalled=0;
    await shot(`${name}-start`);await resetTelemetry(session.page);
    await session.page.keyboard.down('x');await session.page.keyboard.down('ArrowRight');
    const started=Date.now(),limit=numeric(args,'section-ms',40_000);
    while(Date.now()-started<limit){
      await wait(150);const s=await state();samples.push(s);maxX=Math.max(maxX,s.player?.x??0);
      if(!s.player||s.player.lives<=0||s.player.x>=end||s.scene!=='Game')break;
      if(!s.player.alive)continue;
      stalled=Math.abs(s.player.x-lastX)<3?stalled+1:0;lastX=s.player.x;
      const obstacle=await session.page.evaluate(()=>{const c=window.__QACTX,p=c.player();return c.physics.solidAt(p.x+20,p.y-20)||c.physics.groundBelow(p.x+26,p.y-4,36)===null||c.physics.hazardAt(p.x+26,p.y+2);});
      if((obstacle||stalled>3||Date.now()-lastJump>2300)&&Date.now()-lastJump>800){await press('z',250);lastJump=Date.now();}
      if(stalled>9&&Date.now()-lastBomb>1800){await press('c',50);lastBomb=Date.now();}
      if(samples.length%45===0)await shot(`${name}-progress-${samples.length}`);
    }
    for(const key of ['x','ArrowRight','z'])await session.page.keyboard.up(key);
    await shot(`${name}-final`);
    await collectTelemetry(session.page,report);
    const metrics=report.metrics;
    await finishCase({initial,maxX,target:end,completed:maxX>=end,samples,metrics});
    console.log(JSON.stringify({name,maxX,target:end,final:(await state()).player,metrics}));
    delete report.telemetry;delete report.metrics;
  }
}

async function arenas(){
  for(const [name,x] of [['bridge',3080],['bunker',5000]]){
    await boot(`arena-${name}`,`god=1&x=${x}`);
    await session.page.keyboard.down('ArrowRight');await wait(3000);await session.page.keyboard.up('ArrowRight');
    const waves=[];
    for(let i=0;i<30;i++){
      const s=await state();waves.push(s.arena);
      if(s.arena.state==='done'||String(s.arena.arenas).includes(`${name}:done`))break;
      await session.page.evaluate(()=>window.__KBE.cheats.killEnemies());await wait(500);
    }
    await shot(`${name}-after-wave-clear`);
    await check(`${name} all waves unlock after all deaths`,String((await state()).arena.arenas).includes(`${name}:done`),waves);
    await finishCase({waves});
  }
}

async function flow(){
  await boot('lives-continue-timeout','god=1&x=5800');await clearActors();
  for(let i=0;i<3;i++){await session.page.evaluate(()=>window.__KBE.cheats.kill());await wait(i<2?1500:300);}
  await session.page.waitForFunction(()=>window.__QACTX.flow.over,{},{timeout:4000});
  await shot('continue-offer');
  await check('lives exhausted offers continue',(await state()).player.lives===0,await state());
  await press('Enter',80);await wait(400);
  await check('continue restores three lives and zero score',(await state()).player.lives===3&&(await state()).score===0&&(await state()).player.alive,await state());
  await shot('continued');
  await press('Escape',80);await wait(200);const paused=await state();
  await session.page.keyboard.down('ArrowRight');await wait(400);await session.page.keyboard.up('ArrowRight');
  await check('pause freezes physical player',(await state()).player.x===paused.player.x,await state());
  await shot('pause');await press('Escape',80);await wait(250);
  await check('resume restores game',await session.page.evaluate(()=>!window.__QACTX.time.paused&&!window.__KBE.game.scene.isPaused('Game')),await state());
  for(let i=0;i<3;i++){await session.page.evaluate(()=>window.__KBE.cheats.kill());await wait(i<2?1500:300);}
  await session.page.waitForFunction(()=>window.__QACTX.flow.over,{},{timeout:4000});
  await wait(10500);await shot('continue-expired');await finishCase();
}

async function boss(){
  await boot('boss-phases-and-stage-clear','god=1&x=6350&enemytest=boss');
  // Use the actual map boss/gate where possible. The fixture may spawn first;
  // either way the real boss class, damage service and stage-end trigger execute.
  await wait(2000);await shot('boss-phase-1');
  const attacks={};
  for(const [phase,hp] of [[1,400],[2,230],[3,90]]){
    if(phase>1)await session.page.evaluate(hp=>window.__KBE_ENEMYTEST.bossHp(hp),hp);
    const samples=[];
    for(let i=0;i<36;i++){await wait(250);const s=await state();samples.push(s.boss);if([4,16,30].includes(i))await shot(`boss-phase-${phase}-attack-${i}`);}
    attacks[phase]=samples;
    await check(`boss phase ${phase} activates`,samples.some(s=>s?.phase===phase),samples);
  }
  const corners=await session.page.evaluate(()=>{
    const c=window.__QACTX;let box;c.damage.forEach(h=>{if(h.kind==='moosezilla')box=h;});const b=box.owner,r=c.damage.rectOf(box);
    const before=b.hp;const point={x:r.x+2,y:r.y+2};
    const hit=window.__KBE_ENEMYTEST.hitAt(point.x,point.y,1,'bullet',1,0);return {point,hit,before,after:b.hp,rect:{x:r.x,y:r.y,width:r.width,height:r.height}};
  });
  await shot('boss-empty-corner-hit');
  await session.page.evaluate(()=>window.__KBE_ENEMYTEST.bossHp(0));await wait(400);await shot('boss-death-chain');
  await wait(5000);await shot('boss-defeated-before-stage-end');
  const dead=await state();
  await check('boss delayed defeat exactly once',await session.page.evaluate(()=>window.__QAEVENTS.filter(e=>e.key==='boss:defeated').length===1),dead);
  // Physically enter the stage_end rectangle; no fabricated stage:clear event.
  await session.page.keyboard.down('ArrowRight');await wait(1600);await session.page.keyboard.up('ArrowRight');
  await wait(4000);await shot('stage-clear-results');
  await check('defeat then stage clear',await session.page.evaluate(()=>window.__QAEVENTS.some(e=>e.key==='stage:clear')),await state());
  await finishCase({attacks,corners,dead});
}

async function investigations(){
  await boot('outpost-entry-jump','god=1&x=4100');await clearActors();
  const samples=[];
  await session.page.keyboard.down('ArrowRight');
  for(let i=0;i<10;i++){await press('z',500);await wait(350);samples.push(await state());}
  await session.page.keyboard.up('ArrowRight');await shot('outpost-full-hold-jump');
  const geometry=await session.page.evaluate(()=>{
    const c=window.__QACTX,p=c.player(),b=p.sprite.body,l=c.level.groundLayer;
    return {body:{x:b.x,y:b.y,width:b.width,height:b.height,blocked:b.blocked},tiles:l.getTilesWithinWorldXY(4080,200,160,150).filter(t=>t.index>=0).map(t=>({x:t.pixelX,y:t.pixelY,properties:t.properties}))};
  });
  await finishCase({samples,geometry});
  // Recover by landing on the intermediate step before the next jump.
  await session.page.keyboard.down('ArrowLeft');await press('z',260);await session.page.keyboard.up('ArrowLeft');await wait(600);
  await shot('outpost-intermediate-step');const onStep=await state();
  await session.page.keyboard.down('ArrowRight');await press('z',500);await wait(800);await session.page.keyboard.up('ArrowRight');
  await shot('outpost-staged-jump');await finishCase({onStep,stagedJump:await state()});

  await boot('foreground-sign-player-visibility','god=1&x=5800');await clearActors();await wait(2400);
  await session.page.keyboard.down('ArrowDown');await wait(350);await shot('foreground-sign-hides-crouch');
  const occluders=await session.page.evaluate(()=>{const c=window.__QACTX,p=c.player(),b=p.sprite.getBounds();return c.scene.children.list.filter(o=>o.visible&&o.depth>51&&o.getBounds&&o.name?.startsWith('prop:')&&((r)=>r.x<b.right&&r.right>b.x&&r.y<b.bottom&&r.bottom>b.y)(o.getBounds())).map(o=>({name:o.name,depth:o.depth,x:o.x,y:o.y}));});
  await session.page.keyboard.up('ArrowDown');await finishCase({occluders});

  await boot('enemy-map-properties','god=1&x=5800');await clearActors();
  await session.page.evaluate(()=>{
    const c=window.__QACTX;c.spawn('enemy','grunt',{idle:'sleep',patrol:0,facing:1},5860,336);
    c.spawn('enemy','grunt',{idle:'flee',patrol:0,facing:1,from:'door'},5950,336);
    c.spawn('enemy','turret',{mount:'pedestal'},6040,336);
  });
  await wait(700);await shot('ignored-sleep-flee-mount');await finishCase();

  await boot('crate-standing-versus-crouch','god=1&x=5800');await clearActors();
  await session.page.evaluate(()=>{const c=window.__QACTX;c.spawn('prop','crate',{},5860,336);});
  await press('x',1300);await shot('crate-standing-misses');
  const before=await session.page.evaluate(()=>window.__QACTX.scene.children.list.filter(o=>o.active&&o.name==='prop:crate'&&o.x===5860).length);
  await session.page.keyboard.down('ArrowDown');await press('x',1500);await session.page.keyboard.up('ArrowDown');
  await shot('crate-crouch-breaks');
  const after=await session.page.evaluate(()=>window.__QACTX.scene.children.list.filter(o=>o.active&&o.name==='prop:crate'&&o.x===5860).length);
  await check('standing misses bottom crate, crouch breaks it',before===1&&after===0,{before,after});await finishCase();
}

async function audio(){
  await boot('audio-unlock-and-gameplay','god=1&mute=0&x=5800');await clearActors();
  const registered=await session.page.evaluate(()=>Object.keys(window.__KBE.game.scene.keys));
  const before=await state();
  if(!before.audio){report.notes.push('Audio debug state not registered at run time.');await finishCase({registered});return;}
  await session.page.locator('canvas').click();await wait(400);
  await check('gesture unlocks WebAudio',!(await state()).audio.locked&&(await state()).audio.context==='running',(await state()).audio);
  for(const weapon of ['pistol','hmg','spread','rocket','flame']){
    await session.page.evaluate(w=>window.__KBE.cheats.give(w),weapon);
    await press('x',650);await wait(350);
  }
  await press('z',200);await press('c',80);await wait(2500);await shot('audio-gameplay');
  const played=await state();
  await check('real gameplay plays known SFX',played.audio.played>before.audio.played&&played.audio.unknown.length===0,{before:before.audio,after:played.audio});
  await session.page.evaluate(()=>window.__QACTX.audio.music('music_boss',{fade:100}));await wait(350);
  await check('boss music crossfade settles',(await state()).audio.music==='music_boss'&&(await state()).audio.outgoing<=1,(await state()).audio);
  await finishCase({registered,before,played});
  await boot('audio-url-mute','god=1&mute=1&x=5800');await session.page.locator('canvas').click();await wait(300);
  await check('URL mute survives audio unlock',(await state()).audio?.muted===true&&await session.page.evaluate(()=>window.__KBE.game.sound.mute),(await state()).audio);
  await finishCase({registered});
}

async function ui(){
  const active=key=>session.page.evaluate(key=>window.__KBE.game.scene.isActive(key),key);
  async function key(key){await press(key,100);await wait(160);}
  await boot('native-title-options-credits','scene=Title&mute=1');await wait(900);await shot('native-title');
  report.emptyAnimations=await session.page.evaluate(()=>Object.values(window.__KBE.game.anims.anims.entries).filter(a=>!a.frames.length).map(a=>a.key));
  await check('global Aseprite animations have frames',report.emptyAnimations.length===0,report.emptyAnimations);
  await check('Title ready without exception',(await state()).scene==='Title');
  await key('ArrowDown');await key('ArrowDown');await key('ArrowRight');
  await check('Title difficulty toggles',await session.page.evaluate(()=>JSON.parse(localStorage.getItem('kbe.settings.v1')).difficulty==='casual'));
  await key('ArrowDown');await key('Enter');await shot('native-options');
  await check('Options opens from Title',await active('Options'));
  for(let i=0;i<4;i++)await key('ArrowDown');await key('ArrowRight');await key('ArrowDown');await key('ArrowRight');
  const saved=await session.page.evaluate(()=>JSON.parse(localStorage.getItem('kbe.settings.v1')));
  await check('CRT and shake controls persist',saved.crt===true&&saved.shake===false,saved);
  for(let i=0;i<3;i++)await key('ArrowDown');await key('Enter');await shot('native-controls');
  await key('Escape');await key('Escape');await check('Options returns to Title',!await active('Options')&&await active('Title'));
  await key('ArrowDown');await key('Enter');await wait(500);await shot('native-credits');await check('Credits opens',await active('Credits'));
  await key('Escape');await check('Credits exits',!await active('Credits'));
  for(let i=0;i<3;i++)await key('ArrowUp');await key('Enter');await wait(700);
  await shot('native-start-transition');const startTransition=await state();
  await check('Title Start enters unpaused Game',await active('Game'),startTransition);
  if(await active('Pause'))await key('Escape'); // Diagnostic recovery; report the input leak.
  await finishCase({saved,startTransition});

  await boot('native-intro-hud-pause','god=1&fast=0&x=5800');await clearActors();await shot('native-intro');
  await check('normal Game launches Intro',await active('Intro'));
  await wait(2500);await shot('native-hud');await check('Intro finishes',!await active('Intro'));
  const hud=await state();await check('HUD registered',await active('HUD')&&hud.ui?.hud!==null,hud.ui);
  await key('Escape');await shot('native-pause');const before=(await state()).player.x;
  await session.page.keyboard.down('ArrowRight');await wait(400);await session.page.keyboard.up('ArrowRight');
  await check('native pause freezes player',await session.page.evaluate(()=>window.__KBE.game.scene.isPaused('Game'))&&(await state()).player.x===before);
  await key('Escape');await check('native pause resumes',!await session.page.evaluate(()=>window.__KBE.game.scene.isPaused('Game')));
  await finishCase();

  await boot('native-continue-and-game-over','god=1&x=5800');await clearActors();
  for(let i=0;i<3;i++){await session.page.evaluate(()=>window.__KBE.cheats.kill());await wait(1500);}
  await check('native Continue opens',await active('Continue'));await wait(350);await shot('native-continue');
  const digit=await session.page.evaluate(()=>{const s=window.__KBE.game.scene.getScene('Continue'),a=s.cache.json.get('ui_countdown');const tag=a.meta.frameTags.find(t=>t.name===`countdown_${s.n}`);return {n:s.n,actual:s.number.frame.name,expected:Object.keys(a.frames)[tag.from]};});
  await check('Continue digit matches countdown',digit.actual===digit.expected,digit);
  await key('Enter');await wait(400);await check('native continue restores lives',(await state()).player?.lives===3&&(await state()).player.alive,await state());
  await shot('native-continue-transition');const continueTransition=await state();
  await check('native continue returns to unpaused Game',await active('Game'),continueTransition);
  if(await active('Pause'))await key('Escape'); // Recovery lets timeout/results checks continue.
  for(let i=0;i<3;i++){await session.page.evaluate(()=>window.__KBE.cheats.kill());await wait(1500);}
  await wait(10100);await shot('native-game-over');
  await session.page.waitForFunction(()=>window.__KBE.game.scene.isActive('Title'),{},{timeout:10000});
  await shot('native-timeout-title');await check('native timeout returns Title',await active('Title'));await finishCase({digit,continueTransition});

  await uiResults();
}

async function uiResults(){
  const active=key=>session.page.evaluate(key=>window.__KBE.game.scene.isActive(key),key);
  await boot('native-boss-results','god=1&x=6350&enemytest=boss');
  await session.page.evaluate(()=>{const c=window.__QACTX;c.state.score=12345;c.state.rescued=2;window.__KBE.cheats.give('hmg',7);window.__KBE.cheats.bombs(5);});
  await wait(1500);await shot('native-boss-hud');
  const bossHud=await state();await check('HUD receives boss state',bossHud.hud?.boss!==null,bossHud.hud);
  const frame=await session.page.evaluate(()=>{const h=window.__KBE.game.scene.getScene('HUD'),img=window.__KBE.game.textures.get('ui_bossbar_frame').getSourceImage(),canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;const c=canvas.getContext('2d');c.drawImage(img,0,0);return {center:[...c.getImageData(100,7,1,1).data],aboveFill:h.bossBox.list.indexOf(h.bossFrame)>h.bossBox.list.indexOf(h.bossFill)};});
  await check('boss frame leaves fill visible',!frame.aboveFill||frame.center[3]<255,{frame,hud:bossHud.hud});
  await check('HUD matches score ammo bombs and rescues',bossHud.hud?.score==='00012345'&&bossHud.hud?.ammo==='7'&&bossHud.hud?.bombs==='5'&&bossHud.hud?.rescued==='RESCUED 2',bossHud.hud);
  await session.page.evaluate(()=>window.__KBE_ENEMYTEST.bossHp(0));await wait(5000);
  await session.page.keyboard.down('ArrowRight');await wait(1600);await session.page.keyboard.up('ArrowRight');
  await session.page.waitForFunction(()=>window.__KBE.game.scene.isActive('Results'),{},{timeout:10000});
  await session.page.waitForFunction(()=>window.__KBE.game.scene.getScene('Results').done,{},{timeout:12000});
  await wait(400); // done is set when the rank stamp starts its 260 ms reveal.
  await shot('native-results');await check('real stage clear opens Results',await active('Results'));
  const results=await session.page.evaluate(()=>{const s=window.__KBE.game.scene.getScene('Results');return {data:s.res,rank:s.rank,rankFrame:s.stamp.frame.name,rows:s.rowTexts.map(r=>({label:r.label.text,value:r.value.text}))};});
  await press('Enter',100);await wait(800);await check('Results returns to Title',await active('Title'));await finishCase({results});
}

try{
  if(mode==='systems')await systems();else if(mode==='enemies')await enemies();else if(mode==='sections')await sections();else if(mode==='arenas')await arenas();else if(mode==='flow')await flow();else if(mode==='boss')await boss();else if(mode==='investigations')await investigations();else if(mode==='audio')await audio();else if(mode==='ui')await ui();else if(mode==='ui-results')await uiResults();else throw Error(`Unknown --mode ${mode}`);
}catch(error){report.status='failed';report.problems.push(error.stack??error.message);if(session)await shot('probe-error').catch(()=>{});}
finally{
  if(session){await collectTelemetry(session.page,report).catch(()=>{});await session.close();}
  await saveReport(directory,report);
  await writeFile(path.join(directory,'checks.json'),JSON.stringify({checks:report.checks,cases:report.cases,emptyAnimations:report.emptyAnimations},null,2));
}
process.exitCode=report.status==='passed'?0:1;
