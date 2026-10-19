/* Globe from the current site (main), ported as is; colors follow --mark. */
/* ── GLOBE PARAM SETTERS ── */
function sp(key,val,lid,dec){
  document.getElementById(lid).textContent=dec?val.toFixed(dec):val;
  G[key]=val;
  G.dirty=true;
}
var G={
  amt:1800,rad:88,con:3,dst:18,
  lop:0.35,fuz:10,dsz:2.5,dop:0.7,
  dots:true,dirty:true,
  lc:'#b07428',dc:'#b07428',
  rx:0,ry:0,vx:0,vy:0,drag:false,lmx:0,lmy:0,
  verts:null,segs:null
};

/* pre-baked 5000 sphere samples */
var RAW=(function(){
  var a=[];
  for(var i=0;i<5000;i++){
    var lng=Math.acos(2*Math.random()-1);
    var lat=2*Math.PI*Math.random();
    var u=Math.cos(lng);
    a.push({rx:Math.random(),ry:Math.random(),rz:Math.random(),
            lat:lat,u:u,sq:Math.sqrt(1-u*u)});
  }
  return a;
}());

function rebuild(){
  var n=Math.min(G.amt,RAW.length);
  var R=G.rad,H=G.fuz,D=G.dst,C=G.con;
  /* typed arrays for speed */
  var vx=new Float32Array(n),vy=new Float32Array(n),vz=new Float32Array(n);
  var va=new Uint8Array(n);
  for(var i=0;i<n;i++){
    var r=RAW[i];
    vx[i]=(r.rx*H+R)*r.sq*Math.cos(r.lat);
    vy[i]=(r.ry*H+R)*r.sq*Math.sin(r.lat);
    vz[i]=(r.rz*H+R)*r.u;
  }
  var sg=[];
  var D2=D*D;
  for(var i=n-1;i>=0;i--){
    if(va[i]>=C)continue;
    for(var j=i-1;j>=0;j--){
      if(va[i]>=C||va[j]>=C)continue;
      var dx=vx[i]-vx[j],dy=vy[i]-vy[j],dz=vz[i]-vz[j];
      if(dx*dx+dy*dy+dz*dz<D2){
        sg.push(i,j);
        va[i]++;va[j]++;
      }
    }
  }
  G.verts={x:vx,y:vy,z:vz,n:n};
  G.segs=sg;
  G.dirty=false;
}

function h2r(h){
  return parseInt(h.slice(1,3),16)+','+parseInt(h.slice(3,5),16)+','+parseInt(h.slice(5,7),16);
}

