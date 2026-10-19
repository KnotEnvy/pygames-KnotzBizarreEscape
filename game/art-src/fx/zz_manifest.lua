-- Run after the four authoring scripts. All runtime textures use aseprite.
-- Also records frame keys/pivots, so particle variants need no numeric guesses.
local root=app.params.root
local names={
 'explosion_s','explosion_m','explosion_l','explosion_xl','smoke','shockwave','scorch',
 'muzzle_pistol','muzzle_hmg','muzzle_spread','muzzle_rocket','muzzle_flame',
 'casing','sparks','debris_metal','debris_wood','debris_rock',
 'impact_snow','heat','impact_dirt','impact_metal','impact_wood','impact_shield','water_splash','water_ripple',
 'dust','hit_pop','death_poof','snow','foliage','embers','firefly','steam',
 'glow_8','glow_16','glow_32','flare'
}
local function quote(s) return '"'..s..'"' end
local files,records={},{}
for _,short in ipairs(names) do
 local name='fx_'..short
 local spr=app.open(root..'/art-src/fx/'..name..'.aseprite')
 assert(spr,'missing source '..name..'; build authoring scripts first')
 local handle=assert(io.open(root..'/public/assets/sprites/fx/'..name..'.json','r'));handle:close()
 handle=assert(io.open(root..'/public/assets/sprites/fx/'..name..'.png','rb'));handle:close()
 files[#files+1]='    {"type":"aseprite","key":'..quote(name)..',"textureURL":'..quote('assets/sprites/fx/'..name..'.png')..',"atlasURL":'..quote('assets/sprites/fx/'..name..'.json')..'}'
 local px,py=spr.width/2,spr.height/2
 if short:match('^muzzle_') then px,py=8,24
 elseif short=='water_splash' then px,py=40,47
 elseif short=='impact_snow' or short=='impact_dirt' or short=='impact_wood' then px,py=16,20
 elseif short=='dust' then px,py=16,16
 elseif short=='steam' then px,py=24,44 end
 local tags={}
 for _,tag in ipairs(spr.tags) do
  local frames={};local duration=0
  for i=tag.fromFrame.frameNumber,tag.toFrame.frameNumber do
   frames[#frames+1]='{"key":'..quote(name..'#'..(i-1))..',"ms":'..math.floor(spr.frames[i].duration*1000+.5)..'}'
   duration=duration+math.floor(spr.frames[i].duration*1000+.5)
  end
  tags[#tags+1]='{"name":'..quote(tag.name)..',"durationMs":'..duration..',"frames":['..table.concat(frames,',')..']}'
 end
 local blend=(short:match('^glow_') or short=='flare' or short=='firefly') and 'ADD' or 'NORMAL'
 records[#records+1]='    {"key":'..quote(name)..',"width":'..spr.width..',"height":'..spr.height..',"pivotPx":['..px..','..py..'],"blend":'..quote(blend)..',"tags":['..table.concat(tags,',')..']}'
 spr:close()
end
local out=assert(io.open(root..'/public/assets/packs/fx.json','w'))
out:write('{\n  "fx": {"files": [\n'..table.concat(files,',\n')..'\n  ]},\n  "meta": {"app":"KBE FX pipeline","version":"1.0"}\n}\n');out:close()
out=assert(io.open(root..'/art-src/fx/catalog.json','w'))
out:write('{\n  "version":1,\n  "notes":"Frame keys are Aseprite zero-based names. Dust skid/run override pivot to [26,16]. Rocket muzzle points along exhaust, opposite aim. Diagonal muzzle art points -45 degrees. All animations play once unless explicitly looped by FX.",\n  "assets":[\n'..table.concat(records,',\n')..'\n  ]\n}\n');out:close()
print('built FX pack and pivot/tag catalog ('..#names..' textures)')
