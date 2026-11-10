"""Original Gaute Brewtown dioramas. Run with Blender 5.2: blender -b -t 4 -P render.py.
No downloaded meshes, textures, fonts, or Python dependencies.
"""
import bpy, math, random, json
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'renders'
OUT.mkdir(exist_ok=True)
random.seed(19)
SIZE = 480
NAMES = ['meadow', 'barleyMeadow', 'woodland', 'pineWoodland', 'hill', 'spring', 'water', 'hopGrove', 'brewery', 'brewhouse', 'taproom', 'festival', 'warehouse', 'beerGarden', 'yeastLab', 'hopTrellis', 'barleyField', 'well', 'kegs', 'brewer', 'builder', 'surveyor', 'cargoBike', 'deliveryCart']
COLORS = {'grass':'7f9c65','grass2':'94aa74','soil':'786449','grassEdge':'5e7957','leaf':'477b61','leafLight':'68936c','pine':'355f56','trunk':'795842','stone':'aaa79c','stoneDark':'777f80','snow':'e3e7da','water':'4e969d','wave':'9ac7bd','sand':'c2b185','wall':'e2cfab','trim':'bba57e','roof':'704374','roofLight':'9b6b96','gold':'e2b95e','wood':'876044','dark':'403747','metal':'b9c7c7','cloth':'e2dfce','skin':'c58f68','copper':'bb784a','copperLight':'e3a474','hop':'a5ba6d'}
def srgb(v):
    return v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4

def mat(name, hx):
    m=bpy.data.materials.new(name); m.diffuse_color=(*[srgb(int(hx[i:i+2],16)/255) for i in (0,2,4)],1); m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF'); bs.inputs['Base Color'].default_value=m.diffuse_color; bs.inputs['Roughness'].default_value=.82
    return m
M={k:mat(k,v) for k,v in COLORS.items()}
def finish(o, material):
    o.data.materials.append(M[material]); return o

def cube(p,s,m, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=p); o=bpy.context.object; o.dimensions=s; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); finish(o,m)
    if bevel:
        mod=o.modifiers.new('small cut edges','BEVEL'); mod.width=bevel; mod.segments=1; o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
    return o

def cone(p,r,h,m,vertices=6,r2=0):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r,radius2=r2,depth=h,location=p); return finish(bpy.context.object,m)

def ico(p,s,m):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=1,location=p); o=bpy.context.object; o.scale=s; return finish(o,m)

def beam(a,b,r,m):
    a,b=Vector(a),Vector(b); o=cone((a+b)/2,r,(b-a).length,m,8,r); o.rotation_euler=(b-a).to_track_quat('Z','Y').to_euler(); return o

def roof(x,y,z,w,d,h,m='roof'):
    vs=[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x,y-d/2,z+h),(x,y+d/2,z+h)]
    mesh=bpy.data.meshes.new('gable'); mesh.from_pydata(vs,[],[(0,1,4),(3,5,2),(0,4,5,3),(1,2,5,4),(0,3,2,1)]); mesh.update(); o=bpy.data.objects.new('gable',mesh); bpy.context.collection.objects.link(o); finish(o,m)

def house(x,y,z=0,w=.66,d=.64,h=.56):
    cube((x,y,z+h/2),(w,d,h),'wall',.025); roof(x,y,z+h,w+.12,d+.12,.34)
    cube((x,y-d/2-.012,z+.17),(.17,.026,.34),'dark'); cube((x-w/2-.012,y,z+.35),(.026,.15,.16),'gold')

def tree(x,y,h=1,pine=False):
    cone((x,y,.25*h),.075,.5*h,'trunk',6)
    if pine:
        for z,r in [(.52,.43),(.79,.33),(1.02,.22)]: cone((x,y,z*h),r*h,.64*h,'pine' if z<.8 else 'leaf',6)
    else:
        ico((x,y,.83*h),(.48*h,.44*h,.51*h),'leaf'); ico((x-.16*h,y-.12*h,1.04*h),(.34*h,.34*h,.32*h),'leafLight')

def hexagon(z,h,m,r=1.9):
    o=cone((0,0,z),r,h,m,6,r);o.rotation_euler.z=math.pi/12;return o

def tile(m):
    hexagon(-.13,.26,'wood' if m!='water' else 'pine')
    hexagon(-.014,.05,m)

def barrel(x,y,z=0,scale=1):
    cone((x,y,z+.22*scale),.22*scale,.44*scale,'wood',10,.22*scale)
    for h in [.07,.34]: cone((x,y,z+h*scale),.23*scale,.045*scale,'metal',10,.23*scale)
    cone((x,y,z+.449*scale),.19*scale,.02*scale,'trim',10,.19*scale)
    cube((x,y,z+.47*scale),(.07*scale,.1*scale,.025*scale),'dark')

