-- Phase H: flesh-and-fur dog in a Regime harness.
-- Rebuilt from refs/hound concept and pixel/pose guides as native layered clusters. Art faces right; paws y39.
local D=dofile(app.params.root..'/art-src/enemies/lib/draw.lua');local K=D.K
local function oval(im,cx,cy,rx,ry,c)
 for y=-ry,ry do for x=-rx,rx do if x*x/(rx*rx)+y*y/(ry*ry)<=1 then K.px(im,cx+x,cy+y,c)end end end
end
local function bobFor(p,f)
 if p=='idle' then return ({0,0,-1,-1,0,1})[f] end
 if p=='crouch' then return ({1,2,3,3})[f] end
 if p=='land' then return math.max(0,4-f) end
 if p=='leap' then return ({-1,-2,-2,-1})[f] end
 if p=='hurt' then return ({1,1,0})[f] end
 return 0
end
local gait={
 {{-5,5,-8,10},{2,6,5,10},{-1,5,5,10},{3,4,9,8},0},
 {{-3,5,-6,10},{5,3,9,7},{2,5,8,10},{1,5,5,10},1},
 {{1,3,5,6},{6,1,10,3},{4,4,10,8},{-2,5,1,10},0},
 {{5,1,9,2},{1,1,5,3},{-1,3,3,6},{-4,3,-1,6},-2},
 {{5,2,8,5},{-3,1,-1,4},{-4,2,-2,5},{-4,1,-3,3},-3},
 {{1,4,3,8},{-5,3,-6,7},{-4,4,-3,8},{1,3,2,6},-2},
 {{-3,5,-4,10},{-4,5,-8,10},{-1,5,0,10},{5,4,8,8},0},
 {{-5,4,-7,8},{0,6,-3,11},{3,6,4,11},{5,3,10,6},1}}
local function leg(im,x,y,p,near)
 local c=near and 'dirt4' or 'dirt2';local hi=near and 'dirt5' or 'dirt3'
 D.limb(im,x,y,x+p[1],y+p[2],c,hi,2)
 local foot=math.min(38,y+p[4])
 D.limb(im,x+p[1],y+p[2],x+p[3],foot,c,hi,1)
 D.line(im,x+p[3]-1,foot,x+p[3]+3,foot,'outline',2)
 D.line(im,x+p[3],foot,x+p[3]+2,foot,'sand3')
end
local function dog(im,p,f,helmet)
 local run=p=='run';local crouch=p=='crouch';local land=p=='land';local leap=p=='leap';local death=p=='death'
 local g=gait[(f-1)%8+1];local bob=run and g[5] or bobFor(p,f)
 local cy=29+bob
 local legs=run and g or crouch and {{-3,3,0,6},{-4,3,-3,6},{1,3,4,6},{2,3,5,6}} or leap and {{-4,1,-9,1},{-4,2,-8,3},{5,1,10,0},{4,3,9,3}} or {{-2,5,-3,10},{1,4,3,9},{1,5,2,10},{1,4,4,9}}
 if leap then
  local e=({0,2,-1,-4})[f];legs={{-4,1,-9-e,1},{-4,2,-8-e,3},{5,1,10+e,0},{4,3,9+e,3}}
 end
 -- Far limbs are genuinely jointed and occluded by the torso.
 leg(im,16,cy,legs[1],false);leg(im,31,cy,legs[3],false)
 D.line(im,12,cy-1,6,cy-6-(f%3),'outline',3);D.line(im,12,cy-2,5,cy-7-(f%3),'dirt4',2);D.line(im,7,cy-4,4,cy-9-(f%3),'dirt3',2);K.px(im,4,cy-8-(f%3),'dirt5')
 oval(im,23,cy-2,crouch and 13 or 12,crouch and 5 or 6,'outline');oval(im,23,cy-3,12,5,'dirt3');oval(im,20,cy-5,9,3,'dirt4')
 oval(im,14,cy-1,5,5,'dirt3');D.line(im,10,cy-3,14,cy-7,'ink2',2);D.line(im,13,cy-5,19,cy-6,'dirt5');D.line(im,21,cy+2,29,cy+2,'dirt2')
 leg(im,15,cy,legs[2],true);leg(im,30,cy,legs[4],true)
 -- The reference's long red back plate, dark straps and steel buckles sit over fur.
 D.line(im,15,cy-6,25,cy-8,'red1',4);D.line(im,15,cy-7,25,cy-9,'red4',2);D.line(im,15,cy-8,23,cy-10,'red5')
 D.line(im,17,cy-7,18,cy+1,'steel1',2);D.line(im,17,cy-6,18,cy-3,'steel4');D.rivet(im,18,cy-2)
 -- Deep red shoulder plate and chest strap, flesh visible between armour.
 oval(im,27,cy-5,6,5,'red1');oval(im,26,cy-6,5,4,'red3');D.line(im,23,cy-8,28,cy-9,'red5');D.line(im,29,cy-7,30,cy,'red2',2)
 D.line(im,20,cy-7,20,cy+2,'red1',3);D.line(im,20,cy-7,20,cy+1,'red4');D.rivet(im,25,cy-5)
 oval(im,34,cy-8,6,6,'outline');oval(im,34,cy-9,5,5,'dirt4');D.rect(im,33,cy-7,10,5,'dirt3');D.line(im,35,cy-7,41,cy-7,'sand4');D.line(im,34,cy-6,40,cy-6,'dirt5');D.rect(im,41,cy-8,3,3,'steel1')
 if leap or crouch or death then
  D.line(im,35,cy-2,42,cy-2,'outline',3);D.line(im,36,cy-3,41,cy-3,'sand5');D.line(im,37,cy,41,cy,'dirt4');K.px(im,40,cy-1,'red4')
 else D.line(im,36,cy-3,42,cy-3,'outline');K.px(im,40,cy-2,'sand5')end
 if not helmet then
  D.line(im,30,cy-12,28,cy-15,'dirt2',2);D.line(im,35,cy-13,37,cy-15,'dirt2',2)
  K.px(im,36,cy-10,'sand5');K.px(im,37,cy-10,'outline')
  if death then D.line(im,34,cy-11,36,cy-9,'outline');D.line(im,36,cy-11,34,cy-9,'outline')end
 end
 return cy
