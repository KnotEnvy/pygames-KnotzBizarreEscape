-- Phase H: hand-drawn Regime gunship. All geometry is native palette pixel art.
-- Reference: refs/buzzard/{concept,pixel,poses_pixel,parts_pixel}.png; rebuilt as clusters.
-- Separate editable layers retain the tail, hull, turret, exhaust and rotor rig.
local D=dofile(app.params.root..'/art-src/enemies/lib/draw.lua')
local K=D.K
local W,H=112,80
local function ellipse(im,cx,cy,rx,ry,c)
 for y=-ry,ry do for x=-rx,rx do if x*x/(rx*rx)+y*y/(ry*ry)<=1 then K.px(im,cx+x,cy+y,c) end end end
end
local function tail(im,f,dead)
 local dx=dead and math.min(7,f)*2 or 0;local dy=dead and math.min(15,f*3) or 0
 D.line(im,43-dx,39+dy,13-dx,30+dy,'outline',7)
 D.line(im,42-dx,39+dy,13-dx,30+dy,'steel2',5)
 D.line(im,39-dx,37+dy,13-dx,29+dy,'steel4',2)
 D.line(im,35-dx,37+dy,16-dx,31+dy,'steel3');D.line(im,34-dx,35+dy,34-dx,39+dy,'red4',2)
 D.line(im,14-dx,32+dy,12-dx,19+dy,'outline',5)
 D.line(im,14-dx,31+dy,12-dx,20+dy,'steel3',3)
 D.line(im,11-dx,20+dy,12-dx,25+dy,'red4',2)
 D.line(im,12-dx,32+dy,9-dx,40+dy,'steel2',3)
 D.eye(im,23-dx,32+dy,'sand4')
 -- Tail propeller cycles through eight angles, never a static cross.
 local a=(f-1)*math.pi/4;local x,y=13-dx,30+dy
 for i=0,1 do local t=a+i*math.pi;D.line(im,x,y,x+math.floor(math.cos(t)*8),y+math.floor(math.sin(t)*8),'outline',2);D.line(im,x,y,x+math.floor(math.cos(t)*7),y+math.floor(math.sin(t)*7),'steel5')end
 D.disc(im,x,y,2,'steel1');K.px(im,x,y-1,'sand5')
end
local function hull(im,f,damaged,dead)
 -- Engine cowling and stepped, rounded Hind/Huey fuselage.
 ellipse(im,57,33,18,9,'outline');ellipse(im,57,32,17,8,'steel2');ellipse(im,54,30,12,5,'steel4')
 D.line(im,45,26,65,26,'steel5');D.box(im,43,23,11,8,'red3','red5','red1')
 for x=45,51,3 do D.line(im,x,25,x,28,'steel1')end
 -- Twin soot-lined exhaust pipes are the reference's distinctive engine silhouette.
 for _,x in ipairs({39,48})do
  D.box(im,x,26,10,9,'steel2','steel5','steel1');ellipse(im,x+1,30,3,4,'outline');ellipse(im,x+1,30,2,3,'dirt2');D.line(im,x,28,x,31,'steel1')
 end
 ellipse(im,64,44,26,14,'outline');ellipse(im,64,43,25,13,'steel2');ellipse(im,61,40,23,11,'steel3')
 ellipse(im,58,36,18,6,'steel4');D.line(im,44,32,66,31,'steel5');D.line(im,63,30,71,31,'red4',3)
 D.rect(im,44,49,34,6,'steel2');D.line(im,45,49,76,49,'steel4');D.line(im,48,55,75,55,'steel1')
 -- Bulb canopy, thick windshield ribs and an actual tiny red-capped pilot.
 ellipse(im,83,40,17,13,'outline');ellipse(im,83,39,16,12,'red3');ellipse(im,84,38,14,10,'sky2')
 ellipse(im,81,35,11,6,'sky3');D.line(im,70,30,78,28,'red5');D.line(im,74,30,84,29,'sky5');D.line(im,88,31,94,35,'sky4')
 D.rect(im,80,36,6,8,'red2');D.rect(im,83,34,5,6,'skin3');D.rect(im,85,35,4,3,'skin5');K.px(im,87,35,'outline')
 D.rect(im,81,32,7,3,'red4');D.line(im,82,32,86,32,'red5');D.line(im,81,35,89,35,'red1')
 D.line(im,78,29,76,45,'steel5',2);D.line(im,88,30,94,43,'steel1',2)
 D.line(im,71,46,97,43,'steel1',2);D.line(im,73,47,95,45,'steel5')
 D.line(im,96,40,100,43,'red4',3);D.line(im,69,34,71,45,'red3',3);D.line(im,70,33,72,39,'red5');D.line(im,97,44,100,44,'red1')
 -- Side hatch, red shoulder wing and a six-port rocket pod.
 D.box(im,51,35,17,13,'steel3','steel5','steel1');D.line(im,54,37,63,37,'steel4');D.rect(im,61,40,3,1,'sand5')
 D.line(im,48,46,60,49,'outline',5);D.line(im,48,45,60,48,'red4',3)
 ellipse(im,57,51,9,5,'outline');ellipse(im,57,50,8,4,'steel3');D.line(im,51,47,59,47,'steel5')
 for _,p in ipairs({{52,49},{56,49},{60,49},{54,52},{58,52}})do D.rect(im,p[1],p[2],2,2,'steel1');K.px(im,p[1],p[2],'sand2')end
 for _,p in ipairs({{44,40},{48,51},{69,50},{67,34}})do D.rivet(im,p[1],p[2])end
 -- Tubular skids, separated from the belly by visible air.
 for _,x in ipairs({48,79})do D.line(im,x,55,x-3,62,'outline',3);D.line(im,x,55,x-3,61,'steel4')end
 D.line(im,39,64,88,64,'outline',3);D.line(im,39,63,88,63,'steel5');D.line(im,88,63,92,60,'steel4',2)
 if damaged or dead then
  ellipse(im,47,40,5,3,'steel1');D.line(im,44,38,48,38,'steel5');D.line(im,48,40,51,42,'outline')
  D.line(im,68,31,71,36,'outline',2);D.line(im,71,36,67,40,'steel1');D.line(im,72,35,74,36,'sand5')
  D.rect(im,40,31,5,5,'outline');D.rect(im,41,32,2,2,f%2==0 and 'fire4' or 'red2')
  if f%3==0 then D.line(im,43,34,38,39,'fire5');K.px(im,37,37,'white')end
 end
