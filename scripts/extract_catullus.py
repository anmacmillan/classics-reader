#!/usr/bin/env python3
"""Extract Catullus poems 1–116 from pinned Perseus Latin/English XML."""
import json, subprocess
from pathlib import Path
from lxml import etree

ROOT=Path(__file__).resolve().parents[1]; TMP=Path('/tmp/catullus-source'); OUT=ROOT/'imports/catullus'
SHA='e69eee761e5bd89c00a5d0744efa2367c5e1d7e3'; BASE=f'https://raw.githubusercontent.com/PerseusDL/canonical-latinLit/{SHA}/data/phi0472/phi001'
def fetch(name):
 p=TMP/name; p.parent.mkdir(parents=True,exist_ok=True)
 subprocess.run(['curl','-L','--fail','-sS','-o',str(p),f'{BASE}/{name}'],check=True); return p
def clean(x):
 vals=[]
 for node in x.iter():
  tag=node.tag.rsplit('}',1)[-1]
  excluded=tag in {'note','milestone','gap'} or any(a.tag.rsplit('}',1)[-1] in {'note','milestone','gap'} for a in node.iterancestors())
  if excluded: continue
  if node.text: vals.append(node.text)
  if node.tail and node.getparent() is not None and node.getparent().tag.rsplit('}',1)[-1] not in {'note','milestone','gap'}: vals.append(node.tail)
 return ' '.join(' '.join(vals).split())
def align(latin, english):
 used=set(); out=[]
 for pos,(num,_) in enumerate(latin):
  candidates=[j for j,(en,_) in enumerate(english) if j not in used and en==num]
  if not candidates:
   candidates=[j for j in range(len(english)) if j not in used]
  if candidates:
   j=candidates[0]; used.add(j); out.append(english[j][1])
  else:
   out.append('—')
 return out
def poems(path):
 root=etree.parse(path); out={}
 for d in root.xpath('//*[local-name()="div" and @subtype="poem"]'):
  n=d.get('n'); out[n]=[(l.get('n'),clean(l)) for l in d.xpath('.//*[local-name()="l"]') if clean(l)]
 return out
def main():
 latin=poems(fetch('phi0472.phi001.perseus-lat2.xml')); english=poems(fetch('phi0472.phi001.perseus-eng3.xml'))
 OUT.mkdir(parents=True,exist_ok=True); chapters=[]
 keys=sorted(latin, key=lambda x:(int(''.join(c for c in x if c.isdigit())), x))
 for i,key in enumerate(keys,1):
  if key not in english: raise RuntimeError(f'missing English poem {key}')
  ls,es=latin[key],english[key]; aligned=align(ls,es)
  (OUT/f'latin-{i:03}.txt').write_text('\n'.join(x[1] for x in ls)+'\n',encoding='utf-8')
  (OUT/f'english-{i:03}.txt').write_text('\n'.join(aligned)+'\n',encoding='utf-8')
  chapters.append({'title':f'Gedicht {key} ({len(ls)} verzen)','startLine':1,'original':f'latin-{i:03}.txt','english':f'english-{i:03}.txt'})
 chapters[0].update({'translationCredit':'Latijn: Perseus Digital Library (phi0472.phi001.perseus-lat2) · EN: Perseus English reference','translationCreditLanguage':'Bronnen','translationUrl':'https://catalog.perseus.org/catalog/urn:cts:latinLit:phi0472.phi001'})
 manifest={'id':'catullus','title':'Catullus — Carmina','shortTitle':'De volledige gedichten van Catullus','author':'Catullus','year':-55,'lang':'latin','chapters':chapters,'source':{'latin':f'Perseus Digital Library, phi0472.phi001.perseus-lat2 (revision {SHA})','english':f'Perseus English reference (revision {SHA})'}}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
if __name__=='__main__': main()
