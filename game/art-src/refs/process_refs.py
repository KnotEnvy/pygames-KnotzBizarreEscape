"""Offline Phase H references. Run with uv --offline --with pillow,numpy python.
Generated pixels are sampled per target grid cell by modal palette color, never blurred.
"""
from pathlib import Path
import json,re,sys,shutil
import numpy as np
from PIL import Image,ImageDraw
SRC=Path(__file__).resolve().parent
ROOT=SRC.parents[2]
PAL=[tuple(map(int,m.groups())) for l in (ROOT/'docs/palette.gpl').read_text().splitlines() if (m:=re.match(r'\s*(\d+)\s+(\d+)\s+(\d+)',l))]
PA=np.array(PAL,dtype=np.int32)
SPECS={'hopper':[40,32],'airboat':[88,44],'buzzard':[96,40],'piranha':[30,20],'gnat':[22,18],'hound':[36,24],'lurker':[22,34],'skeeter':[144,104],'gatorgeddon_legs':[88,64]}
def quant(im):
 a=np.array(im.convert('RGBA')); rgb=a[:,:,:3].reshape(-1,3).astype(np.int32)
 ids=np.concatenate([((c[:,None]-PA[None])**2).sum(2).argmin(1) for c in np.array_split(rgb,128) if len(c)])
 a[:,:,:3]=PA[ids].reshape(a.shape[:2]+(3,));a[:,:,3]=np.where(a[:,:,3]>=128,255,0);a[a[:,:,3]==0,:3]=0
 return Image.fromarray(a)
def grid(im,size):
 # Quantize source first, then choose modal RGBA of each destination cell.
 im=im.convert('RGBA'); alpha=im.getchannel('A').point(lambda v:255 if v>=128 else 0);box=alpha.getbbox();assert box
 im=im.crop(box);a=np.array(quant(im));w,h=size;out=np.zeros((h,w,4),dtype=np.uint8)
 for y in range(h):
  y0=int(y*im.height/h);y1=max(y0+1,int((y+1)*im.height/h))
  for x in range(w):
   x0=int(x*im.width/w);x1=max(x0+1,int((x+1)*im.width/w));p=a[y0:y1,x0:x1].reshape(-1,4)
   colors,counts=np.unique(p,axis=0,return_counts=True);out[y,x]=colors[counts.argmax()]
 # Remove isolated opaque specks only; preserve one-pixel linework connected diagonally.
 mask=out[:,:,3]>0
 for y,x in zip(*np.where(mask)):
  if mask[max(0,y-1):y+2,max(0,x-1):x+2].sum()==1:out[y,x]=0
 return Image.fromarray(out)
def validate(im):
 a=np.array(im);assert set(np.unique(a[:,:,3]))<={0,255};assert all(tuple(c) in PAL for c in np.unique(a[:,:,:3][a[:,:,3]>0],axis=0))
def frame(stem):
 p=ROOT/'game/public/assets/sprites'/stem; j=json.loads(p.with_suffix('.json').read_text()); f=next(iter(j['frames'].values()))['frame'];im=Image.open(p.with_suffix('.png')).convert('RGBA');im=im.crop((f['x'],f['y'],f['x']+f['w'],f['y']+f['h']));return im.crop(im.getbbox())
def sheet(kind,pix):
 actors=[frame('enemies/grunt'),frame('player/knotz_full'),pix]; width=sum(a.width for a in actors)+48;high=max(a.height for a in actors)+20
 row=Image.new('RGBA',(width,high),(43,38,53,255));d=ImageDraw.Draw(row);x=8
 for label,im in zip(['grunt','Knotz',kind],actors):
  d.text((x,1),label,fill='white');row.alpha_composite(im,(x,high-im.height-2));x+=im.width+16
 s=Image.new('RGBA',(width*4,high*5+12),(43,38,53,255));s.alpha_composite(row,(0,0));s.alpha_composite(row.resize((width*4,high*4),Image.Resampling.NEAREST),(0,high+12));s.save(SRC/f'sheet_{kind}.png')
manifest=json.loads((SRC/'manifest.json').read_text()) if (SRC/'manifest.json').exists() else {}
for kind in (sys.argv[1:] or SPECS):
 w,h=SPECS[kind];out=SRC/kind;out.mkdir(exist_ok=True);files=[]
 for role in ['concept','pixel','poses','parts']:
  raw=SRC/f'raw_{kind}_{role}.png'
  if not raw.exists():continue
  im=Image.open(raw).convert('RGBA');assert im.getextrema()[3][0]<128, f'{raw}: missing real transparency'
  if role=='concept':shutil.copyfile(raw,out/'concept.png');files.append(f'{kind}/concept.png');continue
  if role=='pixel':pix=grid(im,(w,h));pix.save(out/'pixel.png');pix.resize((w*4,h*4),Image.Resampling.NEAREST).save(out/'pixel_4x.png');validate(pix);sheet(kind,pix);files += [f'{kind}/pixel.png',f'{kind}/pixel_4x.png',f'sheet_{kind}.png']
  else:
   im.save(out/f'{role}.png');box=im.getchannel('A').point(lambda v:255 if v>=128 else 0).getbbox();ratio=(box[2]-box[0])/(box[3]-box[1]);ph=h if role=='poses' else h;ref=grid(im,(round(ph*ratio),ph));validate(ref);ref.save(out/f'{role}_pixel.png');files += [f'{kind}/{role}.png',f'{kind}/{role}_pixel.png']
 if (out/'pixel.png').exists():
  manifest[kind]={'status':'ready','visible':[w,h],'files':files,'notes':'Design guide only: redraw/animate in Aseprite. Top-left lighting; master palette and binary alpha on pixel references. '+('Tongue reaches 64px in final animation. Pose sheet is a guide; isolate overlapping cable manually.' if kind=='hopper' else '')+(' 96px rotor envelope; hull target 88x40.' if kind=='buzzard' else '')+(' Provisional reference envelope; match existing boss body and hurtboxes.' if kind in ['skeeter','gatorgeddon_legs'] else '')}
  (SRC/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');print(kind,'ready',w,h)
