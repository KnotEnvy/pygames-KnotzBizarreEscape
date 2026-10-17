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
  -- Reciprocating chrome pistons and ribbed pressure bellows.
  local breath=({0,1,2,1})[(f-1)%4+1]
  for _,x in ipairs({18,91}) do
   D.box(im,x,16,9,17,'steel1','steel4','outline')
   D.rect(im,x+3,18,3,8+breath,'steel5');D.rect(im,x+4,18,1,8+breath,'white')
   for y=27,34,3 do D.line(im,x-1,y+breath,x+9,y+breath,'sand2',2);D.line(im,x,y+breath,x+8,y+breath,'sand5') end
  end
  D.line(im,12,54,100,54,'steel3');D.line(im,15,55,28,55,'dirt3')
  for _,x in ipairs({20,60,85}) do D.line(im,x,47,x+7,48,'dirt2');K.px(im,x+2,46,'dirt4') end
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
 D.anim('moosezilla_body_intro',8,130,function(im,f) body(im,(f-1)%4+1,0);D.rect(im,70,36,2,7,f>3 and 'weird5' or 'weird2') end),
 D.anim('moosezilla_body_vent',4,120,steam),
 D.anim('moosezilla_body_damaged',4,140,function(im,f) body(im,f,1) end),
 D.anim('moosezilla_body_critical',4,100,function(im,f) body(im,f,2) end)})
local function legs(im,f,back,pose)
  local stride=({-7,-4,1,6,7,4,-1,-6})[(f-1+(back and 4 or 0))%8+1]
  if pose=='idle' then stride=0 end
  if pose=='intro' then stride=({0,-3,-6,-7,-4,2,1,0})[f] end
  if pose=='stomp' then stride=f<3 and -5 or 3 end
  if pose=='paw' then stride=({-4,-8,2,5})[f] end
  for j=0,1 do
    local x=21+j*57; local s=j==0 and stride or -stride
    local lift=pose=='intro' and j==1 and ({0,4,9,13,11,5,1,0})[f] or pose=='stomp' and j==1 and f<3 and 10 or (s<0 and math.floor(-s/2) or 0)
    local footX=x+s; local footY=43-lift
    D.disc(im,x,8,8,'outline'); D.disc(im,x,8,6,back and 'steel2' or 'sand3'); D.disc(im,x-2,6,3,back and 'steel3' or 'sand5')
    D.limb(im,x,12,x-s/2,25-lift/2,back and 'steel1' or 'steel3',back and 'steel3' or 'steel5',4)
    D.limb(im,x-s/2,25-lift/2,footX,footY-6,back and 'steel2' or 'sand2',back and 'steel3' or 'sand4',3)
    D.box(im,footX-9,footY-4,20,8,back and 'steel1' or 'steel2','steel4','outline')
    D.box(im,footX-6,footY-1,5,5,'steel1','steel3'); D.box(im,footX+3,footY-1,6,5,'steel1','steel3')
    -- Parallel chrome piston visibly breathes below the torso plating.
    local stroke=pose=='idle' and ({0,1,2,1})[(f-1)%4+1] or 0
    D.line(im,x+5,12,x-s/2+5,22-lift/2+stroke,'outline',3)
    D.line(im,x+5,12,x-s/2+5,22-lift/2+stroke,back and 'steel3' or 'steel5')
    D.line(im,x-s/2+5,22-lift/2+stroke,footX+4,footY-6,'sand2',2)
    if not back then D.line(im,x-s/2+5,23-lift/2+stroke,footX+4,footY-6,'sand5') end
    D.disc(im,x-s/2,25-lift/2,5,'outline'); D.disc(im,x-s/2,25-lift/2,3,back and 'steel2' or 'red3'); D.rivet(im,x-s/2-1,24-lift/2)
  end
end
for _,side in ipairs({'back','front'}) do
 local back=side=='back'; local name='moosezilla_legs_'..side
 D.build(name,104,48,{
  D.anim(name..'_idle',4,160,function(im,f) legs(im,f,back,'idle') end),
  D.anim(name..'_intro',8,130,function(im,f) legs(im,f,back,'intro') end),
  D.anim(name..'_walk',8,100,function(im,f) legs(im,f,back,'walk') end),
  D.anim(name..'_stomp',4,{180,180,70,160},function(im,f) legs(im,f,back,'stomp') end),
  D.anim(name..'_paw',4,125,function(im,f) legs(im,f,back,'paw') end)})
