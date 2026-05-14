var MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function hoy(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
document.getElementById('fecha').value=hoy();
document.getElementById('fn').addEventListener('change',function(){
  var fn=this.value;
  if(!fn){document.getElementById('edn').textContent='-';return;}
  var p=fn.split('-');
  var hoyD=new Date();
  var nac=new Date(parseInt(p[0]),parseInt(p[1])-1,parseInt(p[2]));
  var a=hoyD.getFullYear()-nac.getFullYear();
  var m=hoyD.getMonth()-nac.getMonth();
  if(m<0||(m===0&&hoyD.getDate()<nac.getDate()))a--;
  document.getElementById('edn').textContent=a;
});
function fL(s){if(!s)return'';var p=s.split('-');return parseInt(p[2])+' de '+MES[parseInt(p[1])-1]+' de '+p[0];}
function fC(s){if(!s)return'';var p=s.split('-');return parseInt(p[2])+'/'+parseInt(p[1])+'/'+p[0];}
var _r={};
function generar(){
  var nombre=document.getElementById('nombre').value.trim().toUpperCase();
  var fn=document.getElementById('fn').value;
  var fecha=document.getElementById('fecha').value;
  var edad=document.getElementById('edn').textContent;
  var mn=document.getElementById('mn').value.trim().toUpperCase();
  var mi=document.getElementById('mi').value.trim();
  var mc=document.getElementById('mc').value.trim();
  if(!nombre){toast('Ingresa el nombre');return;}
  if(!fn){toast('Ingresa fecha de nacimiento');return;}
  if(!mn){toast('Ingresa el medicamento');return;}
  document.getElementById('rf').textContent='CDMX a '+fL(fecha);
  document.getElementById('rn').textContent='Nombre: '+nombre;
  document.getElementById('re').textContent='Edad: '+edad+' anos          FN: '+fC(fn);
  var h='<div class="rmed-bloque"><div class="rmed-nombre">1.- '+mn+'</div>';
  if(mi)h+='<div class="rmed-ind">'+mi+'</div>';
  if(mc)h+='<div class="rmed-cant">('+mc.replace(/^[(]|[)]$/g,'')+')</div>';
  h+='</div>';
  document.getElementById('rm').innerHTML=h;
  _r={nombre:nombre,fn:fn,fecha:fecha,edad:edad,mn:mn,mi:mi,mc:mc};
  document.getElementById('ov').classList.add('active');
  document.getElementById('ov').scrollTop=0;
}
function cerrar(){document.getElementById('ov').classList.remove('active');}
function compartir(){
  var nl=String.fromCharCode(10);
  var txt='RECETA MEDICA'+nl+'Dr. Pablo Vidal Gonzalez'+nl+'CDMX a '+fL(_r.fecha)+nl+nl;
  txt+='Nombre: '+_r.nombre+nl+'Edad: '+_r.edad+' anos   FN: '+fC(_r.fn)+nl+nl;
  txt+='1.- '+_r.mn+nl;
  if(_r.mi)txt+=_r.mi+nl;
  if(_r.mc)txt+='('+_r.mc.replace(/^[(]|[)]$/g,'')+')'+ nl;
  if(navigator.share)navigator.share({title:'Receta - '+_r.nombre,text:txt});
  else navigator.clipboard.writeText(txt).then(function(){toast('Copiado');});
}
function toast(msg){var t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},2600);}
