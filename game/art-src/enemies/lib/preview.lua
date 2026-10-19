local K=dofile(app.params.kbe)
local root=app.params.root
local cache={}
local function src(name)
 if not cache[name] then cache[name]=app.open(root..'/art-src/enemies/'..name..'.aseprite') end
 return cache[name]
end
local function frame(name,tag,index)
 local s=src(name); local start,finish=1,1
 for _,t in ipairs(s.tags) do if t.name==tag then start=t.fromFrame.frameNumber; finish=t.toFrame.frameNumber end end
 local fn=start+(index or 0)%(finish-start+1)
 local im=Image(s.width,s.height,ColorMode.RGB)
 for _,l in ipairs(s.layers) do local c=l:cel(fn); if c then im:drawImage(c.image,c.position) end end
 return im
end
local function save(im,path,scale)
 local s=Sprite(im.width,im.height,ColorMode.RGB); s:newCel(s.layers[1],1,im,Point(0,0))
 s:resize(im.width*(scale or 1),im.height*(scale or 1)); s:saveAs('/tmp/kbe-enemies/'..path); s:close()
end
local names={'grunt','grenadier','shield','paratrooper','turret','drone','parachute','enemy_bullet','enemy_grenade','turret_bullet','moosezilla_body','moosezilla_legs_back','moosezilla_legs_front','moosezilla_head','moosezilla_jaw','moosezilla_antler_l','moosezilla_antler_r','moosezilla_armor','moosezilla_core','moosezilla_debris'}
for _,name in ipairs(names) do
 local s=src(name); local im=Image(s.width*8,(s.height+4)*#s.tags,ColorMode.RGB)
 K.rect(im,0,0,im.width,im.height,'ink1')
 for row,t in ipairs(s.tags) do
  for j=0,t.toFrame.frameNumber-t.fromFrame.frameNumber do im:drawImage(frame(name,t.name,j),Point(j*s.width,(row-1)*(s.height+4))) end
  K.rect(im,0,row*(s.height+4)-3,im.width,1,'ink3')
 end
 save(im,name..'-contact.png',3)
end
local parts={
 {'moosezilla_legs_back',52,48,-8,-3,'walk'},
 {'moosezilla_antler_l',8,44,29,-77,'fire'},
 {'moosezilla_body',56,54,-14,-26,'vent'},
 {'moosezilla_core',16,16,-16,-50,'pulse'},
 {'moosezilla_armor',40,20,-16,-52,'intact'},
 {'moosezilla_legs_front',52,48,-14,0,'walk'},
 {'moosezilla_head',12,28,28,-60,'idle'},
 {'moosezilla_jaw',4,4,45,-47,'closed'},
 {'moosezilla_antler_r',8,44,38,-74,'fire'},
}
local s=Sprite(192,144,ColorMode.RGB)
for i=1,8 do
 if i>1 then s:newEmptyFrame() end
 local im=Image(192,144,ColorMode.RGB); K.rect(im,0,0,192,144,'steel1'); K.line(im,0,132,191,132,'sand2')
 for _,p in ipairs(parts) do im:drawImage(frame(p[1],p[1]..'_'..p[6],i-1),Point(92+p[4]-p[2],132+p[5]-p[3])) end
 if i==1 then save(im,'moosezilla-assembled.png',4) end
 s:newCel(s.layers[1],i,im,Point(0,0)); s.frames[i].duration=.1
end
s:resize(768,576); s:saveAs('/tmp/kbe-enemies/moosezilla-assembled.gif'); s:close()
local im=Image(384,216,ColorMode.RGB)
K.rect(im,0,0,128,216,'leaf2'); K.rect(im,128,0,128,216,'dirt2'); K.rect(im,256,0,128,216,'steel2')
for y=32,215,32 do K.line(im,0,y,383,y,'ink2') end
for _,p in ipairs({{'grunt','idle',10,16},{'grenadier','throw',69,16},{'shield','walk',136,16},{'paratrooper','descent',202,16},{'drone','fly',270,23},{'turret','aim_0',327,32}}) do im:drawImage(frame(p[1],p[1]..'_'..p[2],1),Point(p[3],p[4])) end
for i,pose in ipairs({'alert','shoot','crouch_shoot','panic','death_launched','death_flame','death_explosion'}) do im:drawImage(frame('grunt','grunt_'..pose,2),Point(8+(i-1)*53,106)) end
for i,name in ipairs({'enemy_bullet','enemy_grenade','turret_bullet'}) do im:drawImage(frame(name,name..(name=='enemy_grenade' and '_fuse' or '_fly'),0),Point(15+(i-1)*110,184)) end
save(im,'roster.png',4)

local phases=Image(576,144,ColorMode.RGB)
K.rect(phases,0,0,576,144,'steel1')
for phase=1,3 do
 for _,p in ipairs(parts) do
  if not (phase==3 and p[1]=='moosezilla_armor') then
   local tag=p[1]..'_'..p[6]
   if p[1]=='moosezilla_body' and phase>1 then tag=p[1]..(phase==2 and '_damaged' or '_critical') end
   if p[1]:find('antler') and phase>1 then tag=p[1]..'_broken' end
   if p[1]=='moosezilla_head' and phase==2 then tag=p[1]..'_flame' end
   if p[1]=='moosezilla_jaw' and phase==2 then tag=p[1]..'_open' end
   phases:drawImage(frame(p[1],tag,2),Point((phase-1)*192+92+p[4]-p[2],132+p[5]-p[3]))
  end
 end
 K.line(phases,(phase-1)*192,132,phase*192-1,132,'sand2')
end
save(phases,'moosezilla-phases.png',3)

for _,s in pairs(cache) do s:close() end
print('Built contacts, assembled boss animation and roster')
