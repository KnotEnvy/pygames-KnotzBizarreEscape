-- Phase E laser assets. Rebuild: bash game/tools/build-art.sh art-src/player/laser.lua
local K=dofile(app.params.kbe)
local R=app.params.root
local function build(name,w,h,tag,n,ms,draw)
 local frames={}; for i=1,n do local j=i; frames[i]={grid=function(im) draw(im,j) end} end
 K.build{name=name,w=w,h=h,src=R..'/art-src/player/'..name..'.aseprite',sheet=R..'/public/assets/sprites/player/'..name..'.png',data=R..'/public/assets/sprites/player/'..name..'.json',anims={{tag=tag,ms=ms,frames=frames}}}
end
build('laser_beam',64,8,'laser_beam_fly',3,35,function(im,i)
 K.rect(im,2,2,59,4,'weird2'); K.rect(im,1,3,62,2,'weird4'); K.rect(im,5,3,56,1,'white')
 for x=4+i,58,10 do K.line(im,x,2,x+3,2,'weird5'); K.px(im,x+2,5,'weird5') end
 K.line(im,0,3,0,4,'outline'); K.line(im,63,3,63,4,'weird5')
end)
build('laser_muzzle',20,16,'laser_muzzle_flash',3,35,function(im,i)
 K.disc(im,9,8,6-i,'weird2'); K.disc(im,9,8,4-i,'weird4'); K.line(im,2,8,18-i,8,'white')
 K.line(im,7,8,12+i,3+i,'weird5'); K.line(im,7,8,12+i,13-i,'weird5')
end)
build('laser_impact',20,20,'laser_impact_flash',3,35,function(im,i)
 K.disc(im,9,9,5-i,'weird3'); K.disc(im,9,9,3-i,'white')
 for _,v in ipairs({{-1,-1},{1,-1},{-1,1},{1,1}}) do
  K.line(im,9+v[1]*(3+i),9+v[2]*(2+i),9+v[1]*(5+i),9+v[2]*(4+i),'weird5')
 end
end)
build('pickup_l',20,20,'pickup_l_shine',4,150,function(im,i)
 K.rect(im,2,3,16,15,'sand1'); K.rect(im,3,4,14,12,'sand3'); K.rect(im,4,5,12,10,'olive2')
 K.line(im,3,4,16,4,'sand5'); K.line(im,3,5,3,15,'sand4'); K.line(im,4,16,16,16,'sand2')
 K.grid(im,{'10000','10000','10000','10000','10000','10000','11111'},{['1']='sand5',['0']='olive2'},7,7)
 for _,p in ipairs({{4,5},{15,5},{4,15},{15,15}}) do K.px(im,p[1],p[2],'steel1') end
 K.line(im,4+i*3,5,6+i*3,5,'white'); K.outline(im,'outline')
end)
