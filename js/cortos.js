/* ---------- sección "Cortos / POV" ---------- */
var Cortos = (() => {
  let seed = 20260929;
  let userImg = null;
  let iconBox = null;
  let drag = null;

  function opts(){
    return {
      title: $('title').value, subtitle: $('subtitle').value,
      bg1: $('bg1').value, bg2: $('bg2').value, gold: $('gold').value,
      icon: $('icon').value, tint: $('tint').checked,
      titleSize: +$('titleSize').value, iconScale: +$('iconScale').value/100, iconAlpha: +$('iconAlpha').value/100,
      iconX: +$('iconX').value/100, iconY: +$('iconY').value/100,
      particles: +$('particles').value, bokeh: +$('bokeh').value, stars: +$('stars').value
    };
  }

  /* ---------- fondo ---------- */
  function drawBackground(R,o){
    ctx.fillStyle = o.bg2; ctx.fillRect(0,0,W,H);
    let g = ctx.createRadialGradient(W*0.36,H*0.32,40,W*0.45,H*0.45,W*0.85);
    g.addColorStop(0,o.bg1); g.addColorStop(1,o.bg2);
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // brillo cálido en el horizonte
    g = ctx.createLinearGradient(0,H*0.6,0,H);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,rgba(o.gold,0.07));
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // viñeta
    g = ctx.createRadialGradient(W/2,H/2,H*0.3,W/2,H/2,W*0.75);
    g.addColorStop(0,'rgba(0,0,0,0)'); g.addColorStop(1,'rgba(0,0,15,0.55)');
    ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

    // estrellas
    for(let i=0;i<o.stars;i++){
      const x=R()*W, y=R()*H*0.75, r=R()*1.2+0.2;
      ctx.fillStyle = `rgba(255,255,255,${0.15+R()*0.6})`;
      ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }

    // arco de luz sutil
    ctx.save();
    ctx.globalCompositeOperation='lighter';
    ctx.filter='blur(2px)';
    ctx.strokeStyle='rgba(255,255,255,0.07)'; ctx.lineWidth=3;
    ctx.beginPath(); ctx.arc(W*0.95,H*1.9,H*1.55,Math.PI*1.08,Math.PI*1.45); ctx.stroke();
    ctx.restore();
  }

  function drawBokeh(R,o){
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(let i=0;i<o.bokeh;i++){
      const x=R()*W*0.9, y=H*(0.78+gauss(R)*0.16);
      const r=4+Math.pow(R(),1.5)*26, blur=R()*6;
      const col = R()<0.82 ? o.gold : '#9fc3ff';
      const a = 0.12+R()*0.4;
      ctx.filter = blur>0.5 ? `blur(${blur.toFixed(1)}px)` : 'none';
      const g=ctx.createRadialGradient(x,y,0,x,y,r);
      g.addColorStop(0,rgba(col,a)); g.addColorStop(0.7,rgba(col,a*0.8)); g.addColorStop(1,rgba(col,0));
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- íconos (lienzo 600x700) ---------- */
  const ic = document.createElement('canvas'); ic.width=600; ic.height=700;
  const ix = ic.getContext('2d');


  const ICONS = {
    globo(c,o){
      const cx=300, cy=290, r=185;
      c.lineCap='round';
      // aro meridiano
      c.strokeStyle=goldG(c,o,60,520); c.lineWidth=16;
      c.beginPath(); c.arc(cx,cy,r+34,Math.PI*0.5,Math.PI*1.5); c.stroke();
      // esfera
      const g=c.createRadialGradient(cx-60,cy-70,10,cx,cy,r);
      g.addColorStop(0,'#fffbea'); g.addColorStop(0.55,lighten(o.gold,0.35)); g.addColorStop(1,o.gold);
      c.fillStyle=g; c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.fill();
      // líneas
      c.save(); c.beginPath(); c.arc(cx,cy,r,0,Math.PI*2); c.clip();
      c.strokeStyle=darkRgba(o.gold,0.5,0.5); c.lineWidth=5;
      [0.35,0.72].forEach(k=>{ c.beginPath(); c.ellipse(cx,cy,r*k,r,0,0,Math.PI*2); c.stroke(); });
      c.beginPath(); c.moveTo(cx,cy-r); c.lineTo(cx,cy+r); c.stroke();
      [-0.7,-0.35,0,0.35,0.7].forEach(k=>{ c.beginPath(); c.ellipse(cx,cy+r*k,r,r*0.1,0,0,Math.PI*2); c.stroke(); });
      c.restore();
      // soporte
      c.fillStyle=goldG(c,o,500,660);
      c.fillRect(cx-11,cy+r+30,22,95);
      c.beginPath(); c.ellipse(cx,628,125,26,0,0,Math.PI*2); c.fill();
      c.fillRect(cx-125,628,250,18);
      c.beginPath(); c.ellipse(cx,646,125,26,0,0,Math.PI); c.fill();
    },

    avion(c,o){
      // estela de puntos
      for(let i=0;i<16;i++){
        const t=i/15, u=1-t;
        const x=u*u*10+2*u*t*30+t*t*125, y=u*u*690+2*u*t*560+t*t*515;
        c.fillStyle=rgba(lighten(o.gold,0.4),0.35+t*0.6);
        c.beginPath(); c.arc(x,y,3+t*6,0,Math.PI*2); c.fill();
      }
      c.save(); c.translate(330,300); c.rotate(Math.PI/4);
      c.fillStyle=goldG(c,o,-270,250);
      const poly=(pts)=>{ c.beginPath(); c.moveTo(pts[0][0],pts[0][1]); pts.slice(1).forEach(p=>c.lineTo(p[0],p[1])); c.closePath(); c.fill(); };
      [1,-1].forEach(s=>{
        poly([[-18*s,-40],[-230*s,70],[-230*s,105],[-18*s,40]]);
        poly([[-15*s,190],[-100*s,245],[-100*s,268],[-15*s,236]]);
        c.beginPath(); c.roundRect(s>0?-135:109,15,26,62,12); c.fill();
      });
      c.beginPath(); c.roundRect(-24,-270,48,525,24); c.fill();
      // detalles
      c.strokeStyle=darkRgba(o.gold,0.5,0.45); c.lineWidth=4;
      c.beginPath(); c.moveTo(0,-200); c.lineTo(0,230); c.stroke();
      c.fillStyle=darkRgba(o.gold,0.5,0.5);
      c.beginPath(); c.roundRect(-13,-225,26,30,10); c.fill();
      c.restore();
    },

    brujula(c,o){
      const cx=300, cy=365;
      c.strokeStyle=goldG(c,o,130,600);
      c.lineWidth=18; c.beginPath(); c.arc(cx,cy,220,0,Math.PI*2); c.stroke();
      c.lineWidth=4;  c.beginPath(); c.arc(cx,cy,196,0,Math.PI*2); c.stroke();
      for(let i=0;i<48;i++){
        const a=i/48*Math.PI*2, r1= i%6===0 ? 165 : 178;
        c.lineWidth = i%6===0 ? 5 : 3;
        c.beginPath(); c.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);
        c.lineTo(cx+Math.cos(a)*188,cy+Math.sin(a)*188); c.stroke();
      }
      const point=(a,len,w)=>{
        const tx=cx+Math.cos(a)*len, ty=cy+Math.sin(a)*len;
        const sx=Math.cos(a+Math.PI/2)*w, sy=Math.sin(a+Math.PI/2)*w;
        c.fillStyle='#fff6d6';
        c.beginPath(); c.moveTo(cx,cy); c.lineTo(tx,ty); c.lineTo(cx+sx,cy+sy); c.closePath(); c.fill();
        c.fillStyle=o.gold;
        c.beginPath(); c.moveTo(cx,cy); c.lineTo(tx,ty); c.lineTo(cx-sx,cy-sy); c.closePath(); c.fill();
      };
      for(let i=0;i<4;i++) point(Math.PI/4+i*Math.PI/2,115,22);
      for(let i=0;i<4;i++) point(-Math.PI/2+i*Math.PI/2,160,34);
      c.fillStyle='#fffbea'; c.beginPath(); c.arc(cx,cy,16,0,Math.PI*2); c.fill();
      c.fillStyle=lighten(o.gold,0.3); c.font='800 54px Montserrat, sans-serif';
      c.textAlign='center'; c.fillText('N',cx,cy-240);
    },

    palmera(c,o){
      // isla
      c.fillStyle=goldG(c,o,600,680);
      c.beginPath(); c.ellipse(300,640,230,40,0,Math.PI,0); c.fill();
      c.strokeStyle=rgba(lighten(o.gold,0.3),0.8); c.lineWidth=5; c.lineCap='round';
      [[110,672,180],[330,684,150]].forEach(([x,y,w])=>{
        c.beginPath(); c.moveTo(x,y);
        c.quadraticCurveTo(x+w*0.25,y-12,x+w*0.5,y); c.quadraticCurveTo(x+w*0.75,y+12,x+w,y); c.stroke();
      });
      // tronco
      const L=[[290,640],[210,440],[248,232]], Rt=[[350,640],[250,440],[278,232]];
      c.fillStyle=goldG(c,o,230,640);
      c.beginPath(); c.moveTo(...L[0]); c.quadraticCurveTo(...L[1],...L[2]);
      c.lineTo(...Rt[2]); c.quadraticCurveTo(...Rt[1],...Rt[0]); c.closePath(); c.fill();
      const bz=(P,t)=>{ const u=1-t; return [u*u*P[0][0]+2*u*t*P[1][0]+t*t*P[2][0], u*u*P[0][1]+2*u*t*P[1][1]+t*t*P[2][1]]; };
      c.strokeStyle=darkRgba(o.gold,0.5,0.45); c.lineWidth=4;
      for(let i=1;i<11;i++){ const t=i/11, a=bz(L,t), b=bz(Rt,t);
        c.beginPath(); c.moveTo(a[0],a[1]); c.quadraticCurveTo((a[0]+b[0])/2,(a[1]+b[1])/2+8,b[0],b[1]); c.stroke(); }
      // hojas
      const crown=[262,228];
      [-165,-135,-100,-70,-35,-5,25,165].forEach((deg,i)=>{
        const a=deg*Math.PI/180, len=190+(i%3)*25;
        c.save(); c.translate(...crown); c.rotate(a);
        if(Math.cos(a)<0) c.scale(1,-1);
        c.fillStyle=goldG(c,o,-60,60);
        c.beginPath(); c.moveTo(0,0);
        c.quadraticCurveTo(len*0.5,-len*0.3,len,len*0.2);
        c.quadraticCurveTo(len*0.45,len*0.02,0,0); c.fill();
        c.strokeStyle=darkRgba(o.gold,0.5,0.45); c.lineWidth=3;
        c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(len*0.5,-len*0.14,len*0.95,len*0.17); c.stroke();
        c.restore();
      });
      c.fillStyle=o.gold;
      [[248,250],[276,252],[262,270]].forEach(([x,y])=>{ c.beginPath(); c.arc(x,y,16,0,Math.PI*2); c.fill(); });
    },

    maleta(c,o){
      c.strokeStyle=goldG(c,o,140,230); c.lineWidth=22;
      c.beginPath(); c.roundRect(230,150,140,90,30); c.stroke();
      c.fillStyle=goldG(c,o,210,610);
      c.beginPath(); c.roundRect(110,210,380,400,36); c.fill();
      c.fillStyle=darkRgba(o.gold,0.45,0.4);
      c.fillRect(180,210,28,400); c.fillRect(392,210,28,400);
      c.fillRect(110,290,380,8);
      // etiqueta
      c.fillStyle='#fff6d6'; c.beginPath(); c.arc(300,445,58,0,Math.PI*2); c.fill();
      c.strokeStyle=darkRgba(o.gold,0.45,0.6); c.lineWidth=5;
      c.beginPath(); c.arc(300,445,46,0,Math.PI*2); c.stroke();
      c.fillStyle=darkRgba(o.gold,0.35,0.8);
      c.beginPath(); for(let i=0;i<10;i++){ const a=-Math.PI/2+i*Math.PI/5, r=i%2?14:34;
        c.lineTo(300+Math.cos(a)*r,445+Math.sin(a)*r); } c.closePath(); c.fill();
      // ruedas
      c.fillStyle=o.gold;
      [170,430].forEach(x=>{ c.beginPath(); c.arc(x,632,22,0,Math.PI*2); c.fill(); });
    },

    safari(c,o){
      const dark=darkRgba(o.gold,0.5,0.45);
      c.lineCap='round'; c.lineJoin='round';
      // --- jirafa (mirando a la izquierda) ---
      c.fillStyle=goldG(c,o,100,640);
      // patas
      [[238,455],[270,460],[362,455],[394,450]].forEach(([x,y])=>{
        c.beginPath(); c.roundRect(x,y,19,185,8); c.fill();
      });
      // cuerpo
      c.beginPath(); c.ellipse(318,425,108,62,-0.12,0,Math.PI*2); c.fill();
      // cuello
      c.beginPath(); c.moveTo(232,420); c.lineTo(172,182); c.lineTo(212,166); c.lineTo(300,382); c.closePath(); c.fill();
      // cabeza
      c.beginPath(); c.ellipse(168,176,46,23,0.35,0,Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(212,150,16,8,-0.6,0,Math.PI*2); c.fill();   // oreja
      // osiconos
      c.strokeStyle=c.fillStyle; c.lineWidth=7;
      [[186,146,180,108],[198,146,198,106]].forEach(([x1,y1,x2,y2])=>{
        c.beginPath(); c.moveTo(x1,y1); c.lineTo(x2,y2); c.stroke();
        c.beginPath(); c.arc(x2,y2,8,0,Math.PI*2); c.fill();
      });
      // cola
      c.lineWidth=6; c.beginPath(); c.moveTo(420,405); c.quadraticCurveTo(445,450,440,505); c.stroke();
      c.beginPath(); c.ellipse(440,512,8,16,0,0,Math.PI*2); c.fill();

      // manchas (solo sobre la jirafa)
      c.save(); c.globalCompositeOperation='source-atop'; c.fillStyle=dark;
      const hash=n=>{ const j=Math.sin(n)*43758.5453; return j-Math.floor(j); };
      for(let row=0, y=190; y<540; y+=30, row++){
        for(let x=150+(row%2)*16; x<440; x+=32){
          const f=hash(x*12.9898+y*78.233), g=hash(x*3.1+y*7.7);
          // mancha irregular de 5-6 lados
          const sx=x+f*8, sy=y+g*6, rx=10+f*5, ry=8+g*4, n=5+Math.round(f);
          c.beginPath();
          for(let i=0;i<n;i++){
            const a=i/n*Math.PI*2+g, k=0.75+hash(x+y+i)*0.35;
            c.lineTo(sx+Math.cos(a)*rx*k, sy+Math.sin(a)*ry*k);
          }
          c.closePath(); c.fill();
        }
      }
      c.restore();
      // melena, ojo y hocico
      c.strokeStyle=dark; c.lineWidth=5;
      c.beginPath(); c.moveTo(214,172); c.lineTo(302,384); c.stroke();
      c.fillStyle=darkRgba(o.gold,0.6,0.85);
      c.beginPath(); c.arc(178,168,5,0,Math.PI*2); c.fill();
      c.beginPath(); c.arc(130,186,3.5,0,Math.PI*2); c.fill();

      // --- detrás: acacia y suelo ---
      c.save(); c.globalCompositeOperation='destination-over';
      c.fillStyle=goldG(c,o,320,660);
      c.beginPath(); c.ellipse(300,648,250,28,0,Math.PI,0); c.fill();
      c.globalAlpha=0.8;
      c.strokeStyle=goldG(c,o,380,650); c.lineWidth=16;
      c.beginPath(); c.moveTo(495,645); c.quadraticCurveTo(485,520,470,405); c.stroke();
      c.lineWidth=9;
      c.beginPath(); c.moveTo(480,470); c.quadraticCurveTo(510,440,535,398); c.stroke();
      c.beginPath(); c.moveTo(474,430); c.quadraticCurveTo(445,410,420,392); c.stroke();
      c.beginPath(); c.ellipse(462,385,118,30,0,0,Math.PI*2); c.fill();
      c.beginPath(); c.ellipse(455,360,82,22,0,0,Math.PI*2); c.fill();
      c.restore();
    },

    imagen(c,o){
      if(!userImg) return;
      const bw=560, bh=660, s=Math.min(bw/userImg.width,bh/userImg.height);
      const w=userImg.width*s, h=userImg.height*s;
      c.drawImage(userImg,(600-w)/2,(700-h)/2,w,h);
      if(o.tint){
        c.globalCompositeOperation='source-atop';
        c.globalAlpha=0.85; c.fillStyle=goldG(c,o,(700-h)/2,(700+h)/2);
        c.fillRect(0,0,600,700);
        c.globalAlpha=1; c.globalCompositeOperation='source-over';
      }
    }
  };

  function placeIcon(o){
    if(o.icon==='none' || (o.icon==='imagen' && !userImg)) return null;
    ix.clearRect(0,0,600,700);
    ix.save(); ICONS[o.icon](ix,o); ix.restore();
    const k=0.88*o.iconScale, w=600*k, h=700*k;
    const cx=W*o.iconX, cy=H*o.iconY, x=cx-w/2, y=cy-h/2;
    iconBox={x,y,w,h};
    // resplandor exterior
    ctx.save(); ctx.globalCompositeOperation='lighter';
    ctx.filter='blur(30px)'; ctx.globalAlpha=0.7*o.iconAlpha; ctx.drawImage(ic,x,y,w,h);
    ctx.filter='blur(9px)';  ctx.globalAlpha=0.55*o.iconAlpha; ctx.drawImage(ic,x,y,w,h);
    ctx.restore();
    // ícono nítido
    ctx.save(); ctx.globalAlpha=o.iconAlpha; ctx.shadowColor=rgba(o.gold,0.9); ctx.shadowBlur=25;
    ctx.drawImage(ic,x,y,w,h); ctx.restore();
    return {cx,cy,k};
  }

  /* ---------- chispas ---------- */
  function drawParticles(R,o,p){
    const {cx,cy,k} = p || {cx:W*0.79, cy:H*0.5, k:0.88};
    ctx.save(); ctx.globalCompositeOperation='lighter';
    for(let i=0;i<o.particles;i++){
      let x,y; const m=R();
      if(m<0.55){ // cascada hacia abajo a la izquierda
        const t=R(), top=cy-220*k;
        x = cx-170*k - t*200*k + gauss(R)*60*k;
        y = top + t*(H-top) + gauss(R)*40;
      } else if(m<0.85){ // halo
        const a=R()*Math.PI*2, r=(0.8+R()*0.6)*280*k;
        x = cx+Math.cos(a)*r*0.8; y = cy+Math.sin(a)*r;
      } else {
        x = cx+(R()*2-1)*420*k; y = cy+(R()*2-1)*380*k;
      }
      const size=Math.pow(R(),3)*3.2+0.4, a=0.25+R()*0.75;
      ctx.fillStyle = rgba(pick(R,[o.gold,'#fff4c8','#ffffff']),a);
      ctx.beginPath(); ctx.arc(x,y,size,0,Math.PI*2); ctx.fill();
      if(size>2.2){
        const g=ctx.createRadialGradient(x,y,0,x,y,size*5);
        g.addColorStop(0,rgba(o.gold,0.35*a)); g.addColorStop(1,rgba(o.gold,0));
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(x,y,size*5,0,Math.PI*2); ctx.fill();
      }
    }
    ctx.restore();
  }


  function drawSparkles(R,o,p){
    const {cx,cy,k} = p || {cx:W*0.79, cy:H*0.5, k:0.88};
    for(let i=0;i<9;i++){
      const a=R()*Math.PI*2, r=(0.75+R()*0.5)*300*k;
      star4(cx+Math.cos(a)*r*0.85, cy+Math.sin(a)*r, 12+R()*22, o, 0.7+R()*0.3);
    }
    for(let i=0;i<3;i++) star4(W*(0.45+R()*0.25), H*(0.15+R()*0.6), 10+R()*14, o, 0.8);
  }

  /* ---------- texto ---------- */
  function drawText(o){
    const lines=o.title.toUpperCase().split('\n').filter(l=>l.trim()!=='');
    if(!lines.length && !o.subtitle) return;
    const x=96, maxW=W*0.56;
    let size=o.titleSize;
    ctx.save();
    ctx.textBaseline='alphabetic';
    ctx.font=`800 ${size}px Montserrat, sans-serif`; setLS(ctx,size*0.01);
    const widest=Math.max(1,...lines.map(l=>ctx.measureText(l).width));
    if(widest>maxW){ size*=maxW/widest; ctx.font=`800 ${size}px Montserrat, sans-serif`; setLS(ctx,size*0.01); }
    const lh=size*1.04;
    const subSize=Math.min(46,Math.max(22,size*0.32));
    const blockH=lh*lines.length+(o.subtitle?subSize*2:0);
    const y0=H/2-blockH/2+size*0.82;
    const yEnd=y0+(lines.length-1)*lh;

    // degradado blanco → dorado a lo largo del bloque
    const grad=ctx.createLinearGradient(0,y0-size*0.8,0,yEnd);
    grad.addColorStop(0,'#fffdf4'); grad.addColorStop(0.4,lighten(o.gold,0.65)); grad.addColorStop(1,lighten(o.gold,0.12));

    lines.forEach((l,i)=>{
      const yy=y0+i*lh;
      ctx.shadowColor=rgba(o.gold,0.85); ctx.shadowBlur=size*0.45;
      ctx.fillStyle=rgba(o.gold,0.9); ctx.fillText(l,x,yy);
      ctx.shadowBlur=size*0.1; ctx.fillStyle=grad; ctx.fillText(l,x,yy);
    });

    if(o.subtitle){
      const sy=yEnd+subSize*2.1;
      ctx.font=`600 ${subSize}px Montserrat, sans-serif`; setLS(ctx,subSize*0.05);
      ctx.shadowColor=rgba(o.gold,0.7); ctx.shadowBlur=18;
      ctx.fillStyle=lighten(o.gold,0.15);
      ctx.fillText(o.subtitle.toUpperCase(),x+4,sy);
    }
    ctx.restore();
  }


  /* ---------- render ---------- */
  function render(){
    const o=opts(), R=rng(seed);
    $('iconXv').textContent=$('iconX').value+'%';
    $('iconYv').textContent=$('iconY').value+'%';
    $('iconAlphav').textContent=$('iconAlpha').value+'%';
    iconBox=null;
    ctx.save(); ctx.clearRect(0,0,W,H);
    drawBackground(R,o);
    drawBokeh(R,o);
    const p=placeIcon(o);
    drawParticles(R,o,p);
    drawSparkles(R,o,p);
    drawText(o);
    drawFrame();
    ctx.restore();
  }

  /* ---------- arrastrar el ícono ---------- */
  function puedeArrastrar(p){ const b=iconBox; return !!b && p.x>=b.x && p.x<=b.x+b.w && p.y>=b.y && p.y<=b.y+b.h; }
  function onPointerDown(p){
    if(!puedeArrastrar(p)) return false;
    drag={dx:p.x-W*$('iconX').value/100, dy:p.y-H*$('iconY').value/100};
    return true;
  }
  function onPointerMove(p){
    if(!drag) return;
    const clamp=v=>Math.max(0,Math.min(100,Math.round(v)));
    $('iconX').value=clamp((p.x-drag.dx)/W*100);
    $('iconY').value=clamp((p.y-drag.dy)/H*100);
  }
  function onPointerUp(){ drag=null; }

  /* ---------- controles propios ---------- */
  $('file').addEventListener('change',e=>{
    const f=e.target.files[0]; if(!f) return;
    leerImagen(f,img=>{ userImg=img; $('icon').value='imagen'; App.render(); });
  });
  $('centerIcon').addEventListener('click',()=>{ $('iconX').value=79; $('iconY').value=51; App.render(); });
  $('rand').addEventListener('click',()=>{ seed=Math.floor(Math.random()*1e9); App.render(); });

  return { render, nombreArchivo: ()=>'miniatura-corto.png', puedeArrastrar, onPointerDown, onPointerMove, onPointerUp };
})();
