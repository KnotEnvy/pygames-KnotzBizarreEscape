-- Enemies B: original bayou mechs. No GATORGEDDON assets are built here.
local D=dofile(app.params.root..'/art-src/enemies/lib/soldier.lua');local K=D.K
local function dome(im,cx,cy,rx,ry,c)
 for y=-ry,ry do for x=-rx,rx do if x*x/(rx*rx)+y*y/(ry*ry)<=1 then K.px(im,cx+x,cy+y,c) end end end
end
local function shell(im,pose,f,n,tier)
 local bob=(f%4==2 or f%4==3) and 1 or 0;local y=pose=='intro' and math.floor((1-f/n)*48) or bob
 local spin=pose=='spin' or pose=='spin_cue';local dead=pose=='death'
 -- Stumpy hydraulic feet, with independent piston travel and hooked claws.
 if not spin then for j=0,3 do local x=19+j*22;local sy=dead and 20+(f+j)%3*5 or 65+y
  D.limb(im,x,52+y,x-4,sy,'steel2','steel5',4);D.box(im,x-10,sy-2,16,7,'olive2','olive4','outline')
  for k=0,2 do D.line(im,x-9+k*4,sy+4,x-11+k*4,sy+7,'sand4') end
 end end
 dome(im,56,47+y,49,28,'outline');dome(im,55,45+y,47,26,'olive1');dome(im,52,40+y,43,23,'olive3');dome(im,44,35+y,32,16,'olive4')
 -- Hexagonal riveted shell panels, rust seams, spikes and Regime insignia.
 for j=0,4 do local x=19+j*17;D.line(im,x,29+y,x-5,56+y,'olive1',2);D.line(im,x+2,29+y,x-3,52+y,'olive5');D.rivet(im,x+2,45+y) end
 D.line(im,14,47+y,98,47+y,'olive1',2);D.line(im,18,50+y,95,50+y,'sand2')
 for j=0,4 do local x=22+j*17;D.limb(im,x,25+y,x-3,14+(j%2)*3+y,'steel2','steel5',3) end
 D.box(im,43,16+y,28,11,'steel2','steel5','steel1');D.box(im,48,13+y,17,5,'red2','red4','outline')
 if pose=='eggs' then D.box(im,47,7+y,20,10,'olive3','olive5','outline');D.disc(im,56,13+y,4,'fire4') end
 D.box(im,70,35+y,16,12,'red2','red4','red1');D.eye(im,74,39+y)
 for j=0,5 do local x=13+j*15;D.line(im,x,53+y,x+2,61+(f+j)%3+y,'leaf2');K.px(im,x+1,58+y,'leaf4') end
 if tier>=1 then D.line(im,30,29+y,44,39+y,'outline',2);D.line(im,44,39+y,37,46+y,'sand1');D.line(im,80,25+y,74,35+y,'steel1',2) end
 if tier>=2 then dome(im,50,45+y,22,15,'steel1');dome(im,49,44+y,16,11,'weird1');D.box(im,37,37+y,25,15,'fire2','fire5','red1')
  for j=0,4 do D.rect(im,39+j*5,39+y,2,11,(f+j)%3==0 and 'white' or 'fire4') end
  D.line(im,30,28+y,38,33+y,'steel5',2);D.line(im,66,30+y,72,38+y,'steel5',2)
 end
 if spin then for j=0,2 do D.line(im,5+j*8,66-j*5,25+j*8,66-j*5,'steel4') end;D.box(im,6,53+y,11,10,'steel2','steel4','steel1') end
 if not spin and not dead then for _,x in ipairs({27,80}) do D.limb(im,x,62+y,x-5,73,'steel2','steel5',3);D.box(im,x-12,72,18,6,'olive2','olive4','outline');for j=0,2 do D.line(im,x-12+j*5,77,x-14+j*5,79,'sand4') end end end
 if dead then D.box(im,31,55,49,12,'steel1','steel4','outline');for j=0,3 do D.rivet(im,36+j*12,58) end end
 if pose=='spin' then local src=Image(im);im:clear();for yy=0,31 do for xx=0,111 do im:drawPixel(xx,48+yy,src:getPixel(xx,math.min(79,math.floor(yy/31*79)))) end end end
