"""Mission 2 retained imagegen sources -> palette/binary-alpha parallax.
UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache /home/knotz2/.local/bin/uv run --offline --with pillow,numpy python game/art-src/backgrounds/gen/process_g.py
"""
from pathlib import Path
import json, re
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = Path(__file__).resolve().parent
ROOT = SRC.parents[3]
TMP = Path('/tmp/kbe-imagegen')
TMP.mkdir(exist_ok=True)
PAL = [tuple(map(int, m.groups())) for line in (ROOT/'docs/palette.gpl').read_text().splitlines() if (m := re.match(r'\s*(\d+)\s+(\d+)\s+(\d+)', line))]
PA = np.array(PAL, dtype=np.int32)
# name, width, height, screen Y, scroll X, depth, horizontal repeat
SPECS = {
 'm2p1': [('sky',384,216,0,.015,0,True),('cypress_far',768,124,65,.10,2,True),('village_far',768,104,91,.17,4,False),('bog_pump',768,100,115,.20,5,True),('cypress_mid',768,150,77,.28,7,True),('roots_near',768,74,153,.42,12,True)],
 'm2p2': [('sky',384,216,0,.015,0,True),('sky_storm',384,216,0,.015,0,True),('riverbank_far',768,116,73,.10,2,True),('bayou_queen_far',320,90,91,.16,4,False),('riverbank_mid',768,106,110,.23,7,True),('river_surface',768,64,153,.36,11,True)],
 'm2p3': [('sky',384,216,0,.015,0,True),('sky_lightning',384,216,0,.015,0,True),('forest_far',768,126,63,.10,2,True),('mill_far',768,148,62,.20,6,False),('den_backdrop',768,132,83,.24,8,False),('roots_near',768,78,151,.40,12,True)]
}

def quantize(a):
    rgb = a[:,:,:3].reshape(-1,3).astype(np.int32)
    ids = np.concatenate([((c[:,None]-PA[None])**2).sum(2).argmin(1) for c in np.array_split(rgb,32)])
    a[:,:,:3] = PA[ids].reshape(a.shape[:2]+(3,))
    a[:,:,3] = np.where(a[:,:,3]>=128,255,0)
    a[a[:,:,3]==0,:3] = 0
    return Image.fromarray(a)

assets = {}
manifest = []
for part, specs in SPECS.items():
    out = ROOT/'game/public/assets/backgrounds'/part
    out.mkdir(exist_ok=True)
    for name,w,h,y,sf,depth,tiles in specs:
        source = SRC/f'raw_g_{part}_{name}.png'
        assert source.exists(), f'Missing retained source: {source}'
        im = Image.open(source).convert('RGBA')
        sky = name.startswith('sky')
        if not sky:
            assert im.getextrema()[3][0]<128, f'{source}: no real transparency'
            box = im.getbbox()
            # Preserve panorama width while removing surplus transparent vertical margin.
            im = im.crop((0,max(0,box[1]-round(im.height*.03)),im.width,min(im.height,box[3]+round(im.height*.02))))
        overlap = 48 if tiles else 0
        im = im.resize((w+overlap,h),Image.Resampling.BOX)
        if sky: im = im.filter(ImageFilter.MedianFilter(3))
        a = np.array(im).astype(float)
        anchor = np.array([43,43,63]) if part=='m2p1' else np.array([29,37,50])
        strength = .78 if sky else (.68 if depth<7 else .78)
        if name=='sky_lightning': anchor=np.array([65,68,89]); strength=.72
        a[:,:,:3] = anchor+(a[:,:,:3]-anchor)*strength
        if tiles:
            a[:,:,:3] *= a[:,:,3:4]/255
            t = np.linspace(0,1,overlap)[None,:,None]
            join = a[:,-overlap:]*(1-t)+a[:,:overlap]*t
            a = np.concatenate((join,a[:,overlap:w]),axis=1)
            a[:,:,:3] = np.divide(a[:,:,:3]*255,a[:,:,3:4],out=np.zeros_like(a[:,:,:3]),where=a[:,:,3:4]>0)
            edge=(a[:,0]+a[:,-1])/2
            a[:,0]=edge; a[:,-1]=edge
        if sky: a[:,:,3]=255
        im=quantize(np.clip(a,0,255).astype('uint8'))
        ar=np.array(im)
        assert set(np.unique(ar[:,:,3]))<={0,255}
        assert all(tuple(c) in PAL for c in np.unique(ar[:,:,:3][ar[:,:,3]>0],axis=0))
        assert sky or (ar[:,:,3]==0).any()
        assert not tiles or np.array_equal(ar[:,0],ar[:,-1])
        im.save(out/f'gen_{name}.png')
        assets[(part,name)]=im
        manifest.append(dict(path=f'game/public/assets/backgrounds/{part}/gen_{name}.png',size=[w,h],y=y,scrollX=sf,depth=depth,tiles=tiles))
        print(f'{part}/gen_{name}.png {w}x{h}: palette / binary alpha / wrap OK')

