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
 -- Trouser seams, reinforced knees, boot cuffs, toe caps and laced insteps.
 K.line(im,20,y+4,back[1][1],back[1][2],'olive1')
 K.line(im,26,y+4,front[1][1]+2,front[1][2]-2,'olive5')
 K.rect(im,front[1][1],front[1][2],3,2,'sand2'); K.px(im,front[1][1],front[1][2],'sand4')
 for _,foot in ipairs({back[2],front[2]}) do
  K.rect(im,foot[1],foot[2]-3,4,3,'steel2')
  K.line(im,foot[1],foot[2]-3,foot[1]+2,foot[2]-3,'sand3')
  K.px(im,foot[1]+1,foot[2]-2,'steel5')
  K.px(im,foot[1]+4,foot[2],'steel4')
  K.line(im,foot[1],foot[2]+1,foot[1]+5,foot[2]+1,'steel2')
 end
 K.px(im,front[2][1],front[2][2]-1,'steel4')
 K.outline(im,'outline')
end
local head={
 '....22222222....', '..22344444322...', '.2234555444332..', '.23444444443322.', '2233333333333332', '.22rrrrrrr22222.', '..assssssssaa...', '..ashtsssoossaa.', '...astsssssaaa..', '...aasssaaaaa...', '....aasssssa....', '.....aaaaaa.....'}
function P.head(im,x,y,band,pose)
 local K=P.K
 K.grid(im,head,{['2']='olive2',['3']='olive3',['4']='olive4',['5']='olive5',r='red3',a='skin2',s='skin4',h='skin5',t='skin3',o='outline'},x,y)
 if pose then
  -- Rolled rim, scuffed dome and the leather chin strap below the ear.
  K.line(im,x+1,y+4,x+14,y+4,'olive1')
  K.line(im,x+2,y+3,x+10,y+3,'olive5'); K.px(im,x+3,y+2,'sand5')
  K.line(im,x+12,y+1,x+13,y+3,'olive2')
  K.line(im,x+3,y+6,x+4,y+9,'sand1'); K.line(im,x+4,y+9,x+9,y+10,'sand2')
  K.px(im,x+4,y+8,'sand4'); K.px(im,x+3,y+7,'skin5')
  K.line(im,x+3,y+5,x+9,y+5,'red4'); K.px(im,x+3,y+5,'red5')
 end
 if band~=false then
  local flutter=pose and (pose.flutter or 0) or 0
  K.line(im,x+2,y+6,x-3,y+8+flutter,'red3')
  K.line(im,x-3,y+8+flutter,x-6,y+7+flutter,'red4')
  K.line(im,x+1,y+7,x-2,y+11-flutter,'red2')
  K.line(im,x-2,y+11-flutter,x-5,y+10-flutter,'red3')
  K.px(im,x-3,y+7+flutter,'red5')
 end
