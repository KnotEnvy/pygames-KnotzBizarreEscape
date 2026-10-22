-- GATORGEDDON: original mechanical alligator, right-facing, 236x96 assembled.
-- Native pixel art; K.PAL only. Independent joints remain editable in Aseprite.
local D=dofile(app.params.root..'/art-src/enemies/lib/draw.lua')
local K=D.K
local function poly(im,ps,c)
 for y=0,im.height-1 do
  local xs={}
  for i,p in ipairs(ps) do local q=ps[i%#ps+1]
   if (p[2]<=y and q[2]>y) or (q[2]<=y and p[2]>y) then xs[#xs+1]=p[1]+(y-p[2])*(q[1]-p[1])/(q[2]-p[2]) end
  end
  table.sort(xs);for i=1,#xs-1,2 do D.line(im,math.ceil(xs[i]),y,math.floor(xs[i+1]),y,c) end
 end
end
local function moss(im,x,y,f)
 for j=0,3 do local xx=x+j*3;local n=4+(j*3+f)%7
  D.line(im,xx,y,xx-1,y+n,'leaf1');D.line(im,xx+1,y,xx,y+n-2,'leaf3');K.px(im,xx,y+2,'olive4')
 end
end
local function hull(im,f,tier)
 poly(im,{{3,33},{12,18},{33,13},{82,17},{103,30},{110,45},{102,58},{16,60},{3,49}},'outline')
 poly(im,{{5,34},{14,20},{34,15},{81,19},{101,31},{107,45},{100,55},{17,57},{5,48}},'steel2')
 poly(im,{{7,33},{18,21},{77,20},{95,28},{98,42},{18,48},{7,43}},'olive3')
 D.line(im,17,22,76,21,'olive5',2);D.line(im,19,25,73,24,'olive4')
 -- Armoured scutes, raised exhaust ridges, copper pressure tubing.
 for j=0,5 do local x=15+j*14
  poly(im,{{x,22},{x+1,10-j%2*5},{x+6,5+j%2*4},{x+10,23}},'outline')
  poly(im,{{x+2,19},{x+3,11-j%2*4},{x+6,8+j%2*3},{x+8,21}},'steel3')
  D.line(im,x+3,11,x+6,10,'steel5');D.rect(im,x+3,15,4,3,'steel1')
  D.box(im,x-2,28,14,17,'olive2','olive4','olive1');D.rivet(im,x,30)
 end
 D.limb(im,12,47,90,47,'sand2','sand4',2);D.limb(im,90,47,96,39,'sand2','sand5',2)
 D.box(im,25,33,37,19,'red2','sand3','red1');D.box(im,29,35,29,14,'red3','red4','red1')
 -- Large stamped Regime spiral eye.
 poly(im,{{33,42},{42,36},{53,41},{43,48}},'sand4')
 D.line(im,40,39,47,39,'red1');D.line(im,47,39,48,44,'red1');D.line(im,48,44,40,44,'red1');D.line(im,40,44,41,41,'red1');K.px(im,44,41,'red1')
 D.box(im,70,31,23,12,'steel1','steel4','outline')
 for x=73,89,4 do D.line(im,x,34,x,40,'steel3');K.px(im,x,35+(f%3),'fire3') end
 for _,p in ipairs({{15,49},{24,29},{64,49},{99,39},{84,25}}) do D.rivet(im,p[1],p[2]) end
 for _,p in ipairs({{14,33},{58,26},{87,44}}) do D.line(im,p[1],p[2],p[1]+6,p[2]+2,'dirt3');K.px(im,p[1]+1,p[2]-1,'dirt5') end
 moss(im,14,40,f);moss(im,95,39,f)
 -- A reciprocating exposed piston under the belly.
 D.box(im,43,53,28,7,'steel1','steel3');D.rect(im,46,55,17+f%3,2,'steel5');D.rect(im,64+f%3,54,5,5,'sand3')
 if tier>0 then
  D.line(im,57,25,52,33,'outline',2);D.line(im,52,33,61,40,'outline',2);D.line(im,61,40,57,48,'outline',2)
  D.line(im,58,25,54,32,'sand5');D.box(im,17,26,13,9,'steel1','steel4');D.line(im,19,28,26,32,'red4')
  D.rect(im,72,9,11,11,{0,0,0,0});D.line(im,73,20,80,22,'steel5')
 end
 if tier==2 then
  D.box(im,60,24,34,23,'steel1','steel4','outline')
  for x=63,90,5 do D.line(im,x,27,x,43,'weird1',3);D.line(im,x,29,x,40,'weird4');K.px(im,x,30+f%3,'weird5') end
  D.line(im,55,25,58,29,'sand5');D.line(im,96,28,91,32,'steel5');moss(im,30,47,f)
 end
end
local function head(im,f,pose)
 local cue=pose=='cue';local open=pose=='roar' or pose=='gun' or pose=='gas'
 poly(im,{{2,15},{13,5},{29,6},{39,17},{70,20},{82,16},{87,23},{86,33},{70,38},{14,41},{3,32}},'outline')
 poly(im,{{4,16},{14,8},{28,8},{38,20},{70,23},{81,19},{84,24},{83,30},{68,34},{15,37},{5,30}},'olive3')
 D.line(im,39,23,78,25,'olive5');D.line(im,11,13,26,11,'olive4',2)
 D.box(im,7,18,23,14,'steel1','sand3','outline');D.rect(im,11,20,15,7,cue and 'fire4' or 'sand3');D.rect(im,14,21,10,4,cue and 'fire5' or 'fire4');D.rect(im,17,21,2,5,'outline');K.px(im,14,21,'white')
 if pose=='idle' and f==4 then D.rect(im,11,20,15,7,'olive2');D.line(im,12,23,25,23,'sand3') end
 -- Heavy angry brow and tiny rear-facing eye keep the alligator identity.
 D.line(im,7,16,30,20,'outline',3);D.line(im,9,15,28,18,'olive5',2)
 D.box(im,75,20,8,6,'steel1','steel4','outline');D.rect(im,77,21,3,2,'outline')
 D.box(im,33,28,40,7,'steel2','steel5','steel1')
 for x=37,77,8 do poly(im,{{x,33},{x+5,33},{x+2,40}},'outline');poly(im,{{x+1,34},{x+4,34},{x+2,38}},'sand5') end
 D.disc(im,8,30,7,'outline');D.disc(im,8,30,5,'sand2');D.disc(im,8,30,3,'steel4');D.rivet(im,7,29)
 for x=42,69,13 do D.rivet(im,x,27) end
 D.line(im,48,24,55,25,'dirt3');D.line(im,25,8,28,12,'sand3');moss(im,31,29,f)
 if open then
  D.box(im,19,31,17,11,'steel1','steel3','outline')
  for j=0,2 do D.box(im,26,33+j*3,16,3,'steel3','steel5','outline') end
  if pose=='gun' and f%2==0 then D.flash(im,43,37,2) end
  if pose=='gas' then D.rect(im,28,34,12,4,f%2==0 and 'weird5' or 'weird4') end
 end
end
local function jaw(im,f,pose)
 local drop=pose=='open' and ({2,6,10,6})[(f-1)%4+1] or 0
 D.limb(im,8,5,66,8+drop,'steel2','steel4',4);D.box(im,62,5+drop,19,7,'olive2','olive4','outline')
 for x=22,75,9 do poly(im,{{x,6+drop},{x+5,6+drop},{x+3,0+drop}},'outline');poly(im,{{x+1,5+drop},{x+4,5+drop},{x+3,2+drop}},'sand5') end
 D.rivet(im,10,5);D.line(im,25,10+drop,63,12+drop,'dirt3')
end
local function tail(im,f,pose)
 local lift=pose=='coil' and math.floor(f*2) or pose=='slam' and (f<3 and 7 or 0) or f%2
 poly(im,{{83,9},{65,12},{47,18},{28,22-lift},{8,12-lift},{2,15-lift},{16,31-lift},{37,35-lift},{63,32},{85,31}},'outline')
 poly(im,{{81,12},{64,15},{46,21},{28,25-lift},{8,15-lift},{18,28-lift},{37,32-lift},{63,29},{83,28}},'olive3')
 D.line(im,35,26-lift,76,19,'olive5',2)
 for j=0,4 do local x=35+j*10;local y=23-math.floor(j*2)
  D.line(im,x,y,x+3,y+8,'steel1',2);D.line(im,x+2,y,x+5,y+7,'sand3')
  poly(im,{{x,y},{x+3,y-8},{x+7,y-1}},'outline');D.line(im,x+3,y-5,x+5,y-1,'steel4')
 end
 poly(im,{{2,15-lift},{11,3-lift},{17,15-lift},{26,22-lift},{16,26-lift}},'outline')
 poly(im,{{5,15-lift},{11,7-lift},{14,16-lift},{22,22-lift},{16,23-lift}},'steel4');D.line(im,6,15-lift,11,8-lift,'steel5')
 D.disc(im,79,22,8,'outline');D.disc(im,79,22,6,'sand2');D.rivet(im,78,20)
end
-- H2: hand-built plated crocodile limbs, guided by refs/gatorgeddon_legs.
-- The original 112x40 canvases/pivots are retained; soles stay on row 39.
-- Structure, armour, exposed hydraulics and individual claws remain editable layers.
local function legs(im,f,far,pose,tier,layer)
 local stride={-4,-1,3,5,5,2,-2,-5}
 local lift={0,0,0,3,7,8,5,1}
 local compress={4,5,4,3,2,1,0,0}
 local bucklex={0,1,2,4,6,8,10,11,12,12}
 local buckley={0,1,3,5,7,9,11,12,13,13}
 for j=0,1 do
  local x=25+j*63;local n=(f-1+(far and 4 or 0)+j*4)%8+1
  local dx=pose=='walk' and stride[n] or 0
  local up=pose=='walk' and lift[n] or 0
  local squash=pose=='crouch' and ({1,2,3,5,5,4})[f] or pose=='stomp' and compress[f] or 0
  local dying=pose=='death'
  if dying then squash=buckley[f];dx=bucklex[f]*(j==0 and -1 or 1) end
  local hipy=6+squash+(pose=='idle' and ({0,1,2,1,0,-1})[f] or 0)
  local kx=x+(j==0 and 8 or -9)+math.floor(dx/2)
  local ky=19+math.floor(squash*.6)-math.floor(up*.4)
  local ax=x-4+dx;local ay=30-up
  if dying then ax=x-4;ay=30; kx=x+(j==0 and -1 or 1)*math.min(14,7+f) end
  local base=far and 'olive2' or 'olive3'
  local hi=far and 'olive3' or 'olive4'
  local rim=far and 'olive4' or 'olive5'
  if layer=='structure' then
   D.limb(im,x,hipy,kx,ky,'steel1','steel3',7)
   D.limb(im,kx,ky,ax,ay,'steel2','steel4',5)
   D.disc(im,kx,ky,6,'outline');D.disc(im,kx,ky,4,'steel3')
   D.line(im,kx-3,ky-2,kx,ky-3,'steel5');D.disc(im,kx,ky,2,'steel1')
   D.disc(im,ax,ay,5,'outline');D.disc(im,ax,ay,3,far and 'steel3' or 'steel4');D.rivet(im,ax-1,ay-1)
  elseif layer=='armour' then
   -- Broad scapula/haunch plates, with distinct front and hind silhouettes.
   poly(im,{{x-11,hipy-5},{x-6,hipy-8},{x+5,hipy-7},{x+11,hipy-1},{kx+6,ky-4},{kx-3,ky-1},{x-11,hipy+6}},'outline')
   poly(im,{{x-9,hipy-4},{x-5,hipy-6},{x+4,hipy-5},{x+8,hipy},{kx+3,ky-5},{kx-3,ky-3},{x-9,hipy+4}},base)
   D.line(im,x-8,hipy-4,x-3,hipy-6,rim);D.line(im,x-3,hipy-6,x+4,hipy-5,hi,2)
   D.line(im,x-8,hipy-2,x-7,hipy+2,hi,2);D.rivet(im,x+3,hipy-2)
   -- Elbow/knee cap and vented greave leave the ram visibly exposed.
   poly(im,{{kx+2,ky-4},{kx+9,ky-3},{kx+10,ky+5},{ax+7,ay+1},{ax,ay-2},{kx+2,ky+2}},'outline')
   poly(im,{{kx+3,ky-2},{kx+7,ky-2},{kx+8,ky+4},{ax+6,ay-1},{ax+1,ay-3},{kx+3,ky+1}},base)
   D.line(im,kx+3,ky-3,kx+6,ky-2,rim)
   D.line(im,kx+4,ky+1,ax+3,ay-4,hi,2)
   D.line(im,x-7,hipy-2,x-7,hipy+1,'olive1');D.line(im,x-4,hipy-2,x-4,hipy,'olive1')
   D.line(im,kx+5,ky-2,kx+6,ky,'red3',2)
   if tier>0 or dying then
    D.line(im,x-2,hipy-5,x+1,hipy-1,'outline');D.line(im,x+1,hipy-1,x-2,hipy+3,'outline')
    D.line(im,x-1,hipy-5,x+2,hipy-2,'sand4')
   end
   if tier==2 or dying then
    poly(im,{{x-9,hipy+2},{x-3,hipy},{x+2,hipy+4},{kx-2,ky-3},{x-7,hipy+7}},'steel1')
    D.line(im,x-6,hipy+3,kx-3,ky-5,'steel4');D.line(im,x-4,hipy+4,kx-2,ky-4,'red3')
   end
  elseif layer=='hydraulics' then
   -- Ram socket follows the compressed hip, while the shaft follows the knee.
   local rx=x-4;local ry=hipy+5;local tx=kx-2;local ty=ky+3
   D.limb(im,rx,ry,tx,ty,'steel2','steel4',3)
   D.line(im,rx-1,ry,tx-1,ty,'steel5',2)
   D.line(im,rx-3,ry-1,rx+1,ry+1,'red3',2);D.line(im,tx-3,ty-1,tx+1,ty+1,'red3',2)
   if tier>0 or dying then
    D.line(im,tx,ty+1,tx-2,ty+5,'dirt1',2);K.px(im,tx-2,ty+5+(f%3),'dirt3')
   end
   if tier==2 and f%3==0 and not far then
    D.line(im,rx-3,ry+1,rx-6,ry-2,'fire4');K.px(im,rx-7,ry-3,'fire5')
   end
  elseif layer=='claws' then
   -- Broad palms, separate toe knuckles and three hooked, splayed steel claws.
   local spread=(pose=='crouch' or pose=='stomp' and f<4) and 1 or 0
   local fy=31-up
   poly(im,{{ax-10,fy+1},{ax-5,fy-3},{ax+3,fy-3},{ax+11,fy+1},{ax+14,fy+7},{ax-13,fy+7}},'outline')
   poly(im,{{ax-9,fy+1},{ax-4,fy-1},{ax+2,fy-1},{ax+9,fy+2},{ax+11,fy+6},{ax-11,fy+6}},base)
   D.line(im,ax-7,fy,ax-2,fy-2,rim);D.line(im,ax-2,fy-2,ax+3,fy-1,hi)
   for k=0,2 do
    local toe=ax-11+k*9+(k-1)*spread
    local yy=fy+(k==1 and 2 or 1)
    poly(im,{{toe,yy},{toe+4,yy-1},{toe+7,yy+1},{toe+9,yy+5},{toe+9,yy+6},{toe+5,yy+5},{toe+1,yy+5}},'outline')
    poly(im,{{toe+1,yy},{toe+4,yy},{toe+6,yy+2},{toe+7,yy+5},{toe+4,yy+3},{toe+1,yy+3}},far and 'steel3' or 'steel4')
    D.line(im,toe+1,yy,toe+4,yy,'steel5');K.px(im,toe+5,yy+1,'steel5')
    D.line(im,toe,yy-1,toe+3,yy-2,hi);D.rivet(im,toe,yy+1)
   end
   if dying and f>=5 then
    -- A loose ankle plate slides free; the toe fan remains flat under the hull.
    D.box(im,ax-15,26+math.min(9,f),5,3,'olive2','olive4','outline')
   end
  end
 end
end
local function buildLegs(far)
 local name='gatorgeddon_legs_'..(far and 'back' or 'front')
 local layers={'structure','armour','hydraulics','claws'};local anims={}
 for tier=0,2 do for _,pose in ipairs({'idle','walk','crouch','stomp'}) do
  local count=pose=='walk' and 8 or pose=='stomp' and 8 or 6
  local frames={}
  for i=1,count do local f=i;local frame={}
   for _,l in ipairs(layers) do local layer=l;frame[layer]=function(im) legs(im,f,far,pose,tier,layer) end end
   frames[#frames+1]=frame
  end
  local suffix=tier==1 and '_damaged' or tier==2 and '_critical' or ''
  anims[#anims+1]={tag=name..'_'..pose..suffix,ms=pose=='walk' and 80 or pose=='stomp' and 65 or pose=='crouch' and 100 or 150,frames=frames}
 end end
 local frames={}
 for i=1,10 do local f=i;local frame={};for _,l in ipairs(layers) do local layer=l;frame[layer]=function(im) legs(im,f,far,'death',2,layer) end end;frames[#frames+1]=frame end
 anims[#anims+1]={tag=name..'_death',ms=150,frames=frames}
 K.build{name=name,w=112,h=40,layers=layers,anims=anims,anchor='bottom-center',src=D.root..'/art-src/enemies/'..name..'.aseprite',sheet=D.root..'/public/assets/sprites/enemies/'..name..'.png',data=D.root..'/public/assets/sprites/enemies/'..name..'.json'}
end
local function pod(im,f,pose)
 D.box(im,12,23,17,20,'steel1','steel4','outline');D.rect(im,16,25,3,15,'steel5');D.rect(im,24,25,3,15,'sand3');D.box(im,6,39,29,6,'steel2','steel4','outline')
 if pose=='broken' then D.box(im,10,19,21,7,'steel1','sand3');D.line(im,14,19,18,15,'red3');D.line(im,18,15,23,20,'sand4');if f%2==0 then D.flash(im,22,18,0) end;return end
 D.box(im,3,4,34,22,'red2','sand3','red1');D.box(im,6,6,28,17,'red3','red5','red1')
 for j=0,3 do local x=10+j%2*14;local y=11+math.floor(j/2)*8
  D.disc(im,x,y,5,'outline');D.disc(im,x,y,3,'steel3');D.disc(im,x,y,2,pose=='cue' and 'fire4' or 'steel1');K.px(im,x-1,y-1,'sand4')
 end
 D.rivet(im,4,5);D.rivet(im,34,23);moss(im,26,20,f)
end
local static=app.params.silhouette=='1'
local function build(name,w,h,fn,poses)
 local anims={D.anim(name..'_idle',static and 1 or 4,150,function(im,f) fn(im,f,'idle') end)}
 if not static then for _,p in ipairs(poses) do anims[#anims+1]=D.anim(name..'_'..p, p=='walk' and 8 or 4, p=='walk' and 80 or 150,function(im,f) fn(im,f,p) end) end end
 D.build(name,w,h,anims)
end
build('gatorgeddon_body',112,64,function(im,f,p) hull(im,f,p=='critical' and 2 or p=='damaged' and 1 or 0) end,{'damaged','critical'})
build('gatorgeddon_head',88,48,head,{'cue','roar','gun','gas'})
build('gatorgeddon_jaw',88,24,jaw,{'open'})
build('gatorgeddon_tail',88,40,tail,{'coil','slam'})
buildLegs(true);buildLegs(false)
build('gatorgeddon_pod',40,48,pod,{'cue','broken'})
if not static then
 D.build('gatorgeddon_wave',40,24,{D.anim('gatorgeddon_wave_fly',4,90,function(im,f)
  poly(im,{{2,21},{8,17},{12,8},{22,2},{32,3},{37,10},{31,15},{30,9},{24,8},{21,13},{26,20},{38,22}},'steel1')
  poly(im,{{4,20},{10,17},{15,9},{23,4},{31,5},{34,9},{30,11},{29,8},{23,7},{18,13},{23,20},{35,21}},'steel3')
  D.line(im,14,9,23,4,'sky5',2);D.line(im,23,4,30,5,'steel5');D.line(im,4,21,34,21,'steel5')
  for j=0,3 do K.px(im,8+j*7,18-(f+j)%3*3,'sky5') end
 end)})
 D.build('gatorgeddon_rocket',16,12,{D.anim('gatorgeddon_rocket_fly',4,80,function(im,f)
  D.box(im,3,3,10,6,'red3','sand5','red1');poly(im,{{12,3},{15,6},{12,9}},'sand4');D.line(im,1,4,3,6,'fire4',3);K.px(im,f%2,6,'fire5')
 end)})
end