end
local function head(im,f,pose)
  local yy=pose=='intro' and -3 or pose=='roar' and -1 or (f%4==2 and 1 or 0)
  -- Neck collar, forehead, elongated drooping moose muzzle.
  D.limb(im,12,38,20,18,'steel2','steel4',10)
  for j=0,2 do D.line(im,6+j*4,28,19+j*4,34,'sand3',2) end
  D.disc(im,30,18+yy,14,'outline'); D.disc(im,30,18+yy,12,'red3'); D.disc(im,27,15+yy,8,'red4')
  -- Long nasal bridge ends in an overhanging, rounded, heavy upper lip.
  D.limb(im,32,23+yy,51,31+yy,'steel2','steel5',7)
  D.box(im,38,29+yy,24,18,'sand2','sand4','sand1')
  D.disc(im,56,39+yy,7,'outline'); D.disc(im,56,39+yy,6,'sand3')
  D.disc(im,57,45+yy,5,'outline'); D.disc(im,57,45+yy,4,'sand3'); D.rect(im,55,43+yy,5,2,'sand1'); D.rect(im,57,44+yy,2,1,'outline'); D.rect(im,49,44+yy,7,4,'sand2'); D.line(im,40,45+yy,60,45+yy,'sand1')
  D.rect(im,40,33+yy,17,4,'sand3'); D.rect(im,55,35+yy,5,6,'sand1'); D.rect(im,56,36+yy,3,2,'outline')
  D.box(im,23,18+yy,14,9,'steel1','sand4','outline'); D.rect(im,26,20+yy,9,4,'red4'); D.rect(im,28,20+yy,5,2,'fire5'); K.px(im,29,20+yy,'white')
  -- Pulse stays inside the eye socket: no scene-wide flash.
  if pose=='intro' or f%4==2 then D.rect(im,26,20+yy,9,3,'weird4');D.rect(im,28,20+yy,5,2,'weird5');K.px(im,29,20+yy,'white') end
  D.line(im,24,8+yy,33,10+yy,'red5');D.line(im,34,11+yy,39,15+yy,'red2')
  D.line(im,42,32+yy,49,33+yy,'sand5');D.line(im,43,40+yy,48,41+yy,'dirt2')
  D.line(im,22,17+yy,36,20+yy,'outline',2); D.line(im,22,16+yy,35,18+yy,'sand5')
  -- Large leaf-shaped ears project out from both sides of the crown.
  D.limb(im,22,11+yy,9,4+yy,'sand2','sand4',5)
  D.line(im,8,4+yy,19,10+yy,'red2',2)
  D.limb(im,34,9+yy,45,3+yy,'sand2','sand5',4)
  D.line(im,36,9+yy,44,4+yy,'red2',2)
  -- Hanging copper beard and plate seams.
  D.limb(im,27,38+yy,28,49+yy,'sand2','sand4',4)
  D.disc(im,28,50+yy,5,'outline'); D.disc(im,28,50+yy,4,'sand3')
  D.line(im,26,43+yy,26,51+yy,'sand5'); D.rivet(im,28,48+yy)
  D.line(im,39,22+yy,39,30+yy,'steel1'); D.line(im,40,29+yy,55,29+yy,'steel1')
  for _,p in ipairs({{21,30},{38,23},{53,23},{43,39}}) do D.rivet(im,p[1],p[2]+yy) end
  if pose=='flame' then
    D.box(im,39,40+yy,20,7,'fire2','fire4'); D.line(im,42,42+yy,58,42+yy,f>2 and 'white' or 'fire5',2)
    if f>2 then D.disc(im,60,42+yy,3,'fire4'); D.disc(im,61,42+yy,2,'fire5') end
  elseif pose=='roar' or pose=='intro' then
    local gap=({3,6,9,4})[f]
    D.box(im,40,37+yy,18,gap+2,'ink1','sand3'); D.line(im,42,38+yy,55,38+yy,'sand5'); D.line(im,43,38+gap+yy,55,38+gap+yy,'red2')
  end
