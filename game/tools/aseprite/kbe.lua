-- KBE shared Aseprite helper. Load from a build script with:
--   local K = dofile(app.params.kbe)   -- tools/build-art.sh passes kbe=<this file>
-- Then describe a sprite and call K.build{...}. See art-src/_examples/example.lua.
--
-- K.build{
--   name   = "player_legs",                 -- file stem
--   w = 48, h = 48,                          -- canvas size per frame
--   src    = "<abs path>.aseprite",          -- editable source written here
--   sheet  = "<abs path>.png",               -- packed sheet for Phaser (load.aseprite)
--   data   = "<abs path>.json",              -- Aseprite JSON (hash) with frameTags
--   keys   = { o = "outline", a = "olive3", ... },  -- single-char -> palette name or {r,g,b[,a]}
--   layers = { "legs" },                     -- optional, bottom -> top; default {"main"}
--   anims  = {
--     { tag = "run", ms = 80, frames = {        -- ms: default per-frame duration (or per-frame table)
--         { legs = { "....oo....", ... } },     -- per frame: layer -> grid (list of strings) or
--         { legs = function(img, K) ... end },  --   function(img,K) drawing into an Image(w,h)
--     } },
--   },
--   anchor = "bottom-center",                -- informational; record pivot in your manifest
-- }
-- Grid rules: each string is a row; '.' or ' ' = transparent; rows may be shorter than w
-- (padded); grids are placed at (ox,oy) if frame table has ox/oy, else top-left.
local K = {}

-- Master palette (docs/ART-STYLE.md). Names are ramp+index, 1 = darkest.
K.PAL = {
  outline = {26,18,32},
  ink1={43,38,53}, ink2={72,64,90}, ink3={110,102,128}, ink4={154,147,168}, ink5={201,195,209}, ink6={244,240,246},
  skin1={90,46,34}, skin2={142,75,50}, skin3={196,122,82}, skin4={232,168,120}, skin5={255,214,176},
  olive1={31,42,20}, olive2={52,70,31}, olive3={79,107,43}, olive4={115,144,60}, olive5={162,184,90},
  sand1={74,58,34}, sand2={122,98,54}, sand3={168,140,82}, sand4={210,184,120}, sand5={240,224,168},
  red1={58,15,20}, red2={107,26,30}, red3={160,42,38}, red4={212,72,58}, red5={240,122,90},
  steel1={28,36,51}, steel2={47,61,82}, steel3={76,96,117}, steel4={117,137,156}, steel5={169,188,203},
  dirt1={42,26,18}, dirt2={74,46,28}, dirt3={110,70,40}, dirt4={154,106,60}, dirt5={196,146,88},
  leaf1={15,36,24}, leaf2={26,61,36}, leaf3={42,94,48}, leaf4={68,132,60}, leaf5={110,174,76},
  sky1={18,35,74}, sky2={31,63,122}, sky3={58,108,176}, sky4={106,162,220}, sky5={168,212,240},
  fire1={92,20,8}, fire2={184,50,12}, fire3={240,106,16}, fire4={255,174,34}, fire5={255,224,102}, fire6={255,248,208},
  weird1={60,20,82}, weird2={110,42,140}, weird3={166,76,196}, weird4={57,217,138}, weird5={182,255,106},
  white = {255,255,255},
}

function K.color(c)
  if type(c) == "string" then
    local v = K.PAL[c]; assert(v, "unknown palette name: " .. c); c = v
  end
  return app.pixelColor.rgba(c[1], c[2], c[3], c[4] or 255)
end

-- Draw a grid (list of strings) into an Image using a key map.
function K.grid(img, rows, keys, ox, oy)
  ox = ox or 0; oy = oy or 0
  for y, row in ipairs(rows) do
    for x = 1, #row do
      local ch = row:sub(x, x)
      if ch ~= "." and ch ~= " " then
        local k = keys[ch]; assert(k, "no key for char '" .. ch .. "' in row " .. y)
        img:drawPixel(ox + x - 1, oy + y - 1, K.color(k))
      end
    end
  end
end

