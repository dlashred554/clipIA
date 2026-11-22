const $=id=>document.getElementById(id);
const video=$("previewVideo"), canvas=$("overlay"), ctx=canvas.getContext("2d");
let videoURL=null,duration=0,clips=[],selected=0,mode="auto",format="9:16",recording=false;
const fmt=t=>{t=Math.max(0,Math.floor(t||0));return String(Math.floor(t/60)).padStart(2,"0")+":"+String(t%60).padStart(2,"0")};
function setStatus(s){$("status").textContent=s}
function resizeCanvas(){
 const dims=format==="9:16"?[360,640]:format==="1:1"?[480,480]:[640,360];
 canvas.width=dims[0];canvas.height=dims[1];drawFrame();
}
function drawFrame(){
 const w=canvas.width,h=canvas.height;
 ctx.fillStyle="#05070b";ctx.fillRect(0,0,w,h);
 if(video.readyState>=2){
  const vw=video.videoWidth,vh=video.videoHeight,ar=format==="9:16"?9/16:format==="1:1"?1:16/9;
  let sw=vw,sh=vh;if(vw/vh>ar)sw=vh*ar;else sh=vw/ar;
  const zoom=$("zoomCheck").checked?1+0.035*Math.sin(video.currentTime*2):1;
  sw/=zoom;sh/=zoom;
  ctx.drawImage(video,(vw-sw)/2,(vh-sh)/2,sw,sh,0,0,w,h);
 }
 if($("textCheck").checked && $("captionText").value.trim()){
  const text=$("captionText").value.trim().toUpperCase();
  const lines=wrapText(text,25), pos=$("captionPosition").value;
  const lineH=31,total=lines.length*lineH;
  let y=pos==="top"?45:pos==="center"?(h-total)/2: h-total-65;
  ctx.font='bold 23px Arial';ctx.textAlign="center";ctx.textBaseline="middle";
  lines.forEach((line,i)=>{ctx.lineWidth=5;ctx.strokeStyle="#090a10";ctx.strokeText(line,w/2,y+i*lineH);ctx.fillStyle="#fff";ctx.fillText(line,w/2,y+i*lineH)});
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
function loadFile(file){if(!file)return;if(!file.type.startsWith("video/")){setStatus("Selecciona un archivo de vídeo.");return}if(videoURL)URL.revokeObjectURL(videoURL);videoURL=URL.createObjectURL(file);video.src=videoURL;video.load();$("fileName").textContent=file.name;$("fileInfo").classList.remove("hidden");$("placeholder").classList.add("hidden");$("analyzeBtn").disabled=false;$("playBtn").disabled=false;$("seek").disabled=false;setStatus("Vídeo cargado. Elige automático o manual.");}
$("removeVideo").onclick=()=>{video.pause();video.removeAttribute("src");video.load();if(videoURL)URL.revokeObjectURL(videoURL);videoURL=null;clips=[];duration=0;$("fileInfo").classList.add("hidden");$("placeholder").classList.remove("hidden");$("durationLabel").textContent="SIN VÍDEO";$("analyzeBtn").disabled=true;$("playBtn").disabled=true;$("seek").disabled=true;renderClips();syncExport();setStatus("Sube un vídeo para empezar.")};
video.addEventListener("loadedmetadata",()=>{duration=video.duration;$("fileMeta").textContent=fmt(duration);$("durationLabel").textContent=fmt(duration);$("endAt").value=Math.min(30,Math.floor(duration));$("seek").max=100;updateTransport();drawFrame()});
video.addEventListener("timeupdate",updateTransport);video.addEventListener("seeked",drawFrame);video.addEventListener("play",()=>{$("playBtn").textContent="Ⅱ";animate()});video.addEventListener("pause",()=>{$("playBtn").textContent="▶";drawFrame()});
function animate(){if(video.paused||video.ended)return;drawFrame();requestAnimationFrame(animate)}
$("playBtn").onclick=()=>video.paused?video.play():video.pause();
$("seek").oninput=()=>{if(duration)video.currentTime=duration*(+$("seek").value/100)};
document.querySelectorAll(".mode").forEach(b=>b.onclick=()=>{mode=b.dataset.mode;document.querySelectorAll(".mode").forEach(x=>x.classList.toggle("active",x===b));$("autoControls").classList.toggle("hidden",mode!=="auto");$("manualControls").classList.toggle("hidden",mode!=="manual");$("analyzeBtn").innerHTML=mode==="auto"?"✦ Encontrar momentos":"✦ Crear propuesta"});
document.querySelectorAll(".format").forEach(b=>b.onclick=()=>{format=b.dataset.format;document.querySelectorAll(".format").forEach(x=>x.classList.toggle("active",x===b));resizeCanvas()});
["captionText","captionPosition","zoomCheck","textCheck","styleSelect"].forEach(id=>$(id).addEventListener("input",drawFrame));
$("analyzeBtn").onclick=async()=>{if(!videoURL)return;clips=[];if(mode==="manual"){addManual();return}setStatus("Analizando el audio localmente…");$("analyzeBtn").disabled=true;
 try{
  const scanCanvas=document.createElement("canvas"),scanCtx=scanCanvas.getContext("2d",{willReadFrequently:true});scanCanvas.width=64;scanCanvas.height=36;
  const samples=[];let previous=null;
  for(let t=0;t<duration;t+=1){
   video.currentTime=Math.min(t,Math.max(0,duration-.05));
   await new Promise(resolve=>video.addEventListener("seeked",resolve,{once:true}));
   scanCtx.drawImage(video,0,0,64,36);const pixels=scanCtx.getImageData(0,0,64,36).data;let diff=0;
   if(previous){for(let j=0;j<pixels.length;j+=16)diff+=Math.abs(pixels[j]-previous[j])+Math.abs(pixels[j+1]-previous[j+1])+Math.abs(pixels[j+2]-previous[j+2]);}
   samples.push(diff);previous=pixels;
   setStatus("Analizando imágenes… "+Math.min(100,Math.round(t/duration*100))+"%");
  }
  const target=+$("clipLength").value,count=+$("clipCount").value,possible=Math.max(1,Math.ceil(duration/target));let candidates=[];
  for(let k=0;k<possible;k++){let start=Math.min(k*target,Math.max(0,duration-Math.min(target,duration))),end=Math.min(duration,start+target),score=0;for(let j=Math.floor(start);j<Math.ceil(end);j++)score+=samples[j]||0;candidates.push({start,end,score:score/Math.max(1,Math.ceil(end)-Math.floor(start))})}
  candidates.sort((a,b)=>b.score-a.score);clips=candidates.slice(0,Math.min(count,candidates.length)).sort((a,b)=>a.start-b.start);selected=0;renderClips();if(clips.length)selectClip(0);setStatus("Análisis visual terminado. Son sugerencias basadas en cambios de escena, no una predicción de viralidad.");
 }catch(err){setStatus("No se pudo analizar este vídeo. Prueba con otro formato o crea los cortes manualmente.");console.error(err)}finally{$("analyzeBtn").disabled=false}};
function addManual(){let start=Math.max(0,+$("startAt").value||0),end=Math.min(duration,+$("endAt").value||0);if(end<=start){setStatus("El final debe ser posterior al inicio.");return}clips.push({start,end,score:0});clips.sort((a,b)=>a.start-b.start);selected=clips.length-1;renderClips();selectClip(selected);setStatus("Fragmento añadido.");}
$("addManual").onclick=addManual;
async function exportClip(){const c=clips[selected];if(!c||!videoURL)return;const mime=MediaRecorder.isTypeSupported("video/webm;codecs=vp9")?"video/webm;codecs=vp9":"video/webm";if(!MediaRecorder.isTypeSupported("video/webm")){setStatus("Este navegador no permite exportar WebM. Prueba Chrome o Edge en ordenador.");return}
 recording=true;syncExport();setStatus("Preparando exportación…");video.pause();video.currentTime=c.start;await new Promise(resolve=>video.addEventListener("seeked",resolve,{once:true}));const stream=canvas.captureStream(30);try{const source=video.captureStream?video.captureStream():video.mozCaptureStream?.();if(source)source.getAudioTracks().forEach(t=>stream.addTrack(t))}catch(e){console.warn("Audio capture unavailable",e)}
 let chunks=[];const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:5000000});recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data)};recorder.onstop=()=>{const blob=new Blob(chunks,{type:"video/webm"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`clipia-clip-${selected+1}.webm`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);recording=false;syncExport();setStatus("¡Clip exportado! Comprueba el archivo descargado.")};recorder.start(250);video.play();const stop=()=>{if(!recording)return;video.pause();recorder.stop();stream.getTracks().forEach(t=>t.stop())};const check=()=>{if(video.currentTime>=c.end||video.ended){stop()}else if(recording)requestAnimationFrame(check)};video.addEventListener("timeupdate",()=>{if(video.currentTime>=c.end)stop()},{once:false});setTimeout(()=>{if(recording)stop()},Math.max(1000,(c.end-c.start)*1000+1500));requestAnimationFrame(check);setStatus("Exportando clip… no cierres esta pestaña.");}
$("exportBtn").onclick=exportClip;
const drop=$("dropZone");drop.addEventListener("dragover",e=>{e.preventDefault();drop.style.borderColor="#a78bfa"});drop.addEventListener("dragleave",()=>drop.style.borderColor="");drop.addEventListener("drop",e=>{e.preventDefault();drop.style.borderColor="";loadFile(e.dataTransfer.files[0])});
renderClips();resizeCanvas();