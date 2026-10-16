local D=dofile(app.params.root..'/art-src/enemies/lib/draw.lua')
local K=D.K
local function bird(im,pose,f)
  local wings={-7,-4,0,4,1,-4}; local wy=wings[(f-1)%6+1]
  if pose=='dive' then wy=-6+f end
  D.limb(im,13,12,4,12+wy,'steel2','steel4',2)
  for j=0,2 do D.line(im,4+j*3,12+wy,2+j*3,16+wy,'steel1',2) end
  D.disc(im,17,13,6,'outline'); D.disc(im,17,12,5,'steel3'); D.disc(im,15,10,3,'steel4')
  D.box(im,11,10,9,6,'red3','red5','red1'); D.eye(im,12,11)
  D.limb(im,17,12,9,12+wy,'steel3','steel5',2)
  for j=0,2 do D.line(im,8+j*3,12+wy,6+j*3,16+wy,'steel2',2) end
  D.limb(im,20,12,23,6,'sand3','sand5',2); D.disc(im,25,6,4,'outline'); D.disc(im,25,6,3,'steel4')
  D.rect(im,25,5,3,2,'red4'); K.px(im,26,5,'fire5'); D.line(im,27,8,30,8,'sand5',2); K.px(im,29,10,'sand3')
  D.line(im,17,18,16,21,'sand3'); D.line(im,21,18,23,20,'sand3'); D.line(im,14,21,18,21,'steel5')
  if pose=='hit' then for y=0,23 do for x=0,31 do if app.pixelColor.rgbaA(im:getPixel(x,y))>0 then K.px(im,x,y,'white') end end end end
end
local A={D.anim('drone_fly',6,80,function(im,f) bird(im,'fly',f) end),D.anim('drone_dive',2,160,function(im,f) bird(im,'dive',f) end),D.anim('drone_hit',1,70,function(im,f) bird(im,'hit',f) end)}
A[#A+1]=D.anim('drone_destroyed',4,100,function(im,f)
  local temp=Image(32,24,ColorMode.RGB); bird(temp,'dive',f)
  local a=(f-1)*math.pi/2; local c,s=math.cos(a),math.sin(a)
  for y=0,23 do for x=0,31 do local sx=math.floor(16+(x-16)*c+(y-12)*s+.5); local sy=math.floor(12-(x-16)*s+(y-12)*c+.5)
    if sx>=0 and sx<32 and sy>=0 and sy<24 then im:drawPixel(x,y,temp:getPixel(sx,sy)) end end end
  D.disc(im,9+f*2,17,2,'fire4'); K.px(im,8+f*2,16,'white')
end)
D.build('drone',32,24,A)
