local F=dofile(app.params.root..'/art-src/fx/lib/draw.lua')
-- Tiny readable hardware; binary-alpha master-palette clusters.
F.build('fx_machine_bits',16,16,{
 F.anim('fx_machine_bits_bolt',4,65,function(im,f)
  if f%2==1 then
   F.rect(im,5,3,6,4,'steel2');F.rect(im,5,3,5,2,'steel5')
   F.rect(im,7,7,2,5,'steel3');F.px(im,7,8,'ink6');F.px(im,7,10,'steel5')
  else
   F.rect(im,3,5,4,6,'steel2');F.rect(im,3,5,3,2,'steel5')
   F.rect(im,7,7,5,2,'steel3');F.px(im,8,7,'ink6');F.px(im,10,7,'steel5')
  end
 end),
 F.anim('fx_machine_bits_spring',4,65,function(im,f)
  local h=({2,3,4,3})[f]
  for j=0,3 do
   local y=3+j*h/2
   F.line(im,4,y,10,y+1,'steel3');F.line(im,10,y+1,4,y+2,'steel5')
   F.px(im,4,y,'ink6')
  end
 end),
 F.anim('fx_machine_bits_glass',4,55,function(im,f)
  F.poly(im,{{5,3},{10,6},{8,11},{4,8}},'steel2')
  F.poly(im,{{5,4},{9,6},{7,9}},'sky4')
  F.line(im,5,4,8,5,'sky5')
  if f==2 then F.line(im,7,3,7,7,'ink6');F.line(im,5,5,9,5,'ink6') end
 end)
})
F.build('fx_boat_foam',32,16,{
 F.anim('fx_boat_foam_bow',6,50,function(im,f)
  local t=(f-1)/5
  F.line(im,3,12,24,12,'sky4')
  F.line(im,12,11,20,8-t*3,'sky5',2)
  F.line(im,20,8-t*3,24,4+t*2,'ink6',2)
  F.line(im,24,4+t*2,27,6+t*2,'ink6')
  F.px(im,19+t*7,3+t*4,'ink6')
 end),
 F.anim('fx_boat_foam_stern',6,100,function(im,f)
  for j=0,2 do
   local x=3+j*8-f
   F.line(im,x,6+j%2*3,x+5+f,6+j%2*3,'sky4')
   F.line(im,x+2,5+j%2*3,x+6,5+j%2*3,f<4 and 'ink6' or 'sky5')
  end
 end)
})
