local K=dofile(app.params.kbe)
local R=app.params.root
local P=dofile(R..'/art-src/player/lib/poses.lua'); P.use(K)
local function build(name,w,h,anims)
 K.build{name=name,w=w,h=h,src=R..'/art-src/player/'..name..'.aseprite',sheet=R..'/public/assets/sprites/player/'..name..'.png',data=R..'/public/assets/sprites/player/'..name..'.json',anims=anims}
end
local function anim(name,n,ms,fn)
 local a={tag=name,ms=ms,frames={}}; for i=1,n do local j=i; a.frames[i]={grid=function(im) fn(im,j) end} end; return a
end
local dirs={{'aim_fwd',0},{'aim_up45',-math.pi/4},{'aim_up',-math.pi/2},{'aim_down45',math.pi/4},{'aim_down',math.pi/2},{'crouch_fwd',0},{'crouch_down45',math.pi/4},{'crouch_down',math.pi/2}}
local variant='shotgun'
 local a={}; for _,d in ipairs(dirs) do
  for _,shoot in ipairs({false,true}) do
   local name='knotz_'..variant..'_'..d[1]..(shoot and '_shoot' or '')
   a[#a+1]=anim(name,shoot and 3 or 4,shoot and 45 or {360,140,620,80},function(im,i)
    P.torso(im,{angle=d[2],weapon=variant=='heavy' and 'hmg' or variant,heavy=variant~='pistol',phase=i,blink=not shoot and i==4,crouch=d[1]:match('^crouch_')~=nil,barrelLength=d[1]=='crouch_down' and 12 or nil,bob=0,recoil=shoot and (variant=='pistol' and ({1,1,0})[i] or ({2,1,0})[i]) or 0})
   end)
  end
 end
 a[#a+1]=anim('knotz_'..variant..'_knife',5,55,function(im,i)
  P.torso(im,{angle=({-1.7,-2.1,-.8,.4,0})[i],recoil=i<3 and 2 or 0,noGun=true})
  local hands={{22,19},{20,16},{39,20},{40,31},{31,29}}
  local h=hands[i]; P.limb(im,{26,26},{h[1]-4,h[2]+3},h,3,'skin3','skin5')
  K.line(im,h[1],h[2],h[1]+3,h[2]-6,'steel4'); K.line(im,h[1]+1,h[2],h[1]+4,h[2]-6,'steel5'); K.outline(im,'outline')
  if i==3 or i==4 then
   for q=0,12 do local ang=-1.3+q*.15; local x=math.floor(28+math.cos(ang)*17); local y=math.floor(27+math.sin(ang)*17); K.line(im,x,y,x-2,y+1,'steel5'); if q%2==0 then K.px(im,x+1,y,'white') end end
  end
 end)
 a[#a+1]=anim('knotz_'..variant..'_grenade_throw',4,75,function(im,i)
  P.torso(im,{angle=({-2,-2.5,-.8,0})[i],recoil=i<3 and 1 or 0,noGun=true})
  P.limb(im,{25,25},{({22,20,30,31})[i],({20,19,18,25})[i]},{({21,18,35,34})[i],({15,14,15,26})[i]},3,'skin3','skin5')
  if i<3 then K.disc(im,({21,18})[i],({14,13})[i],2,'olive3') end
  K.outline(im,'outline')
 end)
 for _,d in ipairs(dirs) do
  a[#a+1]=anim('knotz_shotgun_'..d[1]..'_pump',4,{70,80,80,50},function(im,i)
   P.torso(im,{angle=d[2],weapon='shotgun',heavy=true,phase=i,pump=i==2 or i==3,crouch=d[1]:match('^crouch_')~=nil,barrelLength=d[1]=='crouch_down' and 12 or nil})
  end)
 end
 build('knotz_torso_shotgun',48,48,a)