def kettle(x,y,z=0,scale=1):
    cone((x,y,z+.4*scale),.34*scale,.66*scale,'copper',12,.34*scale)
    ico((x,y,z+.7*scale),(.34*scale,.34*scale,.2*scale),'copperLight')
    cone((x,y,z+.92*scale),.085*scale,.36*scale,'copper',10,.085*scale)
    beam((x+.15*scale,y,z+1.1*scale),(x+.15*scale,y-.35*scale,z+1.1*scale),.05*scale,'copperLight')
    for dx in [-.22,.22]: beam((x+dx*scale,y,z),(x+dx*scale,y,z+.15*scale),.045*scale,'dark')

def hops(x=0,y=0):
    for dx in [-.6,.6]:
        beam((x+dx,y-.2,0),(x+dx,y-.2,1.35),.05,'wood')
    beam((x-.67,y-.2,1.3),(x+.67,y-.2,1.3),.045,'wood')
    for dx in [-.4,0,.4]:
        beam((x+dx,y-.2,.1),(x+dx,y-.2,1.32),.012,'cloth')
        for i in range(5):
            ico((x+dx+(.07 if i%2 else -.07),y-.22,.25+i*.2),(.13,.06,.13),'leaf' if i%2 else 'hop')
            if i%2: ico((x+dx,y-.3,.3+i*.2),(.065,.075,.12),'hop')

def barley():
    for x in [-.65,-.3,.05,.4,.75]:
        for y in [-.65,-.3,.05,.4,.75]:
            beam((x,y,0),(x,y,.38),.018,'gold')
            ico((x,y,.4),(.065,.05,.14),'gold')

def terrain(n):
    tile('water' if n in ['water','spring'] else 'grass2' if n=='barleyMeadow' else 'grass')
    if n in ['meadow','barleyMeadow']:
        for i in range(10):
            angle=random.random()*math.tau;r=random.uniform(.25,1.3);x,y=r*math.cos(angle),r*math.sin(angle)
            if n=='barleyMeadow':
                beam((x,y,0),(x,y,.24),.014,'gold');ico((x,y,.25),(.04,.04,.1),'gold')
            else:
                ico((x,y,.035),(.17,.11,.045),'grass2')
                if i%3==0:ico((x,y,.1),(.045,.045,.035),'gold')
    elif n in ['woodland','pineWoodland']:
        for x,y,h in [(-.65,.45,1),(.25,.65,1.1),(.75,.1,.85),(-.4,-.45,.86),(.35,-.65,.7)]:tree(x,y,h,n=='pineWoodland')
    elif n=='hill':
        ico((-.3,.3,.23),(.95,.85,.6),'grassEdge');ico((.45,-.25,.17),(.8,.75,.45),'grass2');ico((-.65,-.65,.1),(.26,.2,.22),'stone')
    elif n in ['water','spring']:
        for x,y in [(-.8,-.3),(.4,-.7),(-.2,.65),(.85,.4)]:cube((x,y,.022),(.32,.025,.01),'wave')
        if n=='spring':
            for x,y in [(-.6,.5),(-.2,.7),(.3,.65)]:ico((x,y,.19),(.35,.3,.33),'stone')
            cube((-.2,.45,.23),(.17,.15,.4),'wave',.03);tree(.8,.6,.65)
    elif n=='hopGrove':hops(-.15,.3);tree(.75,.65,.65)

def picnic(x,y):
    cube((x,y,.4),(.78,.42,.09),'wood',.02)
    for dy in [-.36,.36]:
        cube((x,y+dy,.22),(.85,.15,.07),'trim');
        for dx in [-.27,.27]:beam((x+dx,y+dy,.02),(x+dx,y+dy,.22),.035,'wood')
    for dx in [-.27,.27]:beam((x+dx,y,.02),(x+dx,y,.4),.045,'wood')

