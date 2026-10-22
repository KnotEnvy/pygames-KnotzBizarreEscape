local K=dofile(app.params.kbe);local root=app.params.root;local cache={}
local function frame(k,tag,i)
 if not cache[k] then local area=k:find('knotz') and 'player' or 'enemies';cache[k]=app.open(root..'/art-src/'..area..'/'..k..'.aseprite') end
 local s=cache[k];local t=nil;for _,a in ipairs(s.tags) do if a.name==k..'_'..tag then t=a end end;t=t or s.tags[1]
 local f=t.fromFrame.frameNumber+(i or 0)%(t.toFrame.frameNumber-t.fromFrame.frameNumber+1);local im=Image(s.width,s.height,ColorMode.RGB)
 for _,l in ipairs(s.layers) do local c=l:cel(f);if c then im:drawImage(c.image,c.position) end end;return im
end
local function draw(im,k,tag,i,x,y) local a=frame(k,tag,i);im:drawImage(a,Point(x-a.width//2,y-a.height)) end
local function boss(im,k,pose,tier,i,x,y)
 draw(im,k,pose..tier,i,x,y)
 if k=='shellshock' and pose~='spin' and pose~='spin_cue' then draw(im,'shellshock_head',(pose=='death' and 'death' or 'idle')..tier,i,x-48,y-11) end
end
local function save(im,name)
 local s=Sprite(im.width,im.height,ColorMode.RGB);s:newCel(s.layers[1],1,im,Point(0,0));s:resize(im.width*3,im.height*3);s:saveAs('/tmp/kbe-enemies-b/'..name..'.png');s:close()
end
local im=Image(560,150,ColorMode.RGB);K.rect(im,0,0,560,150,'ink1')
for _,x in ipairs({30,285}) do draw(im,'knotz_legs','idle',0,x,130);draw(im,'knotz_torso_pistol','idle',0,x,130) end
boss(im,'shellshock','idle','',0,150,130);boss(im,'skeeter','idle','',0,420,120);save(im,'silhouettes')
if app.params.silhouette~='1' then
 for _,k in ipairs({'shellshock','skeeter','shellshock_head'}) do local poses=k=='shellshock' and {'idle','intro','eggs','spin_cue','spin','death'} or k=='shellshock_head' and {'idle','hiss','cue_high','cue_low','snap','death'} or {'idle','intro','laser','dive','stuck','larva','fan_cue','fan','death'}
 local w,h=180,100;local im=Image(w*4,h*#poses*3,ColorMode.RGB);K.rect(im,0,0,im.width,im.height,'ink1')
 for ti,t in ipairs({'','_damaged','_critical'}) do for row,p in ipairs(poses) do for col=0,3 do local y=((ti-1)*#poses+row)*h-4
  boss(im,k,p,t,col,col*w+100,y);K.line(im,col*w,y+2,(col+1)*w-2,y+2,'steel3')
 end end end;save(im,'states-'..k)
 end
 local keys={'lurker','piranha','hopper','gnat','airboat'};local im=Image(400,500,ColorMode.RGB);K.rect(im,0,0,400,500,'ink1')
 local poses={lurker={'idle','rise','shoot','death_launched'},hopper={'idle','crouch','tongue_cue','death'},airboat={'cruise','gun_cue','fire','sink'},piranha={'swim','bulge','bite','break'},gnat={'hover','dive_cue','dive','pop'}}
 for row,k in ipairs(keys) do for col,p in ipairs(poses[k]) do draw(im,k,p,col-1,col*100-50,row*100-10) end end;save(im,'states-roster')
end
