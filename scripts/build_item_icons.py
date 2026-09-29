"""Build tiny original pixel-style SVG item icons used by the shop and bag."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
out=root/'assets/items';out.mkdir(parents=True,exist_ok=True)
db=json.loads((root/'data/pokedex.json').read_text())
def svg(body,name):
 (out/(name+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><path fill="#22354c" d="M8 2h16v2h4v4h2v16h-2v4h-4v2H8v-2H4v-4H2V8h2V4h4z"/><path fill="#fff9e8" d="M8 4h16v2h4v20h-4v2H8v-2H4V6h4z"/>'+body+'</svg>')
for key,red,blue in [('ball','#d9564e','#f2eee5'),('great-ball','#4374c4','#e46055'),('ultra-ball','#f2c354','#343e59')]:
 svg(f'<path fill="{red}" d="M8 6h16v2h3v7H5V8h3z"/><path fill="{blue}" d="M6 18h20v7H6z"/><path fill="#273b53" d="M5 15h22v3H5z"/><path fill="#f5f1df" stroke="#273b53" stroke-width="2" d="M13 12h6v9h-6z"/><path fill="#fff" d="M9 8h5v2H9z"/>',key)
svg('<path fill="#91b8a8" d="M10 4h12v4H10z"/><path fill="#4d7f9f" d="M8 8h16v18H8z"/><path fill="#b9dfdb" d="M10 10h12v14H10z"/><path fill="#e75c57" d="M14 12h4v10h-4zM11 15h10v4H11z"/>','medicine')
svg('<path fill="#528b55" d="M16 5h3v5h-3zM14 8h8v2h-8z"/><path fill="#a0ca62" d="M10 10h12v3h3v10h-3v3H10v-3H7V13h3z"/><path fill="#e97664" d="M10 14h12v9H10z"/><path fill="#f9c581" d="M11 14h4v3h-4z"/>','berry')
svg('<path fill="#b0b9c7" d="M12 7h4v10h-4zM17 5h4v13h-4zM22 8h4v11h-4z"/><path fill="#64768e" d="M13 17h13v3h-3v3h-4v3h-7v-4h-2v-3h3z"/><path fill="#f7e9cc" d="M15 18h6v2h-6z"/>','claw')
svg('<path fill="#a56cbd" d="M8 9h16v3h3v11h-3v3H8v-3H5V12h3z"/><path fill="#f1d890" d="M10 12h12v10H10z"/><path fill="#d78571" d="M14 13h4v9h-4z"/>','band')
svg('<path fill="#ba9d61" d="M13 5h6v5h-6z"/><path fill="#6bbcc4" d="M11 10h10v3h3v8h-3v3H11v-3H8v-8h3z"/><path fill="#e1f6ec" d="M12 13h7v3h-7z"/>','held')
svg('<path fill="#8e6ba6" d="M15 5h3v3h4v4h3v7h-3v4h-4v3h-5v-3H9v-4H6v-7h3V8h6z"/><path fill="#e6adf2" d="M13 9h7v3h3v7h-3v3h-7v-3h-3v-7h3z"/><path fill="#fff7f8" d="M14 12h4v4h-4z"/>','evolution')
svg('<path fill="#b8b2dc" d="M9 7h14v4h3v14H6V11h3z"/><path fill="#5c70ba" d="M9 9h14v14H9z"/><path fill="#fff0a0" d="M14 11h4v10h-4zM11 14h10v4H11z"/>','ability')
svg('<path fill="#f7c35f" d="M14 5h4v8h7v4h-7v8h-4v-8H7v-4h7z"/><path fill="#fff4ba" d="M15 9h2v12h-2zM11 14h10v2H11z"/><path fill="#d98abf" d="M7 7h2v2H7zM23 22h2v2h-2z"/>','shiny')
colors={1:'#b8ab8d',2:'#b45644',3:'#7e9bc4',4:'#b569bb',5:'#bc9958',6:'#997b59',7:'#8cba60',8:'#8b76bb',9:'#82a9ae',10:'#ed8056',11:'#65a6dc',12:'#83bd64',13:'#edc853',14:'#cb87bb',15:'#8bcdd8',16:'#8380bb',17:'#746c62'}
for n,color in colors.items():svg(f'<path fill="{color}" d="M7 6h18v3h3v16h-3v3H7v-3H4V9h3z"/><path fill="#f5f1da" d="M9 9h14v14H9z"/><path fill="{color}" d="M12 12h8v3h-2v6h-4v-6h-2z"/>',f'tm-{n}')
print('Generated',len(list(out.glob('*.svg'))),'local icons')
