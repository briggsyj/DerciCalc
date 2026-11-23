import { useEffect, useRef, useState } from "react";
import pizzaUrl from "./pizza.png";

// Full-screen WebGL background that tiles the pizza slice and runs one of
// five Hotline-Miami-style effects over it.
const MODES = { drift: 0, vhs: 1, vhsgrey: 1, kaleido: 2, pulse: 3 };

const VS = "attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}";

const FS = `precision mediump float;
uniform sampler2D u_tex;uniform vec2 u_res;uniform float u_time,u_mode,u_amt,u_dpr,u_grey;
const vec2 TILE=vec2(160.,82.);
vec3 hm(float t){t=fract(t);vec3 a=vec3(1.,.18,.53),b=vec3(1.,.55,.1),c=vec3(.1,.89,1.),d=vec3(.45,.12,.75);float s=t*4.;
 if(s<1.)return mix(a,b,s);if(s<2.)return mix(b,c,s-1.);if(s<3.)return mix(c,d,s-2.);return mix(d,a,s-3.);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec4 pz(vec2 p){p.x+=floor(p.y)*.5;vec2 f=fract(p);vec2 t=(f-.5)*1.3+.5;
 if(t.x<0.||t.x>1.||t.y<0.||t.y>1.)return vec4(0.);return texture2D(u_tex,t);}
const vec3 RED=vec3(.929,.259,.192);
vec3 plain(vec2 px,float t){vec4 c=pz(px/TILE+vec2(t*.08,t*.03));return mix(RED*.8,c.rgb,c.a);}
void main(){
 float t=u_time;vec2 px=gl_FragCoord.xy/u_dpr;vec2 res=u_res/u_dpr;vec3 col;
 vec2 uv=(gl_FragCoord.xy-.5*u_res)/u_res.y;
 if(u_mode<.5){
  vec2 q=px+u_amt*vec2(sin(px.y*.02+t*1.3),cos(px.x*.018+t*1.1))*26.;
  vec4 c=pz(q/TILE+vec2(t*.15,t*.05));
  float l=dot(c.rgb,vec3(.3,.59,.11));
  vec3 bg=mix(RED,hm(t*.05+px.y*.0009),u_amt*.85);
  bg*=.82+.18*sin(px.y*.04-t*3.);
  vec3 fg=mix(c.rgb,hm(l*1.4+t*.2+q.x*.001),u_amt);
  col=mix(bg,fg,c.a);
 }else if(u_mode<1.5){
  float band=smoothstep(.96,1.,sin(px.y*.012-t*1.7));
  float jit=(hash(vec2(floor(t*10.),0.))-.5)*4.;
  vec2 q=px+vec2(u_amt*(sin(px.y*.09+t*18.)*1.2+band*34.+jit),0.);
  float o=7.*u_amt;
  col=vec3(plain(q+vec2(o,0.),t).r,plain(q,t).g,plain(q-vec2(o,0.),t).b);
  col=mix(col,col*vec3(1.08,.86,1.18),u_amt);
  col*=.82+.18*sin(gl_FragCoord.y*1.5708);
  col+=(hash(px+fract(t)*91.)-.5)*.16*u_amt;
  col+=band*.15*u_amt;
 }else if(u_mode<2.5){
  float r=length(uv),a=atan(uv.y,uv.x)+t*.25*(.3+u_amt);
  float seg=6.28318/6.;a=mod(a,seg);a=abs(a-seg*.5);
  vec2 k=vec2(a/seg*2.4,.32/(r+.04)+t*.5);
  vec4 c=pz(k);
  vec3 bg=hm(r*.9-t*.25);
  vec3 fg=mix(c.rgb,c.rgb*hm(k.y*.2),u_amt*.6);
  col=mix(bg,fg,c.a);
  col=mix(vec3(.06,0.,.1),col,smoothstep(.02,.35,r));
 }else{
  float beat=exp(-fract(t*2.)*5.);
  float ang=sin(t*.7)*.18*u_amt;mat2 R=mat2(cos(ang),-sin(ang),sin(ang),cos(ang));
  vec2 w=R*uv*(1.-beat*.12*u_amt);
  float ra=atan(w.y,w.x);float rays=step(.5,fract(ra/6.28318*14.+t*.05));
  vec3 bg=mix(vec3(1.,.18,.53),vec3(1.,.55,.1),rays)*(.85+.25*beat*u_amt);
  vec2 p=w*res.y/TILE;
  vec4 sh=pz(p+vec2(.05,.07));
  vec4 c=pz(p);
  col=mix(bg,mix(vec3(.1,.89,1.),vec3(.45,.12,.75),.4),sh.a);
  col=mix(col,c.rgb,c.a);
  col=mix(col,floor(col*4.)/4.,u_amt*.7);
  col*=1.-dot(uv,uv)*.6;
 }
 col=mix(col,vec3(dot(col,vec3(.3,.59,.11))),u_grey);
 gl_FragColor=vec4(col,1.);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(s));
    return null;
  }
  return s;
}

export default function PizzaShader({ mode = "drift", intensity = 0.75, speed = 0.8 }) {
  const canvasRef = useRef(null);
  const propsRef = useRef({ mode, intensity, speed });
  const drawRef = useRef(null);
  const [failed, setFailed] = useState(false);

  propsRef.current = { mode, intensity, speed };

  // Redraw on prop change when animation is paused (reduced motion).
  useEffect(() => {
    if (drawRef.current) drawRef.current();
  }, [mode, intensity]);

  useEffect(() => {
    const cv = canvasRef.current;
    const gl = cv && cv.getContext("webgl", { premultipliedAlpha: false, antialias: false });
    if (!gl) {
      setFailed(true);
      return undefined;
    }
    const vs = compile(gl, gl.VERTEX_SHADER, VS);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FS);
    if (!vs || !fs) {
      setFailed(true);
      return undefined;
    }
    const pr = gl.createProgram();
    gl.attachShader(pr, vs);
    gl.attachShader(pr, fs);
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) {
      setFailed(true);
      return undefined;
    }
    gl.useProgram(pr);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(pr, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const u = {
      res: gl.getUniformLocation(pr, "u_res"),
      time: gl.getUniformLocation(pr, "u_time"),
      mode: gl.getUniformLocation(pr, "u_mode"),
      amt: gl.getUniformLocation(pr, "u_amt"),
      dpr: gl.getUniformLocation(pr, "u_dpr"),
      grey: gl.getUniformLocation(pr, "u_grey"),
    };

    let alive = true;
    let raf = 0;
    let t = 2.5;
    let last = performance.now();
    let dpr = 1;
    const still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      if (!alive) return;
      const p = propsRef.current;
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(u.res, cv.width, cv.height);
      gl.uniform1f(u.time, t);
      gl.uniform1f(u.mode, MODES[p.mode] ?? 0);
      gl.uniform1f(u.grey, p.mode === "vhsgrey" ? 1 : 0);
      gl.uniform1f(u.amt, p.intensity);
      gl.uniform1f(u.dpr, dpr);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    drawRef.current = draw;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(cv.clientWidth * dpr));
      const h = Math.max(1, Math.round(cv.clientHeight * dpr));
      if (cv.width !== w || cv.height !== h) {
        cv.width = w;
        cv.height = h;
      }
      if (still) draw();
    };
    const ro = window.ResizeObserver ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(cv);
    else window.addEventListener("resize", resize);
    resize();

    const img = new Image();
    img.onload = () => {
      if (!alive) return;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      if (still) draw();
    };
    img.src = pizzaUrl;

    const frame = (now) => {
      if (!alive) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      t += dt * propsRef.current.speed;
      draw();
      raf = requestAnimationFrame(frame);
    };
    if (still) draw();
    else raf = requestAnimationFrame(frame);

    const onLost = (e) => {
      e.preventDefault();
      setFailed(true);
    };
    cv.addEventListener("webglcontextlost", onLost);

    return () => {
      alive = false;
      drawRef.current = null;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", resize);
      cv.removeEventListener("webglcontextlost", onLost);
    };
  }, []);

  return (
    <div className="shader" aria-hidden="true">
      <canvas ref={canvasRef} className="shader-canvas" />
      {failed && <div className="shader-fallback" />}
    </div>
  );
}
