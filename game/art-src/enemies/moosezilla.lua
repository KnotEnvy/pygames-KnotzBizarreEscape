-- MOOSEZILLA: original riveted steam moose. Rig uses separately destructible parts.
local D=dofile(app.params.root..'/art-src/enemies/lib/draw.lua')
local K=D.K
local function body(im,f,damage)
  -- Rear pressure reservoir and domed red boiler.
  D.disc(im,33,28,23,'outline'); D.disc(im,33,27,22,'steel2'); D.disc(im,30,24,18,'steel3')
  D.disc(im,29,19,12,'red2'); D.disc(im,27,16,9,'red3'); D.line(im,18,12,37,12,'red5',2)
  D.box(im,8,27,96,29,'steel2','steel5','steel1'); D.box(im,5,46,103,12,'steel1','steel4','outline')
  D.box(im,13,30,37,19,'red2','red4','red1'); D.box(im,54,30,40,19,'red3','red5','red1')
  -- Copper pressure piping, collars, valve wheel and glass gauge.
  D.limb(im,12,24,12,43,'sand3','sand5',2); D.limb(im,12,24,49,24,'sand3','sand5',2)
  D.limb(im,49,24,49,37,'sand3','sand5',2)
  D.disc(im,48,39,8,'outline'); D.disc(im,48,39,6,'sand3'); D.disc(im,48,39,4,'steel1')
  for a=0,3 do local t=a*math.pi/2+f*.08; D.line(im,48,39,48+math.cos(t)*6,39+math.sin(t)*6,'sand5') end
  D.disc(im,48,39,2,'red4')
  D.box(im,75,17,16,14,'steel1','sand4','outline'); D.disc(im,83,23,4,'sand5'); D.line(im,83,23,81,20,'red3')
  -- Stacks and rhythmic vent shutters.
  D.box(im,54,4,10,25,'steel2','steel4','steel1'); D.box(im,51,3,16,5,'steel3','steel5','steel1')
  D.box(im,32,5,9,14,'steel2','steel4','steel1'); D.box(im,30,4,13,4,'steel3','steel5','steel1')
  for j=0,4 do D.box(im,69+j*6,34,4,10,'steel1','steel3'); if f%2==0 then D.rect(im,70+j*6,36,1,5,'fire3') end end
  for x=13,103,10 do D.rivet(im,x,51) end
  for _,p in ipairs({{16,32},{44,32},{57,32},{90,32},{16,45},{91,45}}) do D.rivet(im,p[1],p[2]) end
  D.eye(im,22,35,'sand4')
  if damage and damage>0 then
    D.line(im,72,30,66,36,'outline',2); D.line(im,66,36,71,39,'outline'); D.line(im,71,39,64,46,'outline',2)
    D.line(im,31,30,29,34,'sand1'); D.line(im,29,34,34,37,'outline')
    D.box(im,17,40,10,7,'ink1','steel2'); D.line(im,18,41,24,44,'fire3')
    if damage==2 then D.box(im,64,32,25,15,'ink1','steel1'); D.line(im,65,33,86,45,'fire2'); D.line(im,72,33,67,44,'fire4') end
  end
end
local function steam(im,f)
  body(im,f,0)
  -- Pulse is intentionally compact; FX supplies dissipating world-space steam.
  for j=0,2 do D.disc(im,57+(j%2)*2,3-j*2,2+(f+j)%2,'ink4'); K.px(im,56+j,1,'ink6') end
end
D.build('moosezilla_body',112,64,{
 D.anim('moosezilla_body_idle',4,160,function(im,f) body(im,f,0) end),
 D.anim('moosezilla_body_vent',4,120,steam),
 D.anim('moosezilla_body_damaged',4,140,function(im,f) body(im,f,1) end),
 D.anim('moosezilla_body_critical',4,100,function(im,f) body(im,f,2) end)})
local function legs(im,f,back,pose)
  local stride=({-7,-4,1,6,7,4,-1,-6})[(f-1+(back and 4 or 0))%8+1]
  if pose=='idle' then stride=0 end
  if pose=='stomp' then stride=f<3 and -5 or 3 end
  if pose=='paw' then stride=({-4,-8,2,5})[f] end
  for j=0,1 do
    local x=21+j*57; local s=j==0 and stride or -stride
    local lift=pose=='stomp' and j==1 and f<3 and 10 or (s<0 and math.floor(-s/2) or 0)
    local footX=x+s; local footY=43-lift
    D.disc(im,x,8,8,'outline'); D.disc(im,x,8,6,back and 'steel2' or 'sand3'); D.disc(im,x-2,6,3,back and 'steel3' or 'sand5')
    D.limb(im,x,12,x-s/2,25-lift/2,back and 'steel1' or 'steel3',back and 'steel3' or 'steel5',4)
    D.limb(im,x-s/2,25-lift/2,footX,footY-6,back and 'steel2' or 'sand2',back and 'steel3' or 'sand4',3)
    D.box(im,footX-9,footY-4,20,8,back and 'steel1' or 'steel2','steel4','outline')
    D.box(im,footX-6,footY-1,5,5,'steel1','steel3'); D.box(im,footX+3,footY-1,6,5,'steel1','steel3')
    D.disc(im,x-s/2,25-lift/2,5,'outline'); D.disc(im,x-s/2,25-lift/2,3,back and 'steel2' or 'red3'); D.rivet(im,x-s/2-1,24-lift/2)
  end
