import { useEffect, useRef, useState } from 'react';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader';
import { ConnectionType } from '../types/connection';
// @ts-ignore
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import * as THREE from 'three';

type PlaneRef = THREE.Mesh<THREE.PlaneGeometry, THREE.Material | THREE.Material[]>;

type NullablePlaneRef = PlaneRef | null;

export const useAR = (connectionType: ConnectionType) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [initialized, setInitialized] = useState(false);

  const portPlaneRef = useRef<NullablePlaneRef>(null);
  const imagePlaneRefFront = useRef<NullablePlaneRef>(null);
  const imagePlaneRefBack = useRef<NullablePlaneRef>(null);

  const initPortPlane = (plane: PlaneRef) => {
    //power location
    plane.position.set(-0.38, -0.3, 0);
  };

  const setPortPlane = (plane: PlaneRef, connectionType: ConnectionType) => {
    //set location of power plane based on connection type
    const position = connectionType === 'DSL' ? { x: 0.4, y: -0.3, z: 0 } : { x: 0.3, y: -0.3, z: 0 };
    plane.position.set(position.x, position.y, position.z);
  };
  const initImagePlane = (plane: PlaneRef) => {
    plane.position.set(0, 0, 0);
    plane.scale.set(18, 12, 2);
  };

  const initImagePlane2 = (plane: PlaneRef) => {
    plane.position.set(-0.05, 0.3, 0);
    plane.scale.set(19, 7, 2);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    //MindAR setup
    const mindarThree = new MindARThree({ container, imageTargetSrc: '/targets4.mind' });
    const { renderer, scene, camera, cssRenderer } = mindarThree;
    const anchor = mindarThree.addAnchor(0);
    const anchor2 = mindarThree.addAnchor(1);

    // Port Plane setup
    const portGeometry = new THREE.PlaneGeometry(0.1, 0.1);
    const portMaterial = new THREE.MeshBasicMaterial({
      color: 0xea0a8e,
      transparent: true,
      opacity: 0.5,
    });
    const portPlane = new THREE.Mesh(portGeometry, portMaterial);
    portPlaneRef.current = portPlane;
    initPortPlane(portPlane);
    anchor.group.add(portPlane);

    const createImagePlane = (texturePath: string) => {
      const geometry = new THREE.PlaneGeometry(0.1, 0.1);
      const texture = new THREE.TextureLoader().load(texturePath);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: 0.2 });
      return new THREE.Mesh(geometry, material);
    };
    //create back image plane
    const imagePlane = createImagePlane('/modemback.png');
    imagePlaneRefBack.current = imagePlane;
    anchor.group.add(imagePlane);

    //create front image plane
    const imagePlane2 = createImagePlane('/modemfrontsm.png');
    imagePlaneRefFront.current = imagePlane2;
    anchor2.group.add(imagePlane2);
    initImagePlane(imagePlaneRefBack.current as PlaneRef);
    initImagePlane2(imagePlaneRefFront.current as PlaneRef);

    //load arrow
    const loader = new GLTFLoader();
    loader.load('/arrow.glb', (gltf: GLTF) => {
      const arrow = gltf.scene.children[0] as THREE.Mesh; // Assumes arrow is the first object in your GLTF
      arrow.position.set(0, 0.05, 0); // Adjust position as needed
      arrow.scale.set(0.05, 0.05, 0.05); // Adjust scale as needed
      arrow.material = portMaterial; //
      (portPlaneRef.current as PlaneRef).add(arrow);

      const animationClip = gltf.animations[0];

      // Create a mixer
      const mixer = new THREE.AnimationMixer(arrow);
      const animationAction = mixer.clipAction(animationClip);
      animationAction.play(); // Start the animation
    });

    //start MindAR
    mindarThree.start().then(() => {
      //start animation loop
      renderer.setAnimationLoop(() => {
        renderer.render(scene, camera);
      });
      setInitialized(true);
    });

    return () => {
      //cleanup
      if (renderer) renderer.setAnimationLoop(null);
      if (mindarThree) {
        mindarThree.stop();
        renderer.dispose();
      }
      const elements = document.querySelectorAll('.mindar-ui-overlay');
      elements.forEach((element) => element.remove());
      setInitialized(false);
      console.log('ARViewer cleanup: stopped rendering and MindAR.');
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;
  }, [initialized]);

  return { containerRef };
};