"""Phase F: deterministic BOX resize, premultiplied wrap, palette and binary alpha.
Run with uv run --offline --with pillow,numpy python <this file>.
Optional asset IDs rebuild a subset. Integration rows update as each file lands.
"""
from pathlib import Path
import json,re,sys
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
SRC=Path(__file__).resolve().parent
ROOT=SRC.parents[3]
TMP=Path('/tmp/kbe-imagegen'); TMP.mkdir(exist_ok=True)
PAL=[tuple(map(int,m.groups())) for l in (ROOT/'docs/palette.gpl').read_text().splitlines() if (m:=re.match(r'\s*(\d+)\s+(\d+)\s+(\d+)',l))]
PA=np.array(PAL,dtype=np.int32)
# id, part, output name, width, height, scroll, y, tiles, notes
SPECS=[
('camp','stage1','camp_far',768,132,.13,65,True,'Watchtowers, tiny lit windows; behind forest. FX may overlay searchlights.'),
('waterfall','stage1','waterfall_cliff',176,190,.29,26,False,'Bridge-side cliff; anchor base to river. Overlay bg_mist at foot.'),
('chimneys','stage1','outpost_chimneys',384,150,.25,45,False,'Outpost horizon; overlay smoke at stack mouths.'),
('camp_pines','stage1','pines_rich',768,156,.34,82,True,'Richer mid forest; use instead of old mid pines.'),
('gorge','m1p2','gorge_walls',768,158,.10,56,True,'Trestle section far canyon; behind valley river.'),
('river','m1p2','valley_river',768,114,.18,114,True,'Deep valley below trestle; keep terrain foreground absent here.'),
('train_pines','m1p2','near_pines_rich',768,150,.42,100,True,'Pines and snowbanks; fade out over open gorge.'),
('aurora','m1p3','sky_aurora',384,216,.015,0,True,'Opaque sky variant; muted aurora, FX shimmer optional.'),
('lab_towers','m1p3','lab_towers',512,178,.28,30,False,'Closer coils and antler antennas; animate arcs separately.'),
('ice','m1p3','ice_ridges',768,74,.30,153,True,'Quiet shore ice, behind gameplay snow.'),
('zeppelin','stage1','actor_zeppelin',256,92,.09,18,False,'Animate horizontal drift; spiral-eye insignia on hull.'),
('plane','stage1','actor_transport',208,72,.12,22,False,'Twin-prop transport; animate flypast before paratroopers.'),
('train','m1p2','actor_armored_train',640,98,.30,95,False,'Locomotive plus three cars; move as one actor on parallel line.'),
('moose','m1p3','actor_moosezilla',224,148,.20,42,False,'148 px canvas; move behind compound for foreshadowing.')]
DOC=ROOT/'docs/teams/imagegen.md'
START='<!-- phase-f-assets:start -->';END='<!-- phase-f-assets:end -->'
def update_docs():
    rows=[]
    for id,part,name,w,h,sf,y,t,note in SPECS:
        if (ROOT/f'game/public/assets/backgrounds/{part}/gen_{name}.png').exists():
            rows.append(f'| {part}/gen_{name}.png | {w}×{h} | {sf} | {y} | {"Yes" if t else "No"} | {note} |')
    block=START+'\n## Phase F — richer parallax and actors\n\nFiles below are available now. Paths are relative to `game/public/assets/backgrounds/`. Coordinates use top-left origin, Y is screen-space canvas top. Actors are stills for Levels to move; none has collision. All except the aurora sky have real transparent pixels. Suggested factors and offsets need terrain alignment.\n\n| File | Size | Scroll X | Y offset | Tiles | Notes |\n|---|---:|---:|---:|---|---|\n'+'\n'.join(rows)+'\n\nRebuild: `UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache /home/knotz2/.local/bin/uv run --offline --with pillow,numpy python game/art-src/backgrounds/gen/process_f.py`. Optional asset IDs select a subset. Retained `raw_f_*.png` sources and `prompts_f.json` record built-in generation. Processing uses BOX (plus 3×3 median cleanup on the aurora sky), restrained atmospheric contrast, 48 px premultiplied wrap, nearest master palette without dithering, alpha threshold 128. Rebuild asserts palette, binary alpha, transparency, and matching wrap-edge columns.\n\nPreviews: `/tmp/kbe-imagegen/f-stage1.png`, `f-m1p2.png`, `f-m1p3.png`, their `-3x.png` versions, `f-actors.png`, and `f-tiles.png`. Composites are art-only integration suggestions; runtime FX and actors remain Levels work.\n'+END
    text=DOC.read_text()
    if START in text:text=text[:text.index(START)]+block+text[text.index(END)+len(END):]
    else:text+='\n\n'+block+'\n'
    DOC.write_text(text)
def quant(a):
    rgb=a[:,:,:3].reshape(-1,3).astype(np.int32)
    idx=np.concatenate([((c[:,None]-PA[None])**2).sum(2).argmin(1) for c in np.array_split(rgb,32)])
    a[:,:,:3]=PA[idx].reshape(a.shape[:2]+(3,))
    a[:,:,3]=np.where(a[:,:,3]>=128,255,0);a[a[:,:,3]==0,:3]=0
    return Image.fromarray(a)