end
local function head(im,pose,f,n,tier)
 local open=pose=='snap' or pose=='hiss' or pose=='death';local y=(f%3==0) and 1 or 0
 D.box(im,25,12+y,22,10,'steel2','steel5','steel1');for j=0,3 do D.line(im,29+j*4,14+y,29+j*4,20+y,'steel1') end
 dome(im,17,16+y,15,10,'outline');dome(im,16,15+y,13,8,tier>=1 and 'olive2' or 'olive3');D.line(im,6,10+y,21,8+y,'olive5',2)
 D.box(im,6,11+y,9,5,'red1','sand4');D.rect(im,7,12+y,7,2,(pose=='cue_high' or pose=='cue_low') and 'white' or 'fire4')
 -- Hooked snapping beak. A deep lower jaw opens during hiss and snap.
 D.line(im,3,16+y,2,23+y,'steel5',3);D.line(im,2,23+y,7,21+y,'sand5',2)
 D.box(im,7,21+y,17,open and 8 or 4,'steel2','steel4','steel1');if open then D.line(im,9,24+y,23,24+y,'red2',2);D.rect(im,12,21+y,2,3,'sand5');D.rect(im,20,21+y,2,3,'sand5') end
 if pose=='death' then for j=0,4 do D.line(im,24+j*4,15+(j%2)*4,28+j*4,19-(j%2)*4,'steel5') end end
end
local function skeeter(im,pose,f,n,tier)
 local flap=({-7,0,7,0,-5,2})[(f-1)%6+1];local y=(f%3==0) and 1 or 0
 -- Four separate rotor wings and thin jointed minigun legs: mosquito silhouette.
 for j=0,1 do for side=-1,1,2 do local xx=72+side*(42+j*12);local yy=22+j*13+flap*(j==0 and 1 or -1)
  if not(tier>=2 and j==1 and side==1) then D.limb(im,69,31,xx,yy,'steel2','steel5',3);D.limb(im,xx,yy,xx+side*10,yy-3,'steel3','sky5',2);D.line(im,xx-side*18,yy-4,xx+side*10,yy-4,'steel4')
  else D.line(im,75,32,97,39,'steel5',2) end
 end end
 for j=0,2 do local xx=51+j*18;D.limb(im,xx,48+y,xx-11,62+(f+j)%2*2,'steel2','steel4',2);D.limb(im,xx-11,62,xx-5,76,'steel2','steel5',2);D.box(im,xx-10,72,13,5,'steel1','steel4','outline');if pose=='fan_cue' or pose=='fan' then D.rect(im,xx-7,76,8,2,pose=='fan' and 'white' or 'fire4') end end
 -- Round red fuel-blood tank, strapped to a segmented thorax.
 dome(im,96,43+y,28,22,'outline');dome(im,95,41+y,26,20,tier>=1 and 'red2' or 'red3');dome(im,89,35+y,19,13,'red4');dome(im,85,31+y,9,5,'red5')
 for j=0,2 do D.line(im,80+j*13,24+y,84+j*13,59+y,'steel1',3);D.line(im,81+j*13,25+y,85+j*13,57+y,'steel4') end
 D.box(im,99,36+y,15,12,'red1','sand4');D.eye(im,103,40+y)
 dome(im,61,39+y,20,17,'outline');dome(im,59,37+y,18,15,'olive3');dome(im,56,32+y,13,8,'olive5');D.box(im,49,42+y,26,10,'steel2','steel5','steel1')
 dome(im,37,39+y,15,13,'outline');dome(im,35,37+y,13,11,'red2')
 for j=0,2 do for k=0,1 do D.disc(im,28+j*6,32+k*7+y,2,(pose=='laser' or pose=='fan_cue') and 'fire5' or 'red5') end end
 -- Long tapered drill proboscis and antennae.
 D.limb(im,29,45+y,8,69,'steel2','steel5',3);for j=0,4 do D.line(im,11+j*4,65-j*4,15+j*4,66-j*4,'sand4') end
 D.line(im,8,69,5,77,'steel5',2);D.limb(im,32,28,25,19,'steel1','steel4',1);D.disc(im,24,18,2,'fire4')
 if pose=='larva' then for j=0,2 do D.disc(im,78+j*12,64+j%2*4,4,'sand4');D.line(im,76+j*12,64,80+j*12,64,'red3') end end
 if tier>=1 then D.line(im,97,24,91,39,'outline',2);D.line(im,91,39,103,48,'sand1',2);D.line(im,103,48,95,60,'outline',2) end
 if tier>=2 then D.box(im,88,34,18,20,'fire2','fire5','red1');for j=0,2 do D.rect(im,91+j*5,37,2,14,(j+f)%2==0 and 'fire5' or 'red4') end end
 if pose=='stuck' then D.line(im,0,79,18,79,'sand4');D.line(im,1,76,4,72,'fire5');D.line(im,14,75,19,72,'fire4') end
