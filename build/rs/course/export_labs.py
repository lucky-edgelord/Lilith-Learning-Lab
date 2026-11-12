import json, labs_a, labs_b
allL = {}; allL.update(labs_a.LABS); allL.update(labs_b.LABS)
json.dump(allL, open('/tmp/rustlabs.json', 'w'))
print(len(allL), sum(len(v['levels']) for v in allL.values()))
