-- KBE Phase E campaign UI art: the radio icon (Hazel's briefing box), the escape-route map pictograms and the
-- Pine Ridge route map used by the PART CLEAR screen. Phase G adds the Mission 2 pictograms (cypress, riverboat, mill) and the
-- Blackwater Bayou route map (map_m2). Build: bash tools/build-art.sh art-src/ui/campaign.lua
-- Outputs -> public/assets/ui/ui_radio.png/.json, ui_map.png/.json, map_m1.png, map_m2.png ; previews -> /tmp/kbe-ui/campaign*.png
local U = dofile(app.params.root .. "/art-src/ui/lib/ui.lua")
local K = U.K
local SRC = U.ROOT .. "/art-src/ui/"
local OUT = U.ROOT .. "/public/assets/ui/"
local PREV = "/tmp/kbe-ui/"
os.execute("mkdir -p " .. PREV)

local KEYS = {
  o = "outline", x = "ink1", q = "ink2", i = "ink3", Q = "ink4", I = "ink5", w = "white",
  A = "steel1", B = "steel2", C = "steel3", D = "steel4", E = "steel5",
  r = "red2", R = "red3", p = "red4", P = "red5",
  f = "fire2", F = "fire3", Y = "fire4", y = "fire5", z = "fire6",
  k = "skin3", K = "skin4", j = "skin2",
  g = "olive2", G = "olive3", h = "olive4", H = "olive5",
  s = "sand2", S = "sand3", t = "sand4", T = "sand5",
  n = "dirt2", N = "dirt3", m = "dirt4", M = "dirt5",
  v = "weird2", V = "weird3", W = "weird4", u = "weird5",
  l = "leaf2", L = "leaf3", e = "leaf4", b = "sky3", c = "sky4", d = "sky5", a = "sky2",
}
local function grid(w, h, rows, ox, oy) local img = U.newImage(w, h); K.grid(img, rows, KEYS, ox or 0, oy or 0); return img end
local function copy(img) local c = U.newImage(img.width, img.height); U.blit(c, img, 0, 0); return c end
local F_PLAIN = U.makeFont{ name = "hud_plain", glyphs = U.G.SMALL, scale = 0, gap = 1, space = 6, lineHeight = 9, style = { fill = "white" } }

-- ============================================================== ui_radio (24x24): handheld radio, antenna, signal arcs
local RADIO_BASE = {
  "........................",
  "................oo......",
  "................oDo.....",
  "................oDo.....",
  "................oDo.....",
  "................oDo.....",
  "......oo........oDo.....",
  "....ooAAooooooooooDoo...",
  "...oEDDDDDDDDDDDDDDDDo..",
  "...oDCCCCCCCCCCCCCpCDo..",
  "...oDCoooooooooooooCDo..",
  "...oDCoxxxxxxxxxxxoCDo..",
  "...oDCoxuuuuuWuuuxoCDo..",
  "...oDCoxxxxxxxxxxxoCDo..",
  "...oDCoooooooooooooCDo..",
  "...oDCCCCCCCCCCCCCCCDo..",
  "...oDCxCxCxCxCxCxCxCDo..",
  "...oDCCCCCCCCCCCCCCCDo..",
  "...oDCxCxCxCxCxCxCxCDo..",
  "...oDCCCCCCCCCCCCCCCDo..",
  "...oDCxCxCxCxCxCxCxCDo..",
  "...oDBBBBBBBBBBBBBBBAo..",
  "....ooooooooooooooooo...",
  "........................",
}
local function radio(arcs)
  local img = grid(24, 24, RADIO_BASE)
  -- signal arcs: quarter circles up-left of the antenna tip (17, 1)
  local cx, cy = 17, 1
  for i, r in ipairs(arcs) do
    local col = (i == #arcs) and "fire6" or ((i == #arcs - 1) and "fire5" or "fire4")
    for a = 180, 270, 3 do
      local px = math.floor(cx + r * math.cos(math.rad(a)) + 0.5)
      local py = math.floor(cy - r * math.sin(math.rad(a)) * -1 + 0.5)
      py = math.floor(cy + r * math.sin(math.rad(a)) + 0.5)
      if px >= 0 and py >= 0 and px < 16 and py < 7 then K.px(img, px, py, col) end
    end
  end
  return img
end
U.sheet{ name = "ui_radio", w = 24, h = 24, src = SRC .. "ui_radio.aseprite", sheet = OUT .. "ui_radio.png", data = OUT .. "ui_radio.json",
  entries = {
    { name = "radio_on", ms = 110, frames = { radio({ 3 }), radio({ 3, 5 }), radio({ 3, 5, 7 }), radio({ 5, 7 }) } },
    { name = "radio_off", img = radio({}) },
  } }

-- ============================================================== ui_map (16x16): route pictograms + markers
local MAP = {}
MAP.camp = grid(16, 16, {
  "................",
  "......oooo......",
  "......oRpo......",
  ".....oTttTo.....",
  ".....oTxxTo.....",
  "......oDDo......",
  "......oDDo......",
  "oooooooDDooooooo",
  "oCoCoCoDDoCoCoCo",
  "oCoCoCoDDoCoCoCo",
  "oooooooDDooooooo",
  "......oDDo......",
  "......oooo......",
  "................",
  "................",
  "................" })
MAP.train = grid(16, 16, {
  "................",
  "....oo..........",
  "...oDDo.........",
  "...oDDo.oooooo..",
  "..ooDDoooCCCCo..",
  ".oDDDDDCCCxxCo..",
  ".oDDDDDCCCxxCo..",
  ".oDDDDDCCCCCCo..",
  ".oBBBBBBBBBBBBo.",
  ".oAAAAAAAAAAAAo.",
  "..oooooooooooo..",
  ".oBBo.oBBo.oBBo.",
  ".oBxBoBxBoBxBo..",
  "..oo...oo...oo..",
  "................",
  "................" })
MAP.lake = grid(16, 16, {
  "................",
  ".........o......",
  "........ooo.....",
  ".......oCCCo....",
  ".......oCxCo....",
  "....oooooooooo..",
  "...oddccccccdo..",
  "..oddcccdcccbbo.",
  "..odcccccccbbbo.",
  "...obbbbbbbbbo..",
  "....oooooooooo..",
  "................",
  "................",
  "................",
  "................",
  "................" })
-- Phase G: Mission 2 pictograms. A cypress over black water, the BAYOU QUEEN sternwheeler, the Drowned Mill with its waterwheel.
MAP.bayou = grid(16, 16, {
  "......oo........",
  ".....oLLo..o....",
  "....oLeLLooLo...",
  "...oLLeLLLoLo...",
  "..oLeLLLeLLLLo..",
  "...oLLLeLLoLo...",
  "....ooNNooooo...",
  ".....oNno.o.....",
  ".....oNno.o.....",
  "....oNNnNo......",
  "ooooNNnNNNoooooo",
  "oaabcabbabcabaao",
  "oabaabbbaabbaabo",
  "oooooooooooooooo",
  "................",
  "................" })
MAP.boat = grid(16, 16, {
  "................",
  "....oo..oo......",
  "....oxo.oxo.....",
  "...ooAAooAAo....",
  "...oIIIIIIIIoo..",
  "..ooIIIIIIIIIoo.",
  ".oRRRRRRRRRRRRpo",
  ".oIIIIIIIIIIIRpo",
  ".oBBBBBBBBBBBRpo",
  "..ooooooooooooo.",
  "obbbcbbbbcbbbbbo",
  "obcbbbbbbbbbcbbo",
  "oooooooooooooooo",
  "................",
  "................",
  "................" })
MAP.mill = grid(16, 16, {
  "................",
  ".......oo.......",
  "......oNNo......",
  ".....oNnnNo.....",
  "....oNnnnnNo....",
  "...oooooooooo...",
  "...oMmmmmMoBo...",
  "...oMmxxmMoBo...",
  "...oMmxxmMoBo...",
  "...oooooooooBo..",
  "....oNo.oNoBo...",
  "ooooNNooNNNBoooo",
  "oaaboNobbbBBBaao",
  "oabaabbbaaaBabao",
  "oooooooooooooooo",
  "................" })
local PIN = {
  "......oooo......",
  ".....oyzzyo.....",
  ".....oyzzyo.....",
  ".....oYyyYo.....",
  "......oYYo......",
  ".......oo.......",
}
local pins = {}
for i, oy in ipairs({ 0, 1, 2, 1 }) do pins[i] = grid(16, 16, PIN, 0, oy) end
local KNOTZ = {
  "................",
  "................",
  ".....oooooo.....",
  "....oHhhhhho....",
  "....ohhhhhGo....",
  "....oGGGGGGo....",
  "....oKKoKoKo....",
  "....oKKKKKKo....",
  ".....oKkkKo.....",
  "......oooo......",
  "................",
}
local knotz1 = grid(16, 16, KNOTZ)
local KNOTZ2 = {}
for i, r in ipairs(KNOTZ) do KNOTZ2[i] = r:gsub("o", "w") end
local knotz2 = grid(16, 16, KNOTZ2)
U.sheet{ name = "ui_map", w = 16, h = 16, src = SRC .. "ui_map.aseprite", sheet = OUT .. "ui_map.png", data = OUT .. "ui_map.json",
  entries = {
    { name = "map_camp", img = MAP.camp }, { name = "map_train", img = MAP.train }, { name = "map_lake", img = MAP.lake },
    { name = "map_bayou", img = MAP.bayou }, { name = "map_boat", img = MAP.boat }, { name = "map_mill", img = MAP.mill },
    { name = "map_pin", ms = 110, frames = pins },
    { name = "map_knotz", ms = 260, frames = { knotz1, knotz2 } },
  } }

-- ============================================================== map_m1 (160x72): Pine Ridge escape route (field map)
local MW, MH = 160, 72
local map = U.newImage(MW, MH)
-- paper
for y = 0, MH - 1 do for x = 0, MW - 1 do K.px(map, x, y, ((x + y) % 2 == 0) and "sand4" or "sand3") end end
for y = 0, MH - 1 do for x = 0, MW - 1 do if (x * 7 + y * 13) % 29 == 0 then K.px(map, x, y, "sand2") end end end
K.rect(map, 0, 0, MW, 1, "sand1"); K.rect(map, 0, MH - 1, MW, 1, "sand1"); K.rect(map, 0, 0, 1, MH, "sand1"); K.rect(map, MW - 1, 0, 1, MH, "sand1")
-- far ridge (north): grey-blue triangles with snow caps
local function peak(x, top, half, base, body, cap)
  for y = top, base do
    local w = math.floor((y - top) * half / math.max(1, base - top))
    K.rect(map, x - w, y, w * 2 + 1, 1, body)
  end
  for y = top, math.min(base, top + 4) do
    local w = math.floor((y - top) * half / math.max(1, base - top))
    K.rect(map, x - w, y, w * 2 + 1, 1, cap)
  end
end
for _, p in ipairs({ { 14, 8, 22 }, { 40, 4, 26 }, { 68, 9, 20 }, { 96, 5, 24 }, { 124, 10, 18 }, { 150, 7, 20 } }) do peak(p[1], p[2], p[3], 30, "steel3", "ink6") end
for _, p in ipairs({ { 28, 15, 18 }, { 56, 17, 16 }, { 84, 14, 20 }, { 112, 18, 15 }, { 140, 16, 17 } }) do peak(p[1], p[2], p[3], 32, "steel2", "steel5") end
-- tree line under the ridge, pines scattered south
local function pine(x, y, col) K.px(map, x, y, col); K.rect(map, x - 1, y + 1, 3, 1, col); K.rect(map, x - 2, y + 2, 5, 1, col); K.px(map, x, y + 3, "dirt2") end
for i = 0, 38 do pine(4 + i * 4, 30 + (i * 5) % 3, (i % 3 == 0) and "leaf2" or "leaf3") end
for _, t in ipairs({ { 10, 56 }, { 18, 62 }, { 30, 58 }, { 48, 50 }, { 58, 60 }, { 70, 54 }, { 86, 62 }, { 96, 50 }, { 104, 58 }, { 118, 62 }, { 150, 58 }, { 154, 40 }, { 40, 64 }, { 78, 44 } }) do pine(t[1], t[2], (t[1] % 8 == 0) and "leaf2" or "leaf3") end
-- river from the ridge down to the lake
for i = 0, 40 do local x = 100 + math.floor(i * 0.9); local y = 30 + i; if y < MH - 2 and x < 126 then K.rect(map, x, y, 2, 1, "sky3") end end
-- frozen lake (east)
local lx, ly = 132, 50
for y = -10, 10 do for x = -22, 22 do
  if (x * x) / (22 * 22) + (y * y) / (10 * 10) <= 1 then
    local edge = (x * x) / (20 * 20) + (y * y) / (8 * 8) > 1
    K.px(map, lx + x, ly + y, edge and "sky3" or (((x + y) % 3 == 0) and "sky5" or "sky4"))
  end
end end
K.line(map, 124, 46, 138, 53, "sky5"); K.line(map, 130, 56, 141, 48, "sky5")
-- Von Antler's lab on the north shore
K.rect(map, 136, 36, 10, 6, "outline"); K.rect(map, 137, 37, 8, 4, "steel3"); K.rect(map, 139, 33, 1, 4, "outline"); K.px(map, 139, 32, "weird4")
K.px(map, 138, 38, "weird5"); K.px(map, 142, 38, "weird5")
-- prison camp (west): fenced yard with towers
K.rect(map, 12, 40, 26, 14, "outline"); K.rect(map, 13, 41, 24, 12, "sand3")
for x = 13, 36, 3 do K.px(map, x, 40, "ink1"); K.px(map, x, 53, "ink1") end
K.rect(map, 11, 39, 3, 3, "red3"); K.rect(map, 35, 39, 3, 3, "red3"); K.rect(map, 11, 52, 3, 3, "red3"); K.rect(map, 35, 52, 3, 3, "red3")
K.rect(map, 18, 44, 6, 4, "dirt3"); K.rect(map, 27, 44, 6, 4, "dirt3"); K.rect(map, 22, 49, 6, 3, "dirt3")
-- logging railway: camp gate -> ridge pass -> lake shore, rails with ties
local route = { { 38, 47 }, { 50, 44 }, { 62, 40 }, { 74, 36 }, { 86, 34 }, { 98, 36 }, { 108, 40 }, { 116, 44 }, { 124, 46 } }
for i = 1, #route - 1 do
  local a, b = route[i], route[i + 1]
  K.line(map, a[1], a[2] - 1, b[1], b[2] - 1, "steel1"); K.line(map, a[1], a[2] + 1, b[1], b[2] + 1, "steel1")
  local steps = math.max(math.abs(b[1] - a[1]), math.abs(b[2] - a[2]))
  for s = 0, steps, 4 do
    local x = math.floor(a[1] + (b[1] - a[1]) * s / steps + 0.5); local y = math.floor(a[2] + (b[2] - a[2]) * s / steps + 0.5)
    K.rect(map, x, y - 1, 1, 3, "dirt2")
  end
end
-- trestle over the river gap near the lake
K.rect(map, 112, 42, 8, 1, "dirt4"); for x = 112, 119, 2 do K.rect(map, x, 43, 1, 4, "dirt3") end
-- title + compass (diegetic map lettering)
U.drawText(map, F_PLAIN, 4, 3, "PINE RIDGE", "ink1")
U.drawText(map, F_PLAIN, 148, 3, "N", "ink1"); K.px(map, 150, 10, "ink1"); K.rect(map, 149, 11, 3, 1, "ink1"); K.px(map, 150, 12, "ink1")
U.saveImage(map, OUT .. "map_m1.png", SRC .. "map_m1.aseprite")

-- ============================================================== map_m2 (160x72): Blackwater Bayou escape route (Phase G)
-- Knotz comes down from Pine Ridge (north edge) and follows the Blackwater south-east: the dock and cypress deep (I, north-west),
-- the river run with the stilt village and the BAYOU QUEEN (II, centre) and the Drowned Mill in the black water (III, south-east).
-- Port Delacroix is off the south edge. The route polyline matches UI.partClear.maps[2].route (src/config/tuning/ui.ts).
local map2 = U.newImage(MW, MH)
for y = 0, MH - 1 do for x = 0, MW - 1 do K.px(map2, x, y, ((x + y) % 2 == 0) and "sand4" or "sand3") end end
for y = 0, MH - 1 do for x = 0, MW - 1 do if (x * 7 + y * 13) % 29 == 0 then K.px(map2, x, y, "sand2") end end end
K.rect(map2, 0, 0, MW, 1, "sand1"); K.rect(map2, 0, MH - 1, MW, 1, "sand1"); K.rect(map2, 0, 0, 1, MH, "sand1"); K.rect(map2, MW - 1, 0, 1, MH, "sand1")
-- the Pine Ridge foothills along the north edge (where Mission 1 ended), dark pines under them
for _, p in ipairs({ { 10, 1, 14 }, { 36, 0, 16 }, { 60, 2, 12 }, { 120, 1, 14 }, { 146, 0, 16 } }) do
  for y = p[2], 9 do local w = math.floor((y - p[2]) * p[3] / math.max(1, 9 - p[2])); K.rect(map2, p[1] - w, y, w * 2 + 1, 1, "steel2") end
end
for i = 0, 38 do pine(4 + i * 4, 9 + (i * 5) % 3, (i % 3 == 0) and "leaf1" or "leaf2") end
-- the Blackwater river: from the north edge, winding south-east to the mill and off the map
local river = { { 96, 0 }, { 84, 14 }, { 68, 30 }, { 62, 39 }, { 72, 42 }, { 84, 44 }, { 96, 47 }, { 106, 51 }, { 118, 56 }, { 132, 64 }, { 148, 71 } }
local function thick(pts, w, col)
  for i = 1, #pts - 1 do
    local a, b = pts[i], pts[i + 1]
    for d = -w, w do K.line(map2, a[1] + d, a[2], b[1] + d, b[2], col); K.line(map2, a[1], a[2] + d, b[1], b[2] + d, col) end
  end
end
thick(river, 3, "sky2"); thick(river, 2, "sky3")
for i = 1, #river - 1 do local a, b = river[i], river[i + 1]; if i % 2 == 0 then K.line(map2, a[1], a[2], b[1], b[2], "sky4") end end
-- the bayou (north-west): black water with a channel to the river, cypress knees and moss
local function blob(cx, cy, rx, ry, col, col2)
  for y = -ry, ry do for x = -rx, rx do
    if (x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1 then K.px(map2, cx + x, cy + y, (((x + y) % 3 == 0) and col2) or col) end
  end end
end
blob(26, 30, 20, 9, "sky2", "sky3"); blob(44, 36, 12, 6, "sky2", "sky3"); K.line(map2, 52, 38, 62, 39, "sky2"); K.line(map2, 52, 39, 62, 40, "sky3")
local function cypress(x, y, col) K.px(map2, x, y, col); K.rect(map2, x - 1, y + 1, 3, 1, col); K.px(map2, x, y + 2, col); K.px(map2, x, y + 3, "dirt2") end
for _, t in ipairs({ { 8, 22 }, { 14, 34 }, { 20, 24 }, { 30, 36 }, { 36, 26 }, { 44, 30 }, { 50, 44 }, { 12, 44 }, { 24, 46 }, { 40, 50 }, { 56, 28 }, { 76, 56 }, { 88, 62 }, { 100, 64 }, { 112, 66 }, { 70, 62 }, { 76, 30 }, { 90, 24 }, { 104, 30 }, { 116, 24 }, { 128, 34 }, { 140, 26 }, { 150, 40 }, { 144, 50 }, { 122, 44 }, { 110, 40 }, { 6, 44 }, { 46, 22 }, { 62, 20 }, { 150, 18 } }) do
  cypress(t[1], t[2], (t[1] % 8 == 0) and "leaf2" or "leaf3")
end
-- moss strands and reeds
for _, m in ipairs({ { 10, 28 }, { 34, 32 }, { 22, 40 }, { 48, 36 }, { 136, 54 }, { 150, 62 } }) do K.rect(map2, m[1], m[2], 1, 3, "olive3") end
-- the dock at the bayou edge (I): planks into the water
K.rect(map2, 24, 20, 8, 2, "dirt3"); K.rect(map2, 30, 20, 1, 4, "dirt2")
-- the stilt village (II approach): shacks on stilts over the river bank
for _, h in ipairs({ { 70, 34 }, { 76, 36 }, { 82, 38 } }) do
  K.rect(map2, h[1], h[2], 5, 3, "dirt3"); K.rect(map2, h[1] + 1, h[2] - 1, 3, 1, "red3"); K.px(map2, h[1], h[2] + 3, "dirt2"); K.px(map2, h[1] + 4, h[2] + 3, "dirt2")
end
-- the pump station (bog) and the fog bank
K.rect(map2, 54, 50, 6, 4, "steel2"); K.rect(map2, 56, 48, 2, 2, "steel3")
for x = 96, 112, 3 do K.px(map2, x, 57, "ink6") end
-- the Drowned Mill (III) on pilings in black water, DANGER cage pens
blob(136, 62, 14, 6, "sky2", "sky3")
K.rect(map2, 132, 52, 8, 5, "outline"); K.rect(map2, 133, 53, 6, 3, "sand3"); K.rect(map2, 134, 50, 4, 2, "dirt3")
K.rect(map2, 140, 53, 1, 5, "steel3"); K.px(map2, 141, 54, "steel4"); K.px(map2, 141, 56, "steel4")
K.px(map2, 128, 60, "weird4"); K.px(map2, 144, 59, "weird4")
-- the trail: dotted dirt path along the route from the dock down to the mill
local route2 = { { 28, 25 }, { 38, 30 }, { 50, 34 }, { 62, 39 }, { 72, 42 }, { 84, 44 }, { 96, 47 }, { 106, 51 }, { 116, 54 }, { 126, 58 }, { 136, 61 } }
for i = 1, #route2 - 1 do
  local a, b = route2[i], route2[i + 1]
  local steps = math.max(math.abs(b[1] - a[1]), math.abs(b[2] - a[2]))
  for st = 0, steps, 3 do
    local x = math.floor(a[1] + (b[1] - a[1]) * st / steps + 0.5); local y = math.floor(a[2] + (b[2] - a[2]) * st / steps + 0.5)
    K.px(map2, x, y - 2, "dirt5")
  end
end
-- lettering (bottom-left, clear of the pictograms): the region, the city off the south edge with an arrow, the compass top-right
U.drawText(map2, F_PLAIN, 4, 54, "BLACKWATER BAYOU", "ink1")
U.drawText(map2, F_PLAIN, 10, 63, "DELACROIX", "ink1"); K.rect(map2, 5, 63, 1, 5, "ink1"); K.px(map2, 4, 67, "ink1"); K.px(map2, 6, 67, "ink1")
U.drawText(map2, F_PLAIN, 148, 3, "N", "ink1"); K.px(map2, 150, 10, "ink1"); K.rect(map2, 149, 11, 3, 1, "ink1"); K.px(map2, 150, 12, "ink1")
U.saveImage(map2, OUT .. "map_m2.png", SRC .. "map_m2.aseprite")

-- ============================================================== preview
local prev = U.newImage(200, 120)
K.rect(prev, 0, 0, 200, 120, "ink1")
U.blit(prev, map, 4, 4)
U.blit(prev, MAP.camp, 18, 36); U.blit(prev, MAP.train, 82, 20); U.blit(prev, MAP.lake, 134, 34); U.blit(prev, pins[1], 82, 6); U.blit(prev, knotz1, 50, 30)
local prev2 = U.newImage(200, 120)
K.rect(prev2, 0, 0, 200, 120, "ink1")
U.blit(prev2, map2, 4, 4)
U.blit(prev2, MAP.bayou, 24, 10); U.blit(prev2, MAP.boat, 80, 29); U.blit(prev2, MAP.mill, 132, 46); U.blit(prev2, knotz1, 36, 14); U.blit(prev2, pins[1], 80, 14)
local ix2 = 8
for _, im in ipairs({ MAP.bayou, MAP.boat, MAP.mill }) do U.blit(prev2, im, ix2, 90); ix2 = ix2 + 20 end
local big2 = U.newImage(prev2.width * 3, prev2.height * 3)
for y = 0, prev2.height - 1 do for x = 0, prev2.width - 1 do local p = prev2:getPixel(x, y)
  for j = 0, 2 do for i = 0, 2 do big2:drawPixel(x * 3 + i, y * 3 + j, p) end end end end
U.saveImage(big2, PREV .. "campaign_m2_x3.png")
U.blit(prev, radio({ 3, 5, 7 }), 8, 84); U.blit(prev, radio({ 3 }), 36, 84); U.blit(prev, radio({}), 64, 84)
local ix = 100
for _, im in ipairs({ MAP.camp, MAP.train, MAP.lake, pins[1], knotz1, knotz2 }) do U.blit(prev, im, ix, 90); ix = ix + 16 end
local big = U.newImage(prev.width * 3, prev.height * 3)
for y = 0, prev.height - 1 do for x = 0, prev.width - 1 do local p = prev:getPixel(x, y)
  for j = 0, 2 do for i = 0, 2 do big:drawPixel(x * 3 + i, y * 3 + j, p) end end end end
U.saveImage(big, PREV .. "campaign_x3.png")
print("campaign art done")
