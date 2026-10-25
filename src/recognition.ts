import {lightVisible,type VesselProfile,type ProfileOptions} from './trainingData';
export type RecognitionView='free'|'bow'|'starboard'|'stern'|'port'|'overhead'|'bridge';
export type StudioSection='encounters'|'lights'|'signals'|'rules';
export const recognitionDefaults=():Required<ProfileOptions>=>({makingWay:true,anchored:false,towLength:150,gearLength:100,composite:false});
export const hasFlashes=(profile:VesselProfile)=>profile.lights.some(l=>l.flashing);
export function recognitionReadout(profile:VesselProfile,night:boolean,bearing:number){
 const lights=night?profile.lights.filter(l=>!l.sector||lightVisible(bearing,l.sector)):[];
 const shapes=night?[]:profile.shapes??[];
 const explanation=night?'Only lights whose horizontal sectors face this observer are shown. Change your viewpoint to compare.':shapes.length?'These black shapes identify the vessel’s condition by day. Their arrangement carries the meaning.':'This condition requires no special day shape. Use Night lights to inspect its navigation lights.';
 return {lights,shapes,explanation};
}
export function viewPosition(view:RecognitionView,length:number){
 const heading=view==='starboard'?90:view==='stern'?180:view==='port'?270:0;
 const r=heading*Math.PI/180;
 return view==='overhead'?{x:0,y:length*2.4,z:-.01}:view==='bridge'?{x:0,y:length*.35,z:length*.16}:{x:Math.sin(r)*length*1.55,y:length*.68,z:-Math.cos(r)*length*1.55};
}
