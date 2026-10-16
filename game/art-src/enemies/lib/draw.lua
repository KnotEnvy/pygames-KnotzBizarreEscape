-- Original KBE enemy art primitives. All coordinates are integer pixels.
local K = dofile(app.params.kbe)
local D = { K=K, root=app.params.root }
function D.rect(im,x,y,w,h,c) K.rect(im,math.floor(x),math.floor(y),w,h,c) end
function D.line(im,x,y,xx,yy,c,n)
  x,y,xx,yy=math.floor(x),math.floor(y),math.floor(xx),math.floor(yy)
  for i=0,(n or 1)-1 do K.line(im,x,y+i,xx,yy+i,c) end
end
function D.disc(im,x,y,r,c) K.disc(im,math.floor(x),math.floor(y),r,c) end
function D.box(im,x,y,w,h,c,hi,lo)
  D.rect(im,x,y,w,h,'outline'); D.rect(im,x+1,y+1,w-2,h-2,c)
  if hi then D.line(im,x+2,y+1,x+w-3,y+1,hi); D.line(im,x+1,y+2,x+1,y+h-3,hi) end
  if lo then D.line(im,x+2,y+h-2,x+w-2,y+h-2,lo); D.line(im,x+w-2,y+2,x+w-2,y+h-2,lo) end
end
function D.limb(im,x,y,xx,yy,c,hi,width)
  width=width or 3
  local steps=math.max(math.abs(xx-x),math.abs(yy-y),1)
  for i=0,steps do
    local a=i/steps; D.disc(im,x+(xx-x)*a,y+(yy-y)*a,width,'outline')
  end
  for i=0,steps do
    local a=i/steps; D.disc(im,x+(xx-x)*a,y+(yy-y)*a,width-1,c)
  end
  D.line(im,x-1,y-1,xx-1,yy-1,hi or c)
end
function D.eye(im,x,y,c)
  -- Cult spiral eye: khaki almond, curled red iris.
  D.line(im,x,y+1,x+6,y+1,c or 'sand4'); D.line(im,x+1,y,x+5,y,c or 'sand4')
  D.line(im,x+1,y+2,x+5,y+2,c or 'sand4'); D.rect(im,x+2,y,3,3,'red1'); K.px(im,x+3,y+1,c or 'sand4')
end
function D.rivet(im,x,y) K.px(im,x,y,'steel5'); K.px(im,x+1,y+1,'steel1') end
function D.flash(im,x,y,n)
  D.line(im,x-4,y,x+4+n,y,'fire4',3); D.line(im,x-1,y-4,x+1,y+4,'fire5',2)
  D.disc(im,x,y+1,2,'white')
end
function D.build(name,w,h,anims)
  K.build{name=name,w=w,h=h,src=D.root..'/art-src/enemies/'..name..'.aseprite',sheet=D.root..'/public/assets/sprites/enemies/'..name..'.png',data=D.root..'/public/assets/sprites/enemies/'..name..'.json',anims=anims,anchor='bottom-center'}
end
function D.anim(name,count,ms,fn)
  local frames={}; for j=1,count do local f=j; frames[j]={main=function(im) fn(im,f,count) end} end
  return {tag=name,ms=ms,frames=frames}
end
return D