# Every output isolated at native resolution, on a neutral backing.
sheet=Image.new('RGBA',(800,len(manifest)*250),(65,62,76,255))
d=ImageDraw.Draw(sheet)
for i,row in enumerate(manifest):
    part=Path(row['path']).parent.name; name=Path(row['path']).stem[4:]
    d.text((8,i*250+3),f'{part}/gen_{name}.png',fill='white')
    sheet.alpha_composite(assets[(part,name)],(8,i*250+22))
sheet.save(TMP/'g-all-layers.png')

for part,specs in SPECS.items():
    if any((part,s[0]) not in assets for s in specs): continue
    variants = ['forest','village','bog'] if part=='m2p1' else (['moon','storm','boat'] if part=='m2p2' else ['forest','mill','den','lightning'])
    for variant in variants:
        skyname='sky_storm' if variant=='storm' else ('sky_lightning' if variant=='lightning' else 'sky')
        for phase in (0,384):
            comp=assets[(part,skyname)].copy()
            for name,w,h,y,sf,depth,tiles in sorted(specs,key=lambda s:s[5]):
                if name.startswith('sky'): continue
                if name=='village_far' and variant!='village': continue
                if name=='bog_pump' and variant!='bog': continue
                if name=='cypress_mid' and variant in ('village','bog'): continue
                if name=='bayou_queen_far' and variant!='boat': continue
                if name=='mill_far' and variant not in ('mill','lightning'): continue
                if name=='den_backdrop' and variant!='den': continue
                x=-phase if tiles else (32 if w==320 else -192)
                comp.alpha_composite(assets[(part,name)],(x,y))
                if tiles: comp.alpha_composite(assets[(part,name)],(x+w,y))
            base=TMP/f'g-{part}-{variant}-p{phase}'
            comp.save(f'{base}-384x216.png')
            comp.resize((1152,648),Image.Resampling.NEAREST).save(f'{base}-3x.png')
            # Readability swatches only; these are not game sprites.
            d=ImageDraw.Draw(comp)
            for x in (45,140,245,340):
                d.rectangle((x-6,145,x+6,173),fill='#1a1220')
                d.rectangle((x-5,147,x+5,161),fill='#a02a26')
                d.rectangle((x-4,139,x+4,146),fill='#d2b878')
                d.ellipse((x+17,146,x+22,151),fill='#d4483a')
                d.rectangle((x+18,147,x+21,150),fill='#ffe066')
                d.point((x+19,148),fill='white')
            comp.resize((1152,648),Image.Resampling.NEAREST).save(f'{base}-readability.png')
    # Three repeats of every tile, one sheet per part (not scaled down).
    repeat_specs=[s for s in specs if s[-1]]
    rep=Image.new('RGBA',(2304,sum(s[2]+24 for s in repeat_specs)),(65,62,76,255))
    yy=0; d=ImageDraw.Draw(rep)
    for name,w,h,y,sf,depth,tiles in repeat_specs:
        d.text((4,yy+3),f'{part}/gen_{name}.png: 3 repeats',fill='white'); yy+=24
        for x in range(3): rep.alpha_composite(assets[(part,name)],(x*w,yy))
        yy+=h
    rep.save(TMP/f'g-{part}-repeats.png')
(SRC/'manifest_g.json').write_text(json.dumps(manifest,indent=2)+'\n')

# Compact review galleries retain native-size pixels and both scroll phases.
for part in SPECS:
    paths=sorted(TMP.glob(f'g-{part}-*-384x216.png'))
    sheet=Image.new('RGB',(768,240*((len(paths)+1)//2)),(45,40,55))
    d=ImageDraw.Draw(sheet)
    for i,p in enumerate(paths):
        x=(i%2)*384; y=(i//2)*240
        d.text((x+2,y+2),p.name,fill='white');sheet.paste(Image.open(p),(x,y+24))
    sheet.save(TMP/f'g-{part}-native-gallery.png')
    paths=sorted((ROOT/f'game/public/assets/backgrounds/{part}').glob('gen_*.png'))
    sheet=Image.new('RGB',(784,250*len(paths)),(65,62,76));d=ImageDraw.Draw(sheet)
    for i,p in enumerate(paths):
        d.text((8,i*250+3),p.name,fill='white')
        im=Image.open(p).convert('RGBA');sheet.paste(im,(8,i*250+24),im)
    sheet.save(TMP/f'g-{part}-layers.png')
