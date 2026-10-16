-- KBE bitmap fonts -> public/assets/fonts/*.png + *.xml (BMFont XML for this.load.bitmapFont).
-- Build: bash tools/build-art.sh art-src/ui/fonts.lua
-- Also writes previews to /tmp/kbe-ui/fonts/.
local U = dofile(app.params.root .. "/art-src/ui/lib/ui.lua")
local K = U.K
local OUT = U.ROOT .. "/public/assets/fonts/"
local PREV = "/tmp/kbe-ui/fonts/"
os.execute("mkdir -p " .. PREV)

local FONTS = {}

-- Small HUD font: 5x7 glyphs, 1px outline, monospace (xadvance 6). Fill is white so it tints.
FONTS.hud = U.makeFont{
  name = "hud", glyphs = U.G.SMALL, scale = 0, trim = false, gap = 1, space = 6, lineHeight = 10,
  style = { fill = "white", outline = "outline" },
}
-- Gold HUD digits/labels (score, "1UP", "ARMS"): fire ramp top->bottom.
FONTS.hud_gold = U.makeFont{
  name = "hud_gold", glyphs = U.G.SMALL, scale = 0, trim = false, gap = 1, space = 6, lineHeight = 10,
  style = { fill = U.RAMP.gold, outline = "outline" },
}
-- Small plain font (no outline) for dense text (options, credits, debug).
FONTS.hud_plain = U.makeFont{
  name = "hud_plain", glyphs = U.G.SMALL, scale = 0, trim = false, gap = 1, space = 6, lineHeight = 9,
  style = { fill = "white" },
}

-- Big callout font: 6x8 skeleton -> EPX 2x (12x16), gradient fill, outline, 1px drop shadow.
local function callout(name, fill)
  return U.makeFont{
    name = name, glyphs = U.G.BIG, scale = 1, bold = 1, trim = true, upper = true, gap = 1, space = 8, lineHeight = 21,
    style = { fill = fill, outline = "outline", shadow = { 1, 1, "outline" } },
  }
end
FONTS.callout_fire  = callout("callout_fire", U.RAMP.fire)
FONTS.callout_sand  = callout("callout_sand", U.RAMP.sand)
FONTS.callout_steel = callout("callout_steel", U.RAMP.steel)
FONTS.callout_white = callout("callout_white", "white")

for name, f in pairs(FONTS) do U.exportFont(f, OUT .. name .. ".png", OUT .. name .. ".xml", name .. ".png") end

-- ------------------------------------------------------------------ previews
local function preview(path, w, h, draw)
  local img = U.newImage(w, h)
  K.rect(img, 0, 0, w, h, "ink1")
  draw(img)
  -- 3x nearest upscale for viewing
  local big = U.newImage(w * 3, h * 3)
  for y = 0, h - 1 do for x = 0, w - 1 do local p = img:getPixel(x, y)
    for j = 0, 2 do for i = 0, 2 do big:drawPixel(x * 3 + i, y * 3 + j, p) end end end end
  U.saveImage(img, path)
  U.saveImage(big, (path:gsub("%.png$", "_x3.png")))
end

preview(PREV .. "hud.png", 384, 216, function(img)
  U.drawText(img, FONTS.hud, 4, 4, "1UP  00012340   ARMS 200  BOMB 10")
  U.drawText(img, FONTS.hud_gold, 4, 16, "1UP  00012340   ARMS 200  BOMB 10")
  U.drawText(img, FONTS.hud, 4, 32, "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG")
  U.drawText(img, FONTS.hud, 4, 44, "the quick brown fox jumps over the lazy dog")
  U.drawText(img, FONTS.hud, 4, 56, "0123456789 !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~")
  U.drawText(img, FONTS.hud, 4, 68, "GO \226\134\146  \226\134\144 \226\134\145 \226\134\147  JUMP \226\150\178  BOMB \226\151\143  \195\151 3  \226\153\165")
  U.drawText(img, FONTS.hud_plain, 4, 84, "Plain: Options / Credits text, no outline. 384x216")
  U.drawText(img, FONTS.hud, 4, 100, "PRESS START", "fire5")
  U.drawText(img, FONTS.hud, 4, 112, "DIFFICULTY: ARCADE   CRT: ON   SHAKE: ON", "sand5")
  U.drawText(img, FONTS.hud, 4, 124, "SCORE 00000000   RESCUED 05   RANK S", "steel5")
  U.drawText(img, FONTS.hud, 4, 140, "tint test: ", "ink5"); U.drawText(img, FONTS.hud, 70, 140, "RED", "red4"); U.drawText(img, FONTS.hud, 100, 140, "GREEN", "weird4"); U.drawText(img, FONTS.hud, 140, 140, "SKY", "sky4")
end)

preview(PREV .. "callout.png", 384, 216, function(img)
  U.drawText(img, FONTS.callout_fire, 8, 6, "MISSION 1 START!")
  U.drawText(img, FONTS.callout_fire, 8, 28, "HEAVY MACHINE GUN!")
  U.drawText(img, FONTS.callout_sand, 8, 50, "ROCKET LAUNCHER!")
  U.drawText(img, FONTS.callout_steel, 8, 72, "MISSION COMPLETE")
  U.drawText(img, FONTS.callout_white, 8, 94, "CONTINUE? 9")
  U.drawText(img, FONTS.callout_fire, 8, 116, "ABCDEFGHIJKLMNOPQRSTUVWXYZ")
  U.drawText(img, FONTS.callout_sand, 8, 138, "0123456789 !?.,:;-+'\"/%&()*=<>[]_#@$")
  U.drawText(img, FONTS.callout_steel, 8, 160, "GO \226\134\146 \226\134\144\226\134\145\226\134\147 \226\150\178\226\151\143\195\151\226\153\165 lower->UPPER")
  U.drawText(img, FONTS.callout_white, 8, 182, "GAME OVER", "red4")
end)
print("fonts done")
