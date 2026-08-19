"use strict";

window.FenixAssetManager=(()=>{
  const VERSION=1;
  const ROLES=Object.freeze(["content","gameplay","deco"]);
  const clone=value=>value==null?value:typeof structuredClone==="function"?structuredClone(value):JSON.parse(JSON.stringify(value));
  const normalizeTags=value=>[...new Set((Array.isArray(value)?value:[]).map(tag=>String(tag||"").trim().toLowerCase()).filter(Boolean))];
  const readDataUrl=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error||new Error("Nie udało się odczytać pliku."));reader.readAsDataURL(file)});
  const readDimensions=dataUrl=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve({width:image.naturalWidth||image.width,height:image.naturalHeight||image.height});image.onerror=()=>reject(new Error("Nie udało się odczytać wymiarów obrazu."));image.src=dataUrl});
  const validator=()=>window.FenixAssetValidator||null;
  function assets(projectId){return FenixCore.listAssets(projectId)}
  function duplicateOf(file,projectId){return assets(projectId).find(asset=>asset.filename===file.name&&Number(asset.sizeBytes)===Number(file.size)&&String(asset.mime||"")===String(file.type||""))||null}
  async function importFiles(files,{projectId=FenixCore.getActiveProjectId(),source="imported",validate=true}={}){
    const list=[...(files||[])],summary={added:0,duplicates:0,failed:0,assets:[],errors:[]};
    for(const file of list){try{
      if(duplicateOf(file,projectId)){summary.duplicates++;continue}
      const v=validator();if(v&&Array.isArray(v.SUPPORTED)&&!v.SUPPORTED.includes(file.type))throw new Error("Nieobsługiwany format. Użyj PNG, JPG/JPEG, WEBP albo SVG.");
      const dataUrl=await readDataUrl(file),dimensions=await readDimensions(dataUrl),base={name:file.name.replace(/\.[^.]+$/,"")||"Asset",filename:file.name,mime:file.type||"image/png",dataUrl,source,width:dimensions.width,height:dimensions.height,sizeBytes:file.size,aspectRatio:dimensions.width&&dimensions.height?Number((dimensions.width/dimensions.height).toFixed(4)):null,tags:[]};
      const validation=validate&&v?await v.validate(base):{status:"warning",messages:["Asset nie był jeszcze walidowany."],metrics:{}};
      const saved=FenixCore.putAsset({...base,validation});summary.assets.push(saved);summary.added++;
    }catch(error){summary.failed++;summary.errors.push({file:file?.name||"Asset",message:String(error?.message||error)})}}
    return summary
  }
  function toggleRole(id,role){if(!ROLES.includes(role))return false;const asset=FenixCore.getAsset(id);if(!asset)return false;const tags=new Set(normalizeTags(asset.tags));tags.has(role)?tags.delete(role):tags.add(role);return FenixCore.updateAsset(id,{tags:[...tags]})}
  function setRole(id,role,enabled=true){if(!ROLES.includes(role))return false;const asset=FenixCore.getAsset(id);if(!asset)return false;const tags=new Set(normalizeTags(asset.tags));enabled?tags.add(role):tags.delete(role);return FenixCore.updateAsset(id,{tags:[...tags]})}
  function bulkRole(ids,role){const list=[...new Set(ids||[])].map(id=>FenixCore.getAsset(id)).filter(Boolean);if(!list.length||!ROLES.includes(role))return[];const remove=list.every(asset=>normalizeTags(asset.tags).includes(role));return list.map(asset=>setRole(asset.id,role,!remove)).filter(Boolean)}
  function clearRoles(ids){return [...new Set(ids||[])].map(id=>FenixCore.updateAsset(id,{tags:[]})).filter(Boolean)}
  function rename(id,name){const clean=String(name||"").trim();return clean?FenixCore.updateAsset(id,{name:clean}):false}
  function valueContainsAssetRef(value,id,seen=new Set()){if(value==null)return false;if(typeof value==="string")return value===id;if(typeof value!=="object")return false;if(seen.has(value))return false;seen.add(value);if(Array.isArray(value))return value.some(item=>valueContainsAssetRef(item,id,seen));if(value.assetRef===id||value.assetId===id)return true;return Object.values(value).some(item=>valueContainsAssetRef(item,id,seen))}
  function usage(id,projectId=FenixCore.getActiveProjectId()){const project=FenixCore.getProjects().find(item=>item.id===projectId);if(!project)return[];return (project.pages||[]).filter(page=>valueContainsAssetRef(page,id)).map(page=>({id:page.id,title:page.title||"Strona",module:page.module||page.recipe?.module||"unknown"}))}
  function remove(id,{force=false}={}){const project=FenixCore.getActiveProject(),used=usage(id,project.id);if(used.length&&!force)return{removed:false,reason:"in-use",usage:used};if(!project.assets?.[id])return{removed:false,reason:"missing",usage:used};const next=clone(project.assets);delete next[id];FenixCore.updateProject(project.id,{assets:next});return{removed:true,usage:used}}
  async function revalidate(id){const asset=FenixCore.getAsset(id),v=validator();if(!asset||!v)return false;const validation=await v.validate(asset);return FenixCore.updateAsset(id,{validation})}
  async function revalidateAll(projectId=FenixCore.getActiveProjectId()){const out={total:0,ok:0,warning:0,error:0};for(const asset of assets(projectId)){const updated=await revalidate(asset.id);if(!updated)continue;out.total++;const status=updated.validation?.status||"warning";out[status]=(out[status]||0)+1}return out}
  function filter({query="",role="",status="",sort="newest",projectId=FenixCore.getActiveProjectId()}={}){const q=String(query).trim().toLowerCase(),r=String(role).trim().toLowerCase(),st=String(status).trim().toLowerCase();let list=assets(projectId).filter(asset=>(!q||`${asset.name} ${asset.filename} ${(asset.tags||[]).join(" ")}`.toLowerCase().includes(q))&&(!r||(asset.tags||[]).includes(r))&&(!st||String(asset.validation?.status||"warning").toLowerCase()===st));list=[...list].sort((a,b)=>sort==="name"?String(a.name).localeCompare(String(b.name),"pl",{sensitivity:"base"}):sort==="oldest"?String(a.createdAt).localeCompare(String(b.createdAt)):String(b.createdAt).localeCompare(String(a.createdAt)));return list}
  function library(projectId=FenixCore.getActiveProjectId()){const seen=new Set(),out=[];for(const project of FenixCore.getProjects())for(const asset of Object.values(project.assets||{})){const key=asset.dataUrl||`${asset.filename}|${asset.sizeBytes}`;if(seen.has(key))continue;seen.add(key);out.push({...clone(asset),_projectId:project.id,_projectName:project.name,_active:project.id===projectId})}return out}
  return Object.freeze({VERSION,ROLES,assets,duplicateOf,importFiles,toggleRole,setRole,bulkRole,clearRoles,rename,usage,remove,revalidate,revalidateAll,filter,library});
})();
