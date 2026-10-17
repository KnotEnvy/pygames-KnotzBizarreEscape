local K=dofile(app.params.kbe)
local R=app.params.root
local P=dofile(R..'/art-src/player/lib/poses.lua'); P.use(K)
local function build(name,w,h,anims)
 K.build{name=name,w=w,h=h,src=R..'/art-src/player/'..name..'.aseprite',sheet=R..'/public/assets/sprites/player/'..name..'.png',data=R..'/public/assets/sprites/player/'..name..'.json',anims=anims}
end
local function anim(name,n,ms,fn)
 local a={tag=name,ms=ms,frames={}}; for i=1,n do local j=i; a.frames[i]={grid=function(im) fn(im,j) end} end; return a
end
local legs={}
local function leg(tag,n,ms,fn) legs[#legs+1]=anim('knotz_legs_'..tag,n,ms,function(im,i) P.legs(im,fn(i)) end) end
leg('idle',4,140,function(i)return{bob=({0,0,1,0})[i]}end)
-- Contact, down/recoil, passing, up; then exchange support legs.
-- Runtime attachment bob/sway uses these exact eight indices.
local run={
 {bob=1,back={{17,39},{14,45}},front={{29,39},{32,45}}},
 {bob=0,back={{17,38},{18,42}},front={{27,40},{29,45}}},
 {bob=-1,back={{22,36},{26,40}},front={{25,39},{24,45}}},
 {bob=0,back={{28,37},{30,42}},front={{21,40},{18,44}}},
 {bob=1,back={{29,39},{32,45}},front={{17,39},{14,45}}},
 {bob=0,back={{27,40},{29,45}},front={{17,38},{18,42}}},
 {bob=-1,back={{25,39},{24,45}},front={{22,36},{26,40}}},
 {bob=0,back={{21,40},{18,44}},front={{28,37},{30,42}}},
}
leg('run',8,65,function(i)return run[i] end)
leg('skid',2,80,function(i)return{stride=6-i}end)
leg('jump_rise',1,100,function()return{bob=-1,back={{18,36},{14,40}},front={{28,37},{29,43}}}end)
leg('jump_fall',1,100,function()return{back={{18,39},{18,44}},front={{28,40},{31,45}}}end)
leg('land',2,65,function(i)return i==1 and {bob=3,back={{16,42},{15,45}},front={{30,42},{32,45}}} or {bob=0,stride=2} end)
leg('crouch_enter',2,65,function(i)return{crouch=i==2,stride=1}end)
leg('crouch_idle',1,150,function()return{crouch=true,stride=1}end)
leg('crouch_walk',6,100,function(i)return{crouch=true,stride=({0,2,3,0,-2,-3})[i],lift=i%2}end)
build('knotz_legs',48,48,legs)
-- The crouched heavy down barrel is 12 px so its tip and outline fit above the feet.
local dirs={{'aim_fwd',0},{'aim_up45',-math.pi/4},{'aim_up',-math.pi/2},{'aim_down45',math.pi/4},{'aim_down',math.pi/2},{'crouch_fwd',0},{'crouch_down45',math.pi/4},{'crouch_down',math.pi/2}}
for _,variant in ipairs({'pistol','heavy'}) do
 local a={}; for _,d in ipairs(dirs) do
  for _,shoot in ipairs({false,true}) do
   local name='knotz_'..variant..'_'..d[1]..(shoot and '_shoot' or '')
   a[#a+1]=anim(name,shoot and 3 or 4,shoot and 45 or 140,function(im,i)
    P.torso(im,{angle=d[2],heavy=variant=='heavy',crouch=d[1]:match('^crouch_')~=nil,barrelLength=d[1]=='crouch_down' and 12 or nil,bob=0,recoil=shoot and (variant=='pistol' and ({1,1,0})[i] or ({2,1,0})[i]) or 0})
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
 build('knotz_torso_'..variant,48,48,a)
end
local function full(im,pose) P.legs(im,pose); P.torso(im,pose) end
build('knotz_full',48,48,{
 anim('knotz_death',12,{65,65,70,70,80,90,90,110,110,110,110,110},function(im,i)
  if i<3 then full(im,{recoil=2,crouch=i==2,angle=-.6})
  elseif i<7 or i<10 or i%2==0 then
   local temp=Image(48,48,ColorMode.RGB)
   full(temp,{stride=i<7 and 4 or 1,lift=i<7 and 5 or 0,angle=-1,noGun=true})
   local ys= i<7 and .75 or .43
   local base= i<7 and (26+(i-3)*3) or (i==7 and 38 or 43)
   for y=0,47 do for x=0,47 do
    local c=temp:getPixel(x,y)
    if app.pixelColor.rgbaA(c)>0 then
     local xx=math.floor(24+(y-28)*.85)
     local yy=math.floor(base-(x-24)*ys)
     if xx>=0 and xx<48 and yy>=0 and yy<48 then im:drawPixel(xx,yy,c) end
    end
   end end
  end
 end),
 anim('knotz_respawn_drop',4,80,function(im,i) full(im,{stride=({-3,-2,3,0})[i],lift=i<3 and 4 or 0,crouch=i==3,angle=-.5}) end),
 anim('knotz_victory',6,130,function(im,i)
  P.legs(im,{}); P.torso(im,{angle=-1.2,noGun=true}); P.limb(im,{27,25},{33,25},{({34,33,30,30,30,33})[i],({19,16,15,15,15,16})[i]},3,'skin3','skin5'); K.outline(im,'outline')
 end)})
-- Projectiles: local forward direction is +X. Runtime rotates the complete sprite.
for _,v in ipairs({{'pistol_bullet',8,6},{'hmg_bullet',16,6},{'spread_bullet',8,8}}) do
 build(v[1],v[2],v[3],{anim(v[1]..'_fly',1,80,function(im)
  K.line(im,1,math.floor(v[3]/2),v[2]-2,math.floor(v[3]/2),'sand5'); K.line(im,v[2]-4,math.floor(v[3]/2)-1,v[2]-2,math.floor(v[3]/2)-1,'white'); K.outline(im,'sand2')
 end)})
end
build('rocket',24,12,{anim('rocket_fly',4,55,function(im,i)
 K.rect(im,7,4,12,4,'steel2'); K.rect(im,8,3,9,2,'steel4'); K.line(im,18,4,21,6,'sand4'); K.line(im,21,6,18,7,'sand2'); K.line(im,7,3,5,1,'red3'); K.line(im,7,7,5,10,'red2'); K.rect(im,9,4,2,4,'red4'); K.line(im,6,5,math.max(0,5-i),5,'fire3'); K.line(im,6,6,math.max(0,4-i),6,'fire5'); K.outline(im,'outline')
end)})
build('flame',48,32,{anim('flame_flow',8,55,function(im,i)
 local size=3+i; for j=0,4 do local x=7+j*6; local y=16+math.floor(math.sin(i+j)*2); local r=math.max(2,size-j); K.disc(im,x,y,r,'fire2'); K.disc(im,x-1,y-1,math.max(1,r-2),'fire3'); K.disc(im,x-2,y-2,math.max(1,r-4),'fire5') end
 K.line(im,1,16,15,15,'fire6'); for j=1,3 do K.px(im,33+j*3,8+(i*j)%15,'fire4') end
end)})
build('grenade',12,12,{anim('grenade_spin',4,85,function(im,i)
 K.disc(im,6,6,3,'olive2'); K.disc(im,5,5,2,'olive4'); K.line(im,4,6,8,6,'olive1'); K.line(im,6,4,6,8,'olive2'); local a=(i-1)*math.pi/2; K.line(im,6,6,6+math.floor(math.cos(a)*4),6+math.floor(math.sin(a)*4),'steel4'); K.outline(im,'outline'); K.px(im,5,4,'sand5'); K.px(im,6,3,'white')
end)})
-- Diegetic stencil glyphs on supply crates, not interface typography.
local glyphs={H={'10001','10001','10001','11111','10001','10001','10001'},S={'01111','10000','10000','01110','00001','00001','11110'},R={'11110','10001','10001','11110','10100','10010','10001'},F={'11111','10000','10000','11110','10000','10000','10000'},B={'11110','10001','10001','11110','10001','10001','11110'}}
for _,letter in ipairs({'H','S','R','F','B'}) do
 build('pickup_'..letter:lower(),20,20,{anim('pickup_'..letter:lower()..'_shine',4,150,function(im,i)
  K.rect(im,2,3,16,15,'sand1'); K.rect(im,3,4,14,12,'sand3'); K.rect(im,4,5,12,10,'olive2'); K.line(im,3,4,16,4,'sand5'); K.line(im,3,5,3,15,'sand4'); K.line(im,4,16,16,16,'sand2');
  K.grid(im,glyphs[letter],{['1']='sand5',['0']='olive2'},7,7)
  for _,p in ipairs({{4,5},{15,5},{4,15},{15,15}}) do K.px(im,p[1],p[2],'steel1') end
  K.line(im,4+i*3,5,6+i*3,5,'white'); K.outline(im,'outline')
 end)})
end
local foods={'fish','chicken','medal','ration','life'}
for _,name in ipairs(foods) do
 build('pickup_'..name,20,20,{anim('pickup_'..name..'_shine',4,160,function(im,i)
  if name=='fish' then
   K.disc(im,10,11,4,'sky3'); K.disc(im,9,10,3,'sky4'); K.line(im,6,10,3,7,'sky4'); K.line(im,3,7,3,14,'sky3'); K.line(im,3,14,6,12,'sky3'); K.px(im,12,9,'white'); K.px(im,13,10,'outline'); K.line(im,8,13,11,13,'sand5')
  elseif name=='chicken' then
   K.disc(im,9,11,5,'dirt3'); K.disc(im,8,9,3,'dirt5'); K.disc(im,12,12,3,'dirt4'); K.line(im,13,10,16,7,'sand5'); K.disc(im,16,6,1,'white'); K.disc(im,17,7,1,'sand5'); K.px(im,7,8,'sand4')
  elseif name=='medal' then
   K.rect(im,5,3,4,6,'red3'); K.rect(im,10,3,4,6,'sky3'); K.disc(im,9,12,5,'sand2'); K.disc(im,9,11,4,'sand4'); K.disc(im,8,10,2,'sand5'); K.line(im,9,8,9,14,'sand2'); K.line(im,6,11,12,11,'sand2'); K.px(im,9,10,'white')
  elseif name=='ration' then
   K.rect(im,5,5,10,11,'steel2'); K.rect(im,6,6,8,9,'olive3'); K.rect(im,6,5,8,2,'steel5'); K.rect(im,6,14,8,2,'steel3'); K.rect(im,7,8,5,4,'sand4'); K.line(im,7,6,7,14,'olive5'); K.line(im,8,10,11,10,'olive2')
  else
   P.head(im,2,3,false); K.rect(im,4,15,12,3,'sand2'); K.line(im,5,15,14,15,'sand5'); K.line(im,10,15,10,17,'sand5')
  end
  K.outline(im,'outline'); K.px(im,({4,5,14,15})[i],({4,3,4,5})[i],'sand5')
 end)})
end
-- POW: scruffy hair, oversized beard, knotted rope and expressive raised eyebrows.
local function pow(im,i,state)
 local bob=(i%4==3) and 1 or 0; local run=state=='run_away'; local y=run and 10 or 12+bob
 K.rect(im,11,y+13,10,6,'sand2'); K.rect(im,12,y+13,8,4,'sand3')
 local s=run and ({0,3,4,2,0,-3,-4,-2})[i] or 0
 P.limb(im,{12,y+18},{12-s,33},{12-s,37},2,'skin2','skin4'); P.limb(im,{18,y+18},{18+s,33},{18+s,37},2,'skin3','skin5'); K.rect(im,10-s,37,6,2,'skin2'); K.rect(im,17+s,37,6,2,'skin2')
 K.rect(im,11,y+6,10,10,'skin3'); K.rect(im,12,y+7,4,8,'skin4'); K.rect(im,13,y+7,1,6,'skin5')
 K.disc(im,16,y,6,'sand1'); K.disc(im,16,y+1,5,'skin4'); K.line(im,11,y-4,20,y-4,'sand3'); K.line(im,11,y-3,10,y,'sand4');
 K.rect(im,11,y+3,11,5,'sand2'); K.rect(im,12,y+6,8,3,'sand2'); K.line(im,12,y+3,12,y+6,'sand4'); K.line(im,15,y+4,15,y+8,'sand3'); K.line(im,18,y+4,18,y+7,'sand3'); K.px(im,13,y+8,'sand2'); K.px(im,18,y+9,'sand2'); K.px(im,20,y+6,'sand1'); K.px(im,14,y,'outline'); K.px(im,19,y,'outline'); K.line(im,13,y-2,15,y-2,'sand1'); K.line(im,18,y-2,20,y-2,'sand1'); K.px(im,17,y+2,'skin5')
 if state=='tied_idle' or (state=='freed' and i<3) then
  P.limb(im,{11,y+7},{9,y+12},{15,y+13},2,'skin3','skin5'); P.limb(im,{21,y+7},{23,y+12},{17,y+13},2,'skin2','skin4');
  for j=0,2 do K.line(im,10,y+10+j*2,22,y+10+j*2,'sand4') end; K.disc(im,16,y+12,2,'sand1'); K.px(im,15,y+11,'sand5')
 else
  local hx=state=='salute' and ({25,21,21,24})[i] or state=='give_item' and ({21,24,27,27})[i] or run and 24+s or 24
  local hy=state=='salute' and y+({2,-3,-3,0})[i] or state=='give_item' and y+({11,9,7,7})[i] or y+12
  P.limb(im,{21,y+7},{25,y+10},{hx,hy+(i%2)},2,'skin3','skin5'); P.limb(im,{11,y+7},{8,y+12},{run and 7-s or 9,y+16},2,'skin2','skin4')
  if state=='salute' and (i==2 or i==3) then K.line(im,12,y-3,15,y-4,'sand1'); K.line(im,18,y-4,21,y-3,'sand1'); K.px(im,23,y-5,'white') end
  if state=='give_item' and i<4 then K.rect(im,hx-3,hy-5,6,5,'olive2'); K.rect(im,hx-2,hy-4,4,3,'sand4'); K.px(im,hx-1,hy-3,'white') end
 end
 K.outline(im,'outline')
end
local pa={}; for _,v in ipairs({{'tied_idle',4,160},{'freed',4,100},{'salute',4,{90,140,180,90}},{'give_item',4,120},{'run_away',8,80}}) do local state=v[1]; pa[#pa+1]=anim('pow_'..state,v[2],v[3],function(im,i)pow(im,i,state)end) end
build('pow',32,40,pa)

-- The same authored grip/rounding drives exported sockets, including 1px pistol recoil.
local metaPath=R..'/public/assets/sprites/player/knotz_meta.json'
local file=io.open(metaPath,'r')
if file then
 -- Aseprite JSON objects expose copies on lookup; use ordinary Lua tables while editing.
 local function plain(value)
  if type(value)~='table' and type(value)~='userdata' then return value end
  local result={}; for key,item in pairs(value) do result[key]=plain(item) end; return result
 end
 local meta=plain(json.decode(file:read('*a'))); file:close()
 for _,variant in ipairs({'pistol','heavy'}) do for _,d in ipairs(dirs) do for _,shoot in ipairs({false,true}) do
  local tag='knotz_'..variant..'_'..d[1]..(shoot and '_shoot' or '')
  meta.muzzles[tag]=meta.muzzles[tag] or {angleRadians=d[2],frames={},note='Coordinate is barrel end; spawn FX and projectile here. Recoil is already included.'}
  local frames={}
  meta.muzzles[tag].frames=frames
  for i=1,(shoot and 3 or 4) do frames[i]={direction={math.cos(d[2]),math.sin(d[2])}} end
  for i,f in ipairs(frames) do
   local rx=shoot and (variant=='pistol' and ({1,1,0})[i] or ({2,1,0})[i]) or 0
   local len=variant=='heavy' and d[1]~='crouch_down' and 15 or 12
   local x=math.floor(27-rx+math.cos(d[2])*len+.5)
   local y=math.floor(27+(d[1]:match('^crouch_') and 6 or 0)+math.sin(d[2])*len+.5)
   f.framePx={x,y}; f.offsetFromFeet={x-24,y-48}
  end
 end end end
 -- Keep inventory frame ranges in sync when torso tags are added.
 for _,variant in ipairs({'pistol','heavy'}) do
  local key='knotz_torso_'..variant
  local atlasFile=assert(io.open(R..'/public/assets/sprites/player/'..key..'.json','r'))
  local atlas=json.decode(atlasFile:read('*a')); atlasFile:close()
  local tags={}; local count=0
  for _,tag in ipairs(atlas.meta.frameTags) do
   tags[#tags+1]={name=tag.name,from=tag.from,to=tag.to,frames=tag.to-tag.from+1,loop=not (tag.name:match('_shoot$') or tag.name:match('_knife$') or tag.name:match('_grenade_throw$'))}
   count=math.max(count,tag.to+1)
  end
  meta.inventory[key]={canvas={48,48},frameCount=count,tags=tags}
 end
 local out=assert(io.open(metaPath,'w')); out:write(json.encode(meta)); out:close()
end
