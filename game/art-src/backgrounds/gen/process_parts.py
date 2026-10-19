"""Rebuild M1 Parts II/III from retained generated sources; no network required.
UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache uv run --offline --with pillow,numpy python game/art-src/backgrounds/gen/process_parts.py
"""
from pathlib import Path
import json,re,sys
import numpy as np
from PIL import Image, ImageDraw
SRC=Path(__file__).resolve().parent
ROOT=SRC.parents[3]
TMP=Path('/tmp/kbe-imagegen'); TMP.mkdir(exist_ok=True)
PAL=[tuple(map(int,m.groups())) for l in (ROOT/'docs/palette.gpl').read_text().splitlines() if (m:=re.match(r'\s*(\d+)\s+(\d+)\s+(\d+)',l))]
PA=np.array(PAL,dtype=np.int32)
SPECS={
'm1p2': [('sky',384,216,0,.015,True),('peaks',768,140,30,.08,True),('slopes',768,126,80,.22,True),('near_pines',768,142,104,.42,True)],
'm1p3': [('sky',384,216,0,.015,True),('mountains',768,132,35,.08,True),('lake_far',768,104,112,.16,True),('lab_far',768,160,38,.24,False)]}
def quant(a):
    flat=a[:,:,:3].reshape(-1,3).astype(np.int32)
    idx=np.concatenate([((c[:,None]-PA[None])**2).sum(2).argmin(1) for c in np.array_split(flat,32)])
    a[:,:,:3]=PA[idx].reshape(a.shape[:2]+(3,))
    a[:,:,3]=np.where(a[:,:,3]>=128,255,0)
    a[a[:,:,3]==0,:3]=0
    return Image.fromarray(a)
report={}
for part,specs in SPECS.items():
    if len(sys.argv)>1 and part not in sys.argv[1:]: continue
    assets={}; out=ROOT/'game/public/assets/backgrounds'/part;out.mkdir(exist_ok=True)
    for name,w,h,y,sf,tiles in specs:
        im=Image.open(SRC/f'raw_{part}_{name}.png').convert('RGBA')
        if name!='sky':
            assert im.getextrema()[3][0]<128, f'{part}/{name}: source has no transparency'
            box=im.getbbox(); im=im.crop((0,max(0,box[1]-int(im.height*.025)),im.width,box[3]))
            can=Image.new('RGBA',(im.width,round(im.height*1.08)));can.alpha_composite(im,(0,can.height-im.height));im=can
        overlap=48 if tiles else 0
        a=np.array(im.resize((w+overlap,h),Image.Resampling.BOX)).astype(float)
        # Compress source contrast and snow highlights into quiet atmospheric ramps.
        anchor=np.array([91,96,121]) if name=='sky' else np.array([76,88,109])
        strength=.78 if name in ('near_pines','lab_far') else .65
        a[:,:,:3]=anchor+(a[:,:,:3]-anchor)*strength
        if tiles:
            a[:,:,:3]*=a[:,:,3:4]/255
            t=np.linspace(0,1,overlap)[None,:,None]
            join=a[:,-overlap:]*(1-t)+a[:,:overlap]*t
            a=np.concatenate((join,a[:,overlap:w]),axis=1)
            a[:,:,:3]=np.divide(a[:,:,:3]*255,a[:,:,3:4],out=np.zeros_like(a[:,:,:3]),where=a[:,:,3:4]>0)
        if name=='sky':a[:,:,3]=255
        im=quant(np.clip(a,0,255).astype('uint8')); ar=np.array(im)
        assert set(np.unique(ar[:,:,3])) <= {0,255}
        assert all(tuple(c) in PAL for c in np.unique(ar[:,:,:3][ar[:,:,3]>0],axis=0))
        if name!='sky': assert (ar[:,:,3]==0).any()
        im.save(out/f'gen_{name}.png');assets[name]=im
        tile=Image.new('RGBA',(w*2,h));tile.alpha_composite(im);tile.alpha_composite(im,(w,0));tile.save(TMP/f'{part}_tiled_{name}.png')
        print(f'{part}/gen_{name}.png {w}x{h}: palette/binary alpha OK')
    # Native composites at two scroll phases expose overlap joins and the full compound.
    for phase in (0,384):
        comp=assets['sky'].copy()
        for name,w,h,y,sf,tiles in specs[1:]:
            x=-phase if tiles else -192
            comp.alpha_composite(assets[name],(x,y))
            if tiles:comp.alpha_composite(assets[name],(x+w,y))
        suffix='' if phase==0 else '_phase384'
        comp.save(TMP/f'{part}_composite{suffix}_384x216.png')
        comp.resize((1152,648),Image.Resampling.NEAREST).save(TMP/f'{part}_composite{suffix}_3x.png')
        # Stylized palette swatches approximate enemy silhouette and 4–6px projectiles.
        d=ImageDraw.Draw(comp)
        for x in (40,140,240,340):
            d.rectangle((x-6,144,x+6,170),fill='#1a1220');d.rectangle((x-5,145,x+5,160),fill='#a02a26')
            d.rectangle((x-4,139,x+4,146),fill='#d2b878');d.rectangle((x-9,152,x+9,156),fill='#d4483a')
            d.ellipse((x+16,140,x+21,145),fill='#d4483a');d.rectangle((x+17,141,x+20,144),fill='#ffe066');d.point((x+18,142),fill='white')
        comp.resize((1152,648),Image.Resampling.NEAREST).save(TMP/f'{part}_readability{suffix}_3x.png')
    report[part]=[dict(file=f'gen_{n}.png',size=[w,h],y=y,scrollX=sf,tiles=t) for n,w,h,y,sf,t in specs]
(TMP/'parts_validation.json').write_text(json.dumps(report,indent=2)+'\n')
