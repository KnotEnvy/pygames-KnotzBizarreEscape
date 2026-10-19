-- Four authored scales: the large tiers add lobes and secondary tongues,
-- not a resized copy. Rebuild: bash tools/build-art.sh art-src/fx/explosions.lua
local F=dofile(app.params.root..'/art-src/fx/lib/draw.lua')
local sin,cos,pi=math.sin,math.cos,math.pi
local tiers={{'s',32,8,6},{'m',48,10,7},{'l',80,14,9},{'xl',128,16,11}}
for _,v in ipairs(tiers) do
  local name,w,n,count='fx_explosion_'..v[1],v[2],v[3],v[4]
  local timings={}
  for f=1,n do timings[f]=f==1 and 40 or (f<=math.ceil(n*.5) and 50 or 80) end
  F.build(name,w,w,{F.anim(name..'_burst',n,timings,function(im,f)
    local cx,cy=w*.49,w*.55
    local t=(f-1)/(n-1)
    local unit=w>=80 and 2 or 1
    if f==1 then
      F.star(im,cx,cy,w*.28,w*.32,'fire4',.08)
      F.star(im,cx,cy,w*.23,w*.27,'fire6',.08)
      F.ellipse(im,cx,cy,w*.105,w*.12,'white')
      return
    end
    local rise=w*.16*t
    local spread=w*(.06+.20*math.min(1,t*3))
    local fade=math.max(0,(t-.72)/.28)
    -- Outer billows lead the expansion, then separate as their cores cool.
    for j=1,count do
      local a=(j-1)*2*pi/count+.15
      local asym=1+.1*sin(j*2.1)
      local x=cx+cos(a)*spread*asym+w*.035*sin(j*3+t*2)
      local y=cy+sin(a)*spread*.7-rise-w*.025*sin(j*4)
      local r=w*(.15+.035*sin(j*1.73))*(1-fade*(.65+.2*sin(j)))
      local smoke=t>(.34+.045*(j%5))
      local ramp=smoke and F.smoke or {'fire1','fire2','fire3','fire4','fire4'}
      if t<.88 or j%3==1 then F.roll(im,x,y,r,r*(1+.16*sin(j)),ramp,j*.79+t*1.2,unit) end
      -- Cooling rims keep some incandescent cracks before the ash phase.
      if t>.38 and t<.68 and j%2==0 then
        F.roll(im,x-r*.19,y+r*.22,r*.62,r*.43,{'fire1','fire2','fire3','fire4'},j,unit)
      end
    end
    if t>.45 and t<.94 then
      local r=w*.21*(1-fade*.85)
      F.roll(im,cx+w*.045,cy-rise-w*.08,r,r*.88,F.smoke,2+t,unit)
    end
    if t<.75 then
      local heat=1-math.max(0,t-.32)*1.9
      local r=w*(.12+.12*sin(math.min(1,t*2)*pi*.5))*heat
      local ramp=t<.4 and {'fire2','fire3','fire4','fire5','fire6'} or F.fire
      F.roll(im,cx-w*.02,cy-rise,r,r*1.12,ramp,1.5+t*2,unit)
      -- Erupting hot tongues, staggered instead of radially identical discs.
      for j=1,3 do
        local x=cx+(j-2)*r*.6
        local y=cy-rise-r*(.38+.18*sin(j*3+t*3))
        F.roll(im,x,y,r*.4,r*(.55+.08*j),ramp,j*.8,unit)
      end
      if f==2 then F.star(im,cx-w*.03,cy-rise,w*.17,w*.18,'fire6',.16) end
    end
    -- A few intentional ember streaks; no confetti noise.
    for j=1,math.min(7,count) do
      local a=j*2.399+.5; local d=w*(.2+.23*t)
      local x=cx+cos(a)*d; local y=cy+sin(a)*d*.8-w*.04*t
      if t<.92 or j%3==0 then
        F.line(im,x,y,x-cos(a)*w*.035*(1-t),y-sin(a)*w*.035*(1-t),t>.75 and 'fire2' or 'fire4',unit)
        if t<.65 then F.px(im,x,y,'fire6') end
      end
    end
  end)})
end

F.build('fx_smoke',32,32,{F.anim('fx_smoke_drift',8,{70,80,90,100,110,120,130,140},function(im,f)
  local t=(f-1)/7
  for j=1,5 do
    local a=j*2.4; local r=(6+sin(j)*1.3)*(1-t*.6)
    F.roll(im,16+cos(a)*(3+t*7),19+sin(a)*3-t*9,r,r*.9,F.smoke,j+t,1)
  end
end)})
F.build('fx_shockwave',80,48,{F.anim('fx_shockwave_expand',6,45,function(im,f)
  local r=7+f*5
  F.ring(im,40,24,r,r*.52,f<3 and 2 or 1,f<3 and 'fire6' or (f<5 and 'sand4' or 'ink3'),f>=4 and (f-4)*.4 or nil)
  if f<4 then F.ring(im,40,24,r-3,(r-3)*.52,1,'fire3') end
end)})
F.build('fx_scorch',48,24,{
 F.anim('fx_scorch_round',1,100,function(im)
   F.ellipse(im,24,13,19,7,'ink1'); F.ellipse(im,23,12,15,5,'outline')
   for j=1,9 do local a=j*2.4; F.line(im,24+cos(a)*13,12+sin(a)*4,24+cos(a)*21,12+sin(a)*8,'ink1') end
   F.ring(im,24,12,16,5,1,'dirt2',.45)
 end),
 F.anim('fx_scorch_scatter',1,100,function(im)
   for j=1,8 do local a=j*2.4; F.ellipse(im,24+cos(a)*j*1.7,12+sin(a)*j*.6,4+j%3,2,'ink1') end
   F.ellipse(im,24,12,10,4,'outline'); F.line(im,20,10,29,10,'dirt2')
 end)
})