end
D.build('moosezilla_head',64,56,{
 D.anim('moosezilla_head_idle',4,150,function(im,f) head(im,f,'idle') end),
 D.anim('moosezilla_head_intro',8,130,function(im,f) head(im,(f-1)%4+1,'intro') end),
 D.anim('moosezilla_head_jaw',4,100,function(im,f) head(im,f,'roar') end),
 D.anim('moosezilla_head_roar',4,{180,180,120,120},function(im,f) head(im,f,'roar') end),
 D.anim('moosezilla_head_flame',4,{200,200,100,100},function(im,f) head(im,f,'flame') end)})
D.build('moosezilla_jaw',40,24,{
 D.anim('moosezilla_jaw_closed',1,160,function(im) D.box(im,2,7,30,5,'sand2','sand4','sand1'); D.line(im,10,7,31,7,'outline'); D.rivet(im,6,9) end),
 D.anim('moosezilla_jaw_open',4,100,function(im,f)
  local drop=({2,6,10,5})[f]; D.limb(im,4,4,27,6+drop,'steel2','steel4',3); D.box(im,21,4+drop,16,7,'sand2','sand4','sand1'); D.rivet(im,4,4)
 end)})
-- Scan-filled plates keep the broad palm continuous between the short rim tines.
local function plate(im,points,c)
 for y=0,47 do
  local xs={}
  for i,p in ipairs(points) do
   local q=points[i%#points+1]
   if (p[2]<=y and q[2]>y) or (q[2]<=y and p[2]>y) then
    xs[#xs+1]=p[1]+(y-p[2])*(q[1]-p[1])/(q[2]-p[2])
   end
  end
  table.sort(xs)
  for i=1,#xs-1,2 do D.line(im,math.ceil(xs[i]),y,math.floor(xs[i+1]),y,c) end
 end
end
local function cannon(im,f,side,broken)
 local far=side=='l'
 local brass=far and 'sand2' or 'sand3'
 local light=far and 'sand3' or 'sand5'
 local steel=far and 'steel2' or 'steel4'
 -- Pedicle grows OUT and back from the skull, into the cupped palm.
 D.limb(im,72,43,62,33,brass,light,4)
 D.limb(im,62,33,46,29,brass,light,4)
 D.disc(im,72,41,5,'outline'); D.disc(im,72,41,3,far and 'red2' or 'red3'); D.rivet(im,71,40)
 if broken then
  plate(im,{{44,21},{52,24},{49,27},{56,28},{52,32},{62,35},{66,31},{64,24},{56,20},{50,17},{50,22}},'outline')
  plate(im,{{47,22},{53,25},{51,27},{58,29},{55,32},{62,33},{64,30},{62,25},{55,22},{51,20},{51,24}},brass)
  D.line(im,48,22,53,25,light); D.line(im,53,25,51,27,light); D.line(im,51,27,57,29,light)
  -- Torn steel lip, exposed wire loop and alternating electrical sparks.
  D.line(im,55,32,62,33,steel,2)
  D.line(im,50,27,45,34,'outline',2); D.line(im,45,34,46,40,'outline',2); D.line(im,46,40,51,39,'outline',2)
  D.line(im,50,27,46,34,'red3'); D.line(im,46,34,47,39,'sand2')
  local x=f==1 and 43 or 49; local y=f==1 and 27 or 34
  D.line(im,x-3,y-2,x+2,y+2,'fire4'); D.line(im,x,y-3,x-1,y+3,'fire5'); K.px(im,x,y,'white')
  return
 end
 -- A wide, shallow open hand; lower rim curls up toward its rear tip.
 plate(im,{{7,15},{15,10},{29,10},{43,14},{57,20},{68,28},{64,35},{52,36},{38,33},{24,29},{14,24}},'outline')
 plate(im,{{9,16},{16,12},{29,12},{43,16},{56,22},{65,28},{62,33},{52,34},{39,31},{25,27},{16,23}},steel)
 plate(im,{{12,17},{19,14},{29,14},{42,18},{55,24},{61,28},{59,31},{51,32},{39,29},{26,25},{18,22}},brass)
 D.line(im,15,17,27,15,light); D.line(im,28,15,42,19,light)
 D.line(im,24,26,40,31,'sand1'); D.line(im,40,31,54,34,'sand1')
 -- Six blunt, splayed tines (short barrels), following the top/back rim.
 for _,t in ipairs({{15,21,5,18},{17,16,8,9},{25,13,20,5},{35,15,34,7},{46,19,49,11},{57,24,63,18}}) do
  local x,y,xx,yy=table.unpack(t)
  D.limb(im,x,y,xx,yy,brass,light,3)
  D.disc(im,xx,yy,3,'outline'); D.disc(im,xx,yy,2,steel); D.disc(im,xx,yy,1,'outline')
  K.px(im,xx-1,yy-1,far and 'steel3' or 'steel5')
 end
 -- Recessed palm cannon: fixed muzzle, internal breech absorbs recoil.
 local recoil=f==3 and -2 or 0
 D.box(im,51+recoil,25,15,6,far and 'steel1' or 'steel2',steel,'outline')
 D.box(im,64,25,6,7,brass,light,'sand1'); D.rect(im,68,27,2,3,'outline')
 for _,p in ipairs({{23,20},{33,23},{43,26},{54,29}}) do
  if far then K.px(im,p[1],p[2],'sand3'); K.px(im,p[1]+1,p[2]+1,'sand1') else D.rivet(im,p[1],p[2]) end
 end
 D.line(im,29,17,31,22,'sand1'); D.line(im,42,21,43,26,'sand1')
 if f==2 then D.rect(im,57,27,3,2,'fire4') end
 if f==3 then D.flash(im,70,28,0) end
end
local function crackedTines(im,f)
 D.rect(im,29,3,11,6,{0,0,0,0});D.line(im,31,10,36,12,'steel1',2)
 D.line(im,45,18,49,23,'outline');D.line(im,45,17,49,22,'sand5')
 if f==2 then D.flash(im,35,10,0) end
end
for _,side in ipairs({'l','r'}) do local name='moosezilla_antler_'..side
 D.build(name,80,48,{
  D.anim(name..'_idle',4,160,function(im,f) local tmp=Image(80,48,ColorMode.RGB);cannon(tmp,1,side,false);im:drawImage(tmp,Point(0,f==2 and -1 or 0)) end),
  D.anim(name..'_intro',8,130,function(im,f) local tmp=Image(80,48,ColorMode.RGB);cannon(tmp,1,side,false);im:drawImage(tmp,Point(0,({1,0,-1,-2,-2,-1,0,0})[f])) end),
  D.anim(name..'_damaged',4,140,function(im,f) cannon(im,1,side,false);crackedTines(im,f) end),
  D.anim(name..'_fire_damaged',4,{160,160,60,100},function(im,f) cannon(im,f,side,false);crackedTines(im,f) end),
  D.anim(name..'_fire',4,{160,160,60,100},function(im,f) cannon(im,f,side,false) end),
  D.anim(name..'_broken',2,140,function(im,f) cannon(im,f,side,true) end)})
end
local function armor(im,f,damage)
  D.box(im,2,3,75,32,'red2','sand4','red1'); D.box(im,7,7,65,24,'red3','red5','red1')
  D.rect(im,10,9,58,3,'red4');D.rect(im,10,24,58,4,'red2');D.line(im,11,12,64,12,'red3');
  D.rect(im,8,9,3,19,'red4'); D.rect(im,67,9,4,20,'red2'); D.line(im,11,9,62,9,'red4'); D.line(im,9,28,65,28,'red2',2)
  D.line(im,4,3,74,3,'sand2'); D.line(im,4,33,74,33,'steel1')
  for j=0,4 do D.line(im,49+j*4,12,49+j*4,25,'red1',2) end
  -- Large stamped spiral-eye seal, readable at native resolution.
  D.disc(im,25,19,11,'sand1'); D.disc(im,25,19,9,'sand3'); D.disc(im,24,18,8,'sand4')
  D.line(im,16,19,23,14,'red1'); D.line(im,23,14,32,18,'red1'); D.line(im,16,19,23,23,'red1'); D.line(im,23,23,32,18,'red1')
  D.line(im,23,16,28,16,'red2'); D.line(im,28,16,28,21,'red2'); D.line(im,28,21,22,21,'red2'); D.line(im,22,21,22,18,'red2'); D.line(im,22,18,25,18,'red2'); K.px(im,25,19,'red1')
  D.line(im,12,12,17,12,'sand4'); D.line(im,57,28,62,27,'sand2'); K.px(im,13,13,'red1')
  for x=15,67,13 do D.rivet(im,x,5);D.line(im,x,6,x+1,9,'red1') end
  for _,p in ipairs({{5,5},{72,5},{5,32},{72,32},{41,5},{41,32}}) do D.rivet(im,p[1],p[2]) end
  -- Welds, chipped paint and rain/oil streaks; strongest light is top-left.
  D.line(im,12,10,37,10,'red5');D.line(im,14,29,29,29,'sand2')
  for _,x in ipairs({13,39,61}) do D.line(im,x,22,x+2,26,'red1');K.px(im,x+1,21,'red4') end
  if damage>0 then
   D.line(im,42,4,38,12,'outline',2);D.line(im,38,12,45,19,'outline',2);D.line(im,45,19,40,31,'outline',2)
   D.line(im,43,4,40,11,'sand4');D.line(im,46,19,42,28,'red5')
   D.box(im,54,22,16,9,'steel1','steel4','outline');D.line(im,56,24,65,28,'red4');D.line(im,65,24,60,29,'sand4')
  end
  if damage==2 then
   -- Missing corner plate exposes a hot rib cage, but the core remains gated by phase 3.
   D.rect(im,49,8,22,13,'steel1');for x=51,67,4 do D.line(im,x,10,x,18,'weird2',2);K.px(im,x,12+f%3,'weird4') end
   D.line(im,47,7,72,7,'steel5');D.line(im,11,30,20,24,'outline',2)
   if f%2==0 then D.flash(im,57,25,0) end
  end
end
D.build('moosezilla_armor',80,40,{
 D.anim('moosezilla_armor_intact',4,160,function(im,f) armor(im,f,0) end),
 D.anim('moosezilla_armor_damaged',4,140,function(im,f) armor(im,f,1) end),
 D.anim('moosezilla_armor_critical',4,120,function(im,f) armor(im,f,2) end),
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
D.build('moosezilla_debris',36,36,{
 D.anim('moosezilla_debris_horn',1,120,function(im) D.limb(im,5,29,22,18,'sand2','sand5',5);D.limb(im,22,18,29,5,'steel3','steel5',4);D.line(im,22,18,15,7,'steel3',3);D.line(im,5,27,10,31,'fire4') end),
 D.anim('moosezilla_debris_bolt',1,120,function(im) D.disc(im,12,12,6,'outline'); D.disc(im,12,12,4,'steel4'); D.line(im,9,10,14,14,'steel1',2) end),
 D.anim('moosezilla_debris_plate',1,120,function(im) D.box(im,3,4,28,24,'red2','red5','red1');D.box(im,6,7,21,16,'red3','red4','red1');D.rivet(im,5,6);D.rivet(im,27,25);D.line(im,8,7,22,22,'sand2');D.line(im,15,8,11,15,'outline',2);D.line(im,11,15,18,23,'outline',2) end),
 D.anim('moosezilla_debris_gear',1,120,function(im)
  for j=0,7 do local a=j*math.pi/4; D.box(im,10+math.cos(a)*8,10+math.sin(a)*8,5,5,'sand2','sand4') end
  D.disc(im,12,12,8,'outline'); D.disc(im,12,12,6,'sand3'); D.disc(im,12,12,3,'outline'); K.px(im,9,9,'sand5')
 end),
 D.anim('moosezilla_debris_pipe',1,120,function(im) D.limb(im,5,19,5,7,'sand2','sand5',3); D.limb(im,5,7,19,7,'sand2','sand5',3); D.box(im,15,3,7,8,'steel2','steel4') end)})
