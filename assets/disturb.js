/* Pointer-driven "liquid" disturbance for headline text.
 * - Each letter is pushed away from the cursor and springs back (with a little overshoot).
 * - Each text block gets an SVG turbulence displacement whose strength follows how fast
 *   and how close the cursor moves, so the text ripples like the metal behind it.
 * - A short red/cyan split appears on the letters that get hit hardest.
 */
(function(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  var SEL='.welcome,.glitch,.sub,.title,.title-cn,.card b,.brand';
  var blocks=[],letters=[];
  var NS='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(NS,'svg');
  svg.setAttribute('aria-hidden','true');svg.style.cssText='position:absolute;width:0;height:0;overflow:hidden';
  document.body.appendChild(svg);

  function split(el){
    var txt=el.textContent;el.textContent='';
    var arr=[];
    for(var i=0;i<txt.length;i++){
      var ch=txt[i],s=document.createElement('n-ch');
      s.textContent=ch;
      s.style.display='inline-block';
      s.style.willChange='transform';
      if(ch===' '){s.style.whiteSpace='pre';}
      el.appendChild(s);
      arr.push({el:s,x:0,y:0,vx:0,vy:0,r:0,vr:0,cx:0,cy:0,hit:0});
    }
    return arr;
  }

  document.querySelectorAll(SEL).forEach(function(el,i){
    if(el.children.length)return;
    var id='liq'+i;
    var f=document.createElementNS(NS,'filter');
    f.setAttribute('id',id);f.setAttribute('x','-20%');f.setAttribute('y','-40%');f.setAttribute('width','140%');f.setAttribute('height','180%');
    var tb=document.createElementNS(NS,'feTurbulence');
    tb.setAttribute('type','fractalNoise');tb.setAttribute('baseFrequency','0.012 0.05');tb.setAttribute('numOctaves','2');tb.setAttribute('seed',String(i*7+3));tb.setAttribute('result','n');
    var dm=document.createElementNS(NS,'feDisplacementMap');
    dm.setAttribute('in','SourceGraphic');dm.setAttribute('in2','n');dm.setAttribute('scale','0');
    dm.setAttribute('xChannelSelector','R');dm.setAttribute('yChannelSelector','G');
    f.appendChild(tb);f.appendChild(dm);svg.appendChild(f);
    var ls=split(el);
    letters=letters.concat(ls);
    blocks.push({el:el,id:id,tb:tb,dm:dm,ls:ls,amp:0,on:false,top:0,bottom:0,left:0,right:0});
  });

  function measure(){
    var sx=scrollX,sy=scrollY;
    letters.forEach(function(L){
      var r=L.el.getBoundingClientRect();
      L.cx=r.left+r.width/2+sx-L.x;L.cy=r.top+r.height/2+sy-L.y;
    });
    blocks.forEach(function(b){
      var r=b.el.getBoundingClientRect();
      b.left=r.left+sx;b.right=r.right+sx;b.top=r.top+sy;b.bottom=r.bottom+sy;
    });
  }
  addEventListener('resize',measure);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(measure);
  setTimeout(measure,300);setTimeout(measure,1600);setInterval(measure,2000);

  var mx=-9999,my=-9999,pmx=-9999,pmy=-9999,speed=0,active=false;
  function mv(x,y){mx=x+scrollX;my=y+scrollY;active=true;}
  addEventListener('pointermove',function(e){mv(e.clientX,e.clientY)},{passive:true});
  addEventListener('touchmove',function(e){var t=e.touches[0];if(t)mv(t.clientX,t.clientY)},{passive:true});
  addEventListener('pointerdown',function(e){mv(e.clientX,e.clientY);speed=Math.max(speed,40)},{passive:true});

  var t0=performance.now();
  function frame(now){
    var t=(now-t0)/1000;
    if(active){
      if(pmx>-9000){var dx=mx-pmx,dy=my-pmy;speed=speed*.8+Math.sqrt(dx*dx+dy*dy)*.2;}
      pmx=mx;pmy=my;
    }
    speed*=.96;
    var push=Math.min(1.8,speed/18);   /* faster cursor = stronger push */
    var R=150;

    for(var i=0;i<letters.length;i++){
      var L=letters[i];
      var dx2=L.cx+L.x-mx,dy2=L.cy+L.y-my,d=Math.sqrt(dx2*dx2+dy2*dy2)+.001;
      if(d<R&&active){
        var f=(1-d/R);f=f*f*push*2.2;
        L.vx+=dx2/d*f;L.vy+=dy2/d*f;
        L.vr+=(dx2>0?1:-1)*f*.35;
        L.hit=Math.min(1,L.hit+f*.08);
      }
      /* spring back with a bit of wobble, like a viscous liquid */
      L.vx+=-L.x*.06;L.vy+=-L.y*.06;L.vr+=-L.r*.07;
      L.vx*=.86;L.vy*=.86;L.vr*=.85;
      L.x+=L.vx;L.y+=L.vy;L.r+=L.vr;
      L.hit*=.92;
      var moving=Math.abs(L.x)+Math.abs(L.y)+Math.abs(L.r)>.05||L.hit>.02;
      if(moving){
        L.el.style.transform='translate('+L.x.toFixed(2)+'px,'+L.y.toFixed(2)+'px) rotate('+L.r.toFixed(2)+'deg)';
        L.el.style.textShadow=L.hit>.04?((-4*L.hit).toFixed(1)+'px 0 rgba(255,43,214,'+(.9*L.hit).toFixed(2)+'),'+(4*L.hit).toFixed(1)+'px 0 rgba(0,240,255,'+(.9*L.hit).toFixed(2)+')'):'';
        L.moving=true;
      } else if(L.moving){L.el.style.transform='';L.el.style.textShadow='';L.x=L.y=L.r=0;L.moving=false;}
    }

    for(var j=0;j<blocks.length;j++){
      var b=blocks[j];
      var ddx=Math.max(b.left-mx,0,mx-b.right),ddy=Math.max(b.top-my,0,my-b.bottom);
      var dd=Math.sqrt(ddx*ddx+ddy*ddy);
      var near=active?Math.max(0,1-dd/180):0;
      var target=near*Math.min(26,4+speed*.9);
      b.amp+=(target-b.amp)*(target>b.amp?.35:.06);
      if(b.amp>.4){
        b.dm.setAttribute('scale',b.amp.toFixed(1));
        b.tb.setAttribute('baseFrequency',(0.010+0.004*Math.sin(t*1.7+j)).toFixed(4)+' '+(0.045+0.015*Math.sin(t*2.3+j)).toFixed(4));
        if(!b.on){b.el.style.filter='url(#'+b.id+')';b.on=true;}
      } else if(b.on){b.el.style.filter='';b.on=false;b.amp=0;}
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