for id,part,name,w,h,sf,y,tiles,note in SPECS:
    if len(sys.argv)>1 and id not in sys.argv[1:]:continue
    p=SRC/f'raw_f_{id}.png'
    assert p.exists(), f'Missing retained source: {p}'
    im=Image.open(p).convert('RGBA');sky=id=='aurora'
    if not sky:
        assert im.getextrema()[3][0]<128,f'{id}: missing source transparency'
        box=im.getbbox()
        # Trim empty margin for useful native-scale detail; keep 3% transparent border.
        im=im.crop(box)
        margin=max(2,round(im.height*.03));canvas=Image.new('RGBA',(im.width+2*margin,im.height+2*margin));canvas.alpha_composite(im,(margin,margin));im=canvas
    overlap=48 if tiles else 0
    im=im.resize((w+overlap,h),Image.Resampling.BOX)
    if sky:im=im.filter(ImageFilter.MedianFilter(3))
    a=np.array(im).astype(float)
    anchor=np.array([62,77,100]) if sky else np.array([70,84,106])
    strength=.55 if id in ('camp','gorge','river') else .68
    if id in ('zeppelin','plane','train','moose'):anchor=np.array([43,54,76]);strength=.35
    a[:,:,:3]=anchor+(a[:,:,:3]-anchor)*strength
    if tiles:
        a[:,:,:3]*=a[:,:,3:4]/255
        t=np.linspace(0,1,overlap)[None,:,None]
        join=a[:,-overlap:]*(1-t)+a[:,:overlap]*t
        a=np.concatenate((join,a[:,overlap:w]),axis=1)
        a[:,:,:3]=np.divide(a[:,:,:3]*255,a[:,:,3:4],out=np.zeros_like(a[:,:,:3]),where=a[:,:,3:4]>0)
        # Exact shared boundary samples prevent a one-column color/alpha seam.
        edge=(a[:,0]+a[:,-1])/2;a[:,0]=edge;a[:,-1]=edge
    if sky:a[:,:,3]=255
    im=quant(np.clip(a,0,255).astype('uint8'));ar=np.array(im)
    assert set(np.unique(ar[:,:,3]))<={0,255}
    assert all(tuple(c) in PAL for c in np.unique(ar[:,:,:3][ar[:,:,3]>0],axis=0))
    assert sky or (ar[:,:,3]==0).any()
    assert not tiles or np.array_equal(ar[:,0],ar[:,-1])
    out=ROOT/f'game/public/assets/backgrounds/{part}/gen_{name}.png';im.save(out)
    update_docs();print(f'{out.relative_to(ROOT)} {w}x{h}: palette / alpha / wrap OK')
# Art composites; include local features as separate panorama panels when necessary.
def load(part,name):return Image.open(ROOT/f'game/public/assets/backgrounds/{part}/gen_{name}.png').convert('RGBA')
def paste(comp,part,name,x,y):
    p=ROOT/f'game/public/assets/backgrounds/{part}/gen_{name}.png'
    if p.exists():comp.alpha_composite(load(part,name),(x,y))
for part in ('stage1','m1p2','m1p3'):
    comp=Image.new('RGBA',(768,216))
    sky=load(part,'sky_aurora' if part=='m1p3' and (ROOT/f'game/public/assets/backgrounds/{part}/gen_sky_aurora.png').exists() else 'sky')
    comp.alpha_composite(sky);comp.alpha_composite(sky,(384,0))
    if part=='stage1':
        for name,x,y in [('mountains',0,34),('camp_far',0,65),('pines_far',0,91),('waterfall_cliff',294,26),('outpost_chimneys',440,45),('pines_rich',0,82),('actor_zeppelin',55,8),('actor_transport',535,16)]:paste(comp,part,name,x,y)
    elif part=='m1p2':
        for name,x,y in [('peaks',0,30),('gorge_walls',0,56),('valley_river',0,114),('actor_armored_train',64,96)]:paste(comp,part,name,x,y)
    else:
        for name,x,y in [('mountains',0,35),('lake_far',0,112),('actor_moosezilla',190,42),('lab_towers',256,30),('ice_ridges',0,153)]:paste(comp,part,name,x,y)
    comp.save(TMP/f'f-{part}.png');comp.resize((2304,648),Image.Resampling.NEAREST).save(TMP/f'f-{part}-3x.png')
    # Palette swatches test enemy and bullet readability without pretending to be runtime sprites.
    d=ImageDraw.Draw(comp)
    for x in range(50,768,140):
        d.rectangle((x,145,x+10,165),fill=(160,42,38,255))
        d.rectangle((x+2,139,x+8,145),fill=(210,184,120,255))
        d.rectangle((x+17,146,x+21,148),fill=(255,224,102,255))
        d.point((x+19,147),fill=(255,255,255,255))
    comp.save(TMP/f'f-{part}-readability.png')
actors=Image.new('RGBA',(768,432),(91,96,121,255))
for part,name,x,y in [('stage1','actor_zeppelin',10,10),('stage1','actor_transport',330,10),('m1p2','actor_armored_train',30,138),('m1p3','actor_moosezilla',280,270)]:paste(actors,part,name,x,y)
actors.save(TMP/'f-actors.png')
tiles=Image.new('RGBA',(1536,1400),(91,96,121,255));y=0
for id,part,name,w,h,sf,oy,t,note in SPECS:
    p=ROOT/f'game/public/assets/backgrounds/{part}/gen_{name}.png'
    if not t or not p.exists():continue
    im=load(part,name);tiles.alpha_composite(im,(0,y));tiles.alpha_composite(im,(w,y));y+=h+4
# Height derived from actual rows to avoid clipping.
tiles.crop((0,0,1536,min(y,tiles.height))).save(TMP/'f-tiles.png')
features=Image.new('RGBA',(1152,230),(91,96,121,255))
for part,name,x,y in [('stage1','waterfall_cliff',10,15),('stage1','outpost_chimneys',210,30),('m1p3','lab_towers',620,20)]:paste(features,part,name,x,y)
features.save(TMP/'f-features.png')
