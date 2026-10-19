-- Enlarged boss contacts, assembled using the shipped rig. Rows: idle, intro,
-- 66%, 33%, attacks, death; columns sample four different frames.
local K=dofile(app.params.kbe)
local root=app.params.root
local cache={}
local function source(n)
 if not cache[n] then cache[n]=app.open(root..'/art-src/enemies/'..n..'.aseprite') end
 return cache[n]
end
local function frame(n,tag,i)
 local s=source(n);local t=nil
 for _,v in ipairs(s.tags) do if v.name==n..'_'..tag then t=v end end
 assert(t,'Missing '..n..'_'..tag)
 local fn=t.fromFrame.frameNumber+(i or 0)%(t.toFrame.frameNumber-t.fromFrame.frameNumber+1)
 local im=Image(s.width,s.height,ColorMode.RGB)
 for _,l in ipairs(s.layers) do local c=l:cel(fn);if c then im:drawImage(c.image,c.position) end end
 return im
end
local function save(im,n)
 local s=Sprite(im.width,im.height,ColorMode.RGB);s:newCel(s.layers[1],1,im,Point(0,0));s:resize(im.width*3,im.height*3);s:saveAs('/tmp/kbe-enemies/f-'..n..'.png');s:close()
end
for _,n in ipairs({'snowcat','ironhorn'}) do
 local w,h=224,128
 local rows=n=='snowcat' and {'idle','intro','damaged','critical','charge','mortar','mg','death'} or {'idle','intro','damaged','critical','cannon','cinder','coal','grenade','death'}
 local im=Image(w*4,h*#rows,ColorMode.RGB);K.rect(im,0,0,im.width,im.height,'ink1')
 for row,pose in ipairs(rows) do for col=0,3 do
  local x=col*w+112;local y=row*h-8
  local hullPose=(pose=='cannon' and 'idle' or pose=='cinder' and 'damaged' or (pose=='coal' or pose=='grenade') and 'core' or pose)
  local sample=pose=='intro' and ({0,2,5,7})[col+1] or n=='ironhorn' and col*2 or col
  im:drawImage(frame(n,hullPose,sample),Point(x-source(n).width/2,y-source(n).height))
  if n=='snowcat' then im:drawImage(frame('warden',pose=='intro' and 'salute' or pose=='death' and 'eject' or pose=='mg' and 'fire' or 'taunt',col),Point(x-24,y-36-80))
  else
   for _,p in ipairs({{-68,-40},{-43,-55}}) do im:drawImage(frame('ironhorn_turret',pose=='intro' and 'intro' or (row==3 or row==4 or row>=6) and 'broken' or pose=='cannon' and 'fire' or 'idle',col),Point(x+p[1]-24,y+p[2]-32)) end
   if pose=='coal' or pose=='grenade' then im:drawImage(frame('driver','throw',col),Point(x-17-24,y-49-80)) end
  end
  if pose=='cinder' or pose=='coal' or pose=='grenade' then
   local key=pose=='grenade' and 'enemy_grenade' or pose
   im:drawImage(frame(key,'fuse',col),Point(x-50-col*9,y-75-math.floor(math.sin(col/3*math.pi)*22)))
  end
  if pose=='death' then for j=0,2 do im:drawImage(frame('moosezilla_debris',j==0 and 'plate' or j==1 and 'gear' or 'pipe',0),Point(x-70+j*40,y-40-j*6)) end end
  K.line(im,col*w,row*h-4,(col+1)*w-2,row*h-4,'steel3')
 end end
 save(im,n)
end
local file=io.open(root..'/public/assets/sprites/enemies/moosezilla_rig.json');local raw=json.decode(file:read('a'));file:close();local rig={parts={}}
for i=1,#raw.parts do local p=raw.parts[i];rig.parts[i]={id=p.id,key=p.key,z=p.z,idleTag=p.idleTag,attach={p.attach[1],p.attach[2]},pivot={p.pivot[1],p.pivot[2]}} end
table.sort(rig.parts,function(a,b)return a.z<b.z end)
local rows={'idle','intro','damaged','critical','cannon','stomp','flame','charge','core','death'}
local w,h=224,152;local im=Image(w*4,h*#rows,ColorMode.RGB);K.rect(im,0,0,im.width,im.height,'ink1')
for row,pose in ipairs(rows) do for col=0,3 do
 local x=col*w+108;local y=row*h-8
 for _,p in ipairs(rig.parts) do
  local id=p.id;local tag=p.idleTag:sub(#p.key+2);local dx,dy=0,0;local skip=false
  if id=='body' then tag=pose=='intro' and 'intro' or pose=='damaged' and 'damaged' or (pose=='critical' or pose=='core' or pose=='death') and 'critical' or 'idle' end
  if id=='armor' then tag=pose=='damaged' and 'damaged' or pose=='critical' and 'critical' or pose=='death' and 'falling' or 'intact';if pose=='death' then dx=-22+col*4;dy=16 end;if pose=='core' then skip=true end end
  if id=='head' then tag=pose=='intro' and 'intro' or pose=='flame' and 'flame' or pose=='death' and 'roar' or 'idle';if pose=='death' then dx=20;dy=32 end end
  if id=='jaw' then tag=(pose=='flame' or pose=='intro') and 'open' or 'closed';if pose=='death' then dx=30;dy=35 end end
  if id:find('antler') then
   tag=pose=='intro' and 'intro' or pose=='damaged' and 'damaged' or pose=='cannon' and 'fire' or pose=='death' and 'broken' or 'idle'
   skip=pose=='critical' or pose=='flame' or pose=='charge' or pose=='core'
   if pose=='death' then dx=25;dy=30 end
  end
  if id:find('legs') then tag=pose=='intro' and 'intro' or pose=='stomp' and 'stomp' or pose=='charge' and 'paw' or 'idle' end
  if not skip then im:drawImage(frame(p.key,tag,col*(pose=='intro' and 2 or 1)),Point(x+p.attach[1]-p.pivot[1]+dx,y+p.attach[2]-p.pivot[2]+dy)) end
 end
 if pose=='death' then for j=0,2 do im:drawImage(frame('moosezilla_debris',j==0 and 'horn' or j==1 and 'plate' or 'gear',0),Point(x-75+j*42,y-54-j*9)) end end
 K.line(im,col*w,row*h-4,(col+1)*w-2,row*h-4,'steel3')
end end
save(im,'moosezilla')
local roster=Image(96*4,76*9,ColorMode.RGB);K.rect(roster,0,0,roster.width,roster.height,'ink1')
local units={
 {'grunt','idle','alert','shoot','death_launched'},
 {'grenadier','idle','alert','throw','death_explosion'},
 {'shield','idle','alert','block','death_launched'},
 {'turret','aim_0','windup_0','fire_0','destroyed'},
 {'drone','fly','dive','fly','destroyed'},
 {'paratrooper','descent','landing','idle','death_launched'},
 {'leaper','leap','landing','leap','landing'},
 {'buzzard','fly','aim','strafe','death'},
 {'hound','run','crouch','leap','death'}
}
for row,u in ipairs(units) do for col=1,4 do
 local n=u[1];local src=source(n)
 roster:drawImage(frame(n,u[col+1],col==1 and 3 or 1),Point((col-1)*96+math.floor((96-src.width)/2),row*76-6-src.height))
 K.line(roster,(col-1)*96,row*76-3,col*96-2,row*76-3,'steel3')
end end
save(roster,'roster')
for _,s in pairs(cache) do s:close() end
print('Boss contacts: f-snowcat.png, f-ironhorn.png, f-moosezilla.png')