def prop(n):
    if n in ['brewery','brewhouse']:
        house(-.3,.25,w=1.1,d=.95,h=.78)
        # Copper kettle and curved pipe make production legible beside the house.
        kettle(.62,-.35,scale=.8);barrel(-.7,-.65,scale=.9)
        if n=='brewhouse':
            house(-.35,.7,z=.4,w=.85,d=.75,h=.9);kettle(.7,.65,scale=1.08)
            beam((.7,.65,1.15),(.25,.65,1.15),.055,'copper')
            barrel(-.95,-.25,scale=.75)
        # A gold round hop medallion, not a flag or defensive ornament.
        sign=cone((-.3,-.25,.7),.16,.04,'gold',10,.16);sign.rotation_euler.x=math.pi/2
    elif n=='taproom':
        house(0,.3,w=1.35,d=1,h=.8)
        roof(0,-.52,.62,1.55,.65,.13,'roofLight')
        for x in [-.62,.62]:beam((x,-.75,0),(x,-.75,.67),.045,'wood')
        barrel(-.85,-.45,scale=.9);picnic(.6,-.85)
        sign=cone((.45,-.23,.75),.16,.035,'gold',10,.16);sign.rotation_euler.x=math.pi/2
    elif n=='festival':
        for x in [-.7,.7]:
            for y in [-.5,.5]:beam((x,y,0),(x,y,.96),.045,'wood')
        cone((0,0,1.02),1.1,.65,'roofLight',8,.08)
        cone((0,0,1.38),.1,.16,'gold',6)
        for x in [-.6,0,.6]:barrel(x,0,scale=.7)
        # Lanterns hanging from the pavilion edge.
        for x in [-.7,0,.7]:ico((x,-.65,.77),(.1,.1,.13),'gold')
    elif n=='warehouse':
        house(0,.35,w=1.5,d=1,h=.75);cube((0,-.17,.3),(.65,.045,.58),'wood')
        for x in [-.3,.3]:cube((x,-.21,.3),(.028,.028,.55),'trim')
        for x,y in [(-.7,-.65),(-.2,-.75),(.45,-.5)]:barrel(x,y,scale=.85)
    elif n=='beerGarden':
        for x in [-.6,.6]:picnic(x,0)
        for x in [-1,1]:
            beam((x,.65,0),(x,.65,1.2),.035,'wood');tree(x,-.65,.5)
        beam((-1,.65,1.2),(1,.65,1.2),.012,'dark')
        for x in [-.8,-.4,0,.4,.8]:ico((x,.65,1.08),(.065,.065,.09),'gold')
    elif n=='yeastLab':
        house(-.2,.35,w=1.2,d=.85,h=.64)
        cube((.3,-.45,.36),(1,.5,.08),'trim');
        for x in [0,.35,.65]:
            ico((x,-.45,.55),(.11,.11,.13),'wave' if x else 'roofLight');cone((x,-.45,.7),.045,.15,'cloth',8,.045)
        # Distinct round skylight and copper laboratory exhaust.
        ico((-.2,.35,1),(.26,.26,.12),'wave');beam((-.7,.5,.6),(-.7,.5,1.27),.055,'copper')
    elif n=='hopTrellis':
        for y in [-.4,.45]:hops(0,y)
    elif n=='barleyField':
        hexagon(.015,.025,'soil',1.3);barley()
    elif n=='well':
        cone((0,0,.22),.5,.44,'stone',10,.5);cone((0,0,.45),.38,.02,'water',10,.38)
        for x in [-.6,.6]:beam((x,0,0),(x,0,1.15),.055,'wood')
        roof(0,0,1.08,1.5,1,.3);beam((-.6,0,.9),(.6,0,.9),.045,'wood');barrel(.85,-.4,scale=.6)
    elif n=='kegs':
        for x,y in [(-.3,-.3),(.3,-.3),(0,.3)]:barrel(x,y)
        barrel(0,0,.46,.85)
    elif n in ['brewer','builder','surveyor']:worker(n)
    elif n=='cargoBike':bike()
    elif n=='deliveryCart':cart()

def worker(n):
    for x in [-.13,.13]:cube((x,0,.23),(.19,.25,.46),'dark',.03)
    cube((0,0,.68),(.5,.34,.52),'cloth',.045)
    ico((0,0,1.08),(.22,.2,.24),'skin')
    if n=='brewer':
        # Plum apron and a broad copper stirring paddle.
        cube((0,-.19,.58),(.38,.045,.6),'roof',.025)
        cone((0,0,1.29),.25,.15,'cloth',10,.23)
        beam((.36,-.05,.1),(.36,-.05,1.36),.035,'wood');ico((.36,-.05,.25),(.1,.05,.24),'wood')
        barrel(-.55,.15,scale=.85)
    elif n=='builder':
        cone((0,0,1.28),.28,.18,'gold',8,.2)
        cube((0,-.19,.62),(.45,.04,.38),'leaf')
        # Carried plank and workbox rather than a weapon silhouette.
        ob=cube((.4,0,.6),(.18,.25,1.05),'wood',.02);ob.rotation_euler.y=-.2
        cube((-.36,-.08,.4),(.33,.25,.27),'gold',.03)
    else:
        cone((0,0,1.28),.34,.15,'sand',10,.17)
        cube((0,.2,.68),(.44,.22,.46),'leaf',.03)
        # A broad unfolded map and tripod level identify the surveyor.
        ob=cube((0,-.33,.8),(.65,.42,.04),'cloth');ob.rotation_euler.x=.25
        for x,y in [(.6,-.35),(.95,.1),(.4,.15)]:beam((.66,0,.95),(x,y,0),.025,'wood')
        beam((.5,0,1.02),(.85,0,1.02),.07,'gold')

