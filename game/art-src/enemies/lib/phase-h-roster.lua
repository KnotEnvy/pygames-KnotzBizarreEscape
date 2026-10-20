-- Phase H: independently posed bayou machines. Design guides: art-src/refs/<kind>/.
-- Source pixels are authored here, never sampled from generated references.
local D=dofile(app.params.root..'/art-src/enemies/lib/soldier.lua');local K=D.K
local function oval(im,x,y,rx,ry,c)
 for yy=-ry,ry do for xx=-rx,rx do if xx*xx/(rx*rx)+yy*yy/(ry*ry)<=1 then K.px(im,x+xx,y+yy,c) end end end
end
local function poly(im,pts,c)
 local lo,hi=999,-999;for _,p in ipairs(pts) do lo=math.min(lo,p[2]);hi=math.max(hi,p[2]) end
 for y=lo,hi do local xs={};for i,p in ipairs(pts) do local q=pts[i%#pts+1];if p[2]~=q[2] and y>=math.min(p[2],q[2]) and y<math.max(p[2],q[2]) then xs[#xs+1]=p[1]+(y-p[2])*(q[1]-p[1])/(q[2]-p[2]) end end;table.sort(xs);if #xs>=2 then D.line(im,math.ceil(xs[1]),y,math.floor(xs[#xs]),y,c) end end
end
local function spring(im,x,y,xx,yy)
 local px,py=x,y;for i=1,7 do local nx=math.floor(x+(xx-x)*i/7)+(i<7 and (i%2==0 and 2 or -2) or 0);local ny=math.floor(y+(yy-y)*i/7);D.line(im,px,py,nx,ny,'steel4');px,py=nx,ny end
end
local function sparks(im,x,y,f)
 for j=0,3 do local a=j*1.7+f*.4;local r=2+f*2;local xx=x+math.floor(math.cos(a)*r);local yy=y+math.floor(math.sin(a)*r);D.line(im,xx,yy,xx+math.floor(math.cos(a)*3),yy+math.floor(math.sin(a)*3),j%2==0 and 'fire5' or 'fire3') end
end
local function spray(im,x,y,f)
 for j=0,2 do local t=(f+j)%4;local xx=x-2-j*4;local yy=y-2-t;D.line(im,xx,yy,xx-2,yy-2,'sky5');K.px(im,xx-3,yy-3,'steel5') end
end
local function hopper(im,p,f,n,layer)
 local dead=p=='death';local t=dead and (f-1)/(n-1) or 0
 local y=p=='crouch' and ({2,4,5})[f] or p=='land' and ({5,3,1})[f] or p=='hop' and ({-1,-3,-3,-2,-1,1})[f] or p=='hurt' and 2 or (f%6==3 or f%6==4) and 1 or 0
 if dead then y=math.floor(t*6) end
 if layer=='hydraulics' then
  if t<.8 then
   local stretch=p=='hop' and 5 or 0
   D.limb(im,13,30+y,7,35+stretch,'olive1','olive4',4);D.limb(im,7,35+stretch,15,42,'steel2','steel5',2);D.disc(im,7,35+stretch,2,'steel1');D.rivet(im,6,34+stretch);D.line(im,10,31+y,6,35+stretch,'olive5')
   D.line(im,8,33+stretch,13,40,'sand3');D.box(im,3,43,14,4,'steel2','steel4','outline');D.line(im,4,45,1,46,'steel4');D.line(im,10,45,13,46,'steel5')
   D.limb(im,26,31+y,32,37+stretch,'olive2','olive5',4);D.limb(im,32,37+stretch,23,43,'steel2','steel5',2)
   D.box(im,23,43,16,4,'steel2','steel5','outline');for _,x in ipairs({5,10,25,31,36}) do D.line(im,x,45,x+2,46,'steel4') end
  end
  if dead then for j=0,2 do local xx=12+j*12+math.floor((j-1)*t*10);D.box(im,xx,34+math.floor(t*8)-j*3,5,3,'steel2','steel5','outline') end end
 elseif layer=='armour' then
  if t<.75 then
   oval(im,22,30+y,16,11,'outline');oval(im,21,28+y,15,9,'olive2');oval(im,19,25+y,12,6,'olive3');D.line(im,11,23+y,23,22+y,'olive5');D.line(im,12,24+y,24,23+y,'olive4')
   D.line(im,21,23+y,19,30+y,'olive1');D.line(im,19,30+y,9,32+y,'olive1');D.rivet(im,13,25+y);D.rivet(im,24,25+y)
   D.box(im,8,21+y,8,6,'steel2','steel4','steel1');for j=0,2 do D.line(im,10+j*2,23+y,10+j*2,25+y,'outline') end
   D.box(im,16,28+y,10,6,'red2','red4','red1');D.eye(im,17,29+y,'sand4')
   -- Foreground folded haunch: broad knee plate over a polished hydraulic ram.
   oval(im,11,34+y,7,6,'outline');oval(im,10,33+y,6,5,'olive3');D.line(im,7,30+y,12,29+y,'olive5');D.line(im,8,34+y,5,40,'steel1',3);D.line(im,8,33+y,5,39,'steel5');D.line(im,10,36+y,15,41,'olive2',3);D.line(im,10,35+y,15,40,'olive4');D.disc(im,10,34+y,2,'steel2');D.rivet(im,9,33+y)
   D.limb(im,35,31+y,37,41,'olive2','olive4',2);D.box(im,34,43,10,3,'steel3','steel5','steel1')
  else D.box(im,16,39,20,6,'steel1','steel3','outline') end
  if dead then
   for j=0,2 do local xx=18+(j-1)*math.floor(4+t*17);local yy=25-math.floor(math.sin(t*math.pi)*18)+j*5;poly(im,{{xx-4,yy},{xx+4,yy-2},{xx+6,yy+3},{xx-3,yy+5}},'outline');poly(im,{{xx-3,yy},{xx+3,yy-1},{xx+4,yy+2},{xx-2,yy+3}},j==1 and 'red3' or 'olive3');D.line(im,xx-2,yy,xx+2,yy-1,'olive5');D.rivet(im,xx,yy+1) end
  end
 elseif layer=='head' then
  local swell=p=='tongue_cue' and math.floor(f*.8) or p=='croak' and f or (f%6==2 or f%6==3) and 2 or 0
  if t<.65 then
   oval(im,30,35+y,10,6+swell,'outline');oval(im,29,34+y,9,5+swell,'sand3');oval(im,28,33+y,7,4+swell,'sand5');D.line(im,24,39+y+swell,34,39+y+swell,'sand2')
   poly(im,{{22,28+y},{39,26+y},{44,28+y},{44,32+y},{24,34+y}},'outline');poly(im,{{23,28+y},{39,27+y},{43,29+y},{43,31+y},{24,32+y}},'steel3');D.line(im,24,28+y,39,27+y,'steel5');D.line(im,24,32+y,42,31+y,'steel1');D.rivet(im,25,29+y);D.rivet(im,40,29+y)
   if p=='tongue_cue' or p=='tongue' or p=='croak' then D.rect(im,26,30+y,16,2+math.min(3,swell),'outline');D.line(im,29,32+y,40,32+y,'red2') end
  end
  for j=0,1 do
   local xx=18+j*16+(dead and math.floor((j==0 and -1 or 1)*t*12) or 0);local yy=21+y-(dead and math.floor(math.sin(t*math.pi)*18) or 0)
   if dead then spring(im,18+j*16,27+y,xx,yy+3) end
   oval(im,xx,yy,6,7,'outline');oval(im,xx-1,yy-1,5,6,'olive3');D.line(im,xx-3,yy-5,xx+2,yy-5,'olive5');oval(im,xx+1,yy,4,4,'steel1');oval(im,xx+1,yy,3,3,'fire4');D.line(im,xx-1,yy-2,xx+2,yy-2,'fire6')
   local iris=p=='croak' or p=='tongue_cue' or p=='crouch';D.rect(im,xx+2,yy-1,iris and 1 or 2,3,'outline');K.px(im,xx,yy-2,'white')
  end
 elseif layer=='motion' then
  if p=='idle' and f>=3 and f<=5 then local yy=18-(f-3)*3;oval(im,10-(f-3),yy,2+(f-3)//2,1,'steel4');D.line(im,8-(f-3),yy-1,10-(f-3),yy-1,'steel5') end
  if p=='land' then D.line(im,2,46,7-f,45-f,'steel4');D.line(im,40,46,42+f,45-f,'steel5') end
  if dead and f<7 then sparks(im,24,25,f) end
 end
end
local function crew(im,x,y,f,gunner,launched)
 if launched then
  D.disc(im,x,y,3,'skin4');D.box(im,x-5,y-5,9,4,'red3','red5','red1');D.limb(im,x,y+4,x-5,y+8,'red3','red5',2);D.line(im,x-3,y+8,x-8,y+4,'sand4',2);D.line(im,x-4,y+8,x+1,y+13,'sand3',2);D.line(im,x,y+4,x+6,y,'skin4');return
 end
 D.box(im,x-4,y+2,10,9,'red3','red5','red1');D.line(im,x+3,y+4,x+2,y+9,'sand4');D.box(im,x-3,y-6,8,9,'skin3','skin5','skin1');D.rect(im,x+3,y-2,3,2,'skin4')
 D.line(im,x-2,y-2,x+4,y-2,'steel1',2);K.px(im,x+2,y-2,'sky5');D.line(im,x+2,y+1,x+5,y+1,'skin1')
 D.box(im,x-5,y-10,10,5,'red3','red5','red1');D.line(im,x-5,y-5,x+7,y-5,'outline');D.line(im,x-4,y-6,x+5,y-6,'red4');D.rivet(im,x-1,y-8)
 D.line(im,x-1,y+10,x+5,y+10,'sand3',3);D.line(im,x+4,y+10,x+8,y+12,'sand4',2);D.line(im,x+3,y+4,x+8,y+(gunner and 5 or 7),'red5',2);D.disc(im,x+8,y+(gunner and 5 or 7),1,'skin5')
end
local function airboat(im,p,f,n,layer)
 local dead=p=='sink';local t=dead and (f-1)/(n-1) or 0;local damaged=p:find('damaged')~=nil
 local y=dead and math.floor(t*12) or p=='hurt' and -2 or f%4==2 and 1 or 0
 local function yy(x,base) return base+y+(dead and math.floor((x-48)*t*.13) or 0) end
 if layer=='fan' then
  local cy=25+y;local cx=23
  if t<.85 then
   oval(im,cx,cy,16,19,'outline');oval(im,cx-1,cy-1,14,17,'olive3');oval(im,cx-2,cy-2,13,16,'olive4');oval(im,cx,cy,12,15,'steel1')
   local a=(f-1)*math.pi/4;for side=-1,1,2 do local dx=math.floor(math.cos(a)*11)*side;local dy=math.floor(math.sin(a)*14)*side;D.line(im,cx,cy,cx+dx,cy+dy,'sand2',3);D.line(im,cx-1,cy-1,cx+dx-1,cy+dy-1,'sand4');if not dead then D.line(im,cx+dx//2-3,cy+dy//2,cx+dx//2+3,cy+dy//2-2,'steel3') end end
   for _,dx in ipairs({-8,0,8}) do D.line(im,cx+dx,cy-12,cx+dx,cy+12,dx==0 and 'steel5' or 'steel3') end
   D.line(im,cx-13,cy-6,cx+11,cy-6,'steel3');D.line(im,cx-12,cy+6,cx+11,cy+6,'steel4');D.rivet(im,cx-9,cy-14);D.rivet(im,cx-11,cy+10);D.rivet(im,cx+8,cy+14);D.disc(im,cx,cy,2,'steel5')
   if dead or damaged then D.line(im,cx+5,cy-14,cx+11,cy-5,'outline',2);D.line(im,cx+11,cy-5,cx+5,cy+4,'outline');D.line(im,cx+7,cy-12,cx+11,cy-8,'sand3') end
  end
  D.box(im,14,40+y,24,8,'steel2','steel4','outline');D.box(im,11,32+y,7,10,'olive2','olive4','steel1');D.rect(im,12,34+y,5,2,'red3');D.line(im,12,32+y,12,23+y,'steel2',3);D.line(im,12,23+y,16,23+y,'steel4',2)
  D.line(im,40,34+y,40,9+y,'steel5');D.line(im,40,9+y,49,11+y,'outline',3);D.line(im,41,10+y,47,11+y,'red4',2)
 elseif layer=='crew' then
  if dead then
   for j=0,1 do local xx=44+j*22+math.floor((j==0 and -1 or 1)*t*16);local yy=31-math.floor(math.sin(t*math.pi)*26)+math.floor(t*t*22);if f<9 then crew(im,xx,yy,f,j==1,true) end end
  else
   D.box(im,41,33+y,8,11,'steel1','steel4','outline');crew(im,44,29+y,f,false,false)
   local cue=p:find('gun_cue');local fire=p:find('fire');local lean=cue and math.min(3,f//2) or fire and 3 or 0
   crew(im,66+lean,30+y,f,true,false);D.line(im,61,41+y,67,35+y,'steel4',2)
  end
 elseif layer=='hull' then
  if t<1 then
   poly(im,{{5,yy(5,45)},{13,yy(13,42)},{76,yy(76,42)},{91,yy(91,35)},{87,yy(87,48)},{77,yy(77,54)},{16,yy(16,54)}},'outline')
   poly(im,{{8,yy(8,45)},{18,yy(18,43)},{76,yy(76,43)},{89,yy(89,38)},{85,yy(85,47)},{75,yy(75,52)},{18,yy(18,52)}},'olive2')
   D.line(im,15,yy(15,44),75,yy(75,44),'olive5');D.line(im,75,yy(75,44),87,yy(87,40),'sand4');D.line(im,20,yy(20,50),77,yy(77,50),'steel3');D.line(im,21,yy(21,47),77,yy(77,47),'red3',2)
   for j=0,5 do D.rivet(im,19+j*11,yy(19+j*11,45)) end
   for _,x in ipairs({30,63}) do D.line(im,x,yy(x,46),x-1,yy(x-1,50),'dirt3');K.px(im,x,yy(x,47),'dirt4') end
   D.eye(im,76,yy(76,46),'sand5');D.box(im,31,38+y,9,6,'olive3','olive5','olive1');D.line(im,33,39+y,37,42+y,'olive1');D.box(im,49,39+y,10,5,'sand2','sand4','sand1');D.line(im,51,40+y,56,40+y,'sand5');oval(im,53,42+y,2,3,'sand2');oval(im,53,41+y,1,2,'sand5');D.line(im,51,40+y,52,45+y,'sand4')
   if damaged or dead then D.line(im,62,yy(62,44),58,yy(58,49),'steel1',2);D.line(im,59,yy(59,49),65,yy(65,51),'outline');D.line(im,63,yy(63,44),60,yy(60,47),'steel5');D.rect(im,28,yy(28,47),6,3,'steel1') end
  end
 elseif layer=='weapon' then
  if not dead then
   local fire=p:find('fire');local recoil=fire and f==1 and -2 or 0
   D.line(im,74,41+y,74,30+y,'steel4',2);D.box(im,70,29+y,9,12,'steel2','steel4','steel1');D.rivet(im,72,31+y)
   D.box(im,66+recoil,25+y,12,5,'steel2','steel5','steel1');D.line(im,77+recoil,27+y,80+recoil,27+y,'steel4',2);D.box(im,76,31+y,4,5,'sand2','sand4','sand1')
   if p:find('gun_cue') and f>=5 then K.px(im,80,26+y,'white');D.line(im,78,25+y,81,25+y,'fire5') end
   if fire and f==1 then D.flash(im,80,27+y,0) end
  end
 elseif layer=='motion' then
  if not dead then spray(im,88,53,f) elseif f<8 then sparks(im,25,26+y,f);spray(im,83,53,f) end
  if dead and f>3 then for j=0,2 do D.line(im,9+j*29,53,24+j*29,53,'sky5');K.px(im,12+j*29,51-(f+j)%3,'sky4') end end
 end
end
local function piranha(im,p,f,n,layer)
 local dead=p=='break';local t=dead and (f-1)/(n-1) or 0;local swim=p=='swim' or p=='bulge';local open=p=='leap' or p=='fall' or (p=='bite' and f==1)
 local y=p=='leap' and -1 or p=='fall' and 2 or 0
 if layer=='fins' then
  D.line(im,11,13+y,3,9+f%3,'steel2',3);oval(im,5,15+y,4,5,'outline');oval(im,5,15+y,3,4,'steel3');D.line(im,5,12+y,5,18+y,'sky5');D.line(im,3,15+y,7,15+y,'steel1');K.px(im,4+(f%2),15+y,'steel5')
  poly(im,{{14,10+y},{12,1+y},{19,3+y},{27,10+y}},'outline');poly(im,{{15,9+y},{14,3+y},{19,4+y},{25,9+y}},'steel3');D.line(im,14,2+y,24,8+y,'steel5');D.line(im,15,6+y,20,8+y,'red3');D.line(im,25,8+y,25,3+y,'steel4');D.box(im,24,2+y,4,3,'steel2','steel5','steel1');K.px(im,27,3+y,'red4')
  D.line(im,17,21+y,15+(f%3),25,'steel3',2)
 elseif layer=='armour' then
  if t<.7 then
   oval(im,21,15+y,12,8,'outline');oval(im,20,14+y,11,7,'steel2');oval(im,20,12+y,9,5,'steel3');D.line(im,16,9+y,25,8+y,'steel5');D.line(im,13,12+y,16,10+y,'steel4')
   for j=0,2 do local x=12+j*4;poly(im,{{x,12+y},{x+3,11+y},{x+5,14+y},{x+3,19+y},{x,17+y}},'steel1');D.line(im,x+1,12+y,x+3,12+y,'steel5');D.line(im,x+1,13+y,x+3,15+y,'steel3');D.line(im,x+3,15+y,x+2,17+y,'steel2') end
   D.disc(im,29,13+y,3,'outline');D.disc(im,29,13+y,2,'red3');D.line(im,28,12+y,30,12+y,'red5');K.px(im,29,12+y,'fire5');poly(im,{{25,9+y},{30,8+y},{34,11+y},{34,13+y},{29,11+y},{26,11+y}},'steel4');D.line(im,26,9+y,30,9+y,'steel5');D.rivet(im,23,10+y)
  end
  if dead then for j=0,3 do local xx=20+math.floor((j-1.5)*t*14);local yy=14-math.floor(math.sin(t*math.pi)*9)+j%2*6;D.box(im,xx,yy,4,3,'steel3','steel5','steel1') end end
 elseif layer=='jaw' then
  local gap=open and (p=='leap' and 5+f%2 or 5) or p=='bite' and 0 or 1;local jy=19+y+gap+(dead and math.floor(t*11) or 0)
  if not dead or f<9 then
   D.line(im,23,17+y,34,17+y,'outline',2);D.line(im,26,18+y,34,18+y,'red1');poly(im,{{22,jy-1},{35,jy-2},{36,jy+1},{30,jy+3},{24,jy+2}},'outline');poly(im,{{23,jy-1},{34,jy-1},{34,jy+1},{25,jy+1}},'steel3');D.line(im,25,jy-1,34,jy-1,'steel5');D.disc(im,24,jy,2,'steel4')
   for j=0,2 do D.line(im,27+j*3,17+y,28+j*3,20+y,'sand5');D.line(im,27+j*3,jy-2,28+j*3,jy-4,'white') end
  end
 elseif layer=='surface' then
  if swim then
   -- Only the dorsal fin/periscope breaks the surface; the submerged body is omitted.
   for yy=13,27 do for xx=0,39 do im:drawPixel(xx,yy,0) end end
   D.line(im,8,14,29,14,'sky5');D.line(im,12,16,32,16,'steel3');if p=='bulge' then oval(im,22,14,8+f,2,'sky4');D.line(im,11,12,31,12,'sky5') end
  end
  if p=='splash' then spray(im,25,21,f);spray(im,38,22,f+2) end
  if dead and f<6 then sparks(im,21,14,f) end
 end
end
local function gnat(im,p,f,n,layer)
 local dead=p=='pop';local t=dead and (f-1)/(n-1) or 0;local dive=p=='dive';local cue=p=='dive_cue';local bob=f%4==2 and 1 or 0
 if layer=='wings' then
  local phase=(f-1)%4+1
  for j=0,1 do
   local detach=dead and (j==0 and -1 or 1)*math.floor(t*8) or 0
   local xx=({5,6,7,6})[phase]+j*4+detach;local yy=({3,9,15,7})[phase]+j*3+(dead and math.floor(t*10) or 0);local x=16+detach
   if f<9 or not dead then
    poly(im,{{x,11},{xx-2,yy-1},{xx,yy-2},{xx+3,yy},{x,13}},'steel2');poly(im,{{x-1,11},{xx,yy-1},{xx+2,yy},{x-1,12}},'sky5');D.line(im,xx-1,yy-1,x-1,11,'steel5');K.px(im,math.floor((xx+x)/2),math.floor((yy+12)/2),'steel3')
    if not dead and phase%2==0 then D.line(im,xx-2,yy-3,xx+3,yy-2,'steel4') end
   end
  end
 elseif layer=='body' then
  if t<.7 then
   for j=0,2 do local x=10+j*4;local knee=dive and 17 or 19+j%2;local foot=dive and 17 or 21;D.line(im,x,15+bob,x-2,knee,'steel4');D.line(im,x-2,knee,x+1,foot,'steel2') end
   poly(im,{{3,15+bob},{7,11+bob},{12,11+bob},{15,14+bob},{12,17+bob},{7,17+bob}},'outline');poly(im,{{5,15+bob},{8,12+bob},{11,12+bob},{13,14+bob},{11,16+bob},{8,16+bob}},'red3');D.line(im,7,13+bob,11,12+bob,'red5');D.line(im,7,16+bob,11,16+bob,'red2');D.line(im,8,12+bob,9,16+bob,'steel4');D.line(im,12,12+bob,13,15+bob,'steel3')
   D.box(im,14,12+bob,7,5,'steel2','steel5','steel1');D.line(im,17,13+bob,17,15+bob,'steel4');D.line(im,22,10+bob,20,7+bob,'steel4');D.disc(im,22,13+bob,3,'outline');D.disc(im,23,12+bob,2,cue and 'fire4' or 'red4');K.px(im,23,11+bob,cue and 'white' or 'sand5')
   local ny=dive and 18 or cue and 16 or 14;D.line(im,24,14+bob,30,ny+bob,'steel1',2);D.line(im,25,14+bob,30,ny+bob,cue and 'fire5' or 'steel5')
  else D.line(im,12,15,22,17,'steel4');D.line(im,14,15,12,21,'steel2') end
  if dead then for j=0,2 do local xx=10+math.floor((j-1)*t*10);local yy=13+math.floor(t*t*12)-j*3;D.line(im,xx,yy,xx+2,yy+2,j==0 and 'red4' or 'steel5') end end
 elseif layer=='motion' then
  if cue then K.px(im,30,16+bob,'white');K.px(im,28,14+bob,'fire4') end
  if dead and f<6 then sparks(im,11,13,f) end
 end
end
local function build(name,w,h,layers,poses,paint)
 local anims={};for _,p in ipairs(poses) do local tag,count,ms=p[1],p[2],p[3];local frames={}
  for i=1,count do local f=i;local fr={};for _,l in ipairs(layers) do local layer=l;fr[layer]=function(im)
    paint(im,tag,f,count,layer)
    if name=='airboat' or name=='hopper' then local tmp=Image(im);im:clear();im:drawImage(tmp,name=='hopper' and Point(8,8) or Point(4,9)) end
    if name=='piranha' and (tag=='leap' or tag=='fall') then
     local tmp=Image(im);im:clear();local angle=tag=='leap' and ({-.20,-.16,-.12,-.08,-.04,0})[f] or ({.04,.08,.12,.16})[f];local cs,sn=math.cos(angle),math.sin(angle)
     for yy=0,h-1 do for xx=0,w-1 do local sx=math.floor(20+(xx-20)*cs+(yy-14)*sn+.5);local sy=math.floor(14-(xx-20)*sn+(yy-14)*cs+.5);if sx>=0 and sx<w and sy>=0 and sy<h then im:drawPixel(xx,yy,tmp:getPixel(sx,sy)) end end end
    end
    if name=='piranha' and layer~='surface' then
     if tag=='splash' then local tmp=Image(im);im:clear();im:drawImage(tmp,Point(0,f*4)) end
     if tag=='swim' or tag=='bulge' or tag=='splash' then for yy=13,27 do for xx=0,39 do im:drawPixel(xx,yy,0) end end end
    end
   end end;frames[#frames+1]=fr end
  anims[#anims+1]={tag=name..'_'..tag,ms=ms,frames=frames}
 end
 K.build{name=name,w=w,h=h,layers=layers,src=D.root..'/art-src/enemies/'..name..'.aseprite',sheet=D.root..'/public/assets/sprites/enemies/'..name..'.png',data=D.root..'/public/assets/sprites/enemies/'..name..'.json',anims=anims}
end
build('hopper',64,56,{'hydraulics','armour','head','motion'},{{'idle',6,140},{'croak',3,50},{'crouch',3,100},{'hop',6,120},{'land',3,60},{'tongue_cue',5,100},{'tongue',8,{30,30,30,20,20,30,30,30}},{'hurt',2,70},{'death',10,60}},hopper)
build('airboat',104,64,{'fan','crew','hull','weapon','motion'},{{'cruise',4,100},{'gun_cue',6,100},{'fire',3,{50,60,60}},{'hurt',2,70},{'cruise_damaged',4,100},{'gun_cue_damaged',6,100},{'fire_damaged',3,{50,60,60}},{'sink',10,120}},airboat)
build('piranha',40,28,{'fins','armour','jaw','surface'},{{'swim',6,140},{'bulge',5,100},{'leap',6,50},{'bite',3,50},{'fall',4,100},{'splash',4,60},{'break',10,60}},piranha)
build('gnat',32,28,{'wings','body','motion'},{{'hover',4,80},{'dive_cue',4,100},{'dive',6,100},{'recover',4,100},{'pop',10,60}},gnat)
-- Ghillie follows the soldier's pose before tumbling with the whole figure on death.
local function ghillie(im,p,f,n,layer)
 local death=p:find('death')~=nil;local pose=p=='rise' and 'idle' or p
 if layer=='soldier' then
  if death then D.death(im,'grunt',p:find('flame') and 'flame' or p:find('explosion') and 'explosion' or 'launched',f,n) else D.soldier(im,'grunt',pose,f,n) end
 elseif layer=='ghillie' then
  local tmp=Image(48,48,ColorMode.RGB);local y=(pose=='crouch_idle' or pose=='crouch_shoot') and 8 or (pose=='idle' or pose=='walk' or pose=='panic') and (f%4==2 or f%4==3) and 1 or 0
  for _,p in ipairs({{19,12,6,5},{25,10,6,6},{30,13,5,5},{17,24,7,9},{27,25,7,8}}) do
   local x,yy,w,h=p[1],p[2]+y,p[3],p[4];poly(tmp,{{x,yy},{x+w-1,yy-1},{x+w,yy+h-3},{x+w-2,yy+h},{x+2,yy+h-1},{x,yy+h+2}},'leaf1');poly(tmp,{{x+1,yy},{x+w-2,yy},{x+w-1,yy+h-3},{x+2,yy+h-1}},'olive3');D.line(tmp,x+1,yy,x+w-3,yy,'olive5');D.line(tmp,x+2,yy+2,x+2,yy+h-2,'olive2')
  end
  for _,r in ipairs({{19,14,16,7},{23,12,22,5},{30,15,34,8},{18,28,14,20}}) do D.line(tmp,r[1],r[2]+y,r[3],r[4]+y,'leaf2');K.px(tmp,r[3],r[4]+y,'sand4') end
  local run=pose=='walk' or pose=='panic';local stride=run and ({-5,-3,0,3,5,3,0,-3})[(f-1)%8+1] or 0
  local function mud(target) for _,x in ipairs({18-stride,25+stride}) do D.line(target,x,42,x+5,43,'dirt2',2);D.line(target,x+1,42,x+3,42,'dirt4');D.line(target,x+1,44,x+1,45,'dirt3') end end
  if not death or p:find('flame') then mud(tmp) end
  D.line(tmp,19,13+y,15,5+y,'olive2');D.rect(tmp,14,3+y,2,3,'dirt4');K.px(tmp,14,3+y,'sand3')
  if death and not p:find('flame') then
   local angle=p:find('explosion') and (f-1)*math.pi/2 or (-.35-(f-1)*.32);local cs,sn=math.cos(angle),math.sin(angle)
   -- D.death's launched soldier is 8 px higher than the upright clothing.
   local shifted=Image(48,48,ColorMode.RGB);shifted:drawImage(tmp,Point(0,-8));mud(shifted)
   for yy=0,47 do for x=0,47 do local sx=math.floor(24+(x-24)*cs+(yy-24)*sn+.5);local sy=math.floor(24-(x-24)*sn+(yy-24)*cs+.5);if sx>=0 and sx<48 and sy>=0 and sy<48 then im:drawPixel(x,yy,shifted:getPixel(sx,sy)) end end end
  else im:drawImage(tmp) end
 elseif layer=='water' then
  if p=='rise' then D.line(im,10,46,38,46,'sky4');D.line(im,14,44,34,44,'steel3')
  elseif not death and f%4~=0 then local crouch=pose=='crouch_idle' or pose=='crouch_shoot';local y=crouch and 8 or 0;local yy=34+y+(f%4)*2;D.line(im,16,yy,16,yy+1,'steel4');K.px(im,16,yy,'sky5') end
 end
 if p=='rise' then local top=48-math.floor(f/n*40);for yy=0,top do for x=0,47 do im:drawPixel(x,yy,0) end end end
end
build('lurker',48,48,{'soldier','ghillie','water'},{{'idle',4,140},{'walk',8,80},{'alert',4,100},{'shoot',4,100},{'crouch_idle',4,160},{'crouch_shoot',4,100},{'sleep',4,240},{'panic',4,75},{'rise',7,100},{'death_launched',8,75},{'death_flame',8,75},{'death_explosion',8,75}},ghillie)
