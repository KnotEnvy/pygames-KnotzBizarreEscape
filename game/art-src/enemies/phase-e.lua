-- Phase E: original machines, mutant hounds and train raiders. Master palette only.
local D=dofile(app.params.root..'/art-src/enemies/lib/soldier.lua')
local K=D.K
local function rivets(im,x,y,n) for i=0,n-1 do D.rivet(im,x+i*9,y) end end
local function tread(im,x,y,w,f)
 D.box(im,x,y,w,16,'steel1','steel3','outline')
 for j=0,math.floor(w/14)-1 do local xx=x+8+j*14; D.disc(im,xx,y+8,6,'outline');D.disc(im,xx,y+8,4,'steel3');D.disc(im,xx,y+8,2,'steel1');K.px(im,xx-1,y+6,'steel5') end
 for j=0,math.floor(w/6)-1 do D.rect(im,x+2+j*6+(f%2)*2,y+1,3,2,'steel4');D.rect(im,x+2+j*6+(f%2)*2,y+13,3,2,'steel2') end
end
local function snowcat(im,pose,f,damage)
 local bob=((pose=='charge' or pose=='intro' or pose=='idle') and f%2==0) and 1 or 0
 tread(im,25,63,91,f)
 D.box(im,23,38+bob,94,28,'steel3','steel5','steel1');D.rect(im,26,42+bob,85,7,'steel4');D.rect(im,27,58,83,5,'steel2')
 D.box(im,38,28+bob,52,17,'red3','red5','red1');D.rect(im,42,31+bob,27,9,'steel1');D.rect(im,44,32+bob,21,3,'sky4');D.rect(im,47,35+bob,17,3,'sky2')
 -- Armored rear grille, bright rear weak point.
 D.box(im,94,41,18,18,'steel1','steel5','steel1');for x=97,108,3 do D.line(im,x,44,x,55,'fire3') end
 D.box(im,70,23,15,8,'steel2','steel5','steel1');D.box(im,76,17,5,10,'steel2','steel4','steel1');D.rect(im,73,17,11,3,'steel1')
 D.box(im,48,34,19,4,'steel1','steel5');D.eye(im,52,44,'sand4');rivets(im,31,53,7)
 -- Plow is a heavy curved steel blade, welded struts visible behind it.
 D.line(im,34,56,18,67,'steel1',4);D.line(im,34,60,18,72,'steel4',2)
 for j=0,25 do local xx=9+math.floor(j*j/160);D.rect(im,xx,48+j,16-math.floor(j/5),1,j<4 and 'steel5' or j>19 and 'steel2' or 'steel4') end
 D.line(im,9,48,13,72,'outline',2);D.line(im,11,49,15,69,'steel5');D.line(im,13,73,29,73,'outline',2)
 -- Low MG cradle linked to the Warden's control handles.
 D.box(im,27,51,23,6,'steel1','steel5');D.rect(im,15,53,14,3,'steel2');D.line(im,52,35,48,53,'sand2',2)
 if pose=='mg' and f%2==0 then D.flash(im,14,54,0) end
 if pose=='mortar' then D.box(im,73,13,9,11,'steel3','steel5','steel1');if f==4 then D.flash(im,77,10,1) end end
 if pose=='charge' then for i=1,3 do D.disc(im,100+i*6,29-i*4+(f%3)*2,4+i,'ink2');D.disc(im,99+i*6,27-i*4+(f%3)*2,2+i,'ink4') end end
 -- Welded seams, chipped rims, access doors and oily lower chassis.
 for _,x in ipairs({32,59,86}) do
  D.line(im,x,43+bob,x,50+bob,'steel1');D.line(im,x+1,43+bob,x+1,48+bob,'steel5')
  D.line(im,x+3,59,x+8,60,'dirt2');K.px(im,x+6,58,'dirt4')
 end
 D.box(im,68,43+bob,19,14,'steel3','steel5','steel1');D.line(im,72,48+bob,81,48+bob,'steel1');D.rivet(im,71,46+bob)
 D.line(im,29,40+bob,88,40+bob,'steel5');D.line(im,39,29+bob,62,29+bob,'sand5')
 -- Exhaust lives even when the machine is waiting.
 for i=0,2 do local yy=27-i*6-(f%4)*2;D.disc(im,116+i*2,yy,2+i,'ink2');D.disc(im,115+i*2,yy-1,1+i,'ink3') end
 if damage or pose=='damaged' or pose=='critical' or pose=='death' then
  D.box(im,68,43,20,14,'steel1','steel4','outline');D.line(im,70,46,79,54,'red4');D.line(im,80,46,74,54,'sand4')
  D.line(im,40,31,49,40,'outline',2);D.line(im,49,40,45,46,'steel1');D.line(im,41,31,48,38,'steel5')
  D.line(im,15,57,21,62,'steel1',2);D.line(im,19,65,25,68,'sand2')
  if f%2==0 then D.line(im,79,46,86,41,'fire4');K.px(im,85,42,'fire6') end
 end
 if damage==2 or pose=='critical' then
  D.box(im,40,31,26,10,'steel1','steel4','outline');D.line(im,42,34,61,38,'weird4');D.line(im,43,39,54,33,'red4')
  D.line(im,26,44,38,49,'outline',2);D.line(im,38,49,32,57,'outline',2)
 end
 if pose=='intro' then
  D.line(im,27,57,33,59,'fire4');D.rect(im,97,44,2,10,f%2==0 and 'fire5' or 'fire3')
 end
 if pose=='death' then D.line(im,43,39,58,57,'outline',2);D.line(im,58,57,84,44,'fire4');D.rect(im,43,32,20,8,'steel1');for i=1,3 do D.disc(im,39+i*23,42-(f+i)%3*6,6,'fire2');D.disc(im,38+i*23,39-(f+i)%3*6,4,'fire4') end end
