import json
t=open('template.html').read()
css=open('node_modules/leaflet/dist/leaflet.css').read()
js=open('node_modules/leaflet/dist/leaflet.js').read()
B=json.load(open('data/basemap.json'))
R=json.load(open('data/routes.json'))
# keep only what the page draws
B['features']=[f for f in B['features'] if f['properties'].get('k') in ('water','park','road','place','ref')]
def rnd(o):
    if isinstance(o,float): return round(o,5)
    if isinstance(o,list): return [rnd(x) for x in o]
    if isinstance(o,dict): return {k:rnd(v) for k,v in o.items()}
    return o
B=rnd(B)
out=t.replace('/*LEAFLET_CSS*/',css).replace('/*LEAFLET_JS*/',js.replace('</script','<\\/script')).replace('/*BASEMAP*/',json.dumps(B,separators=(',',':'))).replace('/*ROUTES*/',json.dumps(R,separators=(',',':')))
open('launch_day_map.html','w').write(out)
print(len(out)/1e6,'MB')