end
-- Gun coordinates are local to the grip: u along aim, v across the barrel.
-- All profiles terminate at the legacy socket, including the short crouch-down barrel.
function P.gun(im,sx,sy,ang,len,weapon,phase)
 local K=P.K; local dx,dy=math.cos(ang),math.sin(ang); local nx,ny=-dy,dx
 local function point(u,v) return math.floor(sx+dx*u+nx*v+.5),math.floor(sy+dy*u+ny*v+.5) end
 local function stroke(u,v,u2,v2,col)
  local x,y=point(u,v); local ex,ey=point(u2,v2); K.line(im,x,y,ex,ey,col)
 end
 local function box(u,v,w,h,col) for j=v,v+h-1 do stroke(u,j,u+w-1,j,col) end end
 if weapon=='pistol' then
  box(0,-2,len+1,3,'steel1'); box(1,-2,len-2,1,'steel5')
  box(2,-1,len-3,1,'steel3'); box(0,1,4,4,'sand1'); stroke(1,2,2,4,'sand3')
  box(len-1,-3,1,1,'steel1')
 elseif weapon=='rocket' then
  -- Broad olive launch tube, open dark muzzle and red warhead collar.
  box(-6,-3,len+7,7,'olive1'); box(-5,-3,len+5,2,'olive4')
  box(-5,-1,len+5,3,'olive3'); box(-5,2,len+5,2,'olive2')
  stroke(4,-3,len-5,-3,'olive5'); stroke(5,1,len-5,1,'olive2')
  box(3,-3,2,7,'sand2'); stroke(3,-3,4,-3,'sand4')
  box(len-5,-3,1,7,'olive1'); stroke(7,-1,9,-1,'sand4')
  box(-6,-4,2,9,'steel2'); box(len-2,-3,3,7,'steel1')
  box(len-2,-2,1,5,'red4'); box(len,-1,1,3,'outline')
  box(0,-5,5,2,'steel2'); stroke(1,-5,3,-5,'sand4')
 elseif weapon=='laser' then
  -- Squared energy receiver, mint charge cells and a forked emitter.
  box(-3,-3,12,6,'steel1'); box(-2,-3,10,2,'steel4')
  box(-2,-1,10,3,'steel2'); box(3,3,4,3,'steel1')
  box(8,-2,len-7,4,'steel3'); stroke(9,-2,len,-2,'steel5')
  stroke(9,2,len,2,'steel1'); box(len,-1,1,3,'weird4')
  for u=0,6,3 do box(u,-1,2,2,(phase==2 and 'weird5' or 'weird4')) end
  box(-3,-2,1,3,'weird2')
 elseif weapon=='flame' then
  -- Brass pressure chamber and perforated nozzle; fuel hose hangs below grip.
  box(-3,-2,9,6,'sand1'); box(-2,-2,7,2,'sand4')
  box(-2,0,7,3,'sand2'); box(5,-1,len-4,3,'steel2')
  stroke(6,-1,len,-1,'steel4'); box(len-3,-2,4,5,'steel1')
  for u=len-3,len-1,2 do box(u,-2,1,2,'sand3') end
  stroke(-2,3,-5,6,'dirt1'); stroke(-5,6,-9,4,'sand2')
  box(len,0,1,1,phase==3 and 'fire5' or 'fire3')
 elseif weapon=='shotgun' then
  -- Walnut stock, twin dark barrel/tube silhouette, ribbed sliding pump, red saddle shells.
  box(-7,-1,8,4,'dirt2'); stroke(-7,-1,-1,-1,'dirt5'); stroke(-6,2,-2,2,'dirt3')
  box(-1,-3,7,5,'steel1'); stroke(0,-3,5,-3,'steel5'); box(0,-1,4,2,'steel3')
  box(5,-3,len-4,2,'steel2'); stroke(6,-3,len,-3,'steel5')
  box(5,0,len-5,2,'steel1'); stroke(6,0,len-2,0,'steel3')
  local pump=type(phase)=='number' and phase<0 and -3 or 0
  box(7+pump,1,5,3,'dirt2'); stroke(7+pump,1,11+pump,1,'dirt5')
  for u=7+pump,11+pump,2 do stroke(u,2,u,3,'sand1') end
  for u=0,4,2 do box(u,-1,1,2,'red4'); box(u,1,1,1,'sand4') end
  box(len,-4,1,2,'steel1'); box(len,-2,1,2,'outline')
 elseif weapon=='spread' then
  box(-4,-2,6,4,'dirt2'); stroke(-4,-2,0,-2,'dirt5')
  box(1,-2,len,2,'steel2'); stroke(2,-2,len,-2,'steel5')
  box(3,0,len-3,2,'steel1'); box(5,1,5,2,'sand3')
  for u=5,9,2 do stroke(u,1,u,2,'sand1') end
 else
  -- HMG: long vented cooling jacket, stock and hanging ammunition belt.
  box(-5,-2,9,5,'steel2'); stroke(-5,-2,3,-2,'steel4')
  box(4,-2,len-3,5,'steel1'); stroke(4,-2,len,-2,'steel5')
  stroke(4,-1,len,-1,'steel3'); stroke(4,1,len,1,'steel2')
  for u=5,len-2,3 do box(u,-1,1,2,'outline') end
  box(0,3,4,3,'sand2'); stroke(-6,0,-3,2,'sand3')
  for u=-2,2,2 do box(u,3+(u+2)//2,1,2,'sand4') end
 end
end
function P.torso(im,pose)
 local K=P.K; pose=pose or {}; local bob=pose.bob or 0; local cy=pose.crouch and 6 or 0
 local y=23+bob+cy; local rx=pose.recoil or 0; local phase=pose.phase or 1
 local breathe=phase==2 and 1 or 0
 -- Backpack, shaded shirt, folded collar and two canvas shoulder straps.
 if pose.weapon=='flame' then
  K.rect(im,12,y-1,5,11,'sand1'); K.rect(im,12,y,3,9,'sand3')
  K.line(im,13,y,13,y+6,'sand5'); K.rect(im,12,y+3,5,2,'red2')
  K.rect(im,13,y-2,2,2,'steel3')
 end
 K.rect(im,17,y-breathe,12,10+breathe,'olive1'); K.rect(im,18,y-breathe,10,8+breathe,'olive3')
 K.rect(im,18,y,3,6,'olive4'); K.line(im,18,y+1,18,y+4,'olive5')
 K.line(im,27,y+4,27,y+7,'olive2'); K.line(im,21,y+5,23,y+6,'olive2')
 K.rect(im,19,y,2,9,'sand3'); K.line(im,19,y,19,y+5,'sand5')
 K.rect(im,25,y+1,2,8,'sand2'); K.px(im,25,y+2,'sand4')
 K.rect(im,17,y+7,13,3,'sand1'); K.line(im,18,y+7,28,y+7,'sand3')
 K.rect(im,18,y+7,4,3,'sand3'); K.line(im,18,y+7,21,y+7,'sand5'); K.px(im,20,y+8,'sand1')
 K.rect(im,25,y+6,4,4,'sand2'); K.line(im,25,y+6,28,y+6,'sand4'); K.px(im,27,y+7,'sand5')
 K.rect(im,22,y+8,2,2,'steel4'); K.px(im,22,y+8,'sand5')
 P.head(im,16-rx,12+bob+cy,true,{flutter=({0,-1,1,0})[phase],phase=phase})
 -- Profile: brow, blink, broad nose, cheek highlight, stubble and chin strap.
 K.line(im,25-rx,18+bob+cy,28-rx,18+bob+cy,'skin1')
 if pose.blink then K.line(im,27-rx,19+bob+cy,28-rx,19+bob+cy,'skin2')
 else K.px(im,27-rx,19+bob+cy,'white'); K.px(im,28-rx,19+bob+cy,'outline') end
 K.rect(im,29-rx,20+bob+cy,3,2,'skin4'); K.px(im,29-rx,20+bob+cy,'skin5')
 K.px(im,26-rx,21+bob+cy,'skin5')
 K.line(im,26-rx,23+bob+cy,29-rx,23+bob+cy,'skin1')
 K.px(im,28-rx,22+bob+cy,'skin3')
 K.rect(im,17,y+2,4,3,'olive4'); K.px(im,18,y+2,'olive5')
 if pose.noGun then K.outline(im,'outline'); return end
 local ang=pose.angle or 0; local dx,dy=math.cos(ang),math.sin(ang); local sx,sy=27-rx,y+4
 local len=pose.barrelLength or (pose.heavy and 15 or 12)
 local reach=pose.weapon=='shotgun' and (pose.pump and 3 or 8) or 6
 P.limb(im,{21,y+2},{24,y+7},{math.floor(sx+dx*reach),math.floor(sy+dy*reach)+2},2,'skin2','skin4')
 P.gun(im,sx,sy,ang,len,pose.weapon or (pose.heavy and 'hmg' or 'pistol'),pose.pump and -1 or phase)
 P.limb(im,{27-rx,y+2},{29-rx,y+5},{sx+1,sy+2},2,'skin3','skin5')
 -- Finger separation and thumb on grip remain readable at 1x.
 K.rect(im,sx-1,sy+1,3,3,'skin4'); K.px(im,sx-1,sy+1,'skin5')
 K.px(im,sx+1,sy+3,'skin2'); K.px(im,sx,sy+2,'skin3')
 K.outline(im,'outline')
end
return P
