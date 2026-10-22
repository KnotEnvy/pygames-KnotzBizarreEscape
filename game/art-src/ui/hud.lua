-- KBE HUD kit: icons, 1UP badge, GO! arrow, cursor, button prompts, countdown numerals, rank letters,
-- 9-slice panels and the boss HP bar.  Build: bash tools/build-art.sh art-src/ui/hud.lua
-- Outputs -> public/assets/ui/*.png (+ .json for sheets), previews -> /tmp/kbe-ui/hud*.png
local U = dofile(app.params.root .. "/art-src/ui/lib/ui.lua")
local K = U.K
local SRC = U.ROOT .. "/art-src/ui/"
local OUT = U.ROOT .. "/public/assets/ui/"
local PREV = "/tmp/kbe-ui/"
os.execute("mkdir -p " .. PREV)

local KEYS = {
  o = "outline", x = "ink1", i = "ink3", I = "ink5", w = "white", q = "ink2", Q = "ink4",
  A = "steel1", B = "steel2", C = "steel3", D = "steel4", E = "steel5",
  r = "red2", R = "red3", p = "red4", P = "red5",
  f = "fire2", F = "fire3", Y = "fire4", y = "fire5", z = "fire6",
  k = "skin3", K = "skin4", j = "skin2", J = "skin5",
  g = "olive2", G = "olive3", h = "olive4", H = "olive5",
  s = "sand2", S = "sand3", t = "sand4", T = "sand5",
  n = "dirt2", N = "dirt3", m = "dirt4", M = "dirt5",
  v = "weird2", V = "weird3", W = "weird4", u = "weird5",
  l = "leaf3", L = "leaf4", b = "sky3", c = "sky4",
}
local function grid(w, h, rows, ox, oy) local img = U.newImage(w, h); K.grid(img, rows, KEYS, ox or 0, oy or 0); return img end

-- fonts used for baked labels (same generators as fonts.lua)
local F_SMALL = U.makeFont{ name = "hud", glyphs = U.G.SMALL, scale = 0, gap = 1, space = 6, lineHeight = 10, style = { fill = "white", outline = "outline" } }
local F_PLAIN = U.makeFont{ name = "hud_plain", glyphs = U.G.SMALL, scale = 0, gap = 1, space = 6, lineHeight = 9, style = { fill = "white" } }
local F_GOLD  = U.makeFont{ name = "hud_gold", glyphs = U.G.SMALL, scale = 0, gap = 1, space = 6, lineHeight = 10, style = { fill = U.RAMP.gold, outline = "outline" } }
local F_CALL  = U.makeFont{ name = "callout_fire", glyphs = U.G.BIG, scale = 1, bold = 1, trim = true, upper = true, gap = 1, space = 8, lineHeight = 21, style = { fill = U.RAMP.fire, outline = "outline", shadow = { 1, 1, "outline" } } }

-- ============================================================== ui_icons (16x16)
local ICONS = {}
ICONS.pistol = grid(16, 16, {
  "................",
  "................",
  "................",
  "..oooooooooooo..",
  ".oEEDDDDDDDDDDo.",
  ".oDCCCCCCCCCCCCo",
  ".oDCBBBBBooooooo",
  "..oooBBBoo......",
  "....oBAAoAo.....",
  "....oBAAo.o.....",
  "....oAAAooo.....",
  ".....oooo.......",
  "................",
  "................",
  "................",
  "................" })
ICONS.hmg = grid(16, 16, {
  "................",
  "................",
  ".........oo.....",
  "........oDDo....",
  ".ooooooooDDooooo",
  "oEDDDDDDDDDDDDDo",
  "oDCCCCCCCCCCCCCo",
  "oBBoooCCCoooooo.",
  ".oo..oRRRRo.....",
  ".....oRpPRo.....",
  ".....oRRRRo.....",
  "......oooo......",
  "................",
  "................",
  "................",
  "................" })
ICONS.spread = grid(16, 16, {
  "................",
  "................",
  "..............y.",
  ".............y..",
  ".oooooooooooo...",
  "oTttDDDDDDDDDoyy",
  "oTtsCCCCCCCCCo..",
  "oTsoooBBBoooooyy",
  ".oo..oBBo....y..",
  ".....oooo.....y.",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................" })
ICONS.rocket = grid(16, 16, {
  "................",
  "................",
  "................",
  "....oooooooooo..",
  "...oDDDDDDDDDDo.",
  ".ooDCCCCCCCCCCpo",
  ".oyFCBBBBBBBBpPo",
  ".ooDAAAAAAAAAApo",
  "...oAAAAAAAAAAo.",
  "....oooooooooo..",
  "..oo...oo.......",
  "...o...o........",
  "................",
  "................",
  "................",
  "................" })
ICONS.flame = grid(16, 16, {
  "................",
  "..oooo..........",
  ".oDDDDo.........",
  ".oDCCCCo........",
  ".oCBBBBoooooo...",
  ".oCBBBBCCCCCCooy",
  ".oBBBBBBooooooyz",
  "..ooooBBo...oyzy",
  "......oBo..oYyzY",
  "......ooo..oFYYo",
  "............oFo.",
  ".............o..",
  "................",
  "................",
  "................",
  "................" })
ICONS.bomb = grid(16, 16, {
  "................",
  "......oo........",
  ".....oTto.......",
  "....ooSSoo......",
  "...oHhhGgo......",
  "..oHhGhGggo.....",
  "..oGhGhGgGo.....",
  "..oGGgGGgGo.....",
  "..oGggGggGo.....",
  "..oggggGggo.....",
  "...ogggggo......",
  "....ooooo.......",
  "................",
  "................",
  "................",
  "................" })
ICONS.life = grid(16, 16, {
  "................",
  "....oooooo......",
  "...oHHhhhho.....",
  "..oHhhhhhhGo....",
  "..ohhhhhhGGo....",
  "..oGGGGGGGGo....",
  "..oKKKKKKKKo....",
  "..oKoKKKoKKo....",
  "..oKKKkKKKKo....",
  "...oKkjjKKo.....",
  "....oKKKKo......",
  ".....oooo.......",
  "................",
  "................",
  "................",
  "................" })
ICONS.pow = grid(16, 16, {
  "................",
  "....oooooo......",
  "...oRRpRRRo.....",
  "..oRRpRRRRRo....",
  "..ooooooooooo...",
  "..oKKKKKKKKo....",
  "..oKoKKKoKKo....",
  "..oKKKKKKKKo....",
  "..oNnnnnnnNo....",
  "...oNnNnNno.....",
  "....oNNNNo......",
  ".....oooo.......",
  "................",
  "................",
  "................",
  "................" })
ICONS.medal = grid(16, 16, {
  "................",
  ".....oooo.......",
  "....oRRRRo......",
  "....oRppRo......",
  "....oRRRRo......",
  "....oYyyYo......",
  "...oYyzyyYo.....",
  "...oYyyyyYo.....",
  "...oFYyyYFo.....",
  "....oFYYFo......",
  ".....oooo.......",
  "................",
  "................",
  "................",
  "................",
  "................" })
ICONS.laser = grid(16, 16, {
  "................",
  "................",
  "................",
  "...ooooooooooo..",
  "..oEDDDDDDDDDDo.",
  ".oDCCuuuuuCCCCoo",
  ".oDCuWWWWuCooouu",
  ".ooooBBBoo....uu",
  "....oBAAoAo..uu.",
  "....oBAAo.o.....",
  "....oAAAooo.....",
  ".....oooo.......",
  "................",
  "................",
  "................",
  "................" })
-- Phase G: the shotgun (pump gun, wooden stock, sand furniture) with the Metal Slug "S" badge in the corner.
ICONS.shotgun = grid(16, 16, {
  "................",
  "................",
  ".......oooooooo.",
  ".oooooooDDDDDDDo",
  "oNnnnDDCCCCCCCCo",
  "oNnnnDDoCBBBoooo",
  ".ooooooooBBoo...",
  "......oNNo.oo...",
  ".....oNNo.......",
  "....oNNo..oooo..",
  "....ooo..oYyyYo.",
  ".........oYoooo.",
  ".........oYyyYo.",
  ".........ooooYo.",
  ".........oYyyYo.",
  "..........oooo.." })
ICONS.lock = grid(16, 16, {
  "................",
  "................",
  ".....oooooo.....",
  "....oDDDDDDo....",
  "....oDooooDo....",
  "....oDo..oDo....",
  "...oooooooooooo.",
  "...oTttttttttTo.",
  "...oTtttootttTo.",
  "...oTttoxxottTo.",
  "...oTtttootttTo.",
  "...oTttttstttTo.",
  "...oSSSSSSSSSSo.",
  "....oooooooooo..",
  "................",
  "................" })
ICONS.cursor1 = grid(16, 16, {
  "................",
  "....oo..........",
  "....oyo.........",
  "....oyyo........",
  "....oyzyo.......",
  "....oyzyyo......",
  "....oyzyyyo.....",
  "....oyzyyo......",
  "....oyzyo.......",
  "....oyyo........",
  "....oyo.........",
  "....oo..........",
  "................",
  "................",
  "................",
  "................" })
ICONS.cursor2 = grid(16, 16, {}); U.blit(ICONS.cursor2, ICONS.cursor1, 2, 0)
ICONS.cursor3 = grid(16, 16, {}); U.blit(ICONS.cursor3, ICONS.cursor1, 1, 0)
-- skull for boss bar label / danger
ICONS.skull = grid(16, 16, {
  "................",
  "....oooooo......",
  "...oIIIIIIo.....",
  "..oIIIIIIIIo....",
  "..oIooIIooIo....",
  "..oIoxIIxoIo....",
  "..oIIIIIIIIo....",
  "...oIIooIIo.....",
  "...ooIIIIoo.....",
  "....oIoIoIo.....",
  ".....ooooo......",
  "................",
  "................",
  "................",
  "................",
  "................" })
ICONS.check = grid(16, 16, {
  "................",
  "................",
  "............oo..",
  "...........oLo..",
  "..........oLLo..",
  "..oo.....oLLo...",
  "..oLo...oLLo....",
  "..oLLo.oLLo.....",
  "...oLLoLLo......",
  "....oLLLo.......",
  ".....oLo........",
  "......o.........",
  "................",
  "................",
  "................",
  "................" })

U.sheet{ name = "ui_icons", w = 16, h = 16, src = SRC .. "ui_icons.aseprite", sheet = OUT .. "ui_icons.png", data = OUT .. "ui_icons.json",
  entries = {
    { name = "icon_pistol", img = ICONS.pistol }, { name = "icon_hmg", img = ICONS.hmg }, { name = "icon_spread", img = ICONS.spread },
    { name = "icon_rocket", img = ICONS.rocket }, { name = "icon_flame", img = ICONS.flame }, { name = "icon_bomb", img = ICONS.bomb },
    { name = "icon_life", img = ICONS.life }, { name = "icon_pow", img = ICONS.pow }, { name = "icon_medal", img = ICONS.medal },
    { name = "icon_skull", img = ICONS.skull }, { name = "icon_check", img = ICONS.check },
    { name = "icon_laser", img = ICONS.laser }, { name = "icon_lock", img = ICONS.lock }, { name = "icon_shotgun", img = ICONS.shotgun },
    { name = "ui_cursor", ms = 120, frames = { ICONS.cursor1, ICONS.cursor3, ICONS.cursor2, ICONS.cursor3 } },
  } }

-- ============================================================== ui_hud (64x24): 1UP badge, GO! arrow
local function badge1up()
  local img = U.newImage(64, 24)
  -- plate 24x12 at (0,0): dark fill, steel bezel, gold text
  K.rect(img, 1, 0, 22, 12, "outline"); K.rect(img, 0, 1, 24, 10, "outline")
  K.rect(img, 1, 1, 22, 10, "steel2"); K.rect(img, 2, 2, 20, 8, "ink1")
  K.rect(img, 2, 2, 20, 1, "steel3"); K.rect(img, 2, 2, 1, 8, "steel3")
  U.drawText(img, F_GOLD, 3, 2, "1UP")
  return img
end
local GO = {}
for f = 1, 4 do
  local img = U.newImage(64, 24)
  local arrowOff = ({ 0, 1, 2, 1 })[f]
  U.drawText(img, F_CALL, 1, 2, "GO!")
  if f ~= 3 then
    -- chevron arrow 14 px wide
    local m = U.mask({ "......##......", "......###.....", "......####....", "##############", "###############", "##############", "......####....", "......###.....", "......##......" })
    local a = U.render(m, { fill = (f == 1) and "fire6" or U.RAMP.fire, outline = "outline", shadow = { 1, 1, "outline" } })
    U.blit(img, a, 44 + arrowOff, 6)
  end
  GO[f] = img
end
U.sheet{ name = "ui_hud", w = 64, h = 24, src = SRC .. "ui_hud.aseprite", sheet = OUT .. "ui_hud.png", data = OUT .. "ui_hud.json",
  entries = { { name = "hud_1up", img = badge1up() }, { name = "hud_go", ms = 110, frames = GO } } }

-- ============================================================== ui_prompts (32x14)
local PW = 40
local function keycap(label, wide)
  local w = wide or 12
  local img = U.newImage(PW, 14)
  local x = math.floor((PW - w) / 2)
  K.rect(img, x + 1, 0, w - 2, 13, "outline"); K.rect(img, x, 1, w, 11, "outline")
  K.rect(img, x + 1, 1, w - 2, 9, "ink5"); K.rect(img, x + 1, 1, w - 2, 1, "ink6")
  K.rect(img, x + 1, 10, w - 2, 2, "ink3")
  local tw = U.textWidth(F_PLAIN, label) - 1
  U.drawText(img, F_PLAIN, x + math.floor((w - tw) / 2), 2, label, "ink1")
  return img
end
local function padButton(label, face)
  local img = U.newImage(PW, 14)
  local cx = PW // 2
  K.disc(img, cx, 6, 6, "outline"); K.disc(img, cx, 6, 5, face)
  K.px(img, cx - 3, 2, "white"); K.px(img, cx - 4, 3, "white")
  U.drawText(img, F_PLAIN, cx - 2, 3, label, "ink1")
  return img
end
local function padStart()
  local img = U.newImage(PW, 14)
  local x = PW // 2 - 9
  K.rect(img, x + 1, 2, 18, 9, "outline"); K.rect(img, x, 3, 20, 7, "outline"); K.rect(img, x + 1, 3, 18, 7, "ink5"); K.rect(img, x + 1, 3, 18, 1, "ink6")
  for i = 0, 2 do K.rect(img, x + 6, 4 + i * 2, 8, 1, "ink1") end
  return img
end
local function padShoulder(label)
  local img = U.newImage(PW, 14)
  local x = PW // 2 - 9
  K.rect(img, x, 3, 18, 8, "outline"); K.rect(img, x + 1, 2, 16, 1, "outline"); K.rect(img, x + 1, 3, 16, 7, "ink5"); K.rect(img, x + 1, 3, 16, 1, "ink6"); K.rect(img, x + 1, 9, 16, 1, "ink3")
  local tw = U.textWidth(F_PLAIN, label) - 1
  U.drawText(img, F_PLAIN, PW // 2 - math.floor(tw / 2), 2, label, "ink1")
  return img
end
local function padDpad()
  local img = U.newImage(PW, 14)
  local x = PW // 2 - 4
  K.rect(img, x, 0, 8, 14, "outline"); K.rect(img, x - 3, 3, 14, 8, "outline")
  K.rect(img, x + 1, 1, 6, 12, "ink4"); K.rect(img, x - 2, 4, 12, 6, "ink4"); K.rect(img, x + 2, 5, 4, 4, "ink3")
  return img
end
local P = {
  { "prompt_key_z", keycap("Z") }, { "prompt_key_x", keycap("X") }, { "prompt_key_c", keycap("C") },
  { "prompt_key_j", keycap("J") }, { "prompt_key_k", keycap("K") }, { "prompt_key_l", keycap("L") },
  { "prompt_key_shift", keycap("SHIFT", 36) }, { "prompt_key_esc", keycap("ESC", 22) }, { "prompt_key_enter", keycap("ENTER", 36) }, { "prompt_key_space", keycap("SPACE", 36) },
  { "prompt_key_up", keycap("\226\134\145") }, { "prompt_key_down", keycap("\226\134\147") }, { "prompt_key_left", keycap("\226\134\144") }, { "prompt_key_right", keycap("\226\134\146") },
  { "prompt_pad_a", padButton("A", "leaf4") }, { "prompt_pad_b", padButton("B", "red4") }, { "prompt_pad_x", padButton("X", "sky3") }, { "prompt_pad_y", padButton("Y", "fire4") },
  { "prompt_pad_start", padStart() }, { "prompt_pad_rb", padShoulder("RB") }, { "prompt_pad_dpad", padDpad() },
}
local entries = {}
for _, e in ipairs(P) do entries[#entries + 1] = { name = e[1], img = e[2] } end
U.sheet{ name = "ui_prompts", w = PW, h = 14, src = SRC .. "ui_prompts.aseprite", sheet = OUT .. "ui_prompts.png", data = OUT .. "ui_prompts.json", entries = entries }

-- ============================================================== ui_countdown (28x36): big numerals 0-9
local function bigGlyph(ch, style)
  local m = U.mask(U.G.BIG[ch]); m = U.trimX(m); m = U.epx(U.epx(m)); m = U.bold(m, 1)
  return U.render(m, style)
end
local CD = {}
for d = 0, 9 do
  local g = bigGlyph(tostring(d), { fill = U.RAMP.fire, outline = "outline", shadow = { 1, 2, "outline" } })
  local img = U.newImage(28, 36); U.blit(img, g, math.floor((28 - g.width) / 2), math.floor((36 - g.height) / 2))
  CD[#CD + 1] = { name = "countdown_" .. d, img = img }
end
U.sheet{ name = "ui_countdown", w = 28, h = 36, src = SRC .. "ui_countdown.aseprite", sheet = OUT .. "ui_countdown.png", data = OUT .. "ui_countdown.json", entries = CD }

-- ============================================================== ui_rank (36x44): S/A/B/C stamps
local RANKS = {
  S = { fill = { "fire6", "fire6", "fire5", "fire5", "fire4", "fire4", "fire3", "fire3" }, extrude = { 3, "fire1" } },
  A = { fill = U.RAMP.steel, extrude = { 3, "steel1" } },
  B = { fill = { "dirt5", "dirt5", "dirt4", "dirt4", "dirt3", "dirt3", "dirt2" }, extrude = { 3, "dirt1" } },
  C = { fill = { "ink5", "ink5", "ink4", "ink4", "ink3", "ink3", "ink2" }, extrude = { 3, "ink1" } },
}
local RK = {}
for _, ch in ipairs({ "S", "A", "B", "C" }) do
  local st = RANKS[ch]; st.outline = "outline"
  local g = bigGlyph(ch, st)
  local img = U.newImage(36, 44); U.blit(img, g, math.floor((36 - g.width) / 2), math.floor((44 - g.height) / 2))
  if ch == "S" then -- sparkle
    for _, p in ipairs({ { 3, 4 }, { 31, 10 }, { 6, 34 }, { 30, 36 } }) do
      K.px(img, p[1], p[2], "white"); K.px(img, p[1] - 1, p[2], "fire6"); K.px(img, p[1] + 1, p[2], "fire6"); K.px(img, p[1], p[2] - 1, "fire6"); K.px(img, p[1], p[2] + 1, "fire6")
    end
  end
  RK[#RK + 1] = { name = "rank_" .. ch:lower(), img = img }
end
U.sheet{ name = "ui_rank", w = 36, h = 44, src = SRC .. "ui_rank.aseprite", sheet = OUT .. "ui_rank.png", data = OUT .. "ui_rank.json", entries = RK }

-- ============================================================== panels (9-slice) and boss bar (plain PNGs)
local function panel()
  local img = U.newImage(24, 24)
  K.rect(img, 1, 0, 22, 24, "outline"); K.rect(img, 0, 1, 24, 22, "outline")
  K.rect(img, 1, 1, 22, 22, "steel2")
  K.rect(img, 2, 2, 20, 20, "steel3")
  K.rect(img, 3, 3, 18, 18, "ink1")
  K.rect(img, 2, 2, 20, 1, "steel4"); K.rect(img, 2, 2, 1, 20, "steel4")
  K.rect(img, 2, 21, 20, 1, "steel1"); K.rect(img, 21, 2, 1, 20, "steel1")
  -- corner rivets
  for _, p in ipairs({ { 4, 4 }, { 19, 4 }, { 4, 19 }, { 19, 19 } }) do K.px(img, p[1], p[2], "sand4"); K.px(img, p[1] + 1, p[2] + 1, "sand2") end
  return img
end
local function panelThin()
  local img = U.newImage(12, 12)
  K.rect(img, 0, 0, 12, 12, "outline"); K.rect(img, 1, 1, 10, 10, "steel3"); K.rect(img, 2, 2, 8, 8, "ink1")
  K.rect(img, 1, 1, 10, 1, "steel4"); K.rect(img, 1, 10, 10, 1, "steel2")
  return img
end
local function bossFrame()
  local w, h = 204, 14
  local img = U.newImage(w, h)
  K.rect(img, 1, 0, w - 2, h, "outline"); K.rect(img, 0, 1, w, h - 2, "outline")
  K.rect(img, 1, 1, w - 2, h - 2, "steel2"); K.rect(img, 1, 1, w - 2, 1, "steel4"); K.rect(img, 1, h - 2, w - 2, 1, "steel1")
  K.rect(img, 2, 3, w - 4, 8, "outline"); K.rect(img, 3, 4, w - 6, 6, "ink1")
  for x = 3, w - 4, 4 do K.px(img, x, 1, "steel5") end
  return img
end
local function bossFill()
  local w, h = 198, 6
  local img = U.newImage(w, h)
  local ramp = { "fire5", "red5", "red4", "red4", "red3", "red2" }
  for y = 0, h - 1 do K.rect(img, 0, y, w, 1, ramp[y + 1]) end
  for x = 19, w - 1, 20 do K.rect(img, x, 0, 1, h, "red2"); K.px(img, x, 0, "fire4") end
  return img
end
U.saveImage(panel(), OUT .. "panel.png", SRC .. "panel.aseprite")
U.saveImage(panelThin(), OUT .. "panel_thin.png", SRC .. "panel_thin.aseprite")
U.saveImage(bossFrame(), OUT .. "bossbar_frame.png", SRC .. "bossbar_frame.aseprite")
U.saveImage(bossFill(), OUT .. "bossbar_fill.png", SRC .. "bossbar_fill.aseprite")

-- ============================================================== preview mock HUD (384x216)
local function nineslice(dst, src, x, y, w, h, b)
  local sw, sh = src.width, src.height
  local function part(sx, sy, pw, ph, dx, dy, dw, dh)
    for j = 0, dh - 1 do for i = 0, dw - 1 do
      local p = src:getPixel(sx + (i % pw), sy + (j % ph))
      if pc_a(p) > 0 then dst:drawPixel(dx + i, dy + j, p) end
    end end
  end
  part(0, 0, b, b, x, y, b, b); part(sw - b, 0, b, b, x + w - b, y, b, b)
  part(0, sh - b, b, b, x, y + h - b, b, b); part(sw - b, sh - b, b, b, x + w - b, y + h - b, b, b)
  part(b, 0, sw - 2 * b, b, x + b, y, w - 2 * b, b); part(b, sh - b, sw - 2 * b, b, x + b, y + h - b, w - 2 * b, b)
  part(0, b, b, sh - 2 * b, x, y + b, b, h - 2 * b); part(sw - b, b, b, sh - 2 * b, x + w - b, y + b, b, h - 2 * b)
  part(b, b, sw - 2 * b, sh - 2 * b, x + b, y + b, w - 2 * b, h - 2 * b)
end
function pc_a(p) return app.pixelColor.rgbaA(p) end

local mock = U.newImage(384, 216)
-- fake background: sky gradient + ground so contrast is realistic
for y = 0, 215 do K.rect(mock, 0, y, 384, 1, (y < 120) and ((y < 60) and "sky2" or "sky3") or ((y < 180) and "leaf2" or "dirt2")) end
-- top-left: 1UP, score, lives
U.blit(mock, badge1up(), 4, 3)
U.drawText(mock, F_GOLD, 30, 5, "00012340")
U.blit(mock, ICONS.life, 4, 15); U.drawText(mock, F_SMALL, 18, 19, "\195\151 3")
-- top-center: ARMS / BOMB
U.blit(mock, ICONS.hmg, 150, 2); U.drawText(mock, F_GOLD, 168, 3, "ARMS"); U.drawText(mock, F_SMALL, 168, 13, "200")
U.blit(mock, ICONS.bomb, 200, 2); U.drawText(mock, F_GOLD, 216, 3, "BOMB"); U.drawText(mock, F_SMALL, 216, 13, "10")
-- top-right: rescue tally
for i = 0, 3 do U.blit(mock, ICONS.pow, 320 + i * 14, 3) end
U.drawText(mock, F_SMALL, 322, 17, "RESCUED 4")
-- GO arrow (right edge) + callout
U.blit(mock, GO[1], 316, 90)
U.drawText(mock, F_CALL, 70, 60, "HEAVY MACHINE GUN!")
-- boss bar bottom
U.blit(mock, bossFrame(), 90, 196)
local fill = bossFill(); local cropped = U.newImage(140, 6); for y = 0, 5 do for x = 0, 139 do cropped:drawPixel(x, y, fill:getPixel(x, y)) end end
U.blit(mock, cropped, 93, 200)
U.blit(mock, ICONS.skull, 74, 195); U.drawText(mock, F_SMALL, 90, 186, "MOOSEZILLA", "red5")
-- pause panel with cursor + prompts
nineslice(mock, panel(), 14, 100, 120, 70, 8)
U.drawText(mock, F_CALL, 22, 104, "PAUSE")
U.blit(mock, ICONS.cursor1, 20, 128); U.drawText(mock, F_SMALL, 34, 131, "RESUME", "fire5")
U.drawText(mock, F_SMALL, 34, 143, "OPTIONS"); U.drawText(mock, F_SMALL, 34, 155, "QUIT")
nineslice(mock, panelThin(), 150, 100, 160, 44, 4)
U.blit(mock, keycap("Z"), 150, 104); U.drawText(mock, F_SMALL, 184, 107, "JUMP")
U.blit(mock, padButton("A", "leaf4"), 212, 104)
U.blit(mock, keycap("X"), 150, 118); U.drawText(mock, F_SMALL, 184, 121, "SHOOT")
U.blit(mock, padButton("X", "sky3"), 212, 118)
U.blit(mock, keycap("SHIFT", 36), 146, 132); U.drawText(mock, F_SMALL, 184, 135, "AIM LOCK"); U.blit(mock, padShoulder("RB"), 240, 132)
-- countdown + ranks
for i, e in ipairs(CD) do if i <= 3 then U.blit(mock, e.img, 150 + (i - 1) * 30, 150) end end
for i, e in ipairs(RK) do U.blit(mock, e.img, 240 + (i - 1) * 36, 146) end
-- icons strip
local ix = 150
for _, n in ipairs({ "pistol", "hmg", "spread", "rocket", "flame", "laser", "bomb", "life", "pow", "medal", "skull", "check", "lock" }) do U.blit(mock, ICONS[n], ix, 30); ix = ix + 18 end

local function save3x(img, path)
  U.saveImage(img, path)
  local big = U.newImage(img.width * 3, img.height * 3)
  for y = 0, img.height - 1 do for x = 0, img.width - 1 do local p = img:getPixel(x, y)
    for j = 0, 2 do for i = 0, 2 do big:drawPixel(x * 3 + i, y * 3 + j, p) end end end end
  U.saveImage(big, (path:gsub("%.png$", "_x3.png")))
end
save3x(mock, PREV .. "hud_mock.png")
print("hud kit done")
