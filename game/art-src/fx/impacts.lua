local F=dofile(app.params.root..'/art-src/fx/lib/draw.lua')
local sin,cos,pi=math.sin,math.cos,math.pi
F.build('fx_impact_dirt',32,24,{F.anim('fx_impact_dirt_burst',6,50,function(im,f)
 local t=(f-1)/5
 for j=1,5 do local a=pi+pi*j/6
  local d=3+t*10; local r=(4+sin(j))*(1-t*.78)
  F.roll(im,16+cos(a)*d,20+sin(a)*d-t*3,r,r*.8,F.dust,j+t,1)
 end
 for j=1,4 do local x=16+(j-2.5)*(3+t*5);local y=18-t*19+6*t*t
  F.rect(im,x,y+j%2*3,2,2,f<4 and 'dirt4' or 'dirt3') end
end)},'16,20')
F.build('fx_impact_metal',32,32,{F.anim('fx_impact_metal_burst',5,{30,35,45,55,65},function(im,f)
 local t=(f-1)/4
 if f<3 then F.star(im,16,16,8-f,10-f,f==1 and 'white' or 'fire5',.2) end
 for j=1,7 do local a=j*2.399;local d=3+t*10
  F.line(im,16+cos(a)*d,16+sin(a)*d,16+cos(a)*(d-4*(1-t)),16+sin(a)*(d-4*(1-t)),f<4 and 'fire4' or 'fire2')
  if f<4 then F.px(im,16+cos(a)*d,16+sin(a)*d,'fire6') end
 end
end)})
F.build('fx_impact_wood',32,24,{F.anim('fx_impact_wood_burst',6,55,function(im,f)
 local t=(f-1)/5
 if f<3 then F.star(im,16,17,7,7,'sand4',.2) end
 for j=1,6 do
  local a=pi+pi*j/7;local d=2+t*11
  local x=16+cos(a)*d;local y=19+sin(a)*d+7*t*t
  F.line(im,x,y,x+cos(a+.5)*3*(1-t*.5),y+sin(a+.5)*3*(1-t*.5),'dirt2',2)
  F.line(im,x,y,x+cos(a+.5)*2,y+sin(a+.5)*2,'sand4')
 end
end)},'16,20')
F.build('fx_impact_shield',24,24,{F.anim('fx_impact_shield_tink',5,{30,40,50,60,70},function(im,f)
 local r=({4,10,7,4,1})[f]
 F.star(im,12,12,r,r,'sky4',.18)
 F.star(im,12,12,r*.72,r*.72,'white',.18)
 if f==2 or f==3 then F.ring(im,12,12,10,8,1,'steel5',.3) end
end)})
F.build('fx_water_splash',80,56,{F.anim('fx_water_splash_fall',9,{45,50,55,60,70,80,90,100,110},function(im,f)
 local t=(f-1)/8;local h=math.sin(math.min(1,t*1.8)*pi)*29*(1-t*.5)
 if f<7 then
   F.poly(im,{{10+t*12,45},{20,42-h*.55},{24,43-h*.85},{29,44-h*.4},{33,42-h},{39,44-h*.55},{45,42-h*.94},{50,44-h*.45},{57,42-h*.72},{64,45},{69-t*5,48},{12,48}},'sky3')
   F.poly(im,{{14+t*10,45},{24,44-h*.63},{29,45-h*.25},{34,44-h*.78},{39,45-h*.4},{45,44-h*.7},{50,45-h*.25},{57,44-h*.5},{64-t*5,46},{17,48}},'sky5')
   F.line(im,18+t*8,46,60-t*4,46,'ink6',2)
 end
 F.ring(im,40,47,12+t*25,3+t*4,1,f<5 and 'sky5' or 'sky3',t>.7 and .3 or nil)
 for j=1,9 do
  local a=pi+pi*j/10;local d=5+t*29
  local x=40+cos(a)*d;local y=43+sin(a)*d-18*t+24*t*t
  local r=f<7 and 2 or 1
  F.ellipse(im,x,y,r,r+1,'sky4');F.px(im,x,y-1,'ink6')
 end
end)},'40,47')
F.build('fx_water_ripple',32,16,{F.anim('fx_water_ripple_expand',6,65,function(im,f)
 F.ring(im,16,8,3+f*2,1+f*.6,1,f<4 and 'sky5' or 'sky3',f>4 and .3 or nil)
 if f<3 then F.line(im,16,5-f,16,7,'ink6') end
end)})

local dustAnims={}
for _,kind in ipairs({'land','skid','run'}) do
 local n=kind=='land' and 6 or 4
 dustAnims[#dustAnims+1]=F.anim('fx_dust_'..kind,n,65,function(im,f)
  local t=(f-1)/(n-1); local count=kind=='land' and 6 or 4
  for j=1,count do
   local dir=j%2==0 and 1 or -1
   local x=kind=='land' and (16+dir*(3+t*8)+sin(j)*2) or (24-j*3-t*4)
   local y=12-j%3-t*3
   local r=(3.2+j%2)*(1-t*.73)
   F.roll(im,x,y,r,r*.7,{'dirt3','dirt4','sand3','sand4'},j,1)
  end
 end)
end
F.build('fx_dust',32,20,dustAnims,'land:16,16; skid/run:26,16; plume trails left')
F.build('fx_hit_pop',24,24,{F.anim('fx_hit_pop_burst',5,{30,40,45,55,65},function(im,f)
 local r=({5,10,8,5,2})[f]
 if f<=3 then F.star(im,12,12,r,r,'sand4',.18);F.star(im,12,12,r*.65,r*.65,'fire6',.18)
 else for j=1,4 do local a=j*pi/2+.3;F.roll(im,12+cos(a)*7,12+sin(a)*7,r*.45,r*.45,{'sand3','sand4','sand5'},j,1) end end
end)})
F.build('fx_death_poof',48,48,{F.anim('fx_death_poof_burst',8,{40,50,60,70,80,90,100,110},function(im,f)
 local t=(f-1)/7
 if f==1 then F.star(im,24,26,13,15,'sand5',.1);return end
 for j=1,7 do local a=j*2.4;local d=4+t*13;local r=(7+sin(j))*(1-t*.82)
  F.roll(im,24+cos(a)*d,26+sin(a)*d*.8-t*5,r,r,{'ink2','ink3','ink4','ink5','ink6'},j+t,1)
 end
 if f<4 then F.star(im,24,24,8-f,11-f,'ink6',.1) end
end)})

-- Pale, cool powder: snow gets its own painted puff, never brown chips.
F.build('fx_impact_snow',32,24,{F.anim('fx_impact_snow_burst',6,45,function(im,f)
 local t=(f-1)/5
 for j=1,5 do local a=pi+pi*j/6
  local d=3+t*10; local r=(3.5+sin(j))*(1-t*.82)
  F.roll(im,16+cos(a)*d,20+sin(a)*d-t*3,r,r*.72,{'steel3','sky3','sky4','sky5','ink6'},j+t,1)
 end
 for j=1,4 do F.px(im,16+(j-2.5)*(2+t*5),18-t*16+5*t*t,'ink6') end
end)},'16,20')
-- Broken vertical heat ribbons, distinct from cannon glow and the low charge dust.
F.build('fx_heat',16,24,{F.anim('fx_heat_reach',6,65,function(im,f)
 for j=1,2 do
  local x=4+j*4; local y=22-f*2-j
  F.line(im,x,y,x-2,y-3,'sand3')
  F.line(im,x-2,y-3,x,y-6,'fire4')
  F.px(im,x+2,y-8,'sand4')
 end
end)})