end
for _,side in ipairs({'back','front'}) do
 local back=side=='back'; local name='moosezilla_legs_'..side
 D.build(name,104,48,{
  D.anim(name..'_idle',1,160,function(im,f) legs(im,f,back,'idle') end),
  D.anim(name..'_walk',8,100,function(im,f) legs(im,f,back,'walk') end),
  D.anim(name..'_stomp',4,{180,180,70,160},function(im,f) legs(im,f,back,'stomp') end),
  D.anim(name..'_paw',4,125,function(im,f) legs(im,f,back,'paw') end)})
end
local function head(im,f,pose)
  local yy=pose=='roar' and -1 or (f%4==2 and 1 or 0)
  -- Neck collar, forehead, elongated drooping moose muzzle.
  D.limb(im,12,38,20,18,'steel2','steel4',10)
  for j=0,2 do D.line(im,6+j*4,28,19+j*4,34,'sand3',2) end
  D.disc(im,30,18+yy,14,'outline'); D.disc(im,30,18+yy,12,'red3'); D.disc(im,27,15+yy,8,'red4')
  D.box(im,29,19+yy,30,22,'steel2','steel5','steel1'); D.box(im,38,31+yy,23,15,'sand2','sand4','sand1')
  D.rect(im,40,33+yy,17,4,'sand3'); D.rect(im,55,35+yy,5,6,'sand1'); D.rect(im,56,36+yy,3,2,'outline')
  D.box(im,23,18+yy,14,9,'steel1','sand4','outline'); D.rect(im,26,20+yy,9,4,'red4'); D.rect(im,28,20+yy,5,2,'fire5'); K.px(im,29,20+yy,'white')
  D.line(im,22,17+yy,36,20+yy,'outline',2); D.line(im,22,16+yy,35,18+yy,'sand5')
  D.limb(im,19,9+yy,11,5+yy,'red3','red5',4); D.line(im,10,5+yy,17,10+yy,'sand3')
  -- Hanging copper beard and plate seams.
  for j=0,3 do D.line(im,28+j*3,38+yy,26+j*3,50-(j%2)*3+yy,'sand2',2); K.px(im,27+j*3,40+yy,'sand4') end
  D.line(im,39,22+yy,39,30+yy,'steel1'); D.line(im,40,29+yy,55,29+yy,'steel1')
  for _,p in ipairs({{21,30},{38,23},{53,23},{43,39}}) do D.rivet(im,p[1],p[2]+yy) end
  if pose=='flame' then
    D.box(im,39,40+yy,20,7,'fire2','fire4'); D.line(im,42,42+yy,58,42+yy,f>2 and 'white' or 'fire5',2)
    if f>2 then D.disc(im,60,42+yy,3,'fire4'); D.disc(im,61,42+yy,2,'fire5') end
  elseif pose=='roar' then
    local gap=({3,6,9,4})[f]
    D.box(im,40,37+yy,18,gap+2,'ink1','sand3'); D.line(im,42,38+yy,55,38+yy,'sand5'); D.line(im,43,38+gap+yy,55,38+gap+yy,'red2')
  end
end
D.build('moosezilla_head',64,56,{
 D.anim('moosezilla_head_idle',4,150,function(im,f) head(im,f,'idle') end),
 D.anim('moosezilla_head_jaw',4,100,function(im,f) head(im,f,'roar') end),
 D.anim('moosezilla_head_roar',4,{180,180,120,120},function(im,f) head(im,f,'roar') end),
 D.anim('moosezilla_head_flame',4,{200,200,100,100},function(im,f) head(im,f,'flame') end)})
D.build('moosezilla_jaw',40,24,{
 D.anim('moosezilla_jaw_closed',1,160,function(im) D.box(im,2,1,35,10,'steel2','sand4','steel1'); D.line(im,10,4,32,4,'steel4'); D.rivet(im,6,6) end),
 D.anim('moosezilla_jaw_open',4,100,function(im,f)
  local drop=({2,6,10,5})[f]; D.limb(im,4,4,27,6+drop,'steel2','steel4',3); D.box(im,21,4+drop,16,7,'sand2','sand4','sand1'); D.rivet(im,4,4)
 end)})
