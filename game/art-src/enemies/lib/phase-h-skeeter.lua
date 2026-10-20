-- H2 MEGA-SKEETER: hand-authored mosquito rig from refs/skeeter/{pixel,poses,parts}.
-- Canvas/pivot remain 144x88 / (72,44); needle tip (5,77), tank (73..121,20..60).
local D=dofile(app.params.root..'/art-src/enemies/lib/soldier.lua');local K=D.K
local function oval(im,x,y,rx,ry,c)
 for yy=-ry,ry do for xx=-rx,rx do if xx*xx/(rx*rx)+yy*yy/(ry*ry)<=1 then K.px(im,x+xx,y+yy,c) end end end
end
local function poly(im,pts,c)
 local lo,hi=999,-999;for _,p in ipairs(pts) do lo=math.min(lo,p[2]);hi=math.max(hi,p[2]) end
 for y=lo,hi do local xs={};for i,p in ipairs(pts) do local q=pts[i%#pts+1];if p[2]~=q[2] and y>=math.min(p[2],q[2]) and y<math.max(p[2],q[2]) then xs[#xs+1]=p[1]+(y-p[2])*(q[1]-p[1])/(q[2]-p[2]) end end;table.sort(xs);if #xs>=2 then D.line(im,math.ceil(xs[1]),y,math.floor(xs[#xs]),y,c) end end
end
local function wing(im,rootx,rooty,tipx,tipy,wide,torn)
 local dx,dy=tipx-rootx,tipy-rooty;local midx,midy=rootx+dx*.65,rooty+dy*.65
 local pts={{rootx,rooty},{midx-5,midy-wide},{tipx-4,tipy-3},{tipx+2,tipy},{tipx,tipy+4},{midx+3,midy+wide},{rootx,rooty+2}}
 poly(im,pts,'steel1')
 -- Separate pale glass cells with a one-pixel steel rim, veins, and clear air around them.
 poly(im,{{rootx+3,rooty},{midx-4,midy-wide+2},{tipx-4,tipy-1},{tipx,tipy+1},{midx+2,midy+wide-2}},'sky5')
 for i=1,#pts do local p,q=pts[i],pts[i%#pts+1];D.line(im,p[1],p[2],q[1],q[2],i<=3 and 'steel5' or 'steel3') end
 D.line(im,rootx,rooty,tipx-3,tipy,'steel3')
 for _,t in ipairs({.35,.62,.80}) do local x,y=rootx+dx*t,rooty+dy*t;D.line(im,x,y,x-2,y-wide*(1-t)*1.3,'steel3');D.line(im,x,y,x+4,y+wide*(1-t),'steel4') end
 D.line(im,midx-3,midy-wide+2,tipx-5,tipy-1,'white')
 if torn then
  -- The missing trailing pane is transparent in every critical pose, not a dark painted patch.
  poly(im,{{midx-1,midy+1},{tipx-6,tipy+1},{tipx+3,tipy+7},{midx+2,midy+wide+3}},nil)
  D.line(im,midx-1,midy+1,midx+1,midy+4,'steel5');D.line(im,midx+1,midy+4,midx+4,midy+2,'steel2')
 end
end
-- K.px resolves palette names; transparent tears use the raw RGBA zero fill instead.
local clearPoly=poly
poly=function(im,pts,c)
 if c then return clearPoly(im,pts,c) end
 local tmp=Image(im.width,im.height,ColorMode.RGB);clearPoly(tmp,pts,'white')
 for y=0,im.height-1 do for x=0,im.width-1 do if app.pixelColor.rgbaA(tmp:getPixel(x,y))>0 then im:drawPixel(x,y,0) end end end
end
return function(im,p,f,n,tier,layer)
 local dead=p=='death';local t=dead and (f-1)/(n-1) or 0
 local bob=({0,0,1,1,0,-1})[(f-1)%6+1];local y=bob
 local flap=({0,1,2,3,1,2})[(f-1)%6+1]
 local lift=({-1,-7,2,8})[flap+1]
 local cue=p=='laser';local drill=p=='dive' or p=='stuck'
 if p=='intro' then y=y+({-3,-2,-1,0,1,0})[f] end
 if p=='stuck' then y=f%2 end
 if not layer or layer=='wings' then
 -- Far pair, then near pair: four separate leaves, each with steel ribs and pale cells.
 -- Native envelope clears screen y62 at the existing minimum vertical clamp.
 for j=0,1 do wing(im,64+j*5,33+j*4+y,115-j*21,20+j*12-lift//2,4,false) end
 for j=0,1 do
  local rx,ry=65+j*5,32+j*4+y
  wing(im,rx,ry,125-j*18,14+j*10+lift,6-j,tier>=2 and j==1)
 end
 end
 if not layer or layer=='far_legs' then
 -- Far legs: three knees and pointed tarsi, no heavy box feet.
 for j=0,2 do
  local twitch=({0,1,2,0,-1,-2})[(f+j-1)%6+1];local hip=54+j*8
  local knee=37+j*23+twitch;local ankle=22+j*37+twitch
  if drill then knee=knee+5;ankle=ankle+8 end
  D.line(im,hip,44+y,knee,59+j%2*3,'outline',3);D.line(im,hip,44+y,knee,59+j%2*3,'steel3')
  D.line(im,knee,60+j%2*3,ankle,76-j%2*2,'steel1',2);D.line(im,knee,60+j%2*3,ankle,76-j%2*2,'steel4')
  D.line(im,ankle,76-j%2*2,ankle-4,81-j%2*2,'steel3');D.rivet(im,knee,59+j%2*3)
 end
 end
 if not layer or layer=='body' then
 -- Long tapered abdomen, pinched waist and segmented red shell: roughly the old body width.
 poly(im,{{73,32+y},{88,21+y},{105,25+y},{122,33+y},{137,39+y},{124,45+y},{104,57+y},{85,59+y},{73,47+y}},'outline')
 poly(im,{{75,34+y},{88,23+y},{104,27+y},{120,34+y},{133,39+y},{121,43+y},{103,55+y},{85,56+y},{75,45+y}},'red2')
 poly(im,{{78,34+y},{89,24+y},{103,28+y},{121,36+y},{128,39+y},{102,43+y},{84,43+y}},'red3')
 D.line(im,88,24+y,103,28+y,'red5');D.line(im,105,31+y,119,35+y,'red4');D.line(im,125,38+y,132,39+y,'steel4')
 -- The abdomen tank stays centred on the original +1..49 weak box; glowing panes pulse.
 poly(im,{{80,31+y},{89,25+y},{103,28+y},{112,34+y},{112,47+y},{102,54+y},{86,54+y},{80,47+y}},'steel1')
 local pulse=(f%3==0);poly(im,{{83,32+y},{90,27+y},{102,30+y},{109,35+y},{109,46+y},{101,51+y},{87,51+y},{83,46+y}},pulse and 'fire3' or 'red4')
 poly(im,{{85,33+y},{91,28+y},{101,31+y},{106,35+y},{101,39+y},{86,39+y}},pulse and 'fire5' or 'fire4')
 D.line(im,85,40+y,107,40+y,pulse and 'fire6' or 'fire5');D.line(im,85,34+y,90,32+y,'sand5');K.px(im,85,35+y,'white')
 for j=0,3 do local x=78+j*12;local yy=j==0 and 32 or j==3 and 33 or 25;local bottom=(j==1 or j==2) and 55 or 48
  D.line(im,x,yy+y,x+1,bottom+y,'steel1',3);D.line(im,x,yy+y,x+1,bottom-1+y,'steel4');D.rivet(im,x,yy+2+y)
 end
 -- Slender neck and thorax; two red armour segments expose the steel motor.
 D.limb(im,50,40+y,76,40+y,'steel2','steel4',5)
 oval(im,63,37+y,13,10,'outline');oval(im,62,36+y,11,8,'red2');oval(im,60,33+y,8,4,'red4');D.line(im,56,31+y,63,30+y,'red5')
 D.line(im,65,30+y,69,35+y,'steel4',2);D.line(im,69,35+y,68,43+y,'steel2',2);D.rivet(im,58,33+y)
 D.box(im,57,40+y,15,7,'steel2','steel4','steel1');for j=0,2 do D.line(im,60+j*4,43+y,60+j*4,45+y,'outline') end
 D.box(im,65,32+y,7,6,'red2','red4','red1');D.eye(im,65,33+y,'sand4')
 -- Compound eyes are red faceted domes with two antennae, distinctly separate from the thorax.
 oval(im,42,39+y,12,10,'outline');oval(im,40,37+y,10,8,'steel2');oval(im,38,36+y,8,7,'red2');oval(im,36,34+y,5,4,'red4')
 for j=0,2 do for k=0,1 do D.disc(im,33+j*4,33+k*5+y,1,cue and 'fire5' or 'red5') end end
 D.line(im,33,31+y,36,30+y,'sand5');K.px(im,33,32+y,'white');D.rivet(im,47,41+y)
 D.line(im,41,29+y,37,21+y,'steel3');D.line(im,46,30+y,47,23+y,'steel4');K.px(im,37,20+y,'red5')
 -- Collar + long helical needle; the tip remains at the actual dive/laser socket.
 D.limb(im,34,43+y,13,65,'steel2','steel5',2);D.disc(im,32,46+y,3,'steel1');D.rivet(im,31,44+y)
 for j=0,4 do D.line(im,14+j*4,63-j*4,17+j*4,64-j*4,'red2');K.px(im,15+j*4,63-j*4,'sand4') end
 D.line(im,13,65,5,77,'outline',2);D.line(im,12,65,5,77,(cue or drill) and 'fire5' or 'steel5')
 if cue then D.line(im,6,72,9,72,'red4');K.px(im,4,74,'fire6') end
 end
 if not layer or layer=='near_legs' then
 -- Near legs twitch independently; six readable knees, slender pistons and hooked toes.
 for j=0,2 do
  local twitch=({0,-1,-2,0,1,2})[(f+j-1)%6+1];local hx,hy=53+j*7,45+y
  local kx,ky=41+j*18+twitch,59+j%2*2;local ax,ay=31+j*29+twitch,78-j%2*2
  if drill then kx=kx+4;ax=ax+5 end
  D.line(im,hx,hy,kx,ky,'outline',3);D.line(im,hx,hy,kx,ky,'steel4');D.line(im,hx+1,hy+1,kx+1,ky,'steel2')
  D.disc(im,kx,ky,2,'steel1');K.px(im,kx-1,ky-1,'steel5');K.px(im,kx,ky,'red4')
  D.line(im,kx,ky+3,ax,ay,'steel1',2);D.line(im,kx,ky+3,ax,ay,'steel4');D.line(im,ax,ay,ax-5,84,'steel3')
  D.line(im,kx-1,ky+4,kx+(ax-kx)*.45,ky+7,'red3',2)
 end
 end
 if not layer or layer=='effects' then
 -- Stinger magazine sits on the existing fan muzzle at (0,+25) world space.
 if p=='fan_cue' or p=='fan' then
  D.box(im,66,54,12,9,'steel2','steel5','steel1')
  for j=0,2 do D.line(im,68+j*4,60,68+j*4,69,p=='fan' and 'fire5' or 'red4') end
  if p=='fan' then D.flash(im,72,69,f%2) end
 end
 if p=='larva' then D.box(im,76,49+y,10,7,'steel1','steel4','outline');for j=0,2 do oval(im,77+j*8,59+j%2*3+f%2,3,4,'sand4');D.line(im,75+j*8,59+j%2*3,79+j*8,59+j%2*3,'red3') end end
 if tier>=1 then D.line(im,100,30+y,95,37+y,'outline');D.line(im,95,37+y,101,43+y,'steel5');D.line(im,101,43+y,97,49+y,'red1');D.line(im,56,32+y,59,37+y,'steel1') end
 if tier>=2 then
  D.line(im,94,32+y,99,36+y,'steel5',2);D.line(im,99,36+y,95,39+y,'outline',2);D.line(im,95,39+y,99,47+y,'fire5')
  D.line(im,112,45+y,114,53+y,'red4');K.px(im,114,54+y,'fire4')
 end
 if p=='stuck' then D.line(im,0,79,18,79,'sand4');D.line(im,1,76,4,72,'fire5');D.line(im,14,75,19,72,'fire4') end
 end
 if dead then
  -- Mechanically separate into wing, eye and tank-shell fragments; runtime owns the river spin.
  local src=Image(im);im:clear()
  for yy=0,87 do for xx=0,143 do local pixel=src:getPixel(xx,yy)
   if app.pixelColor.rgbaA(pixel)>0 then
    local dx,dy=0,0
    if yy<28 then dx=math.floor(t*9);dy=-math.floor(t*9)
    elseif xx<49 and yy<50 then dx=-math.floor(t*10);dy=-math.floor(math.sin(t*math.pi)*8)
    elseif xx>112 then dx=math.floor(t*8);dy=math.floor(t*4)
    elseif yy>58 then dx=math.floor((xx-65)*t*.12);dy=math.floor(t*3) end
    local nx,ny=xx+dx,yy+dy;if nx>0 and nx<143 and ny>0 and ny<87 then im:drawPixel(nx,ny,pixel) end
   end
  end end
  if not layer or layer=='effects' then
  for j=0,2 do local x=74+j*13;local yy=34-math.floor(math.sin(t*math.pi)*15)+j*5
   D.box(im,x+math.floor((j-1)*t*18),yy,6,4,'red2','red5','steel1')
  end
  if f<8 then for j=0,3 do local x=70+math.floor(math.cos(j*1.6+f)*f*2);local yy=40+math.floor(math.sin(j*1.6+f)*f*2);D.line(im,x,yy,x+3,yy-2,j%2==0 and 'fire5' or 'fire3') end end
  end
 end
end