end
local function hat(im,cy,f,dead)
 local dx=dead and (f-1)*-2 or 0;local dy=dead and -math.min(7,(f-1)*4)+math.max(0,f-5)*3 or 0
 local x,y=34+dx,cy-11+dy
 oval(im,x,y,6,4,'outline');oval(im,x,y-1,5,3,'steel3');D.line(im,x-4,y-3,x+1,y-3,'steel5');D.line(im,x-6,y+2,x+6,y+2,'steel1',2)
 D.line(im,x-4,y-3,x-6,y-9,'outline',2);D.line(im,x-4,y-4,x-6,y-9,'sand4');D.line(im,x-6,y-7,x-9,y-8,'sand4')
 D.line(im,x+2,y-4,x+5,y-10,'outline',2);D.line(im,x+2,y-4,x+5,y-10,'sand4');D.line(im,x+4,y-7,x+8,y-8,'sand5')
 D.rect(im,x+1,y+1,5,3,'outline');D.rect(im,x+2,y+1,3,2,'fire4');K.px(im,x+2,y+1,'fire6')
end
local anims={}
for _,p in ipairs({'idle','run','crouch','leap','land','hurt','death'})do
 local n=p=='run' and 8 or p=='death' and 8 or p=='hurt' and 3 or p=='idle' and 6 or 4;local frames={}
 for i=1,n do local f=i;local fr={}
  fr.dog=function(im)
   if p=='death' then
    local tmp=Image(48,40,ColorMode.RGB);dog(tmp,'death',f,false)
    local a=(f-1)*.65;local cs,sn=math.cos(a),math.sin(a);local dy=-math.min(5,(f-1)*3)-math.sin((f-1)/7*math.pi)*3
    for y=0,39 do for x=0,47 do local sx=math.floor(24+(x-24)*cs+(y-27-dy)*sn+.5);local sy=math.floor(27-(x-24)*sn+(y-27-dy)*cs+.5);if sx>=0 and sx<48 and sy>=0 and sy<40 then local c=tmp:getPixel(sx,sy);if app.pixelColor.rgbaA(c)>0 then im:drawPixel(x,y,c)end end end end
   else dog(im,p,f,true)end
  end
  fr.helmet=function(im)
   local g=gait[(f-1)%8+1];local bob=p=='run' and g[5] or bobFor(p,f)
   hat(im,29+bob,f,p=='death')
  end
  frames[#frames+1]=fr
 end
 -- Preserve the 650 ms combat leap; hold its landing approach for the final 10 ms.
 if p=='leap' then frames[#frames].ms=170 end
 anims[#anims+1]={tag='hound_'..p,ms=p=='run' and 70 or p=='death' and 100 or p=='hurt' and 60 or p=='idle' and 140 or p=='crouch' and 110 or p=='leap' and 160 or 100,frames=frames}
end
K.build{name='hound',w=48,h=40,src=D.root..'/art-src/enemies/hound.aseprite',sheet=D.root..'/public/assets/sprites/enemies/hound.png',data=D.root..'/public/assets/sprites/enemies/hound.json',layers={'dog','helmet'},anims=anims,anchor='bottom-center; paws y39'}
