-- Shared pixel skeleton. Coordinates are integer art pixels; light falls from upper left.
local P={}
function P.use(K) P.K=K end
function P.limb(im,a,b,c,width,base,light)
 local K=P.K
 for i=0,width do K.line(im,a[1]+i,a[2],b[1]+i,b[2],base); K.line(im,b[1]+i,b[2],c[1]+i,c[2],base) end
 K.line(im,a[1],a[2],b[1],b[2],light); K.line(im,b[1],b[2],c[1],c[2],light)
end
function P.legs(im,pose)
 local K=P.K; pose=pose or {}; local y=(pose.crouch and 37 or 32)+(pose.bob or 0); local s=pose.stride or 0; local lift=pose.lift or 0
 K.rect(im,18,y,12,5,'olive2'); K.rect(im,18,y,11,2,'sand2'); K.rect(im,20,y,3,2,'sand4')
 local back=pose.back or {{20-s,y+7},{20-s,45-lift}}
 local front=pose.front or {{26+s,y+7},{26+s,45}}
 P.limb(im,{20,y+3},back[1],back[2],3,'olive2','olive3')
 K.rect(im,back[2][1]-2,back[2][2]-1,8,3,'steel1'); K.rect(im,back[2][1]-2,back[2][2]-1,5,1,'steel3'); K.rect(im,back[2][1]-2,back[2][2]+2,9,1,'outline')
 P.limb(im,{25,y+3},front[1],front[2],4,'olive3','olive4')
 K.rect(im,front[2][1]-1,front[2][2]-1,8,3,'steel1'); K.rect(im,front[2][1]-1,front[2][2]-1,5,1,'steel3'); K.rect(im,front[2][1]-1,front[2][2]+2,9,1,'outline')
 K.line(im,front[1][1],front[1][2],front[1][1]+2,front[1][2]+1,'olive2')
 K.rect(im,front[1][1],front[1][2]-1,3,2,'olive4'); K.px(im,front[1][1],front[1][2]-1,'olive5')
 K.px(im,front[2][1],front[2][2]-1,'steel4')
 K.outline(im,'outline')
end
local head={
 '....22222222....', '..22344444322...', '.2234555444332..', '.23444444443322.', '2233333333333332', '.22rrrrrrr22222.', '..assssssssaa...', '..ashtsssoossaa.', '...astsssssaaa..', '...aasssaaaaa...', '....aasssssa....', '.....aaaaaa.....'}
function P.head(im,x,y,band)
 local K=P.K
 K.grid(im,head,{['2']='olive2',['3']='olive3',['4']='olive4',['5']='olive5',r='red3',a='skin2',s='skin4',h='skin5',t='skin3',o='outline'},x,y)
 if band~=false then K.line(im,x+2,y+6,x-3,y+9,'red3'); K.line(im,x-2,y+9,x-4,y+8,'red4'); K.line(im,x+2,y+7,x-2,y+12,'red2') end
end
function P.torso(im,pose)
 local K=P.K; pose=pose or {}; local bob=pose.bob or 0; local cy=pose.crouch and 6 or 0; local y=23+bob+cy; local rx=pose.recoil or 0
 -- Rounded shirt, folded collar and webbing, with belt overlap hiding split seam.
 K.rect(im,17,y,12,10,'olive2'); K.rect(im,18,y,10,8,'olive3'); K.rect(im,18,y,3,6,'olive4')
 K.rect(im,19,y,2,9,'sand3'); K.rect(im,25,y+1,2,8,'sand2'); K.rect(im,18,y+7,11,3,'sand2'); K.rect(im,19,y+7,3,2,'sand4'); K.rect(im,25,y+7,3,2,'sand3')
 P.head(im,16-rx,12+bob+cy)
 -- The exposed profile: dark brow, a single sharp eye, protruding nose and jaw shadow.
 K.line(im,25-rx,18+bob+cy,28-rx,18+bob+cy,'skin1')
 K.px(im,27-rx,19+bob+cy,'white'); K.px(im,28-rx,19+bob+cy,'outline')
 K.rect(im,29-rx,20+bob+cy,3,2,'skin4'); K.px(im,29-rx,20+bob+cy,'skin5')
 K.line(im,26-rx,23+bob+cy,29-rx,23+bob+cy,'skin2')
 K.rect(im,17,y+2,4,3,'olive4'); K.px(im,18,y+2,'olive5')
 K.rect(im,24,y+5,3,3,'sand3'); K.px(im,24,y+5,'sand5')
 if pose.noGun then K.outline(im,'outline'); return end
 local ang=pose.angle or 0; local dx,dy=math.cos(ang),math.sin(ang); local sx,sy=27-rx,y+4
 local len=pose.heavy and 15 or 12; local ex,ey=math.floor(sx+dx*len+.5),math.floor(sy+dy*len+.5)
 -- Rear supporting arm.
 P.limb(im,{21,y+2},{25,y+7},{math.floor(sx+dx*5),math.floor(sy+dy*5)+2},3,'skin2','skin4')
 -- Weapon silhouette rotates around grip; layered parallel strokes preserve a metallic top edge.
 local nx,ny=-dy,dx
 local function barrel(off,col)
 K.line(im,math.floor(sx+nx*off),math.floor(sy+ny*off),math.floor(ex+nx*off),math.floor(ey+ny*off),col) end
 barrel(-2,'steel1'); barrel(-1,'steel5'); barrel(0,'steel3'); barrel(1,'steel1')
 if pose.heavy then barrel(2,'steel2'); K.rect(im,sx-4,sy-1,7,5,'steel2'); K.rect(im,sx-4,sy-1,6,1,'steel4'); K.rect(im,sx-2,sy+4,4,3,'sand2'); K.px(im,sx+2,sy,'sand4')
  K.line(im,sx-6,sy,sx-3,sy+2,'sand3')
  for t=6,10,2 do K.px(im,math.floor(sx+dx*t+nx),math.floor(sy+dy*t+ny),'steel5') end
 end
 P.limb(im,{27-rx,y+2},{29-rx,y+5},{sx+1,sy+2},2,'skin3','skin5')
 K.rect(im,sx-1,sy+1,3,3,'skin4'); K.px(im,sx,sy+1,'skin5')
 K.outline(im,'outline')
end
return P