-- Flailing is authored at full detail; runtime moves/crops the sprite at a fixed waterline.
build('knotz_sink',48,48,{anim('knotz_sink_flail',6,110,function(im,i)
 local p={noGun=true,phase=(i-1)%4+1,back={{18,38},{15+(i%3)*2,43}},front={{29,37},{32-(i%3),42}}}
 P.legs(im,p); P.torso(im,p)
 local hands={{{11,17},{36,21}},{{9,23},{37,15}},{{12,27},{36,19}},{{10,19},{38,25}},{{14,16},{36,21}},{{12,23},{37,16}}}
 P.limb(im,{18,25},{12,25},hands[i][1],2,'skin2','skin4')
 P.limb(im,{28,25},{35,24},hands[i][2],2,'skin3','skin5')
 K.rect(im,27,22,3,2,'skin1'); K.px(im,28,22,'skin5'); K.outline(im,'outline')
end)})
build('knotz_crawl',48,48,{anim('knotz_crawl_emerge',6,{160,160,160,160,160,200},function(im,i)
 if i<5 then
  local body=Image(48,48,ColorMode.RGB)
  P.legs(body,{noGun=true,stride=i%2==0 and 3 or 0}); P.torso(body,{noGun=true,phase=(i-1)%4+1})
  -- Prone crawl, rotated nearest pixel with a bent knee and braced forward palm.
  local co,si=math.cos(1.0),math.sin(1.0)
  for y=0,47 do for x=0,47 do
   local tx=math.floor(24+(x-24)*co+(y-38)*si+.5)
   local ty=math.floor(29-(x-24)*si+(y-38)*co+.5)
   if tx>=0 and tx<48 and ty>=0 and ty<48 then local c=body:getPixel(tx,ty); if app.pixelColor.rgbaA(c)>0 then im:drawPixel(x,y,c) end end
  end end
  P.limb(im,{28,36},{34,40},{37+(i%2),44},2,'skin3','skin5'); K.outline(im,'outline')
 else P.legs(im,{crouch=i==5}); P.torso(im,{crouch=i==5,noGun=true,phase=i-4}) end
end)})
build('shotgun_shell',10,6,{anim('shotgun_shell_spin',4,70,function(im,i)
 if i%2==1 then
  K.rect(im,2,2,6,3,'red3'); K.line(im,2,2,7,2,'red5'); K.rect(im,1,2,2,3,'sand3'); K.px(im,1,2,'sand5')
 else K.rect(im,4,1,3,4,'red3'); K.line(im,4,1,4,4,'red5'); K.rect(im,4,4,3,1,'sand4') end
 K.outline(im,'outline')
end)})
build('shotgun_pellet',12,4,{anim('shotgun_pellet_fly',1,100,function(im)
 K.line(im,1,2,10,2,'sand4'); K.line(im,5,1,10,1,'sand5'); K.px(im,10,2,'white')
end)})
build('pickup_shotgun',20,20,{anim('pickup_shotgun_shine',4,150,function(im,i)
 K.rect(im,2,3,16,15,'sand1'); K.rect(im,3,4,14,12,'sand3'); K.rect(im,4,5,12,10,'red2')
 K.line(im,3,4,16,4,'sand5'); K.line(im,3,5,3,15,'sand4'); K.line(im,4,16,16,16,'sand2')
 K.grid(im,{'01111','10000','10000','01110','00001','00001','11110'},{['1']='sand5',['0']='red2'},7,7)
 for _,p in ipairs({{4,5},{15,5},{4,15},{15,15}}) do K.px(im,p[1],p[2],'steel1') end
 K.line(im,4+i*3,5,6+i*3,5,'white'); K.outline(im,'outline')
end)})
local meta={muzzles={}}
for _,d in ipairs(dirs) do for _,suffix in ipairs({'','_shoot','_pump'}) do
 local frames={}; local shoot=suffix=='_shoot'; local len=d[1]=='crouch_down' and 12 or 15
 for i=1,(shoot and 3 or 4) do
  local rx=shoot and ({2,1,0})[i] or 0
  frames[i]={offsetFromFeet={math.floor(27-rx+math.cos(d[2])*len+.5)-24,math.floor(27+(d[1]:match('^crouch_') and 6 or 0)+math.sin(d[2])*len+.5)-48},direction={math.cos(d[2]),math.sin(d[2])}}
 end
 meta.muzzles['knotz_shotgun_'..d[1]..suffix]={frames=frames}
end end
local f=assert(io.open(R..'/public/assets/sprites/player/knotz_m2_meta.json','w')); f:write(json.encode(meta)); f:close()
