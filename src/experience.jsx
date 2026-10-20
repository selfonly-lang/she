import React, {useEffect,useState,Suspense,lazy} from 'react';
import {createRoot} from 'react-dom/client';
import {motion,MotionConfig,useReducedMotion,useScroll} from 'motion/react';
const Scene=lazy(()=>import('./scene.jsx'));
class SceneBoundary extends React.Component {state={failed:false};static getDerivedStateFromError(){return {failed:true}}render(){return this.state.failed?<div className="scene-message">靜態品牌主視覺 · 3D 暫時無法使用</div>:this.props.children}}
function Experience(){
 const reduced=useReducedMotion();const [paused,setPaused]=useState(()=>{try{return localStorage.getItem('she-motion')==='off'}catch{return false}});
 const [visible,setVisible]=useState(true);const [inView,setInView]=useState(false);const [ready,setReady]=useState(false);const [angle,setAngle]=useState(0);
 const {scrollYProgress}=useScroll(); const hero=document.getElementById('immersive-stage');
 useEffect(()=>{const t=setTimeout(()=>setReady(true),250);const fn=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',fn);return()=>{clearTimeout(t);document.removeEventListener('visibilitychange',fn)}},[]);
 useEffect(()=>{if(!hero)return;const observer=new IntersectionObserver(([entry])=>setInView(entry.isIntersecting),{rootMargin:'80px'});observer.observe(hero);return()=>observer.disconnect()},[hero]);
 useEffect(()=>{document.documentElement.dataset.motion=paused||reduced?'off':'on';try{localStorage.setItem('she-motion',paused?'off':'on')}catch{}},[paused,reduced]);
 useEffect(()=>{const nodes=[...document.querySelectorAll('.simple-section,.experience-card,.she-page-heading,.card,.product-card')];if(paused||reduced){nodes.forEach(n=>n.classList.add('is-visible'));return}const ob=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('is-visible');ob.unobserve(e.target)}}),{threshold:.06});nodes.forEach(n=>{n.classList.add('reveal');ob.observe(n)});return()=>{ob.disconnect();nodes.forEach(n=>n.classList.remove('reveal'))}},[paused,reduced]);
 const active=!paused&&!reduced&&visible&&inView;
 return <MotionConfig reducedMotion="user"><motion.div className="experience-progress" style={{scaleX:scrollYProgress}}/>
 <div className="experience-tools"><button onClick={()=>setPaused(p=>!p)} aria-pressed={paused||!!reduced}>{paused||reduced?'動效已暫停':'暫停動效'}</button></div>
 {hero&&<HeroPortal target={hero}><div className="scene-poster" aria-hidden="true"><i/><i/><i/></div>{ready&&!reduced&&<SceneBoundary><Suspense fallback={<div className="scene-message">正在準備 3D 場景，內容已可瀏覽</div>}><Scene active={active} angle={angle}/></Suspense></SceneBoundary>}<div className="scene-controls"><span>品牌 3D 雕塑 · 非商品模型</span><div><button aria-label="向左旋轉雕塑" onClick={()=>setAngle(a=>a-.4)}>←</button><button aria-label="重設雕塑角度" onClick={()=>setAngle(0)}>重設</button><button aria-label="向右旋轉雕塑" onClick={()=>setAngle(a=>a+.4)}>→</button></div><small>拖曳旋轉 · 向下滑動探索</small></div></HeroPortal>}
 </MotionConfig>
}
import {createPortal} from 'react-dom';function HeroPortal({target,children}){return createPortal(children,target)}
const root=document.createElement('div');root.id='she-react-experience';document.body.append(root);createRoot(root).render(<Experience/>);
