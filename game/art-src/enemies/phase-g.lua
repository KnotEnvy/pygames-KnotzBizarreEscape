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
local function skeeter(im,pose,f,n,tier)
 local flap=({-7,0,7,0,-5,2})[(f-1)%6+1];local y=(f%3==0) and 1 or 0
 -- Opaque, palette-limited speed echoes alternate with the four rotor blades.
 for j=0,1 do for side=-1,1,2 do local xx=72+side*(42+j*12);local yy=22+j*13+flap*(j==0 and 1 or -1)
  if not(tier>=2 and j==1 and side==1) then
   local echo=f%2==0 and 4 or -3
   D.line(im,xx-side*19,yy+echo,xx+side*9,yy+echo-2,'steel2');D.line(im,xx-side*15,yy+echo+2,xx+side*6,yy+echo,'steel3')
   D.limb(im,69,31,xx,yy,'steel2','steel5',3);D.limb(im,xx,yy,xx+side*10,yy-3,'steel3','sky5',2)
   D.line(im,xx-side*18,yy-4,xx+side*10,yy-4,'steel4');D.line(im,xx-side*12,yy-3,xx-side*4,yy-3,'sky5');D.rivet(im,xx,yy-1)
  else D.line(im,75,32,97,39,'steel5',2);D.line(im,93,36,96,41,'steel2');D.rivet(im,92,36) end
 end end
 for j=0,2 do local xx=51+j*18;local knee=62+(f+j)%2*2
  piston(im,xx,48+y,xx-11,knee);piston(im,xx-11,knee,xx-5,76)
  D.line(im,xx+3,49+y,xx-7,knee,'outline');D.line(im,xx-7,knee,xx-1,72,'sand2');D.line(im,xx-10,knee+3,xx-7,knee+8,'steel4')
  D.box(im,xx-10,72,13,5,'steel1','steel4','outline');D.rivet(im,xx-7,73)
  if pose=='fan_cue' or pose=='fan' then D.rect(im,xx-7,76,8,2,pose=='fan' and 'white' or 'fire4') end
 end
 -- Curved glass tank, a moving meniscus, deep blood ramp and reflected strip lights.
 dome(im,96,43+y,28,22,'outline');dome(im,95,41+y,26,20,'steel1');dome(im,94,40+y,24,18,'red1')
 for yy=23,58 do for xx=71,119 do if (xx-94)^2/24^2+(yy-40)^2/18^2<=1 then
  local level=34+math.floor((xx-94)*({-.08,-.12,-.06,.05,.12,.06})[f])+y
  local c=yy+y<level and 'red1' or xx>110 and 'red2' or yy>51 and 'red2' or 'red3'
  if yy+y==level then c='red5' elseif yy+y==level+1 then c='red4' elseif xx<85 and yy+y>level+2 and yy<47 then c='red4' end
  K.px(im,xx,yy+y,c)
 end end end
 D.line(im,78,29+y,81,26+y,'steel4');D.line(im,78,30+y,76,37+y,'red5');D.line(im,76,38+y,76,43+y,'sand5');D.line(im,77,38+y,77,44+y,'red5')
 D.line(im,112,31+y,115,39+y,'red4');D.line(im,115,40+y,115,47+y,'red3');D.line(im,85,57+y,102,59+y,'red1')
 for j=0,2 do local xx=80+j*13;D.line(im,xx,24+y,xx+4,59+y,'steel1',3);D.line(im,xx+1,25+y,xx+5,57+y,'steel4');D.rivet(im,xx+1,28+y);D.rivet(im,xx+4,53+y) end
 D.box(im,99,36+y,15,12,'red1','sand4');D.eye(im,103,40+y)
 -- Thorax panel seams, vents, chipped edges and a rear pump coupling.
 dome(im,61,39+y,20,17,'outline');dome(im,59,37+y,18,15,'olive2');dome(im,56,33+y,15,11,'olive3');dome(im,53,29+y,10,6,'olive4')
 D.line(im,47,31+y,63,28+y,'olive5');D.line(im,63,28+y,70,34+y,'olive1');D.line(im,70,34+y,68,42+y,'olive1');D.line(im,68,42+y,49,43+y,'outline');D.line(im,49,41+y,64,41+y,'olive4')
 for j=0,3 do D.line(im,53+j*4,34+y,52+j*4,38+y,'olive1');K.px(im,54+j*4,34+y,'olive5') end
 D.rivet(im,48,32+y);D.rivet(im,65,31+y);D.line(im,59,28+y,62,28+y,'sand3')
 D.box(im,49,44+y,26,9,'steel2','steel5','steel1');for j=0,4 do D.line(im,53+j*4,47+y,53+j*4,50+y,'outline') end
 D.box(im,73,42+y,7,12,'steel1','steel3','outline');D.line(im,76,44+y,76,50+y,'fire4');D.rivet(im,73,44+y)
 dome(im,37,39+y,15,13,'outline');dome(im,35,37+y,13,11,'red1');dome(im,33,34+y,10,7,'red2')
 for j=0,2 do for k=0,1 do D.disc(im,28+j*6,32+k*7+y,2,(pose=='laser' or pose=='fan_cue') and 'fire5' or 'red5');K.px(im,27+j*6,31+k*7+y,'sand5') end end
 D.rivet(im,42,43+y);D.line(im,24,42+y,30,46+y,'steel2')
 -- Drill collar and helical ridges; incandescent tip only during the laser telegraph.
 D.limb(im,29,45+y,8,69,'steel2','steel5',3);D.disc(im,28,47+y,4,'steel1');D.line(im,25,45+y,29,48+y,'sand4')
 for j=0,4 do D.line(im,11+j*4,65-j*4,15+j*4,66-j*4,'steel1',2);D.line(im,11+j*4,65-j*4,15+j*4,66-j*4,'sand4') end
 D.line(im,8,69,5,77,'steel5',2)
 if pose=='laser' then D.disc(im,7,72,4,'red2');D.disc(im,7,73,3,f%2==0 and 'fire3' or 'red4');D.line(im,8,70,5,77,'fire5',2);D.line(im,7,73,5,77,'fire6');K.px(im,3,72,'red5');K.px(im,11,76,'fire4') end
 D.limb(im,32,28,25,19,'steel1','steel4',1);D.disc(im,24,18,2,'fire4');K.px(im,23,17,'fire6')
 if pose=='larva' then for j=0,2 do D.disc(im,78+j*12,64+j%2*4,4,'sand4');D.line(im,76+j*12,64,80+j*12,64,'red3') end end
 if tier>=1 then D.line(im,97,24,91,39,'outline',2);D.line(im,91,39,103,48,'sand1',2);D.line(im,103,48,95,60,'outline',2);D.line(im,98,25,93,37,'steel5');D.line(im,104,49,98,58,'red5') end
 if tier>=2 then
  D.box(im,88,34,18,20,'red1','steel5','steel1');D.box(im,90,36,14,16,'red3','fire4','red2')
  for j=0,2 do D.rect(im,92+j*4,38,2,12,(j+f)%2==0 and 'fire5' or 'red4') end
  for _,p in ipairs({{87,33},{104,34},{88,54},{105,53}}) do D.rivet(im,p[1],p[2]) end
  D.line(im,107,52,110,57,'red4');D.line(im,110,57,109,62,'red2')
 end
 if pose=='stuck' then D.line(im,0,79,18,79,'sand4');D.line(im,1,76,4,72,'fire5');D.line(im,14,75,19,72,'fire4') end
end
local silhouette=app.params.silhouette=='1'
for _,spec in ipairs({{'shellshock',112,80,shell},{'shellshock_head',48,32,head},{'skeeter',144,88,skeeter}}) do
 local A={};local poses=silhouette and {'idle'} or spec[1]=='shellshock_head' and {'idle','hiss','cue_high','cue_low','snap','death'} or spec[1]=='shellshock' and {'idle','intro','eggs','spin_cue','spin','death'} or {'idle','intro','laser','dive','stuck','larva','fan_cue','fan','death'}
 for tier=0,(silhouette and 0 or 2) do for _,pose in ipairs(poses) do A[#A+1]=D.anim(spec[1]..'_'..pose..(tier==0 and '' or tier==1 and '_damaged' or '_critical'),6,pose=='intro' and 180 or 100,function(im,f,n) spec[4](im,pose,f,n,tier) end) end end
 D.build(spec[1],spec[2],spec[3],A)
end
if not silhouette and app.params.only~='bosses' then
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
