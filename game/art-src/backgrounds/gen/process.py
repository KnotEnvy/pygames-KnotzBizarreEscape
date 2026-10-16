"""Rebuild generated backgrounds: uv run --with pillow,numpy python game/art-src/backgrounds/gen/process.py"""
from pathlib import Path
import re,json
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[4]
SRC=Path(__file__).parent
OUT=ROOT/'game/public/assets/backgrounds/stage1'
TMP=Path('/tmp/kbe-imagegen');TMP.mkdir(exist_ok=True)
PAL=[]
for line in (ROOT/'docs/palette.gpl').read_text().splitlines():
 m=re.match(r'\s*(\d+)\s+(\d+)\s+(\d+)',line)
 if m: PAL.append(tuple(map(int,m.groups())))
palette=np.array(PAL,dtype=np.int32)
SPECS={'sky':(384,216),'mountains':(768,140),'pines_far':(768,110),'pines_mid':(768,150),'outpost_far':(768,140),'title':(384,216)}
def quantize(a):
 rgb=a[:,:,:3].astype(np.int32); flat=rgb.reshape(-1,3)
 idx=np.concatenate([((c[:,None,:]-palette[None,:,:])**2).sum(2).argmin(1) for c in np.array_split(flat,16)])
 a[:,:,:3]=palette[idx].reshape(rgb.shape).astype('uint8')
 a[:,:,3]=np.where(a[:,:,3]>=128,255,0)
 a[a[:,:,3]==0,:3]=0
 return Image.fromarray(a)
assets={}
for name,(w,h) in SPECS.items():
 im=Image.open(SRC/f'raw_{name}.png').convert('RGBA')
 # Crop transparent margins, retain a small clear strip over the skyline.
 if name not in ('sky','title'):
  box=im.getbbox()
  if box: im=im.crop((0,max(0,box[1]-round(im.height*.025)),im.width,box[3]))
  # Extra headroom is explicit and remains transparent after resizing.
  canvas=Image.new('RGBA',(im.width,round(im.height*1.12)))
  canvas.alpha_composite(im,(0,canvas.height-im.height));im=canvas
 if name=='title': a=np.array(im.resize((w,h),Image.Resampling.BOX))
 else:
  overlap=48
  a=np.array(im.resize((w+overlap,h),Image.Resampling.BOX)).astype(float)
  # Premultiplied overlap avoids dark fringes on transparent silhouettes.
  a[:,:,:3]*=a[:,:,3:4]/255
  t=np.linspace(0,1,overlap)[None,:,None]
  join=a[:,-overlap:]*(1-t)+a[:,:overlap]*t
  a=np.concatenate((join,a[:,overlap:w]),axis=1)
  a[:,:,:3]=np.divide(a[:,:,:3]*255,a[:,:,3:4],out=np.zeros_like(a[:,:,:3]),where=a[:,:,3:4]>0)
  a=np.clip(a,0,255).astype('uint8')
 if name in ('sky','title'): a[:,:,3]=255
 if name=='sky':
  a=np.array(Image.fromarray(a).filter(ImageFilter.MedianFilter(3)))
 final=quantize(a)
 path=ROOT/'game/public/assets/ui/keyart/title_bg.png' if name=='title' else OUT/f'gen_{name}.png'
 final.save(path);assets[name]=final
 assert set(np.unique(np.array(final)[:,:,3])).issubset({0,255})
 assert all(tuple(c) in PAL for c in np.unique(np.array(final)[:,:,:3][np.array(final)[:,:,3]>0],axis=0))
 if name!='title':
  tile=Image.new('RGBA',(w*2,h));tile.paste(final,(0,0));tile.paste(final,(w,0));tile.save(TMP/f'tiled_{name}.png')
 print(f'{path.relative_to(ROOT)} {w}x{h}')
for section in ('forest','outpost'):
 comp=assets['sky'].copy()
 for n,y in [('mountains',34),('pines_far',91),('outpost_far',67)] if section=='outpost' else [('mountains',34),('pines_far',91),('pines_mid',90)]:
  comp.alpha_composite(assets[n],(-96,y))
 comp.save(TMP/f'parallax_{section}_384x216.png')
 # Nearest-neighbor enlargement for review.
 comp.resize((1152,648),Image.Resampling.NEAREST).save(TMP/f'parallax_{section}_3x.png')
# All final assets at native resolution on a neutral backing.
contact=Image.new('RGB',(800,1240),(43,38,53));d=ImageDraw.Draw(contact);y=0
for n,im in assets.items():
 d.text((8,y+3),n,fill='white');y+=20;contact.paste(im,(8,y),im);y+=im.height+12
contact.save(TMP/'final_contact.png')
