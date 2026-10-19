local D = dofile(app.params.root..'/art-src/enemies/lib/draw.lua')
local K=D.K
-- Art faces right. Feet terminate at y=47. Gun muzzle is (43,26).
function D.soldier(im,kind,pose,f,n)
  local crouch=(pose=='crouch_shoot' or pose=='crouch_idle'); local run=pose=='walk' or pose=='panic' or pose=='retreat'
  local panic=pose=='panic' or pose=='flame'; local throw=pose=='throw'
  local landing=pose=='landing'; local air=pose=='descent' or pose=='chute_torn'
  local bob=((run or pose=='idle') and (f%4==2 or f%4==3)) and 1 or 0
  local y=(crouch and 8 or 0)+bob+(landing and (4-f) or 0)
  local cycle=(run and n==6) and {-5,0,5,5,0,-5} or {-5,-3,0,3,5,3,0,-3}
  local stride=run and cycle[(f-1)%#cycle+1] or 0
  if pose=='launched' then y=y-8 end
  if pose=='flame' then y=y-((f%2)*2) end
  local function R(x,yy,w,h,c) D.rect(im,x,yy+y,w,h,c) end
  local function B(x,yy,w,h,c,hi,lo) D.box(im,x,yy+y,w,h,c,hi,lo) end
  local function L(x,yy,xx,yyy,c,hi,w) D.limb(im,x,yy+y,xx,yyy+y,c,hi,w) end
  -- Back arm, boots and individually posed legs.
  if panic then L(20,26,13+(f%3)*2,13+(f%2)*4,'red3','red5',2); D.disc(im,13+(f%3)*2,11+y+(f%2)*4,2,'skin4')
  elseif air then L(19,25,14,14,'red3','red5',2); D.disc(im,14,13+y,2,'skin4')
  else L(20,26,17,33,'red2','red4',2) end
  local hipY=crouch and 32 or 35
  local footY=46-y
  if air then footY=42; if pose=='chute_torn' then stride=(f-2)*3 end end
  L(22,hipY,21-stride,footY-3,'sand2','sand4',3)
  B(17-stride,footY-2,9,4,'steel1','steel3','outline')
  L(27,hipY,27+stride,footY-3,'sand3','sand5',3)
  B(24+stride,footY-2,10,4,'steel1','steel4','outline')
  -- Rounded tunic, red shadow on trailing edge.
  B(18,22,14,14,'red3','red5','red1'); R(20,24,3,8,'red4'); R(28,25,3,9,'red2')
  D.line(im,21,24+y,28,32+y,'sand4',2); R(18,32,14,3,'sand1'); R(24,32,4,3,'sand4'); R(25,33,2,1,'sand5')
  B(17,28,4,6,'sand3','sand5','sand1')
  -- Head: ear, cheek, chin, prominent nose, visor shadow.
  B(22,12,11,12,'skin3','skin5','skin1'); R(24,16,9,5,'skin4'); R(32,17,3,3,'skin4'); R(24,14,9,3,'skin1')
  R(26,16,3,2,'white'); R(28,16,1,2,'outline'); R(23,18,2,3,'skin2'); R(29,21,3,1,'skin1')
  if panic or pose=='alert' or pose=='launched' then B(28,20,5,5,'skin1'); R(29,21,3,1,'white'); R(30,23,2,1,'red4') end
  -- Red helmet with raised crown and khaki spiral badge.
  R(20,9,12,7,'outline'); R(22,8,8,1,'outline'); R(21,10,10,5,'red3'); R(22,9,7,2,'red5'); R(21,11,3,3,'red4')
  R(19,14,16,2,'outline'); R(20,14,14,1,'red4'); R(26,10,5,4,'sand4'); R(27,11,3,2,'red1'); R(28,11,1,1,'sand5')
  if pose=='sleep' then R(26,16,7,2,'skin3'); R(26,17,6,1,'outline'); R(29,21,2,2,'skin1') end
  -- Brief idle blink and a breathing satchel strap; timing/attack markers stay intact.
  if pose=='idle' and f==4 then R(26,16,6,1,'skin2');R(26,17,6,1,'outline') end
  if pose=='alert' then R(24,12,7,1,'skin1');R(25,13,6,1,'skin5') end
  if kind=='grenadier' then
    B(14,22,5,11,'sand2','sand4','sand1'); R(15,24,2,2,'olive4'); R(15,28,2,2,'olive4'); R(22,27,2,3,'olive2'); R(25,28,2,3,'olive3')
  end
  if pose=='hurt' then
    for yy=0,47 do for x=0,47 do if app.pixelColor.rgbaA(im:getPixel(x,yy))>0 then K.px(im,x,yy,((x+yy)%4==0) and 'red5' or 'white') end end end
  elseif pose=='flame' then
    for yy=9,46 do for x=10,36 do local p=im:getPixel(x,yy); if app.pixelColor.rgbaA(p)>0 and (x+yy)%3~=0 then K.px(im,x,yy,'ink1') end end end
    R(26,16,3,2,'white'); R(31,16,2,2,'white')
    for j=1,5 do local xx=13+j*4; local yy=36-((f+j)%4)*5; D.disc(im,xx,yy,3,'fire2'); D.disc(im,xx,yy-2,2,'fire4'); K.px(im,xx,yy-3,'fire5') end
  end
  if throw then
    local poses={{19,18},{17,13},{22,8},{34,13},{38,23},{32,29}}; local p=poses[f]
    L(29,26,p[1],p[2],'red3','red5',2); D.disc(im,p[1],p[2]-1+y,2,'skin4')
    if f<=3 then B(p[1]-2,p[2]-6,5,5,'olive3','olive5','olive1'); R(p[1],p[2]-7,1,2,'fire5') end
  elseif panic then
    L(30,25,36+(f%2)*3,13+(f%3)*3,'red3','red5',2); D.disc(im,36+(f%2)*3,11+(f%3)*3+y,2,'skin4')
  elseif air then local ay=pose=='chute_torn' and 12+f*3 or 14; L(30,25,36,ay,'red3','red5',2); D.disc(im,36,ay-1+y,2,'skin4')
  elseif kind~='paratrooper' or pose=='landing' then
    local gy=((pose=='shoot' or pose=='crouch_shoot') and f==1) and 2 or 0
    local recoil=(pose=='shoot' or pose=='crouch_shoot') and f==(crouch and 3 or 4) and -2 or 0
    L(28,26,33+recoil,29,'red4','red5',2); D.disc(im,33+recoil,28+y,2,'skin4')
    B(28+recoil,25+gy,13,4,'steel2','steel5','steel1'); R(39+recoil,26+gy,5,2,'steel1'); B(31+recoil,29+gy,3,5,'sand2','sand4'); R(26+recoil,28+gy,6,2,'sand2')
    if (pose=='shoot' or pose=='crouch_shoot') and f==(crouch and 3 or 4) then D.flash(im,44+recoil,26+y,0) end
  end
  if kind=='shield' and pose~='shield_break' and pose~='launched' and pose~='flame' and pose~='explosion' and pose~='hurt' then
    local low=pose=='recover' or (pose=='shoot' and f>=3); local sx=low and 13 or 31; local sy=low and 31 or 19
    D.box(im,sx,sy+y,12,27-(low and 8 or 0),'steel2','steel5','steel1')
    D.rect(im,sx+2,sy+3+y,8,5,'steel1'); D.line(im,sx+3,sy+4+y,sx+8,sy+4+y,'sky4')
    D.rect(im,sx+2,sy+11+y,8,9,'red2'); D.eye(im,sx+3,sy+14+y,'sand4')
    for j=0,2 do D.rivet(im,sx+2+j*3,sy+23+y) end
    if pose=='block' and f==3 then D.flash(im,44,29,0) end
  elseif kind=='shield' and pose=='shield_break' then
    local t=f-1
    D.box(im,33+t*2,21+t*3,8,12,'steel2','steel5','steel1'); D.line(im,34+t*2,22+t*3,38+t*2,29+t*3,'fire4')
    D.box(im,28-t*3,34+t*2,7,9,'steel2','steel4','steel1')
  end
  if pose=='hurt' then
    for yy=0,47 do for x=0,47 do if app.pixelColor.rgbaA(im:getPixel(x,yy))>0 then K.px(im,x,yy,((x+yy)%4==0) and 'red5' or 'white') end end end
  end
  if pose=='alert' then
    -- Requested readable alarm pictogram, not a font glyph.
    D.disc(im,38,7,5,'outline'); D.rect(im,37,3,3,5,'fire5'); D.rect(im,38,9,1,1,'white')
  end
end
function D.death(im,kind,pose,f,n)
  if pose=='flame' then D.soldier(im,kind,pose,f,n); return end
  local tmp=Image(48,48,ColorMode.RGB); D.soldier(tmp,kind,'launched',f,n)
  local angle=pose=='explosion' and (f-1)*math.pi/2 or (-0.35-(f-1)*0.32)
  local cs,sn=math.cos(angle),math.sin(angle)
  for y=0,47 do for x=0,47 do
    local sx=math.floor(24+(x-24)*cs+(y-24)*sn+0.5); local sy=math.floor(24-(x-24)*sn+(y-24)*cs+0.5)
    if sx>=0 and sx<48 and sy>=0 and sy<48 then im:drawPixel(x,y,tmp:getPixel(sx,sy)) end
  end end
  -- Helmet separates on the last tumble, adding a readable little personality beat.
  if f>=n-1 then
   local hx=7+(f%2)*3;local hy=8+(f-(n-1))*5
   D.box(im,hx,hy,9,5,'red3','red5','red1');D.line(im,hx-1,hy+4,hx+10,hy+4,'outline')
  end
end
function D.infantry(kind)
  local A={}
  local function add(tag,n,ms,pose) A[#A+1]=D.anim(kind..'_'..tag,n,ms,function(im,f,count) D.soldier(im,kind,pose or tag,f,count) end) end
  add('idle',4,140); add('walk',kind=='shield' and 6 or 8,80)
  add('alert',3,120)
  if kind=='grenadier' then add('throw',6,{140,120,140,70,80,120}); add('retreat',6,75)
  elseif kind=='shield' then add('block',3,{100,100,60}); add('shoot',4,{160,160,100,80}); add('shield_break',4,100); add('recover',2,180)
  elseif kind=='paratrooper' then add('descent',4,140); add('chute_torn',3,100); add('landing',3,100)
  else add('sleep',4,240); add('crouch_idle',4,160); add('shoot',4,{160,160,100,80}); add('crouch_shoot',3,{160,160,100},'crouch_shoot'); add('panic',6,75) end
  add('hurt',1,70)
  for _,pair in ipairs({{'launched',6,85},{'flame',6,90},{'explosion',4,90}}) do
    A[#A+1]=D.anim(kind..'_death_'..pair[1],pair[2],pair[3],function(im,f,n) D.death(im,kind,pair[1],f,n) end)
  end
  D.build(kind,48,48,A)
end
return D
