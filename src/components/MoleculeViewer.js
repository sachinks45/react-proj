import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const MoleculeViewer = () => {
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const [loadingMessage, setLoadingMessage] = useState('Loading aspirin molecule...');
  const moleculeGroupRef = useRef(new THREE.Group());

  useEffect(() => {
    let scene, camera, controls;

    const init = () => {
      console.log('Initializing Three.js scene...');
      if (!mountRef.current) {
        console.error('Mount ref is null, cannot initialize');
        return;
      }

      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x000000);

      camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.offsetWidth / mountRef.current.offsetHeight,
        0.1,
        1000
      );
      camera.position.z = 10;

      rendererRef.current = new THREE.WebGLRenderer({ antialias: true });
      rendererRef.current.setSize(mountRef.current.offsetWidth, mountRef.current.offsetHeight);
      mountRef.current.appendChild(rendererRef.current.domElement);
      console.log('Renderer appended to DOM, canvas size:', 
        rendererRef.current.domElement.width, 
        rendererRef.current.domElement.height);

      controls = new OrbitControls(camera, rendererRef.current.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
      directionalLight.position.set(10, 10, 10);
      scene.add(directionalLight);

      // Test rendering with a simple cube immediately
      const testGeometry = new THREE.BoxGeometry(2, 2, 2);
      const testMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
      const testCube = new THREE.Mesh(testGeometry, testMaterial);
      scene.add(testCube);
      console.log('Added test green cube to scene');

      loadMolecule(scene, camera, controls);
    };

    const loadMolecule = (scene, camera, controls) => {
      console.log('Fetching molecule.mol...');
      fetch('/molecule.mol')
        .then((response) => {
          if (!response.ok) throw new Error(`Fetch failed with status ${response.status}`);
          return response.text();
        })
        .then((molData) => {
          console.log('Molecule data loaded:', molData.substring(0, 100));
          moleculeGroupRef.current = parseMolFile(molData);
          scene.add(moleculeGroupRef.current);

          const box = new THREE.Box3().setFromObject(moleculeGroupRef.current);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);

          console.log('Bounding box center:', center, 'Size:', size);
          camera.position.copy(center);
          camera.position.z += maxDim * 2;
          controls.target.copy(center);

          setLoadingMessage('');
          console.log('Aspirin molecule loaded and added to scene');
          animate(scene, camera, controls);
        })
        .catch((error) => {
          console.error('Error loading molecule:', error);
          setLoadingMessage('Error loading aspirin molecule - showing fallback');
          const geometry = new THREE.BoxGeometry(2, 2, 2);
          const material = new THREE.MeshPhongMaterial({ color: 0xff0000 });
          const cube = new THREE.Mesh(geometry, material);
          moleculeGroupRef.current = cube;
          scene.add(cube);
          animate(scene, camera, controls);
        });
    };

    const parseMolFile = (molData) => {
      console.log('Parsing MOL file...');
      const lines = molData.split('\n').map((line) => line.replace(/\r/g, ''));
      const atoms = [];
      const bonds = [];

      const headerLine = lines[3];
      const numAtoms = parseInt(headerLine.substring(0, 3).trim(), 10);
      const numBonds = parseInt(headerLine.substring(3, 6).trim(), 10);
      console.log(`Parsed header - Atoms: ${numAtoms}, Bonds: ${numBonds}`);

      if (isNaN(numAtoms) || isNaN(numBonds)) {
        console.error('Invalid header line:', headerLine);
        throw new Error('Failed to parse MOL file header');
      }

      for (let i = 0; i < numAtoms; i++) {
        const line = lines[i + 4];
        console.log('Parsing atom line:', line);
        const x = parseFloat(line.substring(0, 10).trim());
        const y = parseFloat(line.substring(10, 20).trim());
        const z = parseFloat(line.substring(20, 30).trim());
        const element = line.substring(31, 34).trim();
        if (isNaN(x) || isNaN(y) || isNaN(z)) {
          console.error('Invalid coordinates at line', i + 4, ':', line);
        }
        atoms.push({ position: new THREE.Vector3(x, y, z), element });
      }

      const bondStartLine = 4 + numAtoms;
      for (let i = 0; i < numBonds; i++) {
        const line = lines[bondStartLine + i];
        console.log('Parsing bond line:', line);
        const atom1 = parseInt(line.substring(0, 3).trim(), 10) - 1;
        const atom2 = parseInt(line.substring(3, 6).trim(), 10) - 1;
        const order = parseInt(line.substring(6, 9).trim(), 10);
        if (isNaN(atom1) || isNaN(atom2) || isNaN(order)) {
          console.error('Invalid bond data at line', bondStartLine + i, ':', line);
        }
        bonds.push({ atom1, atom2, order });
      }

      return createMoleculeGeometry(atoms, bonds);
    };

    const createMoleculeGeometry = (atoms, bonds) => {
      const group = new THREE.Group();
      const atomColors = {
        'C': 0x808080, // Gray
        'O': 0xff0000, // Red
        'H': 0xffffff  // White
      };

      console.log('Creating geometry for', atoms.length, 'atoms and', bonds.length, 'bonds');
      atoms.forEach((atom, index) => {
        const radius = atom.element === 'H' ? 0.3 : 0.5;
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshPhongMaterial({
          color: atomColors[atom.element] || 0x808080,
          shininess: 100,
        });
        const sphere = new THREE.Mesh(geometry, material);
        sphere.position.copy(atom.position);
        group.add(sphere);
        console.log(`Added atom ${index + 1}: ${atom.element} at`, atom.position);
      });

      bonds.forEach((bond, index) => {
        const atom1 = atoms[bond.atom1];
        const atom2 = atoms[bond.atom2];
        const start = atom1.position;
        const end = atom2.position;

        const createBond = (offset) => {
          const direction = new THREE.Vector3().subVectors(end, start);
          const length = direction.length();
          const geometry = new THREE.CylinderGeometry(0.1, 0.1, length, 8);
          const material = new THREE.MeshPhongMaterial({ color: 0xcccccc });
          const cylinder = new THREE.Mesh(geometry, material);

          const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
          cylinder.position.copy(midpoint);

          cylinder.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            direction.clone().normalize()
          );

          if (offset !== 0) {
            const axis = new THREE.Vector3().crossVectors(direction, new THREE.Vector3(0, 1, 0)).normalize();
            cylinder.position.add(axis.multiplyScalar(offset));
          }

          return cylinder;
        };

        switch (bond.order) {
          case 2:
            group.add(createBond(0.15));
            group.add(createBond(-0.15));
            break;
          case 3:
            group.add(createBond(0.2));
            group.add(createBond(0));
            group.add(createBond(-0.2));
            break;
          default:
            group.add(createBond(0));
            break;
        }
        console.log(`Added bond ${index + 1}: ${bond.atom1 + 1} - ${bond.atom2 + 1}, order: ${bond.order}`);
      });

      console.log('Geometry created with', group.children.length, 'objects');
      return group;
    };

    const animate = (scene, camera, controls) => {
      console.log('Starting animation loop');
      const render = () => {
        requestAnimationFrame(render);
        if (moleculeGroupRef.current) {
          moleculeGroupRef.current.rotation.z += 0.005;
          moleculeGroupRef.current.rotation.y += 0.005;
        }
        controls.update();
        rendererRef.current.render(scene, camera);
      };
      render();
    };

    const handleResize = () => {
      if (mountRef.current && rendererRef.current) {
        camera.aspect = mountRef.current.offsetWidth / mountRef.current.offsetHeight;
        camera.updateProjectionMatrix();
        rendererRef.current.setSize(mountRef.current.offsetWidth, mountRef.current.offsetHeight);
        console.log('Resized renderer to', mountRef.current.offsetWidth, 'x', mountRef.current.offsetHeight);
      }
    };

    init();
    window.addEventListener('resize', handleResize);

    return () => {
      console.log('Cleaning up...');
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && rendererRef.current && mountRef.current.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="middle-container" ref={mountRef}>
      {loadingMessage && <div className="loading">{loadingMessage}</div>}
    </div>
  );
};

export default MoleculeViewer;