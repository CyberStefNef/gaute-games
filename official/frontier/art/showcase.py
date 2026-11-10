"""Run inside Blender's Python console to inspect the editable model collection.
import runpy; runpy.run_path('/absolute/path/showcase.py')
"""
import bpy, runpy, math
from pathlib import Path
ROOT=Path(__file__).resolve().parent
a=runpy.run_path(str(ROOT/'render.py'))
for col in list(bpy.data.collections):
    if not col.objects: bpy.data.collections.remove(col)
# Discard the render rig's distant light placement for a readable solid viewport.
for i,n in enumerate(a['NAMES']):
    before=set(bpy.data.objects)
    if i<8: a['terrain'](n)
    else:
        a['tile']('grass')
        a['prop'](n)
    col=bpy.data.collections.new(n); bpy.context.scene.collection.children.link(col)
    # Separate editable collections, no joined or flattened geometry.
    for ob in set(bpy.data.objects)-before:
        for parent in list(ob.users_collection): parent.objects.unlink(ob)
        col.objects.link(ob); ob.location.x+=(i%6)*4.5; ob.location.y+=(i//6)*4.5
    text=bpy.data.curves.new(n,'FONT'); text.body=n; text.size=.3; text.align_x='CENTER'; text.extrude=.001
    ob=bpy.data.objects.new(n+' label',text); col.objects.link(ob); ob.location=((i%6)*4.5,(i//6)*4.5-1.85,.03); ob.data.materials.append(a['M']['cloth'])
for o in bpy.context.selected_objects: o.select_set(False)
# Select only meshes to frame gallery, excluding the camera and lights.
for o in bpy.context.scene.objects:
    if o.type in {'MESH','FONT'}: o.select_set(True)
for area in bpy.context.screen.areas:
    if area.type in {'VIEW_3D','CONSOLE'}:
        area.type='VIEW_3D'
        space=area.spaces.active; space.shading.type='SOLID'; space.shading.color_type='MATERIAL'; space.shading.light='STUDIO'; space.shading.show_shadows=True; space.shading.show_cavity=True; space.overlay.show_overlays=False
        space.region_3d.view_rotation=a['cam'].rotation_euler.to_quaternion(); space.region_3d.view_perspective='ORTHO'
        region=next(r for r in area.regions if r.type=='WINDOW')
        with bpy.context.temp_override(area=area,region=region): bpy.ops.view3d.view_selected(use_all_regions=False)
for o in bpy.context.selected_objects: o.select_set(False)
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'frontier-models.blend'))
