import React,{useMemo,useRef,useState,useEffect} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {OrbitControls,Float} from '@react-three/drei';
import * as THREE from 'three';
function Sculpture({active,angle,compact}){
 const group=useRef();const {invalidate}=useThree();const scroll=useRef(0);
 useEffect(()=>{const fn=()=>{scroll.current=Math.min(window.scrollY/window.innerHeight,1);invalidate()};window.addEventListener('scroll',fn,{passive:true});return()=>window.removeEventListener('scroll',fn)},[invalidate]);
 useEffect(()=>invalidate(),[angle,active,invalidate]);
 const positions=useMemo(()=>{const p=new Float32Array((compact?90:380)*3);for(let i=0;i<p.length;i++){const seed=Math.sin(i*127.1+32.7)*43758.5453;p[i]=((seed-Math.floor(seed))-.5)*13}return p},[compact]);
 useFrame((state,delta)=>{if(!group.current)return;const target=angle+(active?scroll.current*.8:0);group.current.rotation.y=active?THREE.MathUtils.damp(group.current.rotation.y,target,4,delta):target;if(active){group.current.rotation.z=Math.sin(state.clock.elapsedTime*.3)*.07;group.current.rotation.x=THREE.MathUtils.damp(group.current.rotation.x,state.pointer.y*.12,3,delta);state.camera.position.z=THREE.MathUtils.damp(state.camera.position.z,7+scroll.current*1.8,3,delta)} });
 return <><ambientLight intensity={1.3}/><directionalLight position={[3,5,4]} intensity={4} color="#ffe5b1"/><pointLight position={[-4,-1,2]} intensity={30} color="#a89dff"/><pointLight position={[2,-3,3]} intensity={18} color="#e6aa86"/>
 <group ref={group} rotation={[.1,angle,-.12]}>
 <Float speed={active?1.1:0} rotationIntensity={active?.15:0} floatIntensity={active?.2:0}>
 <mesh><sphereGeometry args={[1.12,compact?32:64,32]}/><meshPhysicalMaterial color="#f1dfcc" metalness={.65} roughness={.22} clearcoat={1}/></mesh>
 {[0,1,2].map(i=><mesh key={i} rotation={[Math.PI/2+i*.68,.35+i*.6,i*.5]}><torusGeometry args={[1.8+i*.24,.035+i*.012,12,compact?80:160]}/><meshStandardMaterial color={i===1?'#a89cf8':'#dbb87d'} metalness={.8} roughness={.21} emissive="#b98a52" emissiveIntensity={.15}/></mesh>)}
 <mesh position={[1.9,.9,.6]}><sphereGeometry args={[.16,20,20]}/><meshStandardMaterial color="#e9bf7d" metalness={.7} roughness={.2}/></mesh>
 </Float></group>
 <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/></bufferGeometry><pointsMaterial color="#e1ca9f" size={compact?.022:.018} transparent opacity={.65} sizeAttenuation/></points>
 <OrbitControls enableZoom={false} enablePan={false} enableDamping={false} minPolarAngle={Math.PI*.25} maxPolarAngle={Math.PI*.75}/></>
}
export default function Scene({active,angle}){const compact=window.matchMedia('(pointer: coarse)').matches;return <Canvas className="sculpture-canvas" aria-label="可拖曳旋轉的 SHE 品牌雕塑" frameloop={active?'always':'demand'} dpr={compact?1:[1,1.5]} camera={{position:[0,0,7],fov:42}} gl={{alpha:true,antialias:!compact,powerPreference:'low-power'}} fallback={<div className="scene-message">此裝置顯示靜態品牌主視覺</div>}><Sculpture active={active} angle={angle} compact={compact}/></Canvas>}
