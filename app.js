const $=id=>document.getElementById(id);
const video=$("previewVideo"), canvas=$("overlay"), ctx=canvas.getContext("2d");
let videoURL=null,duration=0,clips=[],selected=0,mode="auto",format="9:16",recording=false;
const fmt=t=>{t=Math.max(0,Math.floor(t||0));return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0")};
function setStatus(s){$("status").textContent=s}
function resizeCanvas(){
 const dims=format==="9:16"?[360,640]:format==="1:1"?[480,480]:[640,360];
 canvas.width=dims[0];canvas.height=dims[1];drawFrame();
}
function filterString(){
 const presets={normal:[100,100,100],cinematic:[105,118,88],warm:[108,105,115],cool:[102,108,88],bw:[100,112,0],vivid:[105,120,145]};
 const p=presets[$("filterPreset").value]||presets.normal;
 const b=+$("brightness").value||100,c=+$("contrast").value||100,s=+$("saturation").value||100;
 return `brightness(${b*p[0]/100}%) contrast(${c*p[1]/100}%) saturate(${s*p[2]/100}%)`;
}
function drawFrame(){
 const w=canvas.width,h=canvas.height;ctx.fillStyle="#05070b";ctx.fillRect(0,0,w,h);
 if(video.readyState>=2){
  const vw=video.videoWidth,vh=video.videoHeight,ar=format==="9:16"?9/16:format==="1:1"?1:16/9;
  let sw=vw,sh=vh;if(vw/vh>ar)sw=vh*ar;else sh=vw/ar;
  const zoom=$("zoomCheck").checked?1+0.035*Math.sin(video.currentTime*2):1;sw/=zoom;sh/=zoom;
  ctx.save();ctx.filter=filterString();ctx.drawImage(video,(vw-sw)/2,(vh-sh)/2,sw,sh,0,0,w,h);ctx.restore();
 }
 if($("textCheck").checked&&$("captionText").value.trim()){
  const text=$("captionText").value.trim().toUpperCase(),size=+$("captionSize").value||23;
  const lines=wrapText(text,Math.max(10,Math.floor(570/size))),pos=$("captionPosition").value,lineH=size*1.28,total=lines.length*lineH;
  let y=pos==="top"?45:pos==="center"?(h-total)/2:h-total-65;
  ctx.save();ctx.font=`900 ${size}px Arial`;ctx.textAlign="center";ctx.textBaseline="middle";
  lines.forEach((line,i)=>{const yy=y+i*lineH,tw=ctx.measureText(line).width;
   if($("captionBackground").value!=="none"){ctx.fillStyle=$("captionBackground").value==="highlight"?"#a78bfa":"rgba(5,7,12,.78)";ctx.fillRect(w/2-tw/2-12,yy-lineH*.43,tw+24,lineH*.86)}
   ctx.lineWidth=Math.max(2,size*.16);ctx.strokeStyle="#090a10";ctx.strokeText(line,w/2,yy);ctx.fillStyle=$("captionColor").value||"#fff";ctx.fillText(line,w/2,yy);
  });ctx.restore();
 } 
}
function wrapText(s,max){let words=s.split(/\s+/),out=[],line="";for(const word of words){if((line+" "+word).trim().length>max&&line){out.push(line);line=word}else line=(line+" "+word).trim()}if(line)out.push(line);return out.slice(0,4)}
function updateTransport(){if(!duration)return;$("timeReadout").textContent=fmt(video.currentTime)+" / "+fmt(duration);$("seek").value=video.currentTime/duration*100;drawFrame()}
function renderClips(){
 const root=$("clips");$("clipTotal").textContent=clips.length+" clips";
 if(!clips.length){root.className="clips-empty";root.textContent="Tus clips aparecerán aquí cuando analices el vídeo.";return}
 root.className="";
 root.innerHTML=clips.map((c,i)=>`<div class="clip-row ${i===selected?'selected':''}"><span class="clip-number">${String(i+1).padStart(2,"0")}</span><div class="clip-details"><b>Clip ${i+1}</b><small>${fmt(c.start)} – ${fmt(c.end)} · ${Math.round(c.end-c.start)} s</small></div><button data-preview="${i}">Ver</button><button data-delete="${i}">×</button></div>`).join("");
 root.querySelectorAll("[data-preview]").forEach(b=>b.onclick=()=>selectClip(+b.dataset.preview));
 root.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>{clips.splice(+b.dataset.delete,1);selected=Math.max(0,Math.min(selected,clips.length-1));renderClips();syncExport()});
}
function syncExport(){$("exportBtn").disabled=!videoURL||!clips.length||recording}
function selectClip(i){selected=i;const c=clips[i];if(!c)return;video.currentTime=c.start;renderClips();updateTransport();syncExport()}
$("videoFile").addEventListener("change",e=>loadFile(e.target.files[0]));
function seekTo(time){
 const target=Math.max(0,Math.min(time,Math.max(0,duration-.05)));
 if(!video.seeking&&Math.abs(video.currentTime-target)<.05)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  let done=false;
  const cleanup=()=>{clearTimeout(timer);video.removeEventListener("seeked",finish);video.removeEventListener("error",fail)};
  const finish=()=>{if(done)return;done=true;cleanup();resolve()};
  const fail=()=>{if(done)return;done=true;cleanup();reject(new Error("No se pudo cambiar el punto del vídeo."))};
  const timer=setTimeout(()=>{if(done)return;done=true;cleanup();reject(new Error("El vídeo tardó demasiado en avanzar."))},10000);
  video.addEventListener("seeked",finish,{once:true});video.addEventListener("error",fail,{once:true});video.currentTime=target;
 });
}
function loadFile(file){
 if(!file){setStatus("No se ha seleccionado ningún archivo.");return}
 const ext=/\.(mp4|mov|webm|m4v|ogv|ogg|mkv|avi|mpeg|mpg)$/i;
 const valid=(file.type&&file.type.startsWith("video/"))||ext.test(file.name||"");
 if(!valid){setStatus("El archivo no parece un vídeo. Prueba con MP4, MOV o WebM.");return}
 if(videoURL)URL.revokeObjectURL(videoURL);
 videoURL=URL.createObjectURL(file);video.pause();video.src=videoURL;video.load();
 $("fileName").textContent=file.name;$("fileInfo").classList.remove("hidden");$("placeholder").classList.add("hidden");
 $("analyzeBtn").disabled=false;$("playBtn").disabled=false;$("seek").disabled=false;
 setStatus("Vídeo cargado. Esperando vista previa…");
}
$("removeVideo").onclick=()=>{video.pause();video.removeAttribute("src");video.load();if(videoURL)URL.revokeObjectURL(videoURL);videoURL=null;clips=[];duration=0;$("fileInfo").classList.add("hidden");$("placeholder").classList.remove("hidden");$("durationLabel").textContent="SIN VÍDEO";$("analyzeBtn").disabled=true;$("playBtn").disabled=true;$("seek").disabled=true;renderClips();syncExport();setStatus("Sube un vídeo para empezar.")};
video.addEventListener("loadedmetadata",()=>{duration=video.duration;$("fileMeta").textContent=fmt(duration);$("durationLabel").textContent=fmt(duration);$("endAt").value=Math.min(30,Math.floor(duration));$("seek").max=100;updateTransport();drawFrame()});
video.addEventListener("timeupdate",updateTransport);video.addEventListener("seeked",drawFrame);video.addEventListener("play",()=>{$("playBtn").textContent="Ⅱ";animate()});video.addEventListener("pause",()=>{$("playBtn").textContent="▶";drawFrame()});
function animate(){if(video.paused||video.ended)return;drawFrame();requestAnimationFrame(animate)}
$("playBtn").onclick=()=>video.paused?video.play():video.pause();
$("seek").oninput=()=>{if(duration)video.currentTime=duration*(+$("seek").value/100)};
document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll(".mode").forEach(x=>x.classList.toggle("active",x===b));$("autoControls").classList.toggle("hidden",mode!=="auto");$("manualControls").classList.toggle("hidden",mode!=="manual");$("analyzeBtn").innerHTML=mode==="auto"?"✦ Encontrar momentos":"✦ Crear propuesta"});
document.querySelectorAll(".format").forEach(b=>b.onclick=()=>{format=b.dataset.format;document.querySelectorAll(".format").forEach(x=>x.classList.toggle("active",x===b));resizeCanvas()});
["captionText","captionPosition","zoomCheck","textCheck","styleSelect","filterPreset","brightness","contrast","saturation","captionSize","captionColor","captionBackground"].forEach(id=>$(id).addEventListener("input",()=>{if(["brightness","contrast","saturation"].includes(id))$(id+"Value").textContent=$(id).value+"%";if(id==="captionSize")$("captionSizeValue").textContent=$("captionSize").value+" px";drawFrame()}));
$("playbackSpeed").addEventListener("change",()=>{video.playbackRate=+$("playbackSpeed").value||1});
$("resetEdits").onclick=()=>{$("filterPreset").value="normal";$("brightness").value=100;$("contrast").value=100;$("saturation").value=100;$("playbackSpeed").value=1;$("captionSize").value=23;$("captionColor").value="#ffffff";$("captionBackground").value="none";$("captionPosition").value="bottom";$("zoomCheck").checked=true;$("textCheck").checked=true;video.playbackRate=1;["brightness","contrast","saturation"].forEach(id=>$(id+"Value").textContent="100%");$("captionSizeValue").textContent="23 px";drawFrame()};
$("analyzeBtn").onclick=async()=>{
 if(!videoURL||!Number.isFinite(duration)||duration<=0){setStatus("Espera a que el vídeo termine de cargarse.");return}
 clips=[];if(mode==="manual"){addManual();return}
 $("analyzeBtn").disabled=true;setStatus("Preparando análisis visual…");
 const oldRate=video.playbackRate,oldMuted=video.muted;
 try{
  const scanCanvas=document.createElement("canvas"),scanCtx=scanCanvas.getContext("2d",{willReadFrequently:true});
  scanCanvas.width=80;scanCanvas.height=45;
  const samples=[];let previous=null,lastSample=-1,lastStatus=0;
  video.pause();video.playbackRate=2;video.muted=true;await seekTo(0);await video.play();
  await new Promise((resolve,reject)=>{
   let raf=0;
   const cleanup=()=>{cancelAnimationFrame(raf);video.removeEventListener("error",fail)};
   const fail=()=>{cleanup();reject(new Error("Error leyendo el vídeo"))};
   video.addEventListener("error",fail,{once:true});
   const tick=()=>{
    if(video.ended||video.currentTime>=duration-.05){cleanup();resolve();return}
    const t=video.currentTime;
    if(t-lastSample>=.8&&video.readyState>=2){
     scanCtx.drawImage(video,0,0,80,45);
     const pixels=scanCtx.getImageData(0,0,80,45).data;let diff=0;
     if(previous){let n=0;for(let j=0;j<pixels.length;j+=16){diff+=Math.abs(pixels[j]-previous[j])+Math.abs(pixels[j+1]-previous[j+1])+Math.abs(pixels[j+2]-previous[j+2]);n+=3}diff/=n}
     samples.push({time:t,motion:diff});previous=pixels;lastSample=t;
     if(t-lastStatus>=5){setStatus("Analizando el vídeo… "+Math.min(100,Math.round(t/duration*100))+"%");lastStatus=t}
    }
    raf=requestAnimationFrame(tick);
   };
   raf=requestAnimationFrame(tick);
  });
  video.pause();video.playbackRate=oldRate;video.muted=oldMuted;await seekTo(0);
  if(samples.length<2)throw new Error("No se han podido leer suficientes imágenes");
  const target=Math.min(+$("clipLength").value||30,duration),count=Math.min(50,+$("clipCount").value||5);
  const stride=Math.max(1.5,Math.min(4,target/5)),candidates=[];
  for(let startAt=0;startAt+target<=duration+.01;startAt+=stride){
   const endAt=Math.min(duration,startAt+target),values=samples.filter(x=>x.time>=startAt&&x.time<=endAt).map(x=>x.motion);
   if(!values.length)continue;
   const mean=values.reduce((a,b)=>a+b,0)/values.length;
   const variance=values.reduce((a,b)=>a+(b-mean)**2,0)/values.length;
   const peak=Math.max(...values);
   const score=mean+Math.sqrt(variance)*.35+peak*.12;
   candidates.push({start:startAt,end:endAt,score});
  }
  if(!candidates.length)candidates.push({start:0,end:duration,score:0});
  candidates.sort((a,b)=>b.score-a.score);
  const chosen=[];
  for(const c of candidates){
   if(chosen.length>=count)break;
   const overlaps=chosen.some(x=>Math.max(0,Math.min(x.end,c.end)-Math.max(x.start,c.start))>target*.35);
   if(!overlaps)chosen.push(c);
  }
  for(const c of candidates){if(chosen.length>=count)break;if(!chosen.some(x=>Math.abs(x.start-c.start)<1))chosen.push(c)}
  clips=chosen.sort((a,b)=>a.start-b.start);selected=0;renderClips();if(clips.length)selectClip(0);
  setStatus("Análisis terminado: clips ordenados por movimiento y cambios visuales. Revisa los mejores momentos.");
 }catch(err){
  video.pause();video.playbackRate=oldRate;video.muted=oldMuted;
  setStatus("No se pudo analizar el vídeo. Prueba con MP4 o WebM.");console.error(err);
 }finally{$("analyzeBtn").disabled=false}
};
function addManual(){let start=Math.max(0,+$("startAt").value||0),end=Math.min(duration,+$("endAt").value||0);if(end<=start){setStatus("El final debe ser posterior al inicio.");return}clips.push({start,end,score:0});clips.sort((a,b)=>a.start-b.start);selected=clips.length-1;renderClips();selectClip(selected);setStatus("Fragmento añadido.");}
$("addManual").onclick=addManual;
async function exportClip(){const c=clips[selected];if(!c||!videoURL)return;const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm";if(!MediaRecorder.isTypeSupported("video/webm")){setStatus("Este navegador no permite exportar WebM. Prueba Chrome o Edge en ordenador.");return}
 recording=true;syncExport();setStatus("Preparando exportación…");video.pause();video.playbackRate=+$("playbackSpeed").value||1;await seekTo(c.start);const stream=canvas.captureStream(24);try{const source=video.captureStream?video.captureStream():video.mozCaptureStream?.();if(source)source.getAudioTracks().forEach(t=>stream.addTrack(t))}catch(e){console.warn("Audio capture unavailable",e)}
 let chunks=[];const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=()=>{const blob=new Blob(chunks,{type:"video/webm"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`clipia-clip-${selected+1}.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);recording=false;syncExport();setStatus("¡Clip exportado! Comprueba el archivo descargado.")};recorder.start(250);video.play();const stop=()=>{if(!recording)return;video.pause();video.playbackRate=1;recorder.stop();stream.getTracks().forEach(t=>t.stop())};const check=()=>{if(video.currentTime>=c.end||video.ended){stop()}else if(recording)requestAnimationFrame(check)};video.addEventListener("timeupdate",()=>{if(video.currentTime>=c.end)stop()},{once:false});setTimeout(()=>{if(recording)stop()},Math.max(1000,(c.end-c.start)*1000+1500));requestAnimationFrame(check);setStatus("Exportando clip… no cierres esta pestaña.");}
$("exportBtn").onclick=exportClip;
const drop=$("dropZone");drop.addEventListener("dragover",e=>{e.preventDefault();drop.style.borderColor="#a78bfa"});drop.addEventListener("dragleave",()=>drop.style.borderColor="");drop.addEventListener("drop",e=>{e.preventDefault();drop.style.borderColor="";loadFile(e.dataTransfer.files[0])});
renderClips();resizeCanvas();