-- Small drawing helpers for code-drawn art.
function K.px(img, x, y, c) img:drawPixel(x, y, K.color(c)) end
function K.rect(img, x, y, w, h, c) local p = K.color(c); for j = y, y + h - 1 do for i = x, x + w - 1 do img:drawPixel(i, j, p) end end end
function K.disc(img, cx, cy, r, c) local p = K.color(c); for j = -r, r do for i = -r, r do if i*i + j*j <= r*r + r*0.8 then img:drawPixel(cx + i, cy + j, p) end end end end
function K.line(img, x0, y0, x1, y1, c)
  local p = K.color(c); local dx, dy = math.abs(x1 - x0), -math.abs(y1 - y0)
  local sx, sy = x0 < x1 and 1 or -1, y0 < y1 and 1 or -1; local err = dx + dy
  while true do img:drawPixel(x0, y0, p); if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err; if e2 >= dy then err = err + dy; x0 = x0 + sx end; if e2 <= dx then err = err + dx; y0 = y0 + sy end end
end
-- Auto-outline: paints `c` on transparent pixels 4-adjacent to opaque ones (use on a copy).
function K.outline(img, c)
  local p = K.color(c); local w, h = img.width, img.height; local marks = {}
  for y = 0, h - 1 do for x = 0, w - 1 do
    if app.pixelColor.rgbaA(img:getPixel(x, y)) == 0 then
      for _, d in ipairs({{1,0},{-1,0},{0,1},{0,-1}}) do
        local nx, ny = x + d[1], y + d[2]
        if nx >= 0 and ny >= 0 and nx < w and ny < h and app.pixelColor.rgbaA(img:getPixel(nx, ny)) > 0 then marks[#marks+1] = {x, y}; break end
      end
    end
  end end
  for _, m in ipairs(marks) do img:drawPixel(m[1], m[2], p) end
end

function K.build(spec)
  assert(spec.name and spec.w and spec.h and spec.anims and spec.src, "build spec needs name,w,h,anims,src")
  local layers = spec.layers or { "main" }
  local spr = Sprite(spec.w, spec.h, ColorMode.RGB)
  spr.filename = spec.src
  -- palette for the editor convenience
  local names = {}; for n in pairs(K.PAL) do names[#names+1] = n end; table.sort(names)
  local pal = Palette(#names + 1); pal:setColor(0, Color{r=0,g=0,b=0,a=0})
  for i, n in ipairs(names) do local c = K.PAL[n]; pal:setColor(i, Color{r=c[1], g=c[2], b=c[3], a=255}) end
  spr:setPalette(pal)

  local layerObjs = {}
  layerObjs[1] = spr.layers[1]; layerObjs[1].name = layers[1]
  for i = 2, #layers do local l = spr:newLayer(); l.name = layers[i]; layerObjs[i] = l end

  local total = 0
  for _, a in ipairs(spec.anims) do total = total + #a.frames end
  for _ = 2, total do spr:newEmptyFrame() end

  local fi = 1
  for _, a in ipairs(spec.anims) do
    local from = fi
    for j, fr in ipairs(a.frames) do
      local ms = type(a.ms) == "table" and a.ms[j] or a.ms or 100
      spr.frames[fi].duration = (fr.ms or ms) / 1000
      for li, lname in ipairs(layers) do
        local content = fr[lname] or (#layers == 1 and (fr.grid or fr[1])) or nil
        if content then
          local img = Image(spec.w, spec.h, ColorMode.RGB)
          if type(content) == "function" then content(img, K) else K.grid(img, content, spec.keys or {}, fr.ox, fr.oy) end
          spr:newCel(layerObjs[li], spr.frames[fi], img, Point(0, 0))
        end
      end
      fi = fi + 1
    end
    local tag = spr:newTag(from, fi - 1); tag.name = a.tag
    if a.dir == "pingpong" then tag.aniDir = AniDir.PING_PONG end
  end

  spr:saveAs(spec.src)
  if spec.sheet and spec.data then
    app.command.ExportSpriteSheet{
      ui = false, askOverwrite = false, type = SpriteSheetType.PACKED,
      textureFilename = spec.sheet, dataFilename = spec.data,
      dataFormat = SpriteSheetDataFormat.JSON_HASH, filenameFormat = "{title}#{frame}",
      borderPadding = 0, shapePadding = 1, innerPadding = 0, trim = false,
      openGenerated = false, layer = "", tag = "", splitLayers = false, listLayers = true, listTags = true, listSlices = true,
    }
  end
  print("built " .. spec.name .. " (" .. total .. " frames)")
  spr:close()
end

return K
