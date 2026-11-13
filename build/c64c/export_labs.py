import json, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import labs_new, app_c64
json.dump(labs_new.LABS, open('/tmp/c64labs.json', 'w'))
open('/tmp/c64asm.js', 'w').write(app_c64.asm_js())
print(len(labs_new.LABS), 'labs', sum(len(v['levels']) for v in labs_new.LABS.values()), 'levels')
