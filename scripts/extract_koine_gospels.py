#!/usr/bin/env python3
"""Extract complete standard-text Matthew, Luke and John from pinned sources."""
from __future__ import annotations
import json, subprocess, unicodedata
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
TMP = Path('/tmp/koine-gospels-source')
PERSEUS = 'https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/91595f89e15b4d3000cd93efcf8990720c8be2b9/data/tlg0031'
PROIEL = 'https://raw.githubusercontent.com/proiel/proiel-treebank/8e388967a1335ed12335ddc655fe46993ee7d57a/greek-nt.xml'
BOOKS = {
    'matthew': ('tlg001', 'MATT', 'Matthaeus', 'Evangelie volgens Matteüs'),
    'luke': ('tlg003', 'LUKE', 'Lucas', 'Evangelie volgens Lucas'),
    'john': ('tlg004', 'JOHN', 'Ioannes', 'Evangelie volgens Johannes'),
}
POS = {'N':'n','A':'a','S':'l','M':'m','V':'v','R':'r','C':'c','G':'c','D':'d','P':'p','I':'i','X':'x','T':'b'}

def fetch(url, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['curl','-L','--fail','-sS','-o',str(path),url], check=True)

def postag(tok):
    m=(tok.get('morphology') or '----------').ljust(10,'-')
    return POS.get((tok.get('part-of-speech') or 'X-')[0], 'x') + m[:8]

def verses(root):
    out={}
    def walk(node, chapter=None):
        if node.get('subtype') == 'chapter': chapter=node.get('n')
        if node.get('subtype') == 'verse' and chapter:
            key=f'{chapter}:{node.get("n")}'
            out[key]=' '.join(' '.join(node.itertext()).split())
        for child in node: walk(child, chapter)
    walk(root)
    return out

def main():
    TMP.mkdir(parents=True, exist_ok=True)
    fetch(PROIEL, TMP/'proiel.xml')
    pr=ET.parse(TMP/'proiel.xml').getroot()
    for slug,(work,code,author,title) in BOOKS.items():
        base=f'{PERSEUS}/{work}'
        fetch(f'{base}/tlg0031.{work}.perseus-grc2.xml', TMP/f'{slug}-greek.xml')
        fetch(f'{base}/tlg0031.{work}.perseus-eng2.xml', TMP/f'{slug}-english.xml')
        english=verses(ET.parse(TMP/f'{slug}-english.xml').getroot())
        by={}
        for tok in pr.iter('token'):
            cp=tok.get('citation-part') or ''
            if cp.startswith(code+' '):
                key=cp[len(code)+1:].replace('.',':')
                # PROIEL numbers the final clause of John 1 as 1:52; canonical
                # Perseus/WEB editions include it in verse 1:51.
                if code == 'JOHN' and key == '1:52': key='1:51'
                by.setdefault(key,[]).append(tok)
        chapters={}
        for key in by:
            chapters.setdefault(key.split(':')[0],[]).append(key)
        out=ROOT/'imports'/f'{slug}-koine'; out.mkdir(parents=True, exist_ok=True)
        tb=ET.Element('treebank'); manifest_ch=[]
        for i,ch in enumerate(sorted(chapters,key=int),1):
            keys=sorted(chapters[ch], key=lambda k:int(k.split(':')[1]))
            greek=[]; eng=[]
            for key in keys:
                if key not in english: raise RuntimeError(f'{slug}: missing English {key}')
                toks=by[key]; parts=[]
                for tok in toks:
                    if tok.get('form'): parts.extend(tok.get('form').split())
                    if (tok.get('presentation-after') or '').strip(): parts.append(tok.get('presentation-after').strip())
                greek.append(' '.join(parts).replace('  ',' ').strip()); eng.append(english[key])
                s=ET.SubElement(tb,'sentence',id=f'{code.lower()}-{key.replace(":","-")}')
                for tok in toks:
                    form=tok.get('form') or ''
                    if not form or not any(unicodedata.category(c).startswith('L') for c in form): continue
                    for piece in form.split():
                        ET.SubElement(s,'word',form=piece,lemma=tok.get('lemma') or '',postag=postag(tok))
            (out/f'greek-{i:02}.txt').write_text('\n'.join(greek)+'\n',encoding='utf-8')
            (out/f'english-{i:02}.txt').write_text('\n'.join(eng)+'\n',encoding='utf-8')
            manifest_ch.append({'title':f'{author} {ch}:1–{keys[-1].split(":")[1]}','startLine':1,'original':f'greek-{i:02}.txt','english':f'english-{i:02}.txt'})
        ET.ElementTree(tb).write(TMP/f'{slug}-treebank.xml',encoding='utf-8',xml_declaration=True)
        manifest={'id':f'{slug}-koine','title':f'{author} — {title}','shortTitle':f'Het volledige {title.lower()}','author':author,'year':80 if slug!='john' else 95,'lang':'greek','chapters':manifest_ch,'source':{'greek':f'Perseus Digital Library, tlg0031.{work}.perseus-grc2 (revision 91595f89e15b4d3000cd93efcf8990720c8be2b9)','english':f'Perseus English reference (World English Bible), revision 91595f89e15b4d3000cd93efcf8990720c8be2b9)','parsing':'PROIEL Greek New Testament treebank (CC BY-NC-SA 3.0), revision 8e388967a1335ed12335ddc655fe46993ee7d57a'}}
        manifest_ch[0].update({'translationCredit':'Grieks: Perseus Digital Library · EN: World English Bible via Perseus · Parsing: PROIEL Greek New Testament treebank (CC BY-NC-SA 3.0)','translationCreditLanguage':'Bronnen','translationUrl':'https://catalog.perseus.org/'})
        (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

if __name__=='__main__': main()
