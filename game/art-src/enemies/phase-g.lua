-- Enemies B: original bayou mechs. No GATORGEDDON assets are built here.
local D=dofile(app.params.root..'/art-src/enemies/lib/soldier.lua');local K=D.K
local function dome(im,cx,cy,rx,ry,c)
 for y=-ry,ry do for x=-rx,rx do if x*x/(rx*rx)+y*y/(ry*ry)<=1 then K.px(im,cx+x,cy+y,c) end end end
end
-- Convex plate fill and directed bevels: every opaque pixel uses the master palette.
local function plate(im,points,base,hi,lo)
 local ymin,ymax=999,-999
 for _,p in ipairs(points) do ymin=math.min(ymin,p[2]);ymax=math.max(ymax,p[2]) end
 for y=ymin,ymax do local xs={}
  for i,p in ipairs(points) do local q=points[i%#points+1]
   if p[2]~=q[2] and y>=math.min(p[2],q[2]) and y<math.max(p[2],q[2]) then xs[#xs+1]=p[1]+(y-p[2])*(q[1]-p[1])/(q[2]-p[2]) end
  end
  table.sort(xs);if #xs>=2 then D.line(im,math.ceil(xs[1]),y,math.floor(xs[#xs]),y,base) end
 end
 for i,p in ipairs(points) do local q=points[i%#points+1];D.line(im,p[1],p[2],q[1],q[2],'olive1',2)
  D.line(im,p[1],p[2]-1,q[1],q[2]-1,i<=2 and hi or lo)
 end
end
local function piston(im,x,y,xx,yy)
 D.limb(im,x,y,xx,yy,'steel1','steel3',3)
 D.line(im,x,y,xx,yy,'steel5',2);D.line(im,x+2,y+1,xx+2,yy+1,'sand2')
 D.disc(im,x,y,3,'steel1');D.disc(im,x-1,y-1,1,'sand4')
 D.disc(im,xx,yy,2,'steel2');D.rivet(im,xx-1,yy-1)
end
local function shell(im,pose,f,n,tier)
 local bob=(f%4==2 or f%4==3) and 1 or 0;local y=pose=='intro' and math.floor((1-f/n)*48) or bob
 local spin=pose=='spin' or pose=='spin_cue';local dead=pose=='death'
 -- Rear hydraulics stay behind the hull even in the flipped death animation.
 if not spin then for j=0,3 do local x=19+j*22;local sy=dead and 20+(f+j)%3*5 or 65+y
  piston(im,x,52+y,x-4,sy);D.line(im,x+5,53+y,x+6,sy-1,'outline',2);D.line(im,x+6,sy-1,x-2,sy+2,'sand2')
  D.box(im,x-10,sy-2,16,7,'olive2','olive4','outline');D.rivet(im,x-7,sy)
  for k=0,2 do D.line(im,x-9+k*4,sy+4,x-11+k*4,sy+7,'sand4') end
 end end
 dome(im,56,47+y,49,28,'outline');dome(im,55,45+y,47,26,'olive1')
 -- Dark curved undercarriage, segmented rim and a narrow reflected steel edge.
 dome(im,55,51+y,45,20,'steel1');dome(im,54,49+y,43,17,'olive1')
 D.line(im,22,64+y,86,64+y,'steel2',3);D.line(im,28,68+y,81,68+y,'outline',2)
 for j=0,7 do local x=22+j*9;D.line(im,x,61+y,x-2,66+y,'steel3');D.rivet(im,x,62+y) end
 dome(im,54,40+y,46,25,'olive2');dome(im,49,36+y,40,21,'olive3')
 -- Interlocking armour scutes follow the dome instead of straight decorative stripes.
 local rows={
  {{17,32},{28,23},{43,24},{47,36},{34,44},{20,41}},
  {{44,24},{55,18},{69,22},{72,34},{61,42},{48,36}},
  {{71,24},{82,28},{94,39},{91,47},{76,44},{64,41}},
  {{12,42},{20,43},{34,46},{35,56},{21,58},{12,53}},
  {{36,46},{47,38},{60,44},{62,56},{49,62},{37,56}},
  {{63,45},{76,47},{91,50},{96,55},{82,61},{64,57}}
 }
 for j,points in ipairs(rows) do local moved={};for _,p in ipairs(points) do moved[#moved+1]={p[1],p[2]+y} end
  plate(im,moved,j<3 and 'olive4' or j==3 and 'olive3' or 'olive3',j<3 and 'olive5' or 'olive4','olive2')
  local x,yy=points[1][1]+5,points[1][2]+3+y
  D.rivet(im,x,yy);D.line(im,x+1,yy+2,x+2,yy+6,'dirt3');K.px(im,x+2,yy+4,'dirt4')
  D.line(im,points[3][1]-5,points[3][2]+2+y,points[3][1]-2,points[3][2]+3+y,'steel1');K.px(im,points[3][1]-3,points[3][2]+2+y,'sand3')
 end
 -- A few chipped edges, long rusty leaks and a bolted engine hatch.
 for _,p in ipairs({{25,29},{53,26},{78,34},{42,52},{87,54}}) do
  D.line(im,p[1],p[2]+y,p[1]+3,p[2]+1+y,'dirt2');D.line(im,p[1]+1,p[2]+1+y,p[1]+4,p[2]+1+y,'sand3')
  K.px(im,p[1]+1,p[2]+2+y,'steel4')
 end
 for j=0,4 do local x=22+j*17;D.limb(im,x,25+y,x-3,14+(j%2)*3+y,'steel2','steel5',3);D.line(im,x-2,20+y,x+1,21+y,'dirt3') end
 D.box(im,43,16+y,28,11,'steel2','steel5','steel1');for j=0,3 do D.line(im,48+j*5,20+y,48+j*5,24+y,'outline') end
 D.rivet(im,45,18+y);D.rivet(im,67,18+y);D.box(im,48,13+y,17,5,'red2','red4','outline')
 if pose=='eggs' then D.box(im,47,7+y,20,10,'olive3','olive5','outline');D.disc(im,56,13+y,4,'fire4');D.rivet(im,49,10+y) end
 -- Regime spiral-eye paint stencil on a riveted identification plate.
 D.box(im,70,35+y,19,13,'red2','red4','red1');D.rivet(im,72,37+y);D.rivet(im,85,44+y)
 D.line(im,74,40+y,81,38+y,'sand4');D.line(im,81,38+y,85,41+y,'sand4');D.line(im,85,41+y,79,44+y,'sand4');D.line(im,79,44+y,74,40+y,'sand4')
 D.line(im,78,40+y,81,40+y,'sand5');D.line(im,81,40+y,81,42+y,'sand5');K.px(im,79,42+y,'sand5')
 -- Moss clumps sit on the rim; weed strands and falling droplets have a six-frame cycle.
 for j=0,6 do local x=14+j*13;local yy=54+math.floor(math.abs(x-55)/14)+y
  D.line(im,x-3,yy,x+4,yy,'leaf1',3);D.line(im,x-2,yy,x+2,yy-1,'leaf3');K.px(im,x,yy-2,'leaf4')
  local sway=({0,1,1,0,-1,-1})[(f+j)%6+1]
  D.line(im,x,yy+2,x+sway,yy+7+j%3,'leaf2',2);D.line(im,x+3,yy+2,x+2+sway,yy+5,'leaf4')
  if j%2==0 then local dy=(f*2+j)%9;D.line(im,x+sway,yy+9+dy,x+sway,yy+10+dy,'sky3');K.px(im,x+sway,yy+9+dy,'sky5') end
 end
 if tier>=1 then D.line(im,30,29+y,44,39+y,'outline',2);D.line(im,44,39+y,37,46+y,'sand1');D.line(im,80,25+y,74,35+y,'steel1',2);D.line(im,31,30+y,39,36+y,'steel4') end
 if tier>=2 then
  dome(im,50,45+y,22,15,'steel1');dome(im,49,44+y,18,12,'steel3');dome(im,49,45+y,16,10,'weird1')
  for j=0,4 do D.line(im,33+j*8,35+y,35+j*8,38+y,'steel5');D.rivet(im,34+j*7,53+y) end
  D.box(im,37,37+y,25,15,'fire2','fire5','red1');for j=0,4 do D.rect(im,39+j*5,39+y,2,11,(f+j)%3==0 and 'fire6' or 'fire4') end
  D.line(im,35,54+y,63,54+y,'steel4');D.line(im,30,28+y,38,33+y,'steel5',2);D.line(im,66,30+y,72,38+y,'steel5',2)
 end
 if spin then for j=0,2 do D.line(im,5+j*8,66-j*5,25+j*8,66-j*5,'steel4') end;D.box(im,6,53+y,11,10,'steel2','steel4','steel1');D.rivet(im,8,56+y) end
 if not spin and not dead then for _,x in ipairs({27,80}) do
  piston(im,x,62+y,x-5,73);D.line(im,x+5,61+y,x+6,70,'outline',2);D.line(im,x+6,70,x-2,74,'sand2')
  D.box(im,x-12,72,18,6,'olive2','olive4','outline');D.rivet(im,x-9,74);D.rivet(im,x+1,74)
  for j=0,2 do D.line(im,x-12+j*5,77,x-14+j*5,79,'sand4') end
 end end
 if dead then D.box(im,31,55,49,12,'steel1','steel4','outline');for j=0,3 do D.rivet(im,36+j*12,58);D.line(im,36+j*12,61,40+j*12,61,'steel3') end end
 if pose=='spin' then local src=Image(im);im:clear();for yy=0,31 do for xx=0,111 do im:drawPixel(xx,48+yy,src:getPixel(xx,math.min(79,math.floor(yy/31*79)))) end end end
end
local function head(im,pose,f,n,tier)
 local open=pose=='snap' or pose=='hiss' or pose=='death';local y=(f%3==0) and 1 or 0
 D.box(im,25,12+y,22,10,'steel1','steel4','outline')
 D.line(im,26,14+y,44,14+y,'steel5',2);D.line(im,27,20+y,45,20+y,'sand2')
 for j=0,3 do D.box(im,28+j*4,12+y,3,10,'steel2','steel4','steel1') end
 D.line(im,25,22+y,34,25+y,'outline',2);D.line(im,34,25+y,45,23+y,'sand2');D.rivet(im,43,14+y)
 dome(im,17,16+y,15,10,'outline');dome(im,16,15+y,13,8,tier>=1 and 'olive2' or 'olive3')
 D.line(im,6,10+y,21,8+y,'olive5',2);D.line(im,21,9+y,28,14+y,'olive4');D.line(im,20,18+y,28,17+y,'olive1',2)
 D.rivet(im,21,11+y);D.rivet(im,25,18+y);D.line(im,18,10+y,20,11+y,'dirt4')
 D.box(im,5,11+y,11,6,'steel1','sand3','outline');D.rect(im,7,12+y,7,3,'fire3');D.line(im,8,12+y,13,12+y,'fire5');D.rect(im,8,13+y,3,1,(pose=='cue_high' or pose=='cue_low') and 'white' or 'fire6')
 -- Beak plates, jaw hinge, a lower jaw piston and serrated teeth.
 D.line(im,3,17+y,2,23+y,'steel4',3);D.line(im,3,18+y,3,21+y,'steel5');D.line(im,2,23+y,7,21+y,'sand5',2)
 D.box(im,7,21+y,17,open and 8 or 4,'steel2','steel4','steel1');D.disc(im,23,22+y,3,'steel1');D.rivet(im,22,21+y)
 D.line(im,9,23+y,18,23+y,'steel3');D.line(im,11,24+y,14,24+y,'dirt3')
 if open then D.line(im,9,24+y,20,24+y,'red2',2);D.rect(im,12,21+y,2,3,'sand5');D.rect(im,18,21+y,2,3,'sand5');D.line(im,24,20+y,22,26+y,'steel5');D.rivet(im,21,26+y) end
 if tier>=1 then D.line(im,18,8+y,16,10+y,'steel1');K.px(im,17,9+y,'sand3') end
 if pose=='death' then for j=0,4 do D.line(im,24+j*4,15+(j%2)*4,28+j*4,19-(j%2)*4,'steel5') end end
end
-- H2 mosquito rig: source-authored panes, taper, dangling limbs and breakup.
local skeeter=dofile(app.params.root..'/art-src/enemies/lib/phase-h-skeeter.lua')
-- Rebuild this roster through build-art.sh without rewriting the unchanged bosses.
-- KBE_ART_ONLY=roster bash tools/build-art.sh art-src/enemies/phase-g.lua
local only=app.params.only or os.getenv('KBE_ART_ONLY')
local silhouette=app.params.silhouette=='1'
if only~='roster' then
for _,spec in ipairs({{'shellshock',112,80,shell},{'shellshock_head',48,32,head},{'skeeter',144,88,skeeter}}) do
 if not only or only=='bosses' or only==spec[1] then
 local A={};local poses=silhouette and {'idle'} or spec[1]=='shellshock_head' and {'idle','hiss','cue_high','cue_low','snap','death'} or spec[1]=='shellshock' and {'idle','intro','eggs','spin_cue','spin','death'} or {'idle','intro','laser','dive','stuck','larva','fan_cue','fan','death'}
 local layers=spec[1]=='skeeter' and {'wings','far_legs','body','near_legs','effects'} or {'main'}
 for tier=0,(silhouette and 0 or 2) do for _,pose in ipairs(poses) do
  local count=spec[1]=='skeeter' and pose=='death' and 10 or 6
  local frames={}
  for i=1,count do local f=i;local fr={}
   for _,name in ipairs(layers) do local layer=name
    fr[layer]=function(im) spec[4](im,pose,f,count,tier,spec[1]=='skeeter' and layer or nil) end
   end
   frames[#frames+1]=fr
  end
  A[#A+1]={tag=spec[1]..'_'..pose..(tier==0 and '' or tier==1 and '_damaged' or '_critical'),ms=pose=='intro' and 180 or 100,frames=frames}
 end end
 K.build{name=spec[1],w=spec[2],h=spec[3],layers=layers,src=D.root..'/art-src/enemies/'..spec[1]..'.aseprite',sheet=D.root..'/public/assets/sprites/enemies/'..spec[1]..'.png',data=D.root..'/public/assets/sprites/enemies/'..spec[1]..'.json',anims=A}

 end
end
end
if not silhouette and (not only or only=='roster' or only=='hopper') then
 dofile(app.params.root..'/art-src/enemies/lib/phase-h-roster.lua')
 if only~='hopper' then D.build('turtle_egg',16,20,{D.anim('turtle_egg_blink',4,120,function(im,f) dome(im,8,11,6,8,'outline');dome(im,7,10,5,7,'sand4');D.line(im,4,8,10,8,'olive3',2);D.rect(im,6,4,4,3,f%2==0 and 'fire5' or 'red2') end)}) end
end
