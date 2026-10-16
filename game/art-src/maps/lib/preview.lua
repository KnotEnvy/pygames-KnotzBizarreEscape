-- Annotated map preview. Run by art-src/maps/build.sh after tmxrasterizer.
-- Draws prop sprites (first frame of art-src/props/prop_<kind>.aseprite) and colour-coded spawn markers
-- onto the raw render, outlines triggers, then cuts 40-tile chunks scaled 2x for review.
-- Marker colours: grunt red, grenadier orange, shield steel, turret ink, drone purple, paratrooper pink,
-- pow yellow, pickup green, player olive, boss magenta. camera_lock = red frame, checkpoint = green line.
local ROOT, OUT = app.params.root, app.params.out
local function C(r, g, b, a) return app.pixelColor.rgba(r, g, b, a or 255) end
local f = io.open(ROOT .. "/public/assets/maps/stage1.tmj"); local map = json.decode(f:read("a")); f:close()

local base = Sprite{ fromFile = OUT .. "/stage1_full.png" }
local raw = Image(base)
local W, H = raw.width, raw.height
-- stand-in sky (the real parallax comes from public/assets/backgrounds/stage1) so composition reads
local img = Image(W, H, ColorMode.RGB)
local SKY = { {106,162,220}, {128,180,228}, {150,196,234}, {168,212,240} }
for y = 0, H - 1 do local c = SKY[math.min(4, 1 + y * 4 // H)]; local p = C(c[1], c[2], c[3]); for x = 0, W - 1 do img:drawPixel(x, y, p) end end
img:drawImage(raw, Point(0, 0))

local function rect(x, y, w, h, c, fill)
  for j = y, y + h - 1 do for i = x, x + w - 1 do
    if i >= 0 and j >= 0 and i < W and j < H and (fill or j == y or j == y + h - 1 or i == x or i == x + w - 1) then img:drawPixel(i, j, c) end
  end end
end

local propCache = {}
local function propImage(kind)
  if propCache[kind] == nil then
    local path = ROOT .. "/art-src/props/prop_" .. kind .. ".aseprite"
    local fh = io.open(path, "rb")
    if fh then fh:close(); local s = Sprite{ fromFile = path }; propCache[kind] = Image(s); s:close() else propCache[kind] = false end
  end
  return propCache[kind]
end

local ENEMY = { grunt = C(240, 60, 50), grenadier = C(255, 150, 30), shield = C(120, 170, 230), turret = C(60, 60, 70),
  drone = C(170, 80, 210), paratrooper = C(255, 140, 180) }
local layers = {}
for _, l in ipairs(map.layers) do layers[l.name] = l end

-- triggers first (under markers)
for _, o in ipairs(layers.triggers.objects) do
  local x, y, w, h = math.floor(o.x), math.floor(o.y), math.floor(o.width), math.floor(o.height)
  if o.type == "camera_lock" then rect(x, y + 2, w, h - 4, C(255, 40, 40)); rect(x + 1, y + 3, w - 2, h - 6, C(255, 40, 40))
  elseif o.type == "checkpoint" then rect(x, 0, 2, H, C(60, 230, 90), true)
  elseif o.type == "stage_end" then rect(x, y + 6, w, h - 12, C(255, 255, 255))
  elseif o.type == "prompt" then rect(x, y, w, h, C(255, 240, 120))
  end
end

-- props behind, then other markers
local function propsPass(front, target)
  target = target or img
  for _, o in ipairs(layers.spawns.objects) do
    local p = {}
    for _, pr in ipairs(o.properties or {}) do p[pr.name] = pr.value end
    if o.type == "prop" and ((p.layer == "front") == front) then
      local im = propImage(p.kind)
      local x, y = math.floor(o.x), math.floor(o.y)
      if im then target:drawImage(im, Point(x - im.width // 2, y - im.height))
      else rect(x - 6, y - 12, 12, 12, C(200, 200, 200)) end
    end
  end
end
-- clean world (tiles + props, transparent sky) for the parallax composites
local clean = Image(raw)
propsPass(false, clean); propsPass(true, clean)
propsPass(false)
for _, o in ipairs(layers.spawns.objects) do
  local p = {}
  for _, pr in ipairs(o.properties or {}) do p[pr.name] = pr.value end
  local x, y = math.floor(o.x), math.floor(o.y)
  local wave = p.wave ~= nil
  if o.type == "enemy" then
    local c = ENEMY[p.kind] or C(255, 0, 255)
    local w, h = 14, 30
    if p.kind == "drone" then w, h = 22, 14 elseif p.kind == "turret" then w, h = 20, 18 end
    rect(x - w // 2, y - h, w, h, c, not wave)
    if wave then rect(x - w // 2 + 2, y - h + 2, w - 4, h - 4, c) end
    local fx = (p.facing == "right") and (x + w // 2 + 1) or (x - w // 2 - 3)
    rect(fx, y - h + 4, 2, 2, C(255, 255, 255), true)
  elseif o.type == "pow" then rect(x - 7, y - 28, 14, 28, C(255, 225, 80), true); rect(x - 3, y - 34, 6, 5, C(60, 220, 120), true)
  elseif o.type == "pickup" then rect(x - 6, y - 12, 12, 12, C(60, 220, 120), true)
  elseif o.type == "player_start" then rect(x - 8, y - 34, 16, 34, C(150, 190, 70), true)
  elseif o.type == "boss" then rect(x - 80, y - 120, 160, 120, C(255, 0, 255))
  end
end
propsPass(true)

local function save(im, name, scale)
  local s = Sprite(im.width, im.height, ColorMode.RGB)
  s.cels[1].image = im
  if scale and scale ~= 1 then s:resize(im.width * scale, im.height * scale) end
  s:saveCopyAs(OUT .. "/" .. name)
  s:close()
end
save(img, "stage1_annotated.png", 1)
local CH = 40 * 16
local n = 0
for x0 = 0, W - 1, CH do
  local w = math.min(CH, W - x0)
  local crop = Image(w, H, ColorMode.RGB)
  crop:drawImage(img, Point(-x0, 0))
  save(crop, string.format("stage1_x%03d.png", x0 // 16), 2)
  n = n + 1
end
-- game-camera screens (384x216, camera resting on the map bottom), 3x
local sn = 0
for x0 = 0, W - 1, 384 do
  local crop = Image(384, 216, ColorMode.RGB)
  crop:drawImage(img, Point(-x0, -(H - 216)))
  save(crop, string.format("screen_%02d.png", sn), 3)
  sn = sn + 1
end
-- parallax-composited screens using the plan in docs/teams/level.md (camera resting on the map bottom)
local BG = ROOT .. "/public/assets/backgrounds/stage1/"
local function load(name)
  local fh = io.open(BG .. name, "rb"); if not fh then return nil end; fh:close()
  local sp = Sprite{ fromFile = BG .. name }; local im = Image(sp); sp:close(); return im
end
local PLX = {
  { img = load("gen_sky.png"), sf = 0.015, y = 0 },
  { img = load("gen_mountains.png"), sf = 0.08, y = 34 },
  { img = load("gen_pines_far.png"), sf = 0.18, y = 91 },
  { img = load("gen_pines_mid.png"), sf = 0.34, y = 90, before = 3840 },
  { img = load("gen_outpost_far.png"), sf = 0.23, y = 67, after = 3840 },
  { img = load("haze.png"), sf = 0.5, y = 112 },
}
local pn = 0
for camX = 0, W - 384, 384 do
  local view = Image(384, 216, ColorMode.RGB)
  for _, l in ipairs(PLX) do
    if l.img and (not l.before or camX < l.before) and (not l.after or camX >= l.after) then
      local w = l.img.width
      local off = -math.floor(camX * l.sf) % w
      for x = off - w, 384, w do view:drawImage(l.img, Point(x, l.y)) end
    end
  end
  view:drawImage(clean, Point(-camX, -(H - 216)))
  save(view, string.format("plx_%02d.png", pn), 3)
  pn = pn + 1
end
base:close()
print("preview: " .. n .. " chunks")
