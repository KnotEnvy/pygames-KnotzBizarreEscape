"""Inspect Phase H atlases: every tag/frame at 1x and 4x beside grunt and Knotz."""
from pathlib import Path
import argparse
from PIL import Image,ImageDraw
import json,os
parser=argparse.ArgumentParser();parser.add_argument('--out',default='/tmp/kbe-enemies-b/phase-h');args=parser.parse_args()
root=str(Path(__file__).resolve().parents[3]);out=args.out;Path(out).mkdir(parents=True,exist_ok=True)
def atlas(k,area='enemies',folder=None):
 p=folder or f'{root}/public/assets/sprites/{area}';d=json.load(open(f'{p}/{k}.json'));im=Image.open(f'{p}/{k}.png');return d,im

def frame(d,im,i):
 fs=list(d['frames'].values());r=fs[i]['frame'];return im.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h']))
refs=[]
for k,area in [('grunt','enemies'),('knotz_legs','player'),('knotz_torso_pistol','player')]:
 d,im=atlas(k,area);refs.append(frame(d,im,0))
for kind in ['hopper','airboat','piranha','gnat','lurker']:
 d,im=atlas(kind);tags=d['meta']['frameTags'];cw=max(112,max(f['sourceSize']['w'] for f in d['frames'].values())+8);ch=84
 sheet=Image.new('RGBA',(cw*12,ch*len(tags)+80),(43,38,53,255));dr=ImageDraw.Draw(sheet)
 for row,t in enumerate(tags):
  y=80+row*ch;dr.text((4,y),t['name'],fill='white')
  for c,i in enumerate(range(t['from'],t['to']+1)):
   a=frame(d,im,i);sheet.alpha_composite(a,(c*cw+(cw-a.width)//2,y+ch-a.height-6));dr.text((c*cw+2,y+16),str(i-t['from']+1),fill=(169,188,203))
  sheet.alpha_composite(refs[0],(10*cw+10,y+ch-54));sheet.alpha_composite(refs[1],(11*cw+10,y+ch-54));sheet.alpha_composite(refs[2],(11*cw+10,y+ch-54))
  dr.line((0,y+ch-1,sheet.width,y+ch-1),fill=(76,96,117))
 sheet.alpha_composite(refs[0],(5,26));sheet.alpha_composite(refs[1],(60,26));sheet.alpha_composite(refs[2],(60,26));dr.text((115,10),kind+' / every tag and frame / grunt + Knotz at 1x',fill='white')
 sheet.convert('RGB').save(f'{out}/contact-{kind}-1x.png');sheet.resize((sheet.width*4,sheet.height*4),Image.Resampling.NEAREST).convert('RGB').save(f'{out}/contact-{kind}-4x.png')
 # Compact all-tag preview, representative frames at 4x.
 mini=Image.new('RGBA',(cw*4,ch*len(tags)),(43,38,53,255));md=ImageDraw.Draw(mini)
 for row,t in enumerate(tags):
  md.text((4,row*ch),t['name'],fill='white')
  for c,i in enumerate([t['from'],min(t['from']+1,t['to']),(t['from']+t['to'])//2,t['to']]):
   a=frame(d,im,i);mini.alpha_composite(a,(c*cw+(cw-a.width)//2,(row+1)*ch-a.height-5))
 mini.resize((mini.width*3,mini.height*3),Image.Resampling.NEAREST).convert('RGB').save(f'{out}/review-{kind}.png')
