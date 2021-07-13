/** Scene */

import * as THREE from 'three';
import Config from './config';
import ColliderSystem from '../collider/collider_system';
import ColliderObject from '../collider/collider_object';
import Clamp from '../util/clamp';
import CreateElement from '../util/create_element';
import Loader from '../loader/loader';
import PerlinNoise from '../util/perlin_noise';
import HotSpot from './hot_spot';
import ScreenSpace from '../ui/screen_space';
import RandRange from '../util/rand_range';

class Scene {
  constructor() {
    this.scene = new THREE.Scene();
    this.loader = new Loader('assets/');
    this.colliderSystem = new ColliderSystem();
    this.objects = [];
    this.animations = [];
  }

  bind(root) {
    this.ref = {};
    this.ref.camera = root.modules.camera;
    this.initHeightMap();
    this.initText();
    this.initLighting();
  }

  initText() {
    let mat = new THREE.MeshStandardMaterial({color: 0xffffff, metalness: 0.35, roughness: 0.65});

    let callback = () => {
      let text = 'XAVIERBURROW';
      let p = [
        [-6, 6], [-5, 5], [-5, 2], [-4, 2], [-2, 4], [-2, 2],
        [-2, -2], [-2, -4], [0, -4], [-1, -6], [5, -7], [7, -7],
      ];
      for (let i=0; i<text.length; i++) {
        let mesh = new THREE.Mesh(new THREE.TextGeometry(text[i], {font: this.font, size: 0.75, height: 0.125, bevelEnabled: false}), mat);
        let box = new THREE.Box3().setFromObject(mesh);
        let size = new THREE.Vector3();
        box.getSize(size);
        mesh.geometry.translate(-size.x/2, 0, -size.z/2);
        mesh.position.set(p[i][0], 0, p[i][1]);
        mesh.position.y = this.colliderSystem.getMinimum(mesh.position);
        mesh.rotation.y = (Math.random() * 2 - 1) * Math.PI/4 + Math.PI/4;
        this.scene.add(mesh);

        // object refs
        let obj = {};
        obj.mesh = mesh;
        obj.screenSpace = new ScreenSpace({
          camera: this.ref.camera.camera,
          position: mesh.position,
        });
        obj.el = CreateElement({class: 'overlay__hotspot', innerHTML: 'X'});
        this.objects.push(obj);
        document.querySelector('#overlay').appendChild(obj.el);
      }
    };

    // load font
    let fontLoader = new THREE.FontLoader();
    fontLoader.load('fonts/Karla_Bold.json', font => {
      this.font = font;
      callback();
    });
  }

  initHeightMap() {
    const getHeight = (x, z) => {
      let y = PerlinNoise(x/200, z/200, 1, 8) * 20 - 10;
      y += PerlinNoise(x, z, 1, 8) * 0.5;
      return y;
    };

    // create height map
    let geo = new THREE.PlaneBufferGeometry(15, 15, 50, 50);
    let mat = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      metalness: 0.25,
      roughness: 0.75,
      wireframe: true
    });
    //mat = new THREE.MeshBasicMaterial({color: 0xff00, wireframe: true});
    let mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.set(-Math.PI/2, 0, 0);
    mesh.updateMatrix();
    mesh.geometry.applyMatrix(mesh.matrix);
    mesh.rotation.set(0, 0, 0);
    mesh.updateMatrix();

    // make height map
    for (let i=0; i<geo.attributes.position.array.length; i+=3) {
      let x = geo.attributes.position.array[i];
      let z = geo.attributes.position.array[i+2];
      let y = getHeight(x, z) - 0.05;
      geo.attributes.position.array[i+1] = y;
    }
    geo.computeFaceNormals();

    this.scene.add(mesh);

    // create collision map
    let geo2 = new THREE.PlaneBufferGeometry(15, 15, 14, 14);
    let mesh2 = new THREE.Mesh(geo2, mat);
    mesh2.rotation.set(-Math.PI/2, 0, 0);
    mesh2.updateMatrix();
    mesh2.geometry.applyMatrix(mesh2.matrix);
    mesh2.rotation.set(0, 0, 0);
    mesh2.updateMatrix();

    // make height map
    for (let i=0; i<geo2.attributes.position.array.length; i+=3) {
      let x = geo2.attributes.position.array[i];
      let z = geo2.attributes.position.array[i+2];
      let y = getHeight(x, z);
      geo2.attributes.position.array[i+1] = y;
    }
    geo2.computeVertexNormals();

    this.colliderSystem.addFloor(mesh2);
  }

  initLighting() {
    const model = Config.Renderer.lowQuality ? 1 : 2;
    this.light = {};
    this.light.a1 = new THREE.AmbientLight(0xffffff, 0.75);
    this.light.d1 = new THREE.DirectionalLight(0xffffff, 0.25);
    this.light.d2 = new THREE.DirectionalLight(0xffffff, 0.25);
    this.light.p1 = new THREE.PointLight(0xffffff, 0.25, 30, 2);
    this.light.d1.position.set(0, 0, -1);
    this.light.d2.position.set(1, 0, 1);
    this.light.p1.position.set(0, 10, 0);
    for (const key in this.light) {
      this.scene.add(this.light[key]);
    }
  }

  getColliderSystem() {
    return this.colliderSystem;
  }

  getScene() {
    return this.scene;
  }

  update(delta) {
    this.objects.forEach(obj => {
      obj.screenSpace.update();
      let s = obj.screenSpace.getScreenPosition();
      obj.el.style.left = `${s.x * window.innerWidth}px`;
      obj.el.style.top = `${s.y * window.innerHeight - 100}px`;
    });

    for (let i=this.animations.length-1; i>=0; i--) {
      this.animations[i].update();
      if (!this.animations[i].active) {
        this.animations.splice(i, 1);
      }
    }
  }
}

export default Scene;
