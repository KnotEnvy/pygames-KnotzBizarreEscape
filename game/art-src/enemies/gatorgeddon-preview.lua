-- Same-scale comparison: GATORGEDDON, MOOSEZILLA, Knotz; outputs only to the team scratch directory.
local root=app.params.root
app.fs.makeAllDirectories('/tmp/kbe-enemies-a')
local function source(key,tag)
 local s=app.open(root..'/art-src/'..(key:sub(1,6)=='player' and 'player' or 'enemies')..'/'..key..'.aseprite')
 local f=1
 if tag then for _,t in ipairs(s.tags) do if t.name==tag then f=t.fromFrame.frameNumber end end end
 return s.cels[f].image
end
local out=Sprite(620,160,ColorMode.RGB);local im=Image(620,160,ColorMode.RGB);im:clear(Color{r=43,g=38,b=53,a=255})
local function draw(key,x,y) im:drawImage(source(key),Point(x,y)) end
local rx,ry=160,140
for _,p in ipairs({{'legs_back',-4,-3,56,40},{'tail',-50,-32,80,22},{'body',-12,-14,56,60},{'legs_front',-10,0,56,40},{'head',36,-34,12,24},{'jaw',40,-22,8,6},{'pod',-8,-68,20,28}}) do draw('gatorgeddon_'..p[1],rx+p[2]-p[4],ry+p[3]-p[5]) end
-- Existing rig values, identical source scale.
local mx,my=405,140
for _,p in ipairs({{'legs_back',-8,-3,52,48},{'antler_l',24,-81,72,44},{'body',-14,-26,56,54},{'core',-16,-50,16,16},{'armor',-16,-52,40,20},{'legs_front',-14,0,52,48},{'head',28,-60,12,28},{'jaw',45,-47,4,4},{'antler_r',38,-74,72,44}}) do draw('moosezilla_'..p[1],mx+p[2]-p[4],my+p[3]-p[5]) end
local p=app.open(root..'/art-src/player/knotz_full.aseprite');im:drawImage(p.cels[1].image,Point(540,92))
out:newCel(out.layers[1],out.frames[1],im,Point(0,0));out:saveAs('/tmp/kbe-enemies-a/silhouette-1x.png')
app.activeSprite=out;app.command.SpriteSize{ui=false,width=1860,height=480,method='nearest'};out:saveAs('/tmp/kbe-enemies-a/silhouette-3x.png')