function startGlobe(){
  var cv=document.getElementById('gc');
  var ctx=cv.getContext('2d');
  var W=0,H2=0;

  function resize(){
    var r=cv.getBoundingClientRect();
    var dpr=window.devicePixelRatio||1;
    W=r.width; H2=r.height;
    cv.width=Math.round(W*dpr);
    cv.height=Math.round(H2*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  /* wait for layout then init */
  requestAnimationFrame(function(){
    resize();
    window.addEventListener('resize',function(){resize();});

    /* mouse */
    cv.addEventListener('mousedown',function(e){G.drag=true;G.lmx=e.clientX;G.lmy=e.clientY;G.vx=0;G.vy=0;});
    window.addEventListener('mouseup',function(){G.drag=false;});
    window.addEventListener('mousemove',function(e){
      if(!G.drag)return;
      var dx=e.clientX-G.lmx,dy=e.clientY-G.lmy;
      G.vy=dx*0.005;G.vx=dy*0.005;
      G.ry+=G.vy;G.rx+=G.vx;
      G.lmx=e.clientX;G.lmy=e.clientY;
    });
    /* touch */
    cv.addEventListener('touchstart',function(e){G.drag=true;G.lmx=e.touches[0].clientX;G.lmy=e.touches[0].clientY;G.vx=0;G.vy=0;e.preventDefault();},{passive:false});
    cv.addEventListener('touchend',function(){G.drag=false;});
    cv.addEventListener('touchmove',function(e){
      if(!G.drag)return;
      var dx=e.touches[0].clientX-G.lmx,dy=e.touches[0].clientY-G.lmy;
      G.vy=dx*0.005;G.vx=dy*0.005;
      G.ry+=G.vy;G.rx+=G.vx;
      G.lmx=e.touches[0].clientX;G.lmy=e.touches[0].clientY;
      e.preventDefault();
    },{passive:false});

    frame();
  });

  var FOV=500;

  function frame(){
    requestAnimationFrame(frame);
    if(G.dirty)rebuild();
    if(!G.verts)return;

    var cx=W/2,cy=H2/2;
    if(!G.drag){G.vx*=0.92;G.vy*=0.92;G.ry+=G.vy+0.0025;G.rx+=G.vx;}

    var crx=Math.cos(G.rx),srx=Math.sin(G.rx);
    var cry=Math.cos(G.ry),sry=Math.sin(G.ry);
    var vs=G.verts,n=vs.n;
    var px=new Float32Array(n),py=new Float32Array(n),pz=new Float32Array(n),ps=new Float32Array(n);

    for(var i=0;i<n;i++){
      var x0=vs.x[i],y0=vs.y[i],z0=vs.z[i];
      var x1=x0*cry+z0*sry, z1=-x0*sry+z0*cry, y1=y0;
      var y2=y1*crx-z1*srx, z2=y1*srx+z1*crx;
      var s=FOV/(FOV+z2);
      px[i]=cx+x1*s; py[i]=cy+y2*s; pz[i]=z2; ps[i]=s;
    }

    ctx.clearRect(0,0,W,H2);

    var mxZ=G.rad*1.7;
    var lr=h2r(G.lc),dr=h2r(G.dc);
    var sg=G.segs;

    /* lines */
    ctx.lineWidth=0.7;
    for(var k=0;k<sg.length;k+=2){
      var a=sg[k],b=sg[k+1];
      var dep=(pz[a]+pz[b])*0.5;
      var t=Math.max(0,Math.min(1,(dep+mxZ)/(2*mxZ)));
      var op=(G.lop*(0.12+0.88*t)).toFixed(3);
      ctx.beginPath();
      ctx.strokeStyle='rgba('+lr+','+op+')';
      ctx.moveTo(px[a],py[a]);
      ctx.lineTo(px[b],py[b]);
      ctx.stroke();
    }

    /* dots — back to front */
    if(G.dots){
      var idx=[];for(var i=0;i<n;i++)idx.push(i);
      idx.sort(function(a,b){return pz[a]-pz[b];});
      for(var k=0;k<idx.length;k++){
        var i=idx[k];
        var t=Math.max(0,Math.min(1,(pz[i]+mxZ)/(2*mxZ)));
        var op=(G.dop*(0.06+0.94*t)).toFixed(3);
        var r=Math.max(0.4,G.dsz*0.45*ps[i]);
        ctx.beginPath();
        ctx.arc(px[i],py[i],r,0,6.2832);
        ctx.fillStyle='rgba('+dr+','+op+')';
        ctx.fill();
      }
    }
  }
}

/* start after DOM + fonts are ready */
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',startGlobe);
}else{
  startGlobe();
}
function tglPanel(){
  var p=document.getElementById('cpanel'),b=document.getElementById('custBtn');
  var o=p.classList.toggle('open');b.classList.toggle('on',o);b.setAttribute('aria-expanded',o);
}
/* follow the page accent, also when the theme flips */
function syncMark(){
  var m=getComputedStyle(document.documentElement).getPropertyValue('--mark').trim();
  if(/^#[0-9a-f]{6}$/i.test(m)){G.lc=m;G.dc=m;document.querySelectorAll('#cpanel input[type=color]').forEach(function(i){i.value=m;});}
}
syncMark();
new MutationObserver(function(){setTimeout(syncMark,0);}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
