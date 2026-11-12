#!/usr/bin/env python3
import os
H=os.path.dirname(os.path.abspath(__file__))
FILES=['01_lex','02_parse','03_vals','04_interp','05_methods','06_check','07_api']
def core():
    parts=[]
    for f in FILES:
        p=os.path.join(H,f+'.js')
        if os.path.exists(p): parts.append(open(p).read())
    return '\n'.join(parts)
if __name__=='__main__':
    open(os.path.join(H,'rustlab.core.js'),'w').write(core()+'\nif (typeof module!=="undefined") module.exports=RL;\n')
    print('core', len(core()))

def lab_html(cfg, title='Rust Lab'):
    import json
    css=open(os.path.join(H,'lab.css')).read()
    corejs=core(); ui=open(os.path.join(H,'ui.js')).read()
    return ('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>%s</title><style>%s</style></head><body><div id="app"></div><script>%s\n%s\nRL.mount(document.getElementById("app"), %s);</script></body></html>' % (title, css, corejs, ui, json.dumps(cfg).replace('</','<\\/')))
