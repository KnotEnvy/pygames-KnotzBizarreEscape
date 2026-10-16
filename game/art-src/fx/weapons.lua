local F=dofile(app.params.root..'/art-src/fx/lib/draw.lua')
local sin,cos,pi=math.sin,math.cos,math.pi
-- Muzzle pivot (8,24) in a 48-square canvas. All points are painted in
-- aim-space; the diagonal is separately rasterized, never image-rotated.
local shapes={
 pistol={{0,-2},{5,-4},{8,-2},{17,0},{8,2},{5,4},{0,2}},
 hmg={{0,-3},{7,-4},{11,-8},{12,-3},{26,-1},{19,2},{12,3},{13,7},{6,4},{0,2}},
 spread={{0,-3},{8,-5},{18,-10},{15,-4},{29,0},{16,4},{20,11},{8,5},{0,3}},
 rocket={{0,-2},{8,-5},{21,-8},{17,-3},{29,-1},{21,2},{25,6},{10,5},{0,2}},
 flame={{0,-2},{5,-3},{9,-6},{14,-4},{21,-7},{27,-3},{30,0},{26,4},{20,3},{17,7},{9,5},{4,3},{0,2}}
}
for _,weapon in ipairs({'pistol','hmg','spread','rocket','flame'}) do
  local name='fx_muzzle_'..weapon; local anims={}
  for _,diag in ipairs({false,true}) do
    local angle=diag and -pi/4 or 0
    local function paint(im,points,c,sx,sy,offset)
      local p={}
      for _,v in ipairs(points) do
        local x,y=v[1]*sx+(offset or 0),v[2]*sy
        p[#p+1]={8+x*cos(angle)-y*sin(angle),24+x*sin(angle)+y*cos(angle)}
      end
      F.poly(im,p,c)
    end
    anims[#anims+1]=F.anim(name..(diag and '_diag' or '_right'),3,{30,40,35},function(im,f)
      local sx=({.8,1,.55})[f];local sy=({.8,1,.65})[f]
      paint(im,shapes[weapon],'fire2',sx,sy)
      paint(im,shapes[weapon],'fire4',sx*.88,sy*.7)
      paint(im,shapes[weapon],f==3 and 'fire5' or 'fire6',sx*.64,sy*.4)
      if f<3 then paint(im,{{0,-1},{7,-1},{12,0},{7,1},{0,1}},'white',sx,1) end
      if weapon=='rocket' and f==3 then
        local x=8+21*cos(angle);local y=24+21*sin(angle)
        F.roll(im,x,y,5,4,F.smoke,2,1)
      end
      if weapon=='flame' then
        local x=8+25*sx*cos(angle);local y=24+25*sx*sin(angle)
        F.roll(im,x,y,4,3,{'fire2','fire3','fire4','fire5'},f,1)
      end
    end)
  end
  F.build(name,48,48,anims,'8,24; rocket points along exhaust, opposite aim')
end

F.build('fx_casing',10,10,{F.anim('fx_casing_spin',4,70,function(im,f)
  local a=(f-1)*pi/4; local function poly(points,c)
    local p={};for _,v in ipairs(points) do p[#p+1]={4+v[1]*cos(a)-v[2]*sin(a),4+v[1]*sin(a)+v[2]*cos(a)} end
    F.poly(im,p,c)
  end
  poly({{-3,-2},{3,-2},{3,2},{-3,2}},'sand1')
  poly({{-2,-1},{3,-1},{3,1},{-2,1}},'sand3')
  poly({{-2,-1},{2,-1},{2,0},{-2,0}},'sand5')
  poly({{-3,-2},{-2,-2},{-2,2},{-3,2}},'sand4')
end)})

local sparkAnims={}
local sparkShapes={
 {{3,0},{4,3},{7,4},{4,5},{3,7},{2,5},{0,4},{2,3}},
 {{1,1},{3,2},{6,6},{4,5}},
 {{0,3},{6,2},{7,3},{6,4},{0,4}},
 {{3,0},{4,1},{4,7},{3,7}},
 {{1,2},{5,1},{6,3},{4,5},{1,4}},
 {{2,2},{4,2},{4,4},{2,4}}
}
for i,pts in ipairs(sparkShapes) do
  sparkAnims[#sparkAnims+1]=F.anim('fx_sparks_v'..i,1,100,function(im)
    F.poly(im,pts,'fire3');F.line(im,3,2,3,4,'fire6');F.px(im,3,3,'white')
  end)
end
F.build('fx_sparks',8,8,sparkAnims)

for _,material in ipairs({'metal','wood','rock'}) do
 local anims={}
 local ramps={metal={'steel1','steel3','steel5'},wood={'dirt2','dirt4','sand4'},rock={'ink1','ink3','ink5'}}
 local ramp=ramps[material]
 for i=1,4 do anims[#anims+1]=F.anim('fx_debris_'..material..'_v'..i,1,100,function(im)
   local points
   if material=='wood' then points={{2,3},{8,2+i%2},{10,4},{7,5},{9,8},{3,7}}
   elseif material=='metal' then points={{2,3},{7,2},{9,4},{8,8},{5,9},{2,6}}
   else points={{3,2},{7,2},{10,5},{8,9},{4,9},{2,6}} end
   local p={};local a=(i-1)*pi/2
   for _,v in ipairs(points) do p[#p+1]={6+(v[1]-6)*cos(a)-(v[2]-6)*sin(a),6+(v[1]-6)*sin(a)+(v[2]-6)*cos(a)} end
   F.poly(im,p,ramp[1]);F.poly(im,{{3,3},{7,3},{8,5},{6,7},{3,6}},ramp[2])
   F.line(im,3,3,6,3,ramp[3]);F.px(im,3,4,ramp[3])
   if material=='wood' then F.line(im,4,5,7,4,'dirt2');F.line(im,5,7,8,6,'dirt2')
   elseif material=='metal' then F.px(im,6,5,'outline');F.px(im,7,6,'steel4')
   else F.line(im,6,5,7,7,'ink2') end
 end) end
 F.build('fx_debris_'..material,12,12,anims)
end