local function cannon(im,f,side,broken)
  local shift=side=='l' and -3 or 0
  D.limb(im,10,43,18,23,'sand2','sand5',3); D.limb(im,18,23,38,12,'sand3','sand5',3)
  local branches={{18,23,9,11},{25,19,22,4},{31,16,34,3},{38,12,46,5}}
  for j,b in ipairs(branches) do
    if not broken or j<2 then D.limb(im,b[1],b[2],b[3],b[4]+shift,'sand3','sand5',2) end
  end
  D.disc(im,11,40,5,'outline'); D.disc(im,11,40,3,'red3'); D.rivet(im,10,39)
  if broken then
    D.box(im,24,16,12,8,'steel1','steel3'); D.line(im,28,17,33,22,'fire2'); K.px(im,31,18,'fire4')
  else
    local recoil=f==3 and -3 or 0
    D.box(im,28+recoil,17,22,9,'steel2','steel5','steel1'); D.box(im,26+recoil,18,8,7,'red3','red5','red1')
    for j=0,2 do D.line(im,36+j*4+recoil,19,36+j*4+recoil,23,'steel1') end
    D.box(im,48+recoil,18,5,7,'sand3','sand5','sand1')
    if f==2 then D.rect(im,30,19,3,3,'fire5') end
    if f==3 then D.flash(im,52,21,0) end
  end
end
for _,side in ipairs({'l','r'}) do local name='moosezilla_antler_'..side
 D.build(name,56,48,{
  D.anim(name..'_idle',1,140,function(im) cannon(im,1,side,false) end),
  D.anim(name..'_fire',4,{160,160,60,100},function(im,f) cannon(im,f,side,false) end),
  D.anim(name..'_broken',2,140,function(im,f) cannon(im,f,side,true) end)})
end
D.build('moosezilla_armor',80,40,{
 D.anim('moosezilla_armor_intact',1,140,function(im)
  D.box(im,2,3,75,32,'red2','sand4','red1'); D.box(im,7,7,65,24,'red3','red5','red1')
  D.rect(im,8,9,3,19,'red4'); D.rect(im,67,9,4,20,'red2'); D.line(im,11,9,62,9,'red4'); D.line(im,9,28,65,28,'red2',2)
  D.line(im,4,3,74,3,'sand2'); D.line(im,4,33,74,33,'steel1')
  for j=0,4 do D.line(im,49+j*4,12,49+j*4,25,'red1',2) end
  -- Large stamped spiral-eye seal, readable at native resolution.
  D.disc(im,25,19,11,'sand1'); D.disc(im,25,19,9,'sand3'); D.disc(im,24,18,8,'sand4')
  D.line(im,16,19,23,14,'red1'); D.line(im,23,14,32,18,'red1'); D.line(im,16,19,23,23,'red1'); D.line(im,23,23,32,18,'red1')
  D.line(im,23,16,28,16,'red2'); D.line(im,28,16,28,21,'red2'); D.line(im,28,21,22,21,'red2'); D.line(im,22,21,22,18,'red2'); D.line(im,22,18,25,18,'red2'); K.px(im,25,19,'red1')
  D.line(im,12,12,17,12,'sand4'); D.line(im,57,28,62,27,'sand2'); K.px(im,13,13,'red1')
  for _,p in ipairs({{5,5},{72,5},{5,32},{72,32},{41,5},{41,32}}) do D.rivet(im,p[1],p[2]) end
 end),
 D.anim('moosezilla_armor_falling',4,100,function(im,f)
  -- Fragment fan remains in its own canvas; Phase B applies outward velocity.
  for j=0,2 do local x=5+j*25; local y=3+((j+f)%3)*5
   D.box(im,x,y,20,24,'red2','red4','red1'); D.line(im,x+3,y+3,x+15,y+18,'sand2'); D.rivet(im,x+3,y+3)
  end
 end)})
D.build('moosezilla_core',32,32,{
 D.anim('moosezilla_core_pulse',4,120,function(im,f)
  D.disc(im,16,16,15,'outline'); D.disc(im,16,16,13,'steel3'); D.disc(im,16,16,10,'sand2'); D.disc(im,16,16,8,'weird1')
  D.disc(im,16,16,5+(f%3),'weird2'); D.disc(im,15,15,4+(f%2),'weird4'); D.disc(im,14,14,2,'weird5'); K.px(im,13,13,'white')
  for j=0,3 do local a=j*math.pi/2; D.rivet(im,16+math.cos(a)*12,16+math.sin(a)*12) end
 end)})
D.build('moosezilla_debris',24,24,{
 D.anim('moosezilla_debris_bolt',1,120,function(im) D.disc(im,12,12,6,'outline'); D.disc(im,12,12,4,'steel4'); D.line(im,9,10,14,14,'steel1',2) end),
 D.anim('moosezilla_debris_plate',1,120,function(im) D.box(im,3,4,17,15,'red2','red5','red1'); D.rivet(im,5,6); D.line(im,8,7,16,16,'sand2') end),
 D.anim('moosezilla_debris_gear',1,120,function(im)
  for j=0,7 do local a=j*math.pi/4; D.box(im,10+math.cos(a)*8,10+math.sin(a)*8,5,5,'sand2','sand4') end
  D.disc(im,12,12,8,'outline'); D.disc(im,12,12,6,'sand3'); D.disc(im,12,12,3,'outline'); K.px(im,9,9,'sand5')
 end),
 D.anim('moosezilla_debris_pipe',1,120,function(im) D.limb(im,5,19,5,7,'sand2','sand5',3); D.limb(im,5,7,19,7,'sand2','sand5',3); D.box(im,15,3,7,8,'steel2','steel4') end)})
