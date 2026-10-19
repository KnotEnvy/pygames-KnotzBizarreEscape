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
local function legs(im,f,far,pose)
 for j=0,1 do local x=25+j*63;local stride=pose=='walk' and ({-4,-2,2,4,4,2,-2,-4})[(f-1+(far and 4 or 0))%8+1] or f%2
  local lift=pose=='crouch' and 5 or pose=='stomp' and j==1 and f<3 and 12 or 0
  D.limb(im,x,6,x-10,17,far and 'steel1' or 'steel2','steel4',5)
  D.limb(im,x-10,17,x+stride-7,31-lift,'sand2',far and 'sand3' or 'sand5',3)
  D.line(im,x+2,9,x+stride-2,29-lift,'steel5',2);D.line(im,x+4,9,x+stride,27-lift,'steel1')
  D.disc(im,x-10,17,5,'outline');D.disc(im,x-10,17,3,far and 'steel2' or 'red3');D.rivet(im,x-11,16)
  D.box(im,x+stride-13,29-lift,23,9,far and 'steel1' or 'olive2','olive4','outline')
  for k=0,2 do D.box(im,x+stride-9+k*7,34-lift,6,5,'steel3','sand5','outline') end
 end
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
for _,s in ipairs({'back','front'}) do build('gatorgeddon_legs_'..s,112,40,function(im,f,p) legs(im,f,s=='back',p) end,{'walk','crouch','stomp'}) end
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