end
local function rotor(im,f,dead)
 D.box(im,58,17,5,12,'steel2','steel5','steel1');D.box(im,54,15,13,4,'steel3','steel5')
 local angles={0,.48,1.12,1.57,2.1,2.65,3.05,3.6};local a=angles[(f-1)%8+1]
 for i=0,1 do
  local s=i==0 and 1 or -1;local dx=math.floor(math.cos(a)*47)*s;local dy=math.floor(math.sin(a)*5)*s
  local y=16+dy+(dead and i==1 and 8 or 0)
  D.line(im,60,16,60+dx,y,'outline',3);D.line(im,60,15,60+dx,y-1,'steel4');D.line(im,60+dx-s*6,y-1,60+dx,y-1,'red4')
 end
 -- Sparse elliptical blur arcs leave the blade positions readable, binary alpha.
 if not dead then for i=0,3 do local t=a+i*1.57+.35;local x=60+math.floor(math.cos(t)*43);local y=16+math.floor(math.sin(t)*5);D.line(im,x,y,x+4,y,'steel3')end end
 D.box(im,57,13,7,5,'steel3','steel5','steel1')
end
local function turret(im,f,aim,fire)
 ellipse(im,84,53,7,5,'outline');ellipse(im,83,52,6,4,'steel3');D.line(im,80,50,85,50,'steel5')
 local swing=fire and 4 or aim and math.min(4,f) or 0;local ex,ey=98-swing*2,53+swing*3
 D.line(im,85,53,ex,ey,'outline',4);D.line(im,85,52,ex,ey-1,'steel4',2);D.line(im,86,54,ex,ey+1,'steel1')
 if fire and f<=2 then D.flash(im,ex+1,ey+2,f%2)end
end
local function transform(im,src,a,bob)
 -- Inverse sampling preserves clusters; this is a drawn art pose, never runtime rotation.
 local cs,sn=math.cos(a),math.sin(a)
 for y=0,H-1 do for x=0,W-1 do
  local sx=math.floor(56+(x-56)*cs+(y-40-bob)*sn+.5);local sy=math.floor(40-(x-56)*sn+(y-40-bob)*cs+.5)
  if sx>=0 and sy>=0 and sx<W and sy<H then local p=src:getPixel(sx,sy);if app.pixelColor.rgbaA(p)>0 then im:drawPixel(x,y,p)end end
 end end
end
local layers={'tail','hull','turret','exhaust','rotor'}
local anims={}
for _,p in ipairs({'cruise','aim','strafe','fire','damaged','damaged_aim','damaged_strafe','damaged_fire','hurt','death'})do
 local frames={};local dead=p=='death';local hurt=p=='hurt';local fire=p:find('fire')~=nil;local aim=p:find('aim')~=nil or fire or p:find('strafe')~=nil
 local damage=p:find('damaged')~=nil;local n=dead and 12 or hurt and 3 or fire and 3 or 8
 for i=1,n do local f=i;local angle=dead and (f-1)*.12 or (aim and .20 or hurt and -.06 or 0);local bob=dead and 0 or ({0,0,1,1,1,0,-1,-1})[(f-1)%8+1]
  local fr={}
  for _,layer in ipairs(layers)do local l=layer;fr[l]=function(im)
   local tmp=Image(W,H,ColorMode.RGB)
   if l=='tail' then tail(tmp,f,dead and f>=3)
   elseif l=='hull' then hull(tmp,f,damage,dead)
   elseif l=='turret' then turret(tmp,p:find('strafe') and 4 or f,aim,fire)
   elseif l=='rotor' then rotor(tmp,f,dead and f>=3)
   elseif l=='exhaust' then
    local t=(f-1)%4;D.disc(tmp,35-t*3,30-t,2+t//2,'ink2');D.line(tmp,32-t*3,29-t,35-t*3,29-t,'ink4')
    if dead then for j=0,2 do D.disc(tmp,43-j*8-f,32-j*4,3+j,'ink2');D.disc(tmp,42-j*8-f,30-j*4,2,'ink4')end end
   end
   transform(im,tmp,angle,bob)
  end end
  frames[#frames+1]=fr
 end
 anims[#anims+1]={tag='buzzard_'..p,ms=dead and 100 or fire and 60 or hurt and 60 or 70,frames=frames}
end
K.build{name='buzzard',w=W,h=H,src=D.root..'/art-src/enemies/buzzard.aseprite',sheet=D.root..'/public/assets/sprites/enemies/buzzard.png',data=D.root..'/public/assets/sprites/enemies/buzzard.json',layers=layers,anims=anims,anchor='center (56,40); right-facing'}
