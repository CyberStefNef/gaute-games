"""Export reusable offline GLBs from the same original Brewtown models as the atlas."""
import bpy, runpy
from pathlib import Path
ROOT=Path(__file__).resolve().parent
kit=runpy.run_path(str(ROOT/'render.py'))
rig=set(bpy.data.objects)
out=ROOT.parents[2]/'examples/models3d/assets'
out.mkdir(parents=True,exist_ok=True)
for name in ['meadow','brewery','brewer']:
    for obj in list(bpy.data.objects):
        if obj not in rig: bpy.data.objects.remove(obj,do_unlink=True)
    if name=='meadow': kit['terrain'](name)
    else: kit['prop'](name)
    objects=[o for o in bpy.data.objects if o not in rig and o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    mesh=bpy.context.object
    # Remove duplicate material slots so repeated models share a small draw count.
    unique=[];mapping={}
    for i,m in enumerate(mesh.data.materials):
        if m not in unique: unique.append(m)
        mapping[i]=unique.index(m)
    indices=[mapping[p.material_index] for p in mesh.data.polygons]
    mesh.data.materials.clear()
    for m in unique: mesh.data.materials.append(m)
    for p,i in zip(mesh.data.polygons,indices):p.material_index=i
    bpy.ops.object.empty_add(type='PLAIN_AXES')
    pivot=bpy.context.object;pivot.name=name
    mesh.parent=pivot
    if name=='brewer':
        for frame,angle in [(1,0),(20,.025),(40,0),(60,-.025),(80,0)]:
            pivot.rotation_euler[1]=angle;pivot.keyframe_insert(data_path='rotation_euler',frame=frame)
        pivot.animation_data.action.name='Idle'
        bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=80
    bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);pivot.select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_apply=True,export_yup=True,export_lights=False,export_cameras=False)
    print(name,(out/(name+'.glb')).stat().st_size)
