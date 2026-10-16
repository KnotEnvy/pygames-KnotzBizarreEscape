-- Shared deterministic FX paint tools. Not a standalone build script.
local F = { K = dofile(app.params.kbe), root = app.params.root }
local floor, sin, cos, sqrt = math.floor, math.sin, math.cos, math.sqrt
function F.px(im,x,y,c)
  x,y=floor(x+0.5),floor(y+0.5)
  if x>=0 and y>=0 and x<im.width and y<im.height then F.K.px(im,x,y,c) end
end
function F.rect(im,x,y,w,h,c)
  for j=floor(y),floor(y+h-1) do for i=floor(x),floor(x+w-1) do F.px(im,i,j,c) end end
end
function F.line(im,x0,y0,x1,y1,c,width)
  local n=math.max(1,math.ceil(math.max(math.abs(x1-x0),math.abs(y1-y0))))
  width=width or 1
  for k=0,n do F.rect(im,floor(x0+(x1-x0)*k/n+0.5),floor(y0+(y1-y0)*k/n+0.5),width,width,c) end
end
function F.ellipse(im,cx,cy,rx,ry,c)
  for y=floor(cy-ry),math.ceil(cy+ry) do for x=floor(cx-rx),math.ceil(cx+rx) do
    if ((x-cx)/rx)^2+((y-cy)/ry)^2<=1 then F.px(im,x,y,c) end
  end end
end
function F.poly(im,pts,c)
  for y=0,im.height-1 do
    local nodes={}; local j=#pts
    for i=1,#pts do
      local a,b=pts[i],pts[j]
      if (a[2]<=y and b[2]>y) or (b[2]<=y and a[2]>y) then nodes[#nodes+1]=a[1]+(y-a[2])/(b[2]-a[2])*(b[1]-a[1]) end
      j=i
    end
    table.sort(nodes)
    for i=1,#nodes-1,2 do for x=math.ceil(nodes[i]),floor(nodes[i+1]) do F.px(im,x,y,c) end end
  end
end
function F.star(im,cx,cy,rx,ry,c,phase)
  local pts={}; phase=phase or 0
  for k=0,15 do local a=k*math.pi/8+phase; local r=k%2==0 and (k%4==0 and 1 or .62) or .23
    pts[#pts+1]={cx+cos(a)*rx*r,cy+sin(a)*ry*r} end
  F.poly(im,pts,c)
end
-- Scalloped painted roll: coherent bands, no random per-pixel noise.
-- Coordinates quantize to larger pigment clusters for the large explosions.
function F.roll(im,cx,cy,rx,ry,ramp,seed,unit)
  seed=seed or 0; unit=unit or 1
  for y=floor(cy-ry*1.12),math.ceil(cy+ry*1.12),unit do
    for x=floor(cx-rx*1.12),math.ceil(cx+rx*1.12),unit do
      local dx,dy=(x-cx)/rx,(y-cy)/ry
      local a=math.atan(dy,dx); local d=sqrt(dx*dx+dy*dy)
      local edge=1+.065*sin(a*5+seed)+.045*cos(a*3-seed)
      if d<edge then
        local light=sqrt((dx+.23)^2+(dy+.3)^2)
        local band
        if d>edge-.105 then band=1
        elseif light<.36 then band=5
        elseif light<.67 then band=4
        elseif light<.94 then band=3 else band=2 end
        -- One rolled under fold on the lower right, like a painted comma.
        local curl=sqrt((dx-.28)^2+(dy-.25)^2)
        if curl>.31 and curl<.46 and dx>-.18 and dy>-.08 then band=math.max(1,band-2) end
        F.rect(im,x,y,unit,unit,ramp[math.min(#ramp,band)])
      end
    end
  end
end
function F.ring(im,cx,cy,rx,ry,width,c,breaks)
  for y=floor(cy-ry-1),math.ceil(cy+ry+1) do for x=floor(cx-rx-1),math.ceil(cx+rx+1) do
    local dx,dy=x-cx,y-cy; local d=sqrt((dx/rx)^2+(dy/ry)^2)
    local a=math.atan(dy,dx)
    if d<=1 and d>=1-width/math.min(rx,ry) and (not breaks or sin(a*5+.8)>breaks) then F.px(im,x,y,c) end
  end end
end
function F.build(name,w,h,anims,anchor)
  F.K.build{name=name,w=w,h=h,src=F.root..'/art-src/fx/'..name..'.aseprite',
    sheet=F.root..'/public/assets/sprites/fx/'..name..'.png',data=F.root..'/public/assets/sprites/fx/'..name..'.json',
    anims=anims,anchor=anchor or 'center'}
end
function F.anim(name,n,ms,draw)
  local frames={}
  for i=1,n do local frame=i; frames[i]={main=function(im) draw(im,frame,n) end} end
  return {tag=name,ms=ms,frames=frames}
end
F.fire={'fire1','fire2','fire3','fire4','fire5'}
F.smoke={'outline','ink1','ink2','ink3','ink4'}
F.dust={'dirt2','dirt3','dirt4','sand3','sand4'}
F.steam={'steel2','steel3','steel4','steel5','ink6'}
return F
