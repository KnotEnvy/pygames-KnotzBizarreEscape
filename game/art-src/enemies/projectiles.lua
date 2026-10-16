local D=dofile(app.params.root..'/art-src/enemies/lib/draw.lua')
local K=D.K
for _,spec in ipairs({{'enemy_bullet',8,8},{'turret_bullet',12,8}}) do
  local name,w,h=spec[1],spec[2],spec[3]
  D.build(name,w,h,{D.anim(name..'_fly',2,70,function(im,f)
    local cx=math.floor(w/2)
    -- Symmetric silhouette: bright hostile pearls, never tracer streaks.
    D.disc(im,cx,4,3,'outline'); D.disc(im,cx,4,2,'red3')
    D.disc(im,cx,4,1,'fire5'); K.px(im,cx,4,'white')
    K.px(im,cx-1,3,'white'); K.px(im,cx+1,5,f==1 and 'fire4' or 'fire5')
    if w>8 then
      D.line(im,cx-4,3,cx-4,5,'outline'); D.line(im,cx+4,3,cx+4,5,'outline')
      K.px(im,cx-3,4,'fire4'); K.px(im,cx+3,4,'fire4')
    end
  end)})
end
D.build('enemy_grenade',12,12,{D.anim('enemy_grenade_fuse',4,120,function(im,f)
  D.disc(im,5,7,4,'outline'); D.disc(im,5,7,3,'olive2'); D.disc(im,4,6,2,'olive4')
  D.line(im,3,7,7,7,'olive1'); D.line(im,5,5,5,9,'olive1'); D.box(im,4,2,4,3,'sand3','sand5'); D.line(im,7,3,9,2,'sand4')
  D.disc(im,9,2,1,f%2==0 and 'white' or 'red4'); K.px(im,8,1,'fire5')
end)})
