"""Export original saved Brewtown models, without reducing geometry or materials.
Run: blender -b -t 4 -P official/frontier/art/export-frontier.py
The .blend file remains unchanged. The SDK handles lossless delivery compression.
"""
import bpy, json
from pathlib import Path
from mathutils import Vector
ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'frontier-models.blend'
OUT = ROOT.parent / 'assets/models'
REFERENCE = ROOT / 'reference-models'
REFERENCE_ONLY = {'pineWoodland', 'spring', 'kegs', 'builder', 'surveyor'}
NAMES = ['meadow', 'barleyMeadow', 'woodland', 'pineWoodland', 'hill', 'spring',
         'water', 'hopGrove', 'brewery', 'brewhouse', 'taproom', 'festival',
         'warehouse', 'beerGarden', 'yeastLab', 'hopTrellis', 'barleyField',
         'well', 'kegs', 'brewer', 'builder', 'surveyor', 'cargoBike', 'deliveryCart']
bpy.ops.wm.open_mainfile(filepath=str(SOURCE))
OUT.mkdir(parents=True, exist_ok=True)
REFERENCE.mkdir(parents=True, exist_ok=True)
records = []
for index, name in enumerate(NAMES):
    collection = bpy.data.collections.get(name)
    if not collection:
        raise RuntimeError('Missing original model collection: ' + name)
    objects = [o for o in collection.objects if o.type == 'MESH']
    # Terrain now sits on a planetary surface. Remove only the gallery hex
    # support slabs; all above-ground original geometry/materials are retained.
    game_objects = [o for o in objects if not (o.dimensions.x > 3 and o.dimensions.y > 3 and o.dimensions.z < .3 and o.location.z < 0)]
    bpy.ops.object.select_all(action='DESELECT')
    offset = Vector(((index % 6) * 4.5, (index // 6) * 4.5, 0))
    original_locations = {o: o.location.copy() for o in objects}
    for obj in objects:
        obj.location -= offset
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    target = REFERENCE / (name + '.glb')
    bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB',
        use_selection=True, export_animations=False, export_apply=True,
        export_yup=True, export_lights=False, export_cameras=False,
        export_normals=True, export_texcoords=True, export_materials='EXPORT')
    if name not in REFERENCE_ONLY:
        bpy.ops.object.select_all(action='DESELECT')
        for obj in game_objects:
            obj.select_set(True)
        bpy.context.view_layer.objects.active = game_objects[0]
        bpy.ops.export_scene.gltf(filepath=str(OUT / (name + '.glb')), export_format='GLB',
            use_selection=True, export_animations=False, export_apply=True,
            export_yup=True, export_lights=False, export_cameras=False,
            export_normals=True, export_texcoords=True, export_materials='EXPORT')
    for obj, location in original_locations.items():
        obj.location = location
    records.append({'name': name, 'objects': len(objects),
        'location': str(target.relative_to(ROOT.parent)),
        'sourceVertices': sum(len(o.data.vertices) for o in objects),
        'materials': sorted({m.name for o in objects for m in o.data.materials if m}),
        'bytes': target.stat().st_size})
    print('ORIGINAL_MODEL', name, target.stat().st_size)
(ROOT / 'models-source.json').write_text(json.dumps({'source': SOURCE.name, 'models': records}, indent=2) + '\n')

# New cloud scenery, separate from the unchanged original model library.
material = bpy.data.materials.new('cloud porcelain')
material.use_nodes = True
material.diffuse_color = (.94,.96,1,1)
bsdf = material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = material.diffuse_color
bsdf.inputs['Roughness'].default_value = 1
bpy.ops.object.select_all(action='DESELECT')
clouds = []
for x,y,z,s in [(-1.1,0,0,.7),(-.5,.15,.25,.95),(.3,0,.35,1.1),(1,.05,.1,.8),(.1,-.5,.05,.8),(-.7,-.4,.08,.65)]:
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(x,y,z))
    obj = bpy.context.object
    obj.scale = (s,s*.7,s*.55)
    obj.data.materials.append(material)
    for face in obj.data.polygons:
        face.use_smooth = True
    clouds.append(obj)
bpy.ops.object.select_all(action='DESELECT')
for obj in clouds:
    obj.select_set(True)
bpy.context.view_layer.objects.active = clouds[0]
bpy.ops.export_scene.gltf(filepath=str(OUT / 'cloud.glb'), export_format='GLB',
    use_selection=True, export_apply=True, export_animations=False,
    export_lights=False, export_cameras=False, export_yup=True)
