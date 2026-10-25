import {Box3,Object3D,Vector3} from 'three';
/** Blender assets are Y-up, bow -Z, with the origin on the waterline. */
export function fitVessel(model:Object3D,length:number){
 const size=new Box3().setFromObject(model).getSize(new Vector3());
 if(!Number.isFinite(size.z)||size.z<=0||!Number.isFinite(length)||length<=0)throw Error('Invalid vessel dimensions');
 model.scale.multiplyScalar(length/size.z);
 const center=new Box3().setFromObject(model).getCenter(new Vector3());
 model.position.x-=center.x;model.position.z-=center.z;
 return model;
}
export function assetUrl(path:string,base:string){return base.replace(/\/?$/,'/')+path.replace(/^\/+/, '');}
