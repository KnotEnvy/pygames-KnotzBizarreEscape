local F=dofile(app.params.root..'/art-src/fx/lib/draw.lua')
local sin,cos,pi=math.sin,math.cos,math.pi
local snow={}
for i=1,4 do snow[#snow+1]=F.anim('fx_snow_v'..i,1,100,function(im)
 if i==1 then F.px(im,4,4,'sky5')
 elseif i==2 then F.rect(im,3,3,2,2,'ink6');F.px(im,4,4,'sky4')
 else
  F.line(im,4,1,4,7,'sky5');F.line(im,1,4,7,4,'sky5');F.px(im,4,4,'white')
  if i==4 then F.px(im,2,2,'steel5');F.px(im,6,2,'steel5');F.px(im,2,6,'steel5');F.px(im,6,6,'steel5') end
 end
end) end
F.build('fx_snow',9,9,snow)
F.build('fx_foliage',12,12,{
 F.anim('fx_foliage_leaf',4,140,function(im,f)
  local sx=({1,.5,-1,-.5})[f]
  F.poly(im,{{6-4*sx,3},{6,2},{6+4*sx,5},{6+2*sx,8},{6,9},{6-3*sx,7}},'leaf2')
  F.poly(im,{{6-3*sx,3},{6,3},{6+2*sx,5},{6,7}},'leaf4')
  F.line(im,4,9,7,4,'sand3');F.px(im,6,4,'leaf5')
 end),
 F.anim('fx_foliage_needle',4,140,function(im,f)
  local a=(f-1)*pi/4
  for j=1,3 do local angle=a+(j-2)*.48
   F.line(im,6-cos(a),6-sin(a),6+cos(angle)*4,6+sin(angle)*4,'olive2')
   F.line(im,6,6,6+cos(angle)*3,6+sin(angle)*3,'olive4')
  end
  F.px(im,6-cos(a),6-sin(a),'dirt4')
 end)
})
local embers={}
for i=1,4 do embers[#embers+1]=F.anim('fx_embers_v'..i,1,100,function(im)
 F.line(im,3,5,4,2,'fire2',i<3 and 1 or 2)
 F.line(im,3,4,4,2,'fire4'); F.px(im,4,2,i%2==0 and 'fire6' or 'fire5')
end) end
F.build('fx_embers',8,8,embers)
F.build('fx_firefly',12,12,{F.anim('fx_firefly_pulse',4,{180,140,180,220},function(im,f)
 local r=({2,3,4,3})[f]
 F.ellipse(im,6,6,r,r,'olive2');F.ellipse(im,6,6,r-1,r-1,'olive4')
 F.rect(im,5,5,2,2,'weird5');F.px(im,5,5,'fire6')
end)})
F.build('fx_steam',48,48,{F.anim('fx_steam_vent',8,{60,70,80,90,100,110,120,140},function(im,f)
 local t=(f-1)/7
 for j=1,5 do
  local spread=2+t*12
  local x=24+sin(j*2.3)*spread
  local y=40-t*25-j*2
  local r=(4+t*6)*(1-math.max(0,t-.65)*2.4)
  F.roll(im,x,y,r,r*.85,F.steam,j+t,1)
 end
 if f<3 then F.poly(im,{{21,44},{22,32-f*3},{25,30-f*3},{27,44}},'steel5') end
end)},'24,44')
for _,w in ipairs({8,16,32}) do
 local name='fx_glow_'..w
 F.build(name,w,w,{F.anim(name..'_still',1,100,function(im)
  local ramp={'fire1','fire2','fire3','fire4','fire5','fire6'}
  for y=0,w-1 do for x=0,w-1 do
   local d=math.sqrt((x-(w-1)/2)^2+(y-(w-1)/2)^2)/(w/2)
   if d<.97 then F.px(im,x,y,ramp[math.min(6,1+math.floor((1-d)*6))]) end
  end end
 end)})
end
F.build('fx_flare',32,8,{F.anim('fx_flare_still',1,100,function(im)
 F.poly(im,{{1,4},{12,2},{19,3},{30,4},{19,5},{12,6}},'sand3')
 F.poly(im,{{3,4},{12,3},{25,4},{12,5}},'sand5')
 F.line(im,9,4,19,4,'white');F.line(im,13,2,13,6,'fire6')
end)})