end
local silhouette=app.params.silhouette=='1'
for _,spec in ipairs({{'shellshock',112,80,shell},{'shellshock_head',48,32,head},{'skeeter',144,88,skeeter}}) do
 local A={};local poses=silhouette and {'idle'} or spec[1]=='shellshock_head' and {'idle','hiss','cue_high','cue_low','snap','death'} or spec[1]=='shellshock' and {'idle','intro','eggs','spin_cue','spin','death'} or {'idle','intro','laser','dive','stuck','larva','fan_cue','fan','death'}
 for tier=0,(silhouette and 0 or 2) do for _,pose in ipairs(poses) do A[#A+1]=D.anim(spec[1]..'_'..pose..(tier==0 and '' or tier==1 and '_damaged' or '_critical'),6,pose=='intro' and 180 or 100,function(im,f,n) spec[4](im,pose,f,n,tier) end) end end
 D.build(spec[1],spec[2],spec[3],A)
end
if not silhouette then
 local poses={'idle','walk','alert','shoot','crouch_idle','crouch_shoot','sleep','panic','rise','death_launched','death_flame','death_explosion'};local A={}
 for _,p in ipairs(poses) do A[#A+1]=D.anim('lurker_'..p,p=='walk' and 8 or p=='rise' and 7 or 4,100,function(im,f,n)
  if p:find('death') then D.death(im,'grunt',p:find('flame') and 'flame' or 'launched',f,n) else D.soldier(im,'grunt',p=='rise' and 'idle' or p,f,n) end
  for j=0,6 do local x=16+j*3;D.line(im,x,11,x-1,18+(f+j)%4,'leaf2',2);D.line(im,x+1,12,x,17,'leaf4') end
  for j=0,4 do D.line(im,17+j*3,23,15+j*3,34+(j+f)%3,'olive2',2);K.px(im,17+j*3,27,'olive5') end
  if p=='rise' then local top=48-math.floor(f/n*40);for y=0,top do for x=0,47 do im:drawPixel(x,y,0) end end;D.line(im,10,46,38,46,'sky4');D.line(im,14,44,34,44,'steel3') end
 end) end;D.build('lurker',48,48,A)
 local function small(im,name,pose,f,n)
  if name=='hopper' then
   local squat=pose=='cue' or pose=='tongue_cue';local yy=squat and 5 or (f%3==0 and 1 or 0)
   D.limb(im,13,27+yy,7,37,'olive2','olive5',5);D.limb(im,32,27+yy,40,37,'olive2','olive5',5);D.box(im,4,37,13,5,'steel2','steel5','outline');D.box(im,31,37,14,5,'steel2','steel5','outline')
   dome(im,24,27+yy,17,12,'outline');dome(im,23,25+yy,15,10,'olive3');D.box(im,14,23+yy,22,7,'steel2','steel5','steel1');D.line(im,13,31+yy,34,31+yy,'outline',2)
   for _,x in ipairs({14,31}) do D.disc(im,x,15+yy,7,'outline');D.disc(im,x,14+yy,5,'olive4');D.rect(im,x-3,13+yy,6,2,'fire5');D.rect(im,x,12+yy,2,4,'red2') end
   dome(im,25,34+yy,pose=='tongue_cue' and 10 or 6,5,pose=='tongue_cue' and 'red5' or 'red2');D.eye(im,21,22+yy)
  elseif name=='piranha' then
   dome(im,19,14,13,9,'outline');dome(im,18,13,11,7,'steel3');D.limb(im,29,13,37,7,'red2','red5',3);D.limb(im,29,14,37,21,'red2','red4',3);D.limb(im,17,7,21,2,'olive2','olive5',2)
   D.disc(im,11,10,4,'red1');D.rect(im,8,9,6,2,'fire5');D.line(im,5,15,19,15,'outline',2);for j=0,3 do D.line(im,6+j*3,15,7+j*3,18,'sand5') end
  elseif name=='gnat' then
   for j=0,1 do D.limb(im,16,10,4+j*24,3+(f%2)*4,'steel2','sky5',2) end;dome(im,20,14,7,5,'red2');D.box(im,10,10,9,9,'steel2','steel5','steel1');D.disc(im,10,13,3,pose=='cue' and 'fire5' or 'red5');D.line(im,10,17,6,23,'steel5');D.line(im,18,18,22,22,'steel4')
  else
   -- Low planing hull, exposed fan cage, driver and gunner.
   D.box(im,5,35,81,12,'olive2','olive5','steel1');D.line(im,9,47,80,47,'sky4',2);D.line(im,2,41,14,35,'sand4',2)
   dome(im,70,22,17,18,'outline');dome(im,70,21,15,16,'steel3');dome(im,70,21,12,13,'steel1');D.line(im,55,21,85,21,'steel5');D.line(im,70,5,70,37,'steel5');D.line(im,59,10,81,32,'steel4');D.line(im,81,10,59,32,'steel4')
   D.limb(im,70,21,70+math.floor(math.cos(f*1.3)*10),21+math.floor(math.sin(f*1.3)*10),'sand3','sand5',2)
   for j=0,1 do local x=23+j*21;D.box(im,x,23,10,11,'red3','red5','red1');D.disc(im,x+5,20,5,'skin4');D.box(im,x-1,13,12,6,'red2','red5','outline') end
   D.box(im,9,27,27,5,'steel2','steel5','steel1');D.box(im,27,31,5,5,'sand3','sand5');if pose=='fire' then D.flash(im,7,28,0) end
  end
  if pose=='death' then D.line(im,8,9,26,29,'outline',2);D.line(im,20,8,10,30,'red5',2) end
 end
 for _,spec in ipairs({{'hopper',48,48},{'piranha',40,28},{'gnat',32,28},{'airboat',96,56}}) do local A={}
 for _,pose in ipairs({'idle','cue','attack','tongue_cue','tongue','fire','death'}) do A[#A+1]=D.anim(spec[1]..'_'..pose,6,100,function(im,f,n) small(im,spec[1],pose,f,n) end) end
 D.build(spec[1],spec[2],spec[3],A) end
 D.build('turtle_egg',16,20,{D.anim('turtle_egg_blink',4,120,function(im,f) dome(im,8,11,6,8,'outline');dome(im,7,10,5,7,'sand4');D.line(im,4,8,10,8,'olive3',2);D.rect(im,6,4,4,3,f%2==0 and 'fire5' or 'red2') end)})
end
