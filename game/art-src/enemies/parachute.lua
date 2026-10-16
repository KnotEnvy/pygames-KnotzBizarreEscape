local D=dofile(app.params.root..'/art-src/enemies/lib/draw.lua')
local K=D.K
local function chute(im,f,torn)
  local sway=({0,1,0,-1})[(f-1)%4+1]
  if not torn then
    for x=3,44 do
      local dx=(x-24)/21; local top=math.floor(5+dx*dx*12)
      D.line(im,x+sway,top,x+sway,20+math.floor(math.abs(dx)*2),'outline')
      if x>3 and x<44 then D.line(im,x+sway,top+1,x+sway,19+math.floor(math.abs(dx)*2),(x<16 or x>31) and 'sand3' or 'red3') end
      if x%7==0 then D.line(im,x+sway,top+2,x+sway,20,'sand5') end
    end
    D.line(im,5+sway,22,16,46,'sand4'); D.line(im,43+sway,22,34,46,'sand4'); D.line(im,16+sway,21,21,46,'sand2'); D.line(im,32+sway,21,29,46,'sand2')
    D.eye(im,21+sway,12,'sand5')
  else
    for j=0,3 do
      local x=6+j*9+(j%2==0 and f*2 or -f*2); local y=7+j%2*7+f*3
      D.box(im,x,y,8,9,'red2','red4','red1'); D.line(im,x+2,y+8,x+4,y+14,'sand3')
    end
    D.line(im,13+f*2,29,18,46,'sand2'); D.line(im,37-f*2,28,32,46,'sand2')
  end
end
D.build('parachute',48,48,{D.anim('parachute_descent',4,140,function(im,f) chute(im,f,false) end),D.anim('parachute_torn',3,100,function(im,f) chute(im,f,true) end)})
