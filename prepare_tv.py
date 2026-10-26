from pathlib import Path
from xml.etree import ElementTree as ET
from PIL import Image, ImageDraw, ImageFont
manifest=Path('android/app/src/main/AndroidManifest.xml')
ET.register_namespace('android','http://schemas.android.com/apk/res/android')
a='{http://schemas.android.com/apk/res/android}'
tree=ET.parse(manifest); root=tree.getroot()
for name in ('android.software.leanback','android.hardware.touchscreen','android.hardware.gamepad'):
    el=next((e for e in root.findall('uses-feature') if e.get(a+'name')==name),None)
    if el is None: el=ET.Element('uses-feature'); root.insert(0,el)
    el.set(a+'name',name);el.set(a+'required','false')
app=root.find('application');app.set(a+'banner','@drawable/tv_banner')
for activity in app.findall('activity'):
    for f in activity.findall('intent-filter'):
        if any(e.get(a+'name')=='android.intent.action.MAIN' for e in f.findall('action')):
            if not any(e.get(a+'name')=='android.intent.category.LEANBACK_LAUNCHER' for e in f.findall('category')):
                ET.SubElement(f,'category',{a+'name':'android.intent.category.LEANBACK_LAUNCHER'})
tree.write(manifest,encoding='utf-8',xml_declaration=True)
out=Path('android/app/src/main/res/drawable-nodpi/tv_banner.png');out.parent.mkdir(parents=True,exist_ok=True)
im=Image.new('RGB',(320,180),'#050B1B');d=ImageDraw.Draw(im)
d.rounded_rectangle((9,10,310,170),radius=13,outline='#00D5FF',width=3)
try:font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',31)
except OSError: font=ImageFont.load_default()
d.text((26,50),'ALAN ALVES',font=font,fill='white');d.text((123,101),'DEV TV',font=font,fill='#00D5FF');im.save(out)
print('Android TV manifest + banner configured')
