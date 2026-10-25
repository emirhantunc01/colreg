import {describe,it,expect} from 'vitest';
import {BoxGeometry,Mesh,MeshBasicMaterial,Box3,Vector3} from 'three';
import {fitVessel,assetUrl} from './vesselModel';
describe('Blender model placement',()=>{
 it('scales length and centres horizontally while preserving the authored waterline',()=>{
  const mesh=new Mesh(new BoxGeometry(4,10,20).translate(2,3,4),new MeshBasicMaterial());
  fitVessel(mesh,40);
  const box=new Box3().setFromObject(mesh),size=box.getSize(new Vector3()),centre=box.getCenter(new Vector3());
  expect(size.z).toBeCloseTo(40);expect(centre.x).toBeCloseTo(0);expect(centre.z).toBeCloseTo(0);expect(box.min.y).toBeCloseTo(-4);expect(mesh.position.y).toBe(0);
 });
 it('rejects empty geometry rather than introducing an infinite scale',()=>{expect(()=>fitVessel(new Mesh(),20)).toThrow();});
 it('resolves model paths under deployment subdirectories',()=>{expect(assetUrl('models/tanker.glb','/colreg/')).toBe('/colreg/models/tanker.glb');});
});