end
local A={};for _,p in ipairs({'idle','intro','damaged','critical','charge','mortar','mg','death'}) do A[#A+1]=D.anim('snowcat_'..p,(p=='charge' or p=='intro') and 8 or 4,p=='intro' and 130 or p=='charge' and 80 or 140,function(im,f) snowcat(im,p,f) end) end;for _,pose in ipairs({'charge','mortar','mg'}) do for tier=1,2 do A[#A+1]=D.anim('snowcat_'..pose..(tier==1 and '_damaged' or '_critical'),pose=='charge' and 8 or 4,pose=='charge' and 80 or 140,function(im,f) snowcat(im,pose,f,tier) end) end end;D.build('snowcat',128,80,A)
D.build('snowcat_tread',48,20,{D.anim('snowcat_tread_roll',4,80,function(im,f)tread(im,2,2,44,f)end)})
local function officer(im,driver,pose,f)
 local y=pose=='eject' and -5 or pose=='taunt' and (f%2) or 0
 local function R(x,yy,w,h,c)D.rect(im,x,yy+y,w,h,c)end
 local function B(x,yy,w,h,c,hi,lo)D.box(im,x,yy+y,w,h,c,hi,lo)end
 B(14,65,22,14,driver and 'steel3' or 'red3',driver and 'steel5' or 'red5','red1')
 B(17,51,16,17,'skin3','skin5','skin1');R(18,55,14,8,'skin4');R(15,57,5,4,'skin4')
 R(17,55,4,2,'white');R(18,55,1,2,'outline');R(18,53,6,1,'outline');R(17,61,13,2,'skin1');R(22,63,7,2,'skin2')
 if not driver then R(22,58,13,3,'ink1');R(28,57,6,3,'ink1');R(29,59,7,2,'ink1') end
 B(15,46,20,8,driver and 'steel3' or 'red3',driver and 'steel5' or 'red5','red1');R(12,52,22,2,'steel1');B(24,47,5,4,'sand4','sand5')
 R(17,69,4,3,'sand5');R(24,71,3,3,'sand4');R(31,69,3,5,'sand4')
 local ay=pose=='salute' and (f<3 and 51 or 44) or pose=='taunt' and 49+(f%2)*3 or pose=='throw' and 48+(f-1)*5 or pose=='panic' and 43+f%2*8 or 70
 D.limb(im,31,70+y,38,ay+y,'red3','red5',2);D.disc(im,38,ay+y,3,'skin4');D.line(im,37,ay+y-2,40,ay+y-2,'skin5')
 D.limb(im,17,70+y,10,pose=='panic' and 46 or 71+y,'red3','red5',2)
 if pose=='aim' or pose=='fire' then B(5,68,20,5,'steel2','steel5');R(1,70,7,2,'steel1');if pose=='fire' then D.flash(im,2,70,0)end end
 if pose=='throw' and f<=2 then D.disc(im,38,ay+y-5,4,'steel1');K.px(im,37,ay+y-7,'steel5') end
 if pose=='eject' then
  -- Parachute opens fully, officer still angrily pumps his raised fist.
  for j=0,13 do local half=math.floor(math.sqrt(math.max(0,22*22-(j-13)*(j-13))));D.rect(im,24-half,3+j,half*2,1,j<4 and 'sand5' or j<10 and 'sand4' or 'red3')end
  for i=0,4 do D.line(im,4+i*10,16,17+i*3,51,'sand2')end
  D.line(im,4,16,44,16,'outline');D.limb(im,33,65,39,42+f%2*4,'red3','red5',2);D.disc(im,39,41+f%2*4,3,'skin4')
 end
end
for _,name in ipairs({'warden','driver'}) do local a={};for _,p in ipairs({'idle','salute','taunt','aim','fire','throw','panic','eject'})do a[#a+1]=D.anim(name..'_'..p,4,p=='fire' and 80 or 150,function(im,f)officer(im,name=='driver',p,f)end)end;D.build(name,48,80,a)end
-- Right-facing locomotive: the approaching player fights the rear tender at left.
local function loco(im,pose,f)
 local bob=(f%4==1 or f%4==2) and -1 or 0
 local function box(x,y,w,h,c,hi,lo) D.box(im,x,y+bob,w,h,c,hi,lo) end
 -- Far-side driving wheels peek above the rail, with their own steel rims.
 for _,x in ipairs({104,132,160}) do D.disc(im,x,96,12,'outline');D.disc(im,x,96,10,'steel2') end
 box(7,80,172,8,'red2','red5','red1')
 -- Tender: coal mound, stepped rear gun deck, separate coupling and small trucks.
 D.line(im,11,59+bob,25,52+bob,'steel1',5);D.line(im,25,52+bob,52,58+bob,'steel2',5)
 box(8,63,47,20,'steel2','steel5','steel1');box(29,51,26,14,'red2','red5','red1')
 rivets(im,13,77+bob,5);D.eye(im,36,66+bob,'sand4')
 for _,x in ipairs({19,44}) do D.disc(im,x,99,8,'outline');D.disc(im,x,99,6,'steel3');D.disc(im,x,99,2,'steel5') end
 D.line(im,54,81,64,81,'steel5',2)
 -- Tall cab with a generous window and overhanging roof; shutter swings open in phase 3.
 box(61,42,36,41,'red3','red5','red1');box(58,36,43,7,'steel2','steel5','steel1')
 box(66,47,24,23,'steel1','steel5','outline')
 if pose=='core' or pose=='death' then
  D.rect(im,68,49+bob,20,19,'ink1');box(59,48,6,26,'red2','red5','red1')
 else
  D.rect(im,68,49+bob,20,6,'sky4');D.rect(im,68,55+bob,20,12,'sky2');D.line(im,78,49+bob,78,66+bob,'steel5',2)
 end
 box(67,73,22,9,'red2','red4','red1');D.eye(im,75,75+bob,'sand4')
 -- Horizontal cylindrical boiler: rounded nose, curved highlight, riveted armor bands.
 D.disc(im,163,66+bob,20,'outline');D.disc(im,163,65+bob,18,'steel2')
 for y=46,83 do
  local inset=(y<50 and 3 or y>79 and 3 or 0)
  D.rect(im,96,y+bob,68-inset,1,y<50 and 'steel5' or y<57 and 'steel4' or y<71 and 'steel3' or y<79 and 'steel2' or 'steel1')
 end
 for _,x in ipairs({100,126,153}) do
  box(x,47,5,37,'steel2','steel5','steel1');for y=51,78,9 do D.rivet(im,x+2,y+bob) end
 end
 D.disc(im,169,65+bob,15,'outline');D.disc(im,169,65+bob,13,'steel3');D.disc(im,170,65+bob,10,'steel1')
 D.eye(im,167,63+bob,'red5')
 -- Firebox on the visible boiler side, glowing when the cab is forced open.
 D.disc(im,112,76+bob,13,'outline');D.disc(im,112,76+bob,11,'sand2')
 D.disc(im,112,76+bob,9,(pose=='critical' or pose=='core' or pose=='death') and 'fire3' or 'steel1')
 if pose=='critical' or pose=='core' or pose=='death' then D.disc(im,112,75+bob,6,f%2==0 and 'fire5' or 'fire4');D.disc(im,110,73+bob,3,'fire6') end
 for x=106,118,4 do D.line(im,x,69+bob,x,83+bob,'steel2') end
 -- Flared funnel and steam dome, distinctly higher than the cab.
 box(139,24,12,28,'steel2','steel5','steel1');box(136,19,18,7,'red2','red5','red1');box(132,14,26,7,'steel3','steel5','steel1')
 D.rect(im,135,15+bob,20,3,'outline');D.disc(im,118,44+bob,7,'outline');box(111,40,14,8,'sand3','sand5','sand1')
 D.line(im,99,58+bob,158,58+bob,'sand2',2);D.line(im,99,57+bob,158,57+bob,'sand5')
 -- Bolted iron bull horns sweep up from the armored nose.
 for _,o in ipairs({-5,5}) do
  if pose=='idle' or pose=='intro' then
  D.limb(im,170+o,51+bob,180+o,40+bob,'steel3','steel5',3)
  D.limb(im,180+o,40+bob,177+o,28+bob,'steel3','steel5',2)
  D.line(im,177+o,28+bob,172+o,24+bob,'steel5',2);D.rivet(im,169+o,50+bob)
  else D.limb(im,170+o,51+bob,175+o,44+bob,'steel2','steel5',3);D.line(im,173+o,42+bob,177+o,45+bob,'sand5') end
 end
 -- Headlamp and triangular cow-catcher, with open diagonal slats.
 box(177,58,9,10,'sand2','sand5','steel1');D.disc(im,182,62+bob,3,'fire6')
 D.line(im,177,83+bob,190,105,'outline',4);D.line(im,177,83+bob,190,104,'steel5',2)
 D.line(im,172,104,190,104,'red3',3)
 for x=174,186,4 do D.line(im,176,85+bob,x,103,'steel3',2) end
 -- Three 24px spoked drivers; rotating crank pins carry a single side rod.
 local angle=(f-1)*math.pi/4
 local dx=math.floor(math.cos(angle)*7);local dy=math.floor(math.sin(angle)*7)
 for _,x in ipairs({101,128,155}) do
  D.disc(im,x,98,12,'outline');D.disc(im,x,98,10,'steel5');D.disc(im,x,98,8,'ink1')
  for j=0,5 do local t=angle+j*math.pi/3;D.line(im,x,98,x+math.cos(t)*8,98+math.sin(t)*8,'red4',2) end
  D.disc(im,x,98,3,'sand3');D.disc(im,x+dx,98+dy,2,'steel5')
 end
 D.line(im,101+dx,98+dy,155+dx,98+dy,'outline',4);D.line(im,101+dx,98+dy,155+dx,98+dy,'steel5',2)
 box(165,88,14,7,'steel2','steel5','steel1');D.line(im,155+dx,98+dy,172+dx,91,'sand4',2)
 -- Soot streaks, recessed panels and chipped bands preserve the boiler's light ramp.
 for _,x in ipairs({107,135,158}) do
  D.line(im,x,61+bob,x+7,61+bob,'steel1');D.line(im,x,62+bob,x+6,62+bob,'steel4')
  D.line(im,x+2,78+bob,x+7,80+bob,'dirt2');K.px(im,x+3,77+bob,'dirt4')
 end
 D.line(im,142,27+bob,142,42+bob,'steel1',2);D.line(im,64,39+bob,94,39+bob,'steel5')
 if pose~='idle' and pose~='intro' then
  D.line(im,128,48+bob,137,56+bob,'outline',2);D.line(im,137,56+bob,132,68+bob,'outline',2)
  D.line(im,129,48+bob,138,55+bob,'steel5')
  D.box(im,139,65+bob,15,13,'steel1','steel4','outline');D.line(im,141,67+bob,150,75+bob,'red4');D.line(im,149,67+bob,144,76+bob,'sand4')
  if f%3==0 then D.flash(im,143,68+bob,0) end
 end
 if pose=='critical' or pose=='core' or pose=='death' then
  D.box(im,68,74+bob,21,8,'steel1','steel4','outline');D.line(im,70,76+bob,85,79+bob,'fire4')
  D.line(im,152,50+bob,146,56+bob,'outline',2);D.line(im,146,56+bob,154,61+bob,'outline',2)
 end
 if pose=='intro' then D.rect(im,114,39+bob,3,5,f%2==0 and 'fire5' or 'sand5') end
 if pose=='death' then for j=0,3 do D.disc(im,49+j*35,58-(j+f)%3*9,7,'fire2');D.disc(im,48+j*35,55-(j+f)%3*9,4,'fire5') end;D.line(im,124,49,141,79,'outline',2) end
end
local a={};for _,p in ipairs({'idle','intro','damaged','critical','core','death'})do a[#a+1]=D.anim('ironhorn_'..p,8,100,function(im,f)loco(im,p,f)end)end;D.build('ironhorn',192,112,a)
local function turret(im,p,f)
 D.box(im,13,20,24,10,'steel1','steel4');D.disc(im,24,17,11,'outline');D.disc(im,24,16,9,'red3');D.disc(im,21,13,4,'red4');D.line(im,18,9,27,9,'red5')
 D.box(im,p=='fire' and 4 or 1,15,22,7,'steel2','steel5','steel1');D.rect(im,2,17,7,3,p=='aim' and 'fire4' or 'steel1');D.rivet(im,28,15)
 if p=='intro' then local cover=math.max(0,4-f)*5;D.box(im,12,8,cover+4,19,'steel2','steel5','steel1') end
 if p=='fire' and f==2 then D.flash(im,2,18,0)end
 if p=='broken' then D.rect(im,0,8,23,16,'outline');D.rect(im,0,0,17,24,'outline');D.box(im,20,15,10,12,'steel1','steel4');D.line(im,20,15,26,22,'fire4');D.rect(im,0,0,18,24,{26,18,32,0})end
end
local a={};for _,p in ipairs({'idle','intro','aim','fire','broken'})do a[#a+1]=D.anim('ironhorn_turret_'..p,4,p=='fire' and 80 or 160,function(im,f)turret(im,p,f)end)end;D.build('ironhorn_turret',48,32,a)
local function hound(im,p,f)
 local run=p=='run';local leap=p=='leap';local crouch=p=='crouch' or p=='land';local cy=crouch and 18 or 14
 D.line(im,12,cy+3,4,cy-5+(f%2)*3,'dirt2',3);D.line(im,12,cy+2,5,cy-6+(f%2)*3,'dirt4')
 for i=0,3 do local x=13+i*6;local dx=run and ({-4,-2,2,4,4,2,-2,-4})[(f+i*2-1)%8+1] or leap and (i%2==0 and -5 or 5) or 0;local foot=leap and 22 or 30;D.limb(im,x,cy+3,x+dx,foot,'dirt2','dirt4',2);D.rect(im,x+dx-3,foot-1,6,2,'steel1')end
 for y=cy-3,cy+6 do local inset=(y==cy-3 or y==cy+6) and 3 or 0;D.rect(im,10+inset,y,26-inset*2,1,y<cy and 'dirt4' or y<cy+4 and 'dirt3' or 'dirt2')end
 D.disc(im,34,cy-4,7,'outline');D.disc(im,34,cy-5,6,'dirt3');D.disc(im,32,cy-7,3,'dirt4');D.box(im,35,cy-5,11,7,'dirt3','dirt5','dirt1');D.rect(im,43,cy-5,3,3,'steel1')
 D.line(im,29,cy-8,28,cy-14,'sand3',2);D.line(im,29,cy-10,25,cy-12,'sand4');D.line(im,36,cy-9,38,cy-15,'sand3',2);D.line(im,37,cy-12,41,cy-14,'sand4')
 D.rect(im,35,cy-8,4,2,'weird5');K.px(im,38,cy-8,'outline');D.rect(im,22,cy-4,5,10,'red2');D.rect(im,23,cy-4,2,9,'red4');D.rivet(im,24,cy+2)
 if p=='leap' or p=='crouch' then D.rect(im,37,cy+1,7,3,'red1');for j=0,2 do K.px(im,38+j*2,cy+1,'sand5')end end
 if p=='crouch' then D.line(im,35,cy-9,41,cy-8,'red1',2);D.rect(im,36,cy+2,6,2,'sand5') end
 if p=='death' then D.disc(im,32,cy-4,6,'ink2');D.line(im,29,cy-6,35,cy-1,'sand5');D.line(im,35,cy-6,29,cy-1,'sand5')end
end
local a={};for _,p in ipairs({'run','crouch','leap','land','death'})do a[#a+1]=D.anim('hound_'..p,p=='run' and 8 or 4,p=='run' and 70 or 110,function(im,f)hound(im,p,f)end)end;D.build('hound',48,32,a)
local function buzzard(im,p,f)
 D.box(im,35,14,8,9,'steel2','steel5');D.line(im,8+(f%2)*8,12,85-(f%2)*8,12,'outline',3);D.line(im,8+(f%2)*8,12,85-(f%2)*8,12,'steel5')
 D.box(im,22,23,46,23,'steel3','steel5','steel1');D.disc(im,25,33,13,'outline');D.disc(im,25,32,11,'red3');D.disc(im,23,29,8,'red4');D.box(im,12,27,19,9,'steel1','steel5');D.rect(im,14,28,14,3,'sky4');D.rect(im,14,31,11,3,'sky2')
 D.box(im,36,24,15,18,'steel1','steel4');D.rect(im,39,28,10,13,'ink1');D.rect(im,41,30,5,9,'sand3');D.rect(im,45,32,3,3,'skin4')
 D.line(im,64,32,86,26,'steel1',6);D.line(im,65,31,85,25,'steel4',3);D.line(im,84,18,84,34,'red3',4);D.line(im,77,26,92,26,'steel5',2);D.box(im,68,36,8,6,'steel2','steel5')
 D.line(im,21,46,18,50,'steel1',3);D.line(im,48,46,53,50,'steel1',3);D.line(im,15,51,57,51,'steel4',2);D.box(im,25,45,9,6,'steel1','steel5')
 rivets(im,38,43,3);D.eye(im,55,29,'sand4')
 if p=='aim' then D.disc(im,30,51,3,'fire4');D.line(im,40,31,45,31,'skin5');D.line(im,45,32,47,35,'steel5',2) end
 if p=='strafe' and f%2==0 then D.flash(im,30,53,1)end
 if p=='death' then for i=1,3 do D.disc(im,17+i*15,35-(f+i)%3*6,8,'fire2');D.disc(im,16+i*15,31-(f+i)%3*6,5,'fire5')end end
end
local a={};for _,p in ipairs({'fly','aim','strafe','death'})do a[#a+1]=D.anim('buzzard_'..p,p=='fly' and 8 or 4,p=='fly' and 70 or 110,function(im,f)buzzard(im,p,f)end)end;D.build('buzzard',96,64,a)
-- Trackside raider's tucked entry and braced landing, followed by existing grunt AI.
D.build('leaper',48,48,{D.anim('leaper_leap',6,150,function(im,f)D.soldier(im,'paratrooper','chute_torn',f%3+1,3)end),D.anim('leaper_landing',3,120,function(im,f)D.soldier(im,'paratrooper','landing',f,3)end)})
for _,name in ipairs({'coal','cinder'})do D.build(name,12,12,{D.anim(name..'_fuse',4,100,function(im,f)D.disc(im,6,6,4,name=='coal' and 'steel1' or 'fire2');D.disc(im,5,5,2,name=='coal' and 'steel3' or 'fire4');K.px(im,4+(f%2),4,name=='coal' and 'steel5' or 'fire6');if name=='cinder'then D.line(im,6,1,7,4,'fire5')end end)})end
