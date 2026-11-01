/* Neon liquid-metal background + HUD clock/coords, shared by every page */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(function(){document.body.classList.add('ready')},250);
  var clock=document.getElementById('clock')||{},coord=document.getElementById('coord')||{};
  function pad(n,w){n=String(Math.floor(Math.abs(n)));while(n.length<w)n='0'+n;return n}
  function tick(){var d=new Date();clock.textContent='T '+pad(d.getHours(),2)+':'+pad(d.getMinutes(),2)+':'+pad(d.getSeconds(),2)}
  tick();setInterval(tick,1000);

  var c=document.getElementById('metal');
  var gl=c.getContext('webgl')||c.getContext('experimental-webgl');
  if(!gl){c.style.background='radial-gradient(circle at 30% 30%,#ff2bd6,#3a0b5c 35%,#07060b 70%)';return;}
  var vs='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var fs=[
  'precision highp float;',
  'uniform vec2 R;uniform float T;uniform vec2 M;uniform float MS;',
  'float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
  'float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
  ' return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}',
  'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*n(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}',
  'float H(vec2 p){',
  ' float t=T*.09;',
  ' vec2 q=vec2(fbm(p+t),fbm(p+vec2(5.2,1.3)-t));',
  ' vec2 r=vec2(fbm(p+1.8*q+vec2(1.7,9.2)+t*1.3),fbm(p+1.8*q+vec2(8.3,2.8)-t));',
  ' float v=fbm(p+1.6*r);',
  ' float d=length(p-M);',
  ' v+=MS*.3*sin(d*16.-T*6.)*exp(-d*2.4);',
  ' v+=.22*exp(-d*d*7.)*MS;',
  ' return v;}',
  'vec3 neon(float k){',
  ' k=fract(k);',
  ' vec3 c1=vec3(1.,.17,.84),c2=vec3(.48,.17,1.),c3=vec3(0.,.94,1.);',
  ' return k<.33?mix(c1,c2,k*3.):k<.66?mix(c2,c3,(k-.33)*3.):mix(c3,c1,(k-.66)*3.);}',
  'void main(){',
  ' vec2 uv=(gl_FragCoord.xy-.5*R)/min(R.x,R.y)*1.1;',
  ' float e=.01;',
  ' float a=H(uv),bx=H(uv+vec2(e,0)),by=H(uv+vec2(0,e));',
  ' vec2 g2=vec2(a-bx,a-by)/e;',
  ' float sl=length(g2);',
  ' float ang=atan(g2.y,g2.x)/6.2831+.5+T*.03;',
  ' vec3 base=vec3(.025,.01,.06);',
  ' vec3 col=base;',
  ' float rim=smoothstep(.35,1.1,sl);',
  ' col+=neon(ang)*rim*1.05;',
  ' col+=neon(ang+.5)*smoothstep(1.4,2.4,sl)*.6;',
  ' float band=sin(a*26.-T*.8);',
  ' col+=neon(a*1.3+T*.02)*smoothstep(.92,1.,band)*.35;',
  ' vec3 N=normalize(vec3(-g2*.16,1.));',
  ' vec3 L=normalize(vec3(-.4,.6,.7));',
  ' col+=vec3(.85,1.,1.)*pow(max(dot(reflect(-L,N),vec3(0,0,1)),0.),60.)*.9;',
  ' col*=.45+.6*a;',
  ' vec2 sp=gl_FragCoord.xy/R;',
  ' float hz=.3;',
  ' if(sp.y<hz){',
  '  float z=hz/(hz-sp.y+.001);',
  '  vec2 g=vec2((sp.x-.5)*z*6.,z*1.4+T*.6);',
  '  vec2 gf=abs(fract(g)-.5);',
  '  float ln=smoothstep(.47,.5,max(gf.x,gf.y));',
  '  col+=mix(vec3(1.,.17,.84),vec3(0.,.94,1.),sp.y/hz)*ln*.45*smoothstep(0.,.08,hz-sp.y);',
  ' }',
  ' vec2 vg=sp-.5;col*=1.-dot(vg,vg)*1.2;',
  ' gl_FragColor=vec4(col,1.);',
  '}'].join('\n');
  function sh(t,s){var o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))console.error(gl.getShaderInfoLog(o));return o;}
  var pr=gl.createProgram();gl.attachShader(pr,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pr,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pr);gl.useProgram(pr);
  var b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  var loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  var uR=gl.getUniformLocation(pr,'R'),uT=gl.getUniformLocation(pr,'T'),uM=gl.getUniformLocation(pr,'M'),uS=gl.getUniformLocation(pr,'MS');
  var scale=Math.min(window.devicePixelRatio||1,1.5)*.75;
  function resize(){c.width=Math.floor(innerWidth*scale);c.height=Math.floor(innerHeight*scale);gl.viewport(0,0,c.width,c.height);}
  addEventListener('resize',resize);resize();
  var mx=0,my=0,tx=0,ty=0,ms=0,tms=0;
  function mv(x,y){var m=Math.min(innerWidth,innerHeight);tx=(x-innerWidth/2)/m*1.1;ty=-(y-innerHeight/2)/m*1.1;tms=1;
    coord.textContent='X '+pad(x,4)+' · Y '+pad(y,4);}
  addEventListener('pointermove',function(e){mv(e.clientX,e.clientY)});
  addEventListener('touchmove',function(e){var t=e.touches[0];if(t)mv(t.clientX,t.clientY)},{passive:true});
  var t0=performance.now();
  function frame(now){
    var t=(now-t0)/1000;
    mx+=(tx-mx)*.08;my+=(ty-my)*.08;ms+=(tms-ms)*.05;tms*=.985;
    gl.uniform2f(uR,c.width,c.height);gl.uniform1f(uT,reduce?10:t);gl.uniform2f(uM,mx,my);gl.uniform1f(uS,ms);
    gl.drawArrays(gl.TRIANGLES,0,3);
    if(!reduce)requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
