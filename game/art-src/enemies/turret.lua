local D=dofile(app.params.root..'/art-src/enemies/lib/draw.lua')
local K=D.K
local dirs={{1,0},{1,-1},{0,-1},{-1,-1},{-1,0},{-1,1},{0,1},{1,1}}
local function draw(im,d,pose,f)
  for row=0,1 do for j=0,2 do
    local x=2+j*9-(row%2)*2; local y=22+row*4
    D.box(im,x,y,11,6,'sand3','sand5','sand1'); D.line(im,x+3,y+3,x+7,y+3,'sand2')
  end end
  D.box(im,10,17,13,8,'steel2','steel4','steel1')
  D.disc(im,16,15,8,'outline'); D.disc(im,16,14,7,'steel2'); D.disc(im,14,12,4,'steel3')
  D.box(im,10,11,12,7,'red3','red5','red1'); D.eye(im,12,13)
  local v=dirs[d]; local tx,ty=16+v[1]*12,14+v[2]*10
  local recoil=pose=='fire' and f==2 and 2 or 0
  tx,ty=tx-v[1]*recoil,ty-v[2]*recoil
  D.limb(im,16,14,tx,ty,'steel3','steel5',2); D.disc(im,tx,ty,2,'steel1'); K.px(im,tx,ty,'outline')
  D.rivet(im,11,18); D.rivet(im,22,18)
  if pose=='windup' then D.line(im,10,10,20,10,'fire3');D.line(im,11,9,19,9,f>2 and 'fire5' or 'red4');D.disc(im,12,9,2,f%2==0 and 'white' or 'fire4'); K.px(im,11,8,'fire5') end
  if pose=='fire' and f==2 then D.flash(im,tx+v[1]*2,ty+v[2]*2,0) end
end
local A={}
for d=1,8 do
  local i=d; A[#A+1]=D.anim('turret_aim_'..(i-1),1,140,function(im,f) draw(im,i,'aim',f) end)
  A[#A+1]=D.anim('turret_fire_'..(i-1),3,{80,60,100},function(im,f) draw(im,i,'fire',f) end)
  A[#A+1]=D.anim('turret_windup_'..(i-1),4,125,function(im,f) draw(im,i,'windup',f) end)
end
A[#A+1]=D.anim('turret_destroyed',4,100,function(im,f)
  for j=0,2 do D.box(im,2+j*9,26,10,5,'sand2','sand4','sand1') end
  D.box(im,9,21+f,14,6,'steel1','steel3','outline'); D.line(im,19,22+f,28,18+f,'steel3',2)
  for j=1,4 do D.disc(im,6+j*4,20-((f+j)%3)*4,4,'ink2'); D.disc(im,5+j*4,19-((f+j)%3)*4,2,'ink3') end
  if f<3 then D.flash(im,17,19-f*3,f) end
end)
D.build('turret',32,32,A)