def wheel(x,y,z,r=.3):
    # Dark tire, light hub, visible broad spokes, vertical in X/Z.
    bpy.ops.mesh.primitive_torus_add(major_segments=12,minor_segments=4,location=(x,y,z),major_radius=r,minor_radius=.035,rotation=(math.pi/2,0,0));finish(bpy.context.object,'dark')
    for ang in [0,math.pi/3,2*math.pi/3]:beam((x+math.cos(ang)*r,y,z+math.sin(ang)*r),(x-math.cos(ang)*r,y,z-math.sin(ang)*r),.016,'metal')

def bike():
    for x in [-.7,.8]:wheel(x,0,.32)
    for a,b in [((-.7,0,.32),(-.1,0,.32)),((-.7,0,.32),(-.4,0,.8)),((-.4,0,.8),(-.1,0,.32)),((-.4,0,.8),(.3,0,.8)),((-.1,0,.32),(.3,0,.8)),((.3,0,.8),(.8,0,.32)),((.3,0,.8),(.35,0,1.02))]:beam(a,b,.035,'roofLight')
    cube((-.4,0,.88),(.3,.18,.055),'dark',.02);beam((.35,-.22,1.02),(.35,.22,1.02),.035,'dark')
    cube((.67,0,.61),(.72,.65,.32),'wood',.035);barrel(.65,0,.78,.75)

def cart():
    for y in [-.5,.5]:wheel(.2,y,.33,.32)
    cube((0,0,.55),(1.2,.85,.18),'wood',.03)
    for y in [-.45,.45]:cube((0,y,.77),(1.3,.08,.35),'trim')
    for x in [-.32,.3]:barrel(x,0,.66,.85)
    for y in [-.32,.32]:beam((-.6,y,.5),(-1.3,y,.75),.045,'wood')

# Shared rig. The world-space regular hex projects with 30-degree elevation.
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=32; scene.cycles.use_denoising=True
scene.render.resolution_x=SIZE; scene.render.resolution_y=SIZE; scene.render.resolution_percentage=100; scene.render.film_transparent=True
scene.render.image_settings.file_format='PNG'; scene.render.image_settings.color_mode='RGBA'
scene.view_settings.view_transform='Standard'; scene.view_settings.look='Medium High Contrast'
scene.world.color=(.45,.45,.45)
bpy.ops.object.camera_add(location=(7,-7,6.615)); cam=bpy.context.object; target=Vector((0,0,.9)); cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler(); cam.data.type='ORTHO'; cam.data.ortho_scale=4.7; scene.camera=cam
bpy.ops.object.light_add(type='AREA',location=(-3,-4,8)); light=bpy.context.object; light.data.energy=450; light.data.shape='DISK'; light.data.size=5
# Large fill makes plum roofs and dark trees readable without black faces.
bpy.ops.object.light_add(type='AREA',location=(4,1,6)); bpy.context.object.data.energy=180; bpy.context.object.data.size=5
rig=set(bpy.data.objects)
def render_all():
    for n in NAMES:
        for o in list(bpy.data.objects):
            if o not in rig: bpy.data.objects.remove(o,do_unlink=True)
        random.seed(19+NAMES.index(n))
        if n in NAMES[:8]: terrain(n)
        else:
            cube((0,0,-.035),(200,200,.05),'sand').is_shadow_catcher=True
            prop(n)
        scene.render.filepath=str(OUT / (n+'.png')); bpy.ops.render.render(write_still=True)
p=world_to_camera_view(scene,cam,Vector((0,0,0)))
metadata={'width':SIZE*6,'height':SIZE*4,'cell':SIZE,'columns':6,'anchor':[round(p.x*SIZE,3),round((1-p.y)*SIZE,3)],'groundWidth':round(3.8*SIZE/4.7,3),'groundHeight':round(1.9*math.sqrt(3)*.5*SIZE/4.7,3),'hexOrientation':'pointed left and right, flat top and bottom','sprites':{n:[(i%6)*SIZE,(i//6)*SIZE,SIZE,SIZE] for i,n in enumerate(NAMES)}}
if __name__ == '__main__':
    render_all()
    (ROOT / 'atlas.json').write_text(json.dumps(metadata,indent=2)+'\n')
