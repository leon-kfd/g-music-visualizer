var e=Object.defineProperty,t=Object.getOwnPropertySymbols,r=Object.prototype.hasOwnProperty,a=Object.prototype.propertyIsEnumerable,n=(t,r,a)=>r in t?e(t,r,{enumerable:!0,configurable:!0,writable:!0,value:a}):t[r]=a,s=(e,s)=>{for(var c in s||(s={}))r.call(s,c)&&n(e,c,s[c]);if(t)for(var c of t(s))a.call(s,c)&&n(e,c,s[c]);return e};import{e as c,r as u,C as i,R as o,l,c as d,a as h}from"./vendor.6a853802.js";const p=new window.AudioContext;var m="_operationWrapper_1q8jp_1",f="_audioWrapper_1q8jp_8",y="_exampleWrapper_1q8jp_13";const{transform:x}=c;function g(e,{x:t,y:r,r:a,shadowColor:n}){const c=n?{shadowColor:n,shadowBlur:16}:{};e.addShape("circle",{attrs:s({x:t,y:r,r:a,fill:"#262626"},c)});const u=e.addShape("image",{attrs:{x:t-a,y:r-a,width:2*a,height:2*a,img:`https://source.unsplash.com/random/${2*a}x${2*a}?Nature`}});u.setClip({type:"circle",attrs:{x:t,y:r,r:a}});const i=u.getMatrix(),o=2*Math.PI;return u.animate((e=>({matrix:x(i,[["t",-t,-r],["r",o*e],["t",t,r]])})),{duration:1e4,repeat:!0}),setTimeout((()=>{u.pauseAnimate()})),u}const E=150,v=150,P=80;function A(e){const t="#e9dcf7",r=u.exports.useRef(),a=u.exports.useRef(),n=u.exports.useRef([]);return u.exports.useEffect((()=>{var t;if(null==(t=e.data)?void 0:t.length){(function(e){return e.reduce(((e,t,r)=>(r%2&&e.push(t),e)),[])})(e.data).map(((e,t)=>{n.current[t].attr("height",e*e/65025*50+4)}))}}),[e.data]),u.exports.useEffect((()=>{r.current=new i({container:"SLine",width:300,height:300}),a.current=g(r.current,{x:E,y:v,r:P,shadowColor:t}),n.current=Array.from({length:64},((e,a)=>{const n=5.625*a-150,s=Math.cos(n*Math.PI/180),c=Math.sin(n*Math.PI/180);return r.current.addShape("rect",{attrs:{width:4,height:4,radius:2,x:E+90*s-2,y:v+90*c-2,fill:t}}).rotateAtPoint(E+90*s,v+90*c,(n-90)*Math.PI/180)}))}),[]),u.exports.useEffect((()=>{setTimeout((()=>{var t,r;e.isPlaying?null==(t=a.current)||t.resumeAnimate():null==(r=a.current)||r.pauseAnimate()}))}),[e.isPlaying]),o.createElement("div",{className:"s-model"},o.createElement("div",{id:"SLine",className:"s-canvas-wrapper"}))}function w(e,t=5,r=.8){if(t<3||t>13||t%2==0)throw new Error("num value muse be singular, num >= 3, num <= 13");return e.map(((a,n)=>{const s=(t-1)/2-n%t,c=e[n+s];return~~(c?c*r**Math.abs(s):a)}))}function M(e,t){"#"===e[0]&&(e=e.slice(1));const r=parseInt(e,16);return`rgba(${r>>16}, ${255&r}, ${r>>8&255}, ${t})`}function S(e,t,r){return`M ${e-r}, ${t}\n  a ${r}, ${r} 0 1, 0 ${2*r}, 0 \n  a ${r}, ${r} 0 1, 0 ${2*-r}, 0`}function R(e){const t=["#e9dcf7","#cdd9f5","#cdf5dd","#f3dfbb"],r=u.exports.useRef(),a=u.exports.useRef(),n=u.exports.useRef([]);function s(e,t=0){const r=5.625*e-150,a=Math.cos(r*Math.PI/180),n=Math.sin(r*Math.PI/180),s=84+t;return[E+a*s,v+n*s]}return u.exports.useEffect((()=>{var t;if(null==(t=e.data)?void 0:t.length){const t=[[],[],[],[]];(function(e){let t=[];return e.map(((e,r)=>{r%2&&t.push(e)})),w(t,5,.75)})(e.data).map(((e,r)=>{t[r%4].push(s(r,e*e/65025*30+4))})),t.map(((e,t)=>{var r;const a=l().x((e=>e[0])).y((e=>e[1])).curve(d)(e);null==(r=n.current[t])||r.attr("path",a)}))}}),[e.data]),u.exports.useEffect((()=>{r.current=new i({container:"SPath",width:300,height:300}),a.current=g(r.current,{x:E,y:v,r:P,shadowColor:t[0]});const e=Array.from({length:16},((e,t)=>s(4*t))),c=l().x((e=>e[0])).y((e=>e[1])).curve(d)(e);Array.from({length:4},((e,a)=>{n.current.push(r.current.addShape("path",{attrs:{stroke:t[a],lineWidth:1,path:c}}))}))}),[]),u.exports.useEffect((()=>{setTimeout((()=>{var t,r;e.isPlaying?null==(t=a.current)||t.resumeAnimate():null==(r=a.current)||r.pauseAnimate()}))}),[e.isPlaying]),o.createElement("div",{className:"s-model"},o.createElement("div",{id:"SPath",className:"s-canvas-wrapper"}))}function N(e){const t=128,r="#e9dcf7",a=u.exports.useRef(),n=u.exports.useRef(),s=u.exports.useRef([]),c=u.exports.useRef();function h(e,t=0){const r=2.8125*e-150,a=Math.cos(r*Math.PI/180),n=Math.sin(r*Math.PI/180),s=90+t;return[E+a*s,v+n*s,a,n]}return u.exports.useEffect((()=>{var r;if((null==(r=e.data)?void 0:r.length)&&c.current){const r=e.data.reduce(((e,t,r)=>r%8?[...e,h(r,t*t/65025*36+4)]:e),[]),a=l().x((e=>e[0])).y((e=>e[1])).curve(d)(r);c.current.attr("path",a),s.current.map(((e,r)=>{const{x:a,y:n}=c.current.getPoint(r/t);e.attr("x",a),e.attr("y",n)}))}}),[e.data]),u.exports.useEffect((()=>{a.current=new i({container:"SPathDot",width:300,height:300}),n.current=g(a.current,{x:E,y:v,r:P,shadowColor:r});const e=Array.from({length:16},((e,t)=>h(8*t))),u=l().x((e=>e[0])).y((e=>e[1])).curve(d)(e);c.current=a.current.addShape("path",{attrs:{lineWidth:1,path:u}}),s.current=Array.from({length:t},((e,n)=>{const{x:s,y:u}=c.current.getPoint(n/t),[,,i,o]=h(n),l=5*i,d=5*o;return a.current.addShape("circle",{attrs:{x:s,y:u,r:1.2,fill:r,shadowColor:"#22aaff",shadowOffsetX:-l,shadowOffsetY:-d,shadowBlur:4}})}))}),[]),u.exports.useEffect((()=>{setTimeout((()=>{var t,r;e.isPlaying?null==(t=n.current)||t.resumeAnimate():null==(r=n.current)||r.pauseAnimate()}))}),[e.isPlaying]),o.createElement("div",{className:"s-model"},o.createElement("div",{id:"SPathDot",className:"s-canvas-wrapper"}))}function I(e){const t=["#81D8F2","#67A1E0","#5263C2","#74E1A5"],r=u.exports.useRef(),a=u.exports.useRef(),n=u.exports.useRef([]);function s(e,t=0){const r=5.625*e-150,a=Math.cos(r*Math.PI/180),n=Math.sin(r*Math.PI/180),s=P+t;return[E+a*s,v+n*s]}return u.exports.useEffect((()=>{var t;if(null==(t=e.data)?void 0:t.length){const t=[[],[],[],[]];(function(e){let t=[];return e.map(((e,r)=>{r%2&&t.push(e)})),w(t,5,.75)})(e.data).map(((e,r)=>{t[r%4].push(s(r,e*e/65025*60))})),t.map(((e,t)=>{const r=l().x((e=>e[0])).y((e=>e[1])).curve(d)(e);n.current[t].attr("path",r)}))}}),[e.data]),u.exports.useEffect((()=>{r.current=new i({container:"SPathFill",width:300,height:300}),a.current=g(r.current,{x:E,y:v,r:P,shadowColor:"#ffffff"}).setZIndex(2);const e=Array.from({length:16},((e,t)=>s(4*t))),c=l().x((e=>e[0])).y((e=>e[1])).curve(d)(e);Array.from({length:4},((e,a)=>{n.current.push(r.current.addShape("path",{attrs:{stroke:t[a],lineWidth:1,path:c,fill:M(t[a],.2)}}).setZIndex(1))}))}),[]),u.exports.useEffect((()=>{setTimeout((()=>{var t,r;e.isPlaying?null==(t=a.current)||t.resumeAnimate():null==(r=a.current)||r.pauseAnimate()}))}),[e.isPlaying]),o.createElement("div",{className:"s-model"},o.createElement("div",{id:"SPathFill",className:"s-canvas-wrapper"}))}function C(e){const t="#fff",r=u.exports.useRef(),a=u.exports.useRef(),n=u.exports.useRef([]),s=u.exports.useRef([]),c=u.exports.useRef([]),l=u.exports.useRef([]),d=u.exports.useRef([]),h=u.exports.useRef(!1);return u.exports.useEffect((()=>{d.current=e.data||[]}),[e.data]),u.exports.useEffect((()=>{if(!r.current){r.current=new i({container:"SCircle",width:300,height:300}),a.current=g(r.current,{x:E,y:v,r:P,shadowColor:"#fcc8d9"});const u=()=>r.current.addShape("path",{attrs:{stroke:t,lineWidth:2,path:S(E,v,P),opacity:0}}),o=()=>r.current.addShape("circle",{attrs:{x:E,y:70,r:5,fill:t,shadowColor:"#e9dcf7",shadowBlur:5,opacity:0}}),h={duration:6e3,easing:"easeLinear",repeat:!0};Array.from({length:3},((t,r)=>{l.current.push(!1),n.current.push(u()),n.current[r].animate((e=>({path:S(E,v,P+80*e),opacity:e>.02&&e<.9?.8-.8*e:0})),h),s.current.push(o()),c.current.push(0),s.current[r].animate((t=>{e.data&&t<.05&&!c.current[r]?c.current[r]=(()=>{const e=d.current||[],t=e.sort(((e,t)=>t-e)).slice(0,10)[~~(10*Math.random())],r=e.findIndex((e=>e===t));return~r?360*r/e.length:1})():t>.9&&(c.current[r]=0);const a=c.current[r]+360*t-180,n=Math.cos(a*Math.PI/180),s=Math.sin(a*Math.PI/180),u=P+80*t;return{x:E+n*u,y:v+s*u,r:5*(1-t/2),opacity:t>.05&&t<.9?.8-.8*t:0}}),h)}))}if(e.isPlaying)for(let e=0;e<n.current.length;e++)l.current[e]?(n.current[e].resumeAnimate(),s.current[e].resumeAnimate()):setTimeout((()=>{h.current&&(n.current[e].resumeAnimate(),s.current[e].resumeAnimate(),l.current[e]=!0)}),2e3*e);else setTimeout((()=>{for(let e=0;e<n.current.length;e++)n.current[e].pauseAnimate(),s.current[e].pauseAnimate()}))}),[e.isPlaying]),u.exports.useEffect((()=>{h.current=e.isPlaying,setTimeout((()=>{var t,r;e.isPlaying?null==(t=a.current)||t.resumeAnimate():null==(r=a.current)||r.pauseAnimate()}))}),[e.isPlaying]),o.createElement("div",{className:"s-model"},o.createElement("div",{id:"SCircle",className:"s-canvas-wrapper"}))}function b(e){const t="#e9dcf7",r=u.exports.useRef(),a=u.exports.useRef(),n=u.exports.useRef(),s=u.exports.useRef([]);function c(e,t=0){const r=5.625*e-150,a=Math.cos(r*Math.PI/180),n=Math.sin(r*Math.PI/180),s=90+t;return[E+a*s,v+n*s]}return u.exports.useEffect((()=>{var t,r;if(null==(t=e.data)?void 0:t.length){const t=[],a=function(e){let t=[];return e.map(((e,r)=>{r%2&&t.push(e)})),w(t,3,.5)}(e.data);a.map(((e,r)=>{const n=c(r,e*e/65025*60),u=c(r,-e*e/65025*12);t[r]=n,t[a.length+r]=u,s.current[r].attr("x1",n[0]),s.current[r].attr("y1",n[1]),s.current[r].attr("x2",u[0]),s.current[r].attr("y2",u[1])}));const u=l().x((e=>e[0])).y((e=>e[1])).curve(d)(t);null==(r=n.current)||r.attr("path",u)}}),[e.data]),u.exports.useEffect((()=>{r.current=new i({container:"SPathDouble",width:300,height:300}),a.current=g(r.current,{x:E,y:v,r:P,shadowColor:t}),n.current=r.current.addShape("path",{attrs:{stroke:t,lineWidth:1,path:S(E,v,90)}}),s.current=Array.from({length:64},((e,a)=>r.current.addShape("line",{attrs:{x1:E,y1:70,x2:E,y2:70,stroke:t,lineWidth:1}})))}),[]),u.exports.useEffect((()=>{setTimeout((()=>{var t,r;e.isPlaying?null==(t=a.current)||t.resumeAnimate():null==(r=a.current)||r.pauseAnimate()}))}),[e.isPlaying]),o.createElement("div",{className:"s-model"},o.createElement("div",{id:"SPathDouble",className:"s-canvas-wrapper"}))}function $(e){const t="#e9dcf7",r=u.exports.useRef(),a=u.exports.useRef(),n=u.exports.useRef([]),s=u.exports.useRef([]);function c(e,t=0){const r=5.625*e-150,a=Math.cos(r*Math.PI/180),n=Math.sin(r*Math.PI/180),s=90+t;return[E+a*s,v+n*s,a,n]}return u.exports.useEffect((()=>{var t,r;(null==(t=e.data)?void 0:t.length)&&(r=e.data,r.reduce(((e,t,r)=>r%2?[...e,t]:e),[])).map(((e,t)=>{const[r,a]=c(t,e*e/65025*24+4);n.current[t].attr("x",r),n.current[t].attr("y",a),s.current[t].attr("x2",r),s.current[t].attr("y2",a)}))}),[e.data]),u.exports.useEffect((()=>{r.current=new i({container:"SDot",width:300,height:300}),a.current=g(r.current,{x:E,y:v,r:P,shadowColor:t}),Array.from({length:64},((e,a)=>{const[u,i,o,l]=c(a),d=~~(5.625*a+210),h=r.current.addShape("circle",{attrs:{x:u,y:i,r:2,fill:t}}),p=r.current.addShape("line",{attrs:{x1:u,y1:i,x2:u,y2:i,lineWidth:2.8,stroke:`l(${d}) 0.3:rgba(255,255,255,0) 1:#e9dcf7`}});n.current.push(h),s.current.push(p)}))}),[]),u.exports.useEffect((()=>{setTimeout((()=>{var t,r;e.isPlaying?null==(t=a.current)||t.resumeAnimate():null==(r=a.current)||r.pauseAnimate()}))}),[e.isPlaying]),o.createElement("div",{className:"s-model"},o.createElement("div",{id:"SDot",className:"s-canvas-wrapper"}))}function T(e){const t=u.exports.useRef(),r=u.exports.useRef(),a=u.exports.useRef([]),n=u.exports.useRef([]),s=u.exports.useRef([]),c=u.exports.useRef(-1),l=u.exports.useRef(),d=u.exports.useRef(!1);return u.exports.useEffect((()=>{if(e.isPlaying&&e.data&&e.data.length){if(l.current)return;l.current=setTimeout((()=>{const t=e.data?e.data.reduce(((e,t,r)=>r%2?[...e,t]:e),[]):[],r=t.sort(((e,t)=>t-e)).slice(0,10)[~~(10*Math.random())],a=t.findIndex((e=>e===r));c.current=a,l.current=0,clearTimeout(l.current)}),300)}}),[e.isPlaying,e.data]),u.exports.useEffect((()=>{t.current||(t.current=new i({container:"SParticle",width:300,height:300}),r.current=g(t.current,{x:E,y:v,r:P,shadowColor:"#fcc8d9"}),Array.from({length:64},((e,r)=>{Array.from({length:12},((e,u)=>{const i=5.625*r-150+10*(Math.random()-.5),o=Math.cos(i*Math.PI/180),l=Math.sin(i*Math.PI/180),d=E+80*o,h=v+80*l,p=t.current.addShape("circle",{attrs:{x:d,y:h,r:.8,fill:"#fff",opacity:0}});p.animate((e=>{const t=5.625*r-150+4*Math.sin(20*e),a=Math.cos(t*Math.PI/180),n=Math.sin(t*Math.PI/180),i=64*r+u;s.current[i]&&(e<.02?s.current[i]=r>=c.current-1&&r<=c.current+1?48:18:e>.98&&(s.current[i]=18));const o=s.current[i]||18;return{x:d+a*e*o,y:h+n*e*o,opacity:1-e}}),{duration:4e3,repeat:!0,easing:"easeSinInOut"}),a.current.push(p),n.current.push(!1),s.current.push(18)}))}))),e.isPlaying?a.current.map(((e,t)=>{n.current[t]?e.resumeAnimate():setTimeout((()=>{d.current&&(e.resumeAnimate(),n.current[t]=!0)}),4e3*Math.random())})):setTimeout((()=>{a.current.map((e=>{e.pauseAnimate()}))}))}),[e.isPlaying]),u.exports.useEffect((()=>{d.current=e.isPlaying,setTimeout((()=>{var t,a;e.isPlaying?null==(t=r.current)||t.resumeAnimate():null==(a=r.current)||a.pauseAnimate()}))}),[e.isPlaying]),o.createElement("div",{className:"s-model"},o.createElement("div",{id:"SParticle",className:"s-canvas-wrapper"}))}const k=new class{constructor(e){this.options=s(s({},{size:128}),e),this.analyser=p.createAnalyser(),this.analyser.fftSize=2*this.options.size,this.gainNode=p.createGain(),this.gainNode.connect(p.destination),this.analyser.connect(this.gainNode),this.options.audioEl&&(this.audioSource=p.createMediaElementSource(this.options.audioEl),this.audioSource.connect(this.analyser)),this.visualArr=new Uint8Array(this.analyser.frequencyBinCount),this.resumeAudioContext()}resumeAudioContext(){if(p){const e=()=>{"suspended"===p.state&&p.resume(),document.removeEventListener("click",e)};document.addEventListener("click",e)}}destory(){var e;this.analyser.disconnect(this.gainNode),null==(e=this.audioSource)||e.disconnect(this.analyser),this.gainNode.disconnect(p.destination)}setAudioEl(e){this.audioSource&&this.audioSource.disconnect(this.analyser),this.audioSource=p.createMediaElementSource(e),this.audioSource.connect(this.analyser)}changeVolumn(e){this.gainNode.gain.value=e}getVisualizeValue(){return this.analyser.getByteFrequencyData(this.visualArr),this.visualArr}};function j(){const e=u.exports.useRef(null);u.exports.useEffect((()=>{k.setAudioEl(e.current)}),[]);const[t,r]=u.exports.useState("Please load a music..."),[a,n]=u.exports.useState(),[s,c]=u.exports.useState([]),[i,l]=u.exports.useState(!1),d=u.exports.useRef(null);let h,p=u.exports.useRef();function x(e){h||(h=e);const t=e-h;(0===t||t>0)&&(c([...k.getVisualizeValue()]),h=e),p.current=requestAnimationFrame(x)}function g(){l(!1),p.current&&cancelAnimationFrame(p.current)}return o.createElement(o.Fragment,null,o.createElement("div",{className:m},o.createElement("button",{className:"btn m10",onClick:async function(){var t;try{const e=await fetch("https://api.uomg.com/api/rand.music?sort=%E7%83%AD%E6%AD%8C%E6%A6%9C&format=json"),{data:t}=await e.json(),{name:a,url:s,artistsname:c,picurl:u}=t,i=await fetch(`https://kongfandong.cn/api/neteaseMusic?target=${s}`),{url:o}=await i.json();r(`${a} - ${c}`),n(o.replace("http:","")),g()}catch(a){console.error(a),null==(t=e.current)||t.pause(),g(),alert("API busy...")}}},"Random a online music"),o.createElement("button",{className:"btn m10",onClick:function(){var e;null==(e=d.current)||e.click()}},"Choose a local muisc"),o.createElement("div",{className:"strong-text m10",style:{minWidth:"200px"}},t),o.createElement("input",{type:"file",style:{display:"none"},ref:d,onChange:function(e){const t=e.target.files[0],a=URL.createObjectURL(t);r(t.name),n(a)}})),o.createElement("div",{className:f},o.createElement("audio",{controls:!0,onPlay:function(){l(!0),p.current=requestAnimationFrame(x)},onPause:g,ref:e,src:a,crossOrigin:"anonymous"})),o.createElement("div",{className:y},o.createElement(A,{isPlaying:i,data:s}),o.createElement(b,{isPlaying:i,data:s}),o.createElement(R,{isPlaying:i,data:s}),o.createElement(I,{isPlaying:i,data:s}),o.createElement(C,{isPlaying:i,data:s}),o.createElement(T,{isPlaying:i,data:s}),o.createElement($,{isPlaying:i,data:s}),o.createElement(N,{isPlaying:i,data:s}),Array.from({length:5}).map(((e,t)=>o.createElement("div",{key:t,className:"s-module-fake"})))))}function O(){return o.createElement("div",{className:"App"},o.createElement(j,null))}h.render(o.createElement(o.StrictMode,null,o.createElement(O,null)),document.getElementById("root"));
