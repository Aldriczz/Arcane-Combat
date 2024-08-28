import * as THREE from "./threejs/threejs/build/three.module.js";
import { OrbitControls } from "./threejs/threejs/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "./threejs/threejs/examples/jsm/loaders/GLTFLoader.js";
import { FontLoader } from "./threejs/threejs/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "./threejs/threejs/examples/jsm/geometries/TextGeometry.js";
let scene,
  camera1, title,
  camera2,
  currentCamera,
  renderer,
  controls,
  player,
  raycaster,
  raycaster2,
  gameOver = false,
  gameOverText,
  level = 1,
  ammo = 30,
  totalAmmo = 210,
  isReload = false,
  isCollectBullet = false,
  boss,
  bossAction,
  changeAct = false,
  bossDeadFlag = false,
  levPopUp = document.querySelector(".popup-text");
let actionReload;
let spotLight;
let lev = document.querySelector("#level");
let ammoDiv = document.querySelector("#ammo");
let bossHealthBar = document.querySelector("#bossHealthBar");
let bossBarMain = document.querySelector("#bossHealthBarFrame");
let playerHealthBar = document.querySelector("#playerHealthBar");
const clock = new THREE.Clock();
let bullet = [];
let projectiles = [];
let projectilesAll = [];
let shotProjectiles = [];
let key = {};
let enemies = [];
let seconds = 0;
let bulletSupply;
let mixerEnvironment, mixerFps;
let firstMove = false;
let camera3;
class Player {
  constructor() {
    this.mixer = null;
    this.animationsMap = new Map();
    this.currentAction = null;
    this.model = null;
    this.speed = 0.15;
    this.dx = 0;
    this.dx2 = 0;
    this.health = 100;
    this.flashLight = new THREE.SpotLight(
      "white",
      10,
      100,
      Math.PI / 10,
      0.5,
      10
    );
    this.flashLight.position.set(200, 10, 200);
    this.fps;
    this.health = 100;
    this.currentHealth = 100;
    this.invicible = false;

    new GLTFLoader().load("./assets/model/Soldier.glb", (gltf) => {
      this.model = gltf.scene;
      this.model.scale.set(1.7, 1.7, 1.7);
      this.model.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });

      this.model.position.set(200, 0, 200);
      scene.add(this.model);

      const gltfAnimations = gltf.animations;
      this.mixer = new THREE.AnimationMixer(this.model);
      gltfAnimations
        .filter((a) => a.name !== "TPose")
        .forEach((a) => {
          this.animationsMap.set(a.name, this.mixer.clipAction(a));
        });

      this.playAnimation("Idle");
    });

    new GLTFLoader().load("./assets/model/fps.glb", (gltf) => {
      this.fps = gltf.scene;
      let animations = gltf.animations;
      mixerFps = new THREE.AnimationMixer(this.fps);
      actionReload = mixerFps.clipAction(animations[0]);

      this.fps.scale.set(2, 2, 2);
      this.fps.traverse((object) => {
        if (object.isMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
      this.fps.rotation.y = Math.PI;
      this.fps.position.set(200, 4, 200);
      scene.add(this.fps);
    });
  }

  playAnimation(name) {
    if (this.currentAction && this.currentAction.getClip().name === name) {
      return;
    }

    if (this.currentAction) {
      this.currentAction.fadeOut(0.5);
    }

    const action = this.animationsMap.get(name);
    if (action) {
      action.reset().fadeIn(0.5).play();
      this.currentAction = action;
    }
  }

  update(deltaTime) {
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    if (this.model && this.fps) {
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera1.quaternion);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(camera1.quaternion);
      right.y = 0;
      right.normalize();

      const moveDirection = new THREE.Vector3();
      moveDirection.addScaledVector(right, this.dx);
      moveDirection.addScaledVector(forward, this.dx2);

      if (moveDirection.length() > 0) {
        moveDirection.normalize();

        const angle = Math.atan2(-moveDirection.x, -moveDirection.z);

        this.model.rotation.y = angle;

        camera1.position.set(
          this.model.position.x,
          this.model.position.y + 3.6,
          this.model.position.z
        );

        this.fps.position.set(
          this.model.position.x + moveDirection.x,
          this.model.position.y + 2.4,
          this.model.position.z + moveDirection.z
        );

        this.model.position.addScaledVector(moveDirection, this.speed);
        this.playAnimation("Run");

        spotLight.position.set(
          this.model.position.x,
          this.model.position.y + 10,
          this.model.position.z
        );
        spotLight.target = this.model;

        this.flashLight.position.set(
          this.model.position.x,
          this.model.position.y + 2,
          this.model.position.z
        );
        this.flashLight.angle = angle;
        this.flashLight.target.position.set(
          this.model.position.x + moveDirection.x,
          this.model.position.y + 2,
          this.model.position.z + moveDirection.z
        );
        this.flashLight.target.updateMatrixWorld();
        scene.add(this.flashLight);
        if (
          this.model.position.x + this.dx < 0 ||
          this.model.position.x + this.dx > 200 ||
          this.model.position.z + this.dx2 < 0 ||
          this.model.position.z + this.dx2 > 200
        ) {
          if (this.model.position.x < 0) {
            this.model.position.x = 0;
          } else if (this.model.position.x > 200) {
            this.model.position.x = 200;
          }
          if (this.model.position.z < 0) {
            this.model.position.z = 0;
          } else if (this.model.position.z > 200) {
            this.model.position.z = 200;
          }
        }
        if (
          this.model.position.x > 190 &&
          this.model.position.z > 190 &&
          totalAmmo < 210 &&
          isCollectBullet === false
        ) {
          totalAmmo = 210;
          scene.remove(bulletSupply);
          isCollectBullet = true;
        } else if (
          this.model.position.x > 190 &&
          this.model.position.z > 190 &&
          isCollectBullet === true
        ) {
          {
            setTimeout(() => {
              isCollectBullet = false;
              scene.add(bulletSupply);
            }, 30000);
          }
        }
      } else {
        this.playAnimation("Idle");
      }
    }
  }

  leftMove() {
    this.dx = -this.speed;
  }

  rightMove() {
    this.dx = this.speed;
  }

  frontMove() {
    this.dx2 = this.speed;
  }

  backMove() {
    this.dx2 = -this.speed;
  }

  stop() {
    this.dx = 0;
    this.dx2 = 0;
  }

  shoot() {
    if (ammo !== 0) {
      ammo -= 1;
      ammoDiv.innerHTML = ammo + " / " + totalAmmo;
      let cube = createBullet();
      cube.position.set(
        this.model.position.x,
        this.model.position.y + 2,
        this.model.position.z
      );
      bullet.push(cube);
      scene.add(cube);
    }
  }

  reduceHealth() {
    if(this.invicible === false){
      this.currentHealth -= 20;
      playerHealthBar.style.width = (this.currentHealth / this.health) * 100 + "%";
      if (this.currentHealth <= 0) {
        gameOverFunc("die");
      }
      this.invicible = true;
      setTimeout(() => {
        this.invicible = false;
      }, 3000);
    }
  }
}

class Enemy {
  constructor(object) {
    this.x = Math.floor(Math.random() * 1000) % 200;
    this.y = 2;
    this.z = Math.floor(Math.random() * 1000) % 200;
    this.object = object;
    this.speed = 1;
    this.dx;
    this.dx2;
    this.health = 100 + level * 20;
    this.healthBar = this.createHealthBar();
    scene.add(this.healthBar);
    this.object.position.set(this.x, this.y, this.z);
  }
  update() {
    if (
      this.x + this.dx < 0 ||
      this.x + this.dx > 200 ||
      this.z + this.dx2 < 0 ||
      this.z + this.dx2 > 200
    ) {
      return;
    } else {
      this.x += this.dx || 0;
      this.z += this.dx2 || 0;
      this.object.position.set(this.x, this.y, this.z);

      this.healthBar.position.set(this.x, this.y + 7, this.z);
    }
  }

  leftMove() {
    this.dx = -this.speed;
  }

  rightMove() {
    this.dx = this.speed;
  }

  frontMove() {
    this.dx2 = this.speed;
  }

  backMove() {
    this.dx2 = -this.speed;
  }

  stop() {
    this.dx = 0;
    this.dx2 = 0;
  }

  moveEnemy() {
    switch (Math.floor(Math.random() * 100) % 4) {
      case 0:
        this.leftMove();
        break;
      case 1:
        this.rightMove();
        break;
      case 2:
        this.frontMove();
        break;
      case 3:
        this.backMove();
        break;
    }
  }

  reduceHealth() {
    this.health -= 20;
    this.healthBar.scale.x = this.health / 100;
    switch (this.health) {
      case 80:
        this.healthBar.material.color.set("yellow");
        break;
      case 60:
        this.healthBar.material.color.set("orange");
        break;
      case 40:
        this.healthBar.material.color.set("red");
        break;
      case 20:
        this.healthBar.material.color.set("purple");
        break;
    }
    if (this.health <= 0) {
      scene.remove(this.object);
      scene.remove(this.healthBar);
      enemies = enemies.filter((e) => e.object !== this.object);
    }
  }

  createHealthBar() {
    let bar = new THREE.BoxGeometry(3, 0.6, 0.3);
    let material = new THREE.MeshBasicMaterial({ color: "green" });
    return new THREE.Mesh(bar, material);
  }

  changeColor() {
    this.object.material.color.set("blue");
  }
}

class Boss {
  constructor() {
    this.model = null;
    this.animations = [];
    this.mixer = null;
    this.action = null;
    this.currentAction = "attack";
    this.dx = 0;
    this.dx2 = 0;
    this.speed = 0.98;
    this.health = 1000;
    this.currentHealth = 1000;
    this.meleeAttack = false;
    this.isAlive = false;

    new GLTFLoader().load(
      "assets/model/tarisland_-_dragon_high_poly/scene.gltf",
      (gltf) => {
        this.model = gltf.scene;
        this.animations = gltf.animations;
        this.mixer = new THREE.AnimationMixer(this.model);
        this.action = this.mixer.clipAction(this.animations[19]);
        this.action.time = 134.1;
        this.action.play();

        this.model.traverse((object) => {
          if (object.isMesh) {
            object.castShadow = true;
            object.receiveShadow = true;
          }
        });
        this.model.scale.set(1, 1, 1);
        this.model.position.set(100, 2, 100);
      }
    );
  }

  changeAnimation(animation) {
    if (this.action) {
      this.action.stop();
    }
    this.action = this.mixer.clipAction(this.animations[animation]);

    switch (animation) {
      case 19:
        this.currentAction = "idle";
        this.action.time = 118;
        break;
      case 15:
        this.currentAction = "attack";
        this.action.time = 97;
        break;
      case 3:
        this.currentAction = "die";
        this.action.time = 18;
        break;
      case 26:
        this.currentAction = "walk";
        this.action.time = 134.1;
        break;
      case 18:
        this.currentAction = "melee_attack";
        this.action.time = 114.9;
        break;
    }
    this.action.play();
  }

  animate(deltaTime) {
    if (
      boss.currentAction === "melee_attack" &&
      boss.action.time > 116.5 &&
      player.model &&
      player.model.position.distanceTo(boss.model.position) < 35 &&
      this.meleeAttack === true
    ) {
      this.meleeAttack = false;
      player.reduceHealth();
    }
    if (boss.action.time > 99.6 && boss.currentAction === "attack") {
      this.shotProjectile();
    }
    if (boss.action.time > 135.7 && boss.currentAction === "walk") {
      boss.action.time = 134.1;
    } else if (boss.action.time > 121.3 && boss.currentAction === "idle") {
      boss.action.time = 118;
      createEnemy("boss");
    } else if (boss.action.time > 103.58 && boss.currentAction === "attack") {
      boss.action.time = 96.5;
    } else if (boss.action.time > 117.9 && boss.currentAction === "melee_attack") {
      this.meleeAttack = false;
      seconds = 790;
      boss.action.time = 114.5;
    }else if(boss.action.time > 25.8 && boss.currentAction === "die" && bossDeadFlag === true){
      scene.remove(this.model);
      bossBarMain.style.display = "none";
      this.isAlive = false;
      enemies.forEach((enemy) => {
        scene.remove(enemy.object);
        scene.remove(enemy.healthBar);
      });
      enemies = [];
      bossDeadFlag = false;
    }
    if(boss.mixer !== null){
      boss.mixer.update(deltaTime);
    }
  }

  move() {
    if (this.model) {
      let angle;
      const forward = new THREE.Vector3(0, 0, -1);
      forward.applyQuaternion(camera2.quaternion);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(camera2.quaternion);
      right.y = 0;
      right.normalize();

      const moveDirection = new THREE.Vector3();
      moveDirection.addScaledVector(right, this.dx);
      moveDirection.addScaledVector(forward, this.dx2);

      if (moveDirection.length() > 0) {
        moveDirection.normalize();
        angle = Math.atan2(-moveDirection.x, -moveDirection.z);
        this.model.rotation.y = -angle;
      }
      this.model.position.addScaledVector(moveDirection, this.speed);

      if (this.model.position.x < 0) {
        this.model.position.x = 0;
        this.model.rotation.y = angle;
      } else if (this.model.position.x > 200) {
        this.model.position.x = 200;
        this.model.rotation.y = angle;
      }
      if (this.model.position.z < 0) {
        this.model.position.z = 0;
        this.model.rotation.y = angle;
      } else if (this.model.position.z > 200) {
        this.model.position.z = 200;
        this.model.rotation.y = angle;
      }
      if (seconds % 30 === 0) {
        let projectile = createProjectile();
        projectile.position.set(
          this.model.position.x + (Math.floor(Math.random() * 100) % 10),
          this.model.position.y,
          this.model.position.z + (Math.floor(Math.random() * 100) % 10)
        );
        projectilesAll.push(projectile);
        scene.add(projectile);
      }

      if (seconds % 30 === 0) {
        let projectile = createProjectile();
        projectile.position.set(
          this.model.position.x + 1,
          this.model.position.y,
          this.model.position.z + 1
        );
        shotProjectiles.push(projectile);
        scene.add(projectile);
      }
    }
  }

  direction() {
    if (seconds % 300 === 0) {
      switch (Math.floor(Math.random() * 100) % 4) {
        case 0:
          this.leftMove();
          break;
        case 1:
          this.rightMove();
          break;
        case 2:
          this.frontMove();
          break;
        case 3:
          this.backMove();
          break;
      }
    }
  }

  control() {
    if(this.currentHealth <= 0 && this.isAlive === true && bossDeadFlag === false){
      bossDeadFlag = true;
      seconds = -1000;
      this.changeAnimation(3);
      return;
    }
    if (
      player.model.position.distanceTo(boss.model.position) <= 35 &&
      player.model &&
      this.currentAction !== "walk" &&
      this.currentAction !== "melee_attack"
    ) {
      this.changeAnimation(18);
      this.meleeAttack = true;
      return;
    }
    if (seconds % 800 === 0) {
      changeAct = true;
      bossAction = Math.floor(Math.random() * 100) % 4;

      if (
        (bossAction === 1 && this.currentAction === "idle") ||
        (this.currentAction === "attack" && bossAction === 2)
      ) {
        bossAction = 0;
      }
    }
    switch (bossAction) {
      case 0:
        if (changeAct === true) {
          this.changeAnimation(26);
          changeAct = false;
        }
        if (seconds % 4 === 0) {
          boss.direction();
          boss.move();
        }
        break;
      case 1:
        if (changeAct === true) {
          this.changeAnimation(19);
          changeAct = false;
        }
        break;
      case 2:
        if (changeAct === true) {
          this.changeAnimation(15);
          changeAct = false;
        }
        break;
    }
  }

  shotProjectile() {
    for (let i = 0; i < 5; i++) {
      let projectile = createProjectile();
      projectile.position.set(
        this.model.position.x + i * 5,
        this.model.position.y,
        this.model.position.z + i * 5
      );
      projectiles.push(projectile);
      scene.add(projectile);
    }
  }

  leftMove() {
    this.dx = -this.speed;
  }
  rightMove() {
    this.dx = this.speed;
  }
  frontMove() {
    this.dx2 = this.speed;
  }
  backMove() {
    this.dx2 = -this.speed;
  }
  stop() {
    this.dx = 0;
    this.dx2 = 0;
  }

  reduceHealth(){
    this.currentHealth -= 20;
    bossHealthBar.style.width = (this.currentHealth / this.health) * 100 + "%";
  }
}

window.addEventListener("keydown", (e) => {
  let input = e.key;
  key[input] = true;
  if(currentCamera === camera3){
    return;
  }
  if (currentCamera === camera1) {
    renderer.domElement.requestPointerLock();
  }
  if (gameOver === false) {
    switch (input.toLowerCase()) {
      case "a":
        firstMove = true;
        player.leftMove();
        break;
      case "d":
        firstMove = true;
        player.rightMove();
        break;
      case "w":
        firstMove = true;
        player.frontMove();
        break;
      case "s":
        firstMove = true;
        player.backMove();
        break;
      case "f":
        if (player.flashLight.visible) {
          player.flashLight.visible = !player.flashLight.visible;
        } else {
          player.flashLight.visible = !player.flashLight.visible;
        }
        break;
      case "r":
        reload();
        break;
    }
  } else if (gameOver === true) {
    if (input === "e") {
      gameOverFunc("revive");
    }
  }
});

window.addEventListener("keyup", (e) => {
  let input = e.key;
  key[input] = false;

  if (!key["a"] && !key["d"] && !key["w"] && !key["s"]) {
    player.stop();
  }
});

const createProjectile = () => {
  const sphere = new THREE.SphereGeometry(
    1,
    32,
    32,
    0,
    Math.PI * 2,
    0,
    Math.PI * 2
  );
  const material = new THREE.MeshStandardMaterial({
    color: "red",
    flatShading: true,
    metalness: 0.5,
    roughness: 0.5,
  });
  let mesh = new THREE.Mesh(sphere, material);
  mesh.receiveShadow = true;
  return mesh;
};

const createCylinder = () => {
  const loader = new THREE.TextureLoader();
  const cylinder = new THREE.CylinderGeometry(
    Math.floor(Math.random() + 1),
    Math.random() + 1,
    (Math.floor(Math.random() * 100) % 10) + 5,
    32
  );
  const material = new THREE.MeshPhongMaterial({
    color: "red",
    flatShading: true,
    map: loader.load("./assets/texture/enemy.png_3"),
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(cylinder, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const createCube = () => {
  let geometry = new THREE.BoxGeometry(4, 4, 4);
  let material = new THREE.MeshStandardMaterial({ color: "red" });
  let cube = new THREE.Mesh(geometry, material);
  cube.castShadow = true;
  cube.receiveShadow = true;
  return cube;
};

const createBullet = () => {
  let headGeo = new THREE.ConeGeometry(0.08, 0.5, 32);
  let headMaterial = new THREE.MeshBasicMaterial({ color: "yellow" });
  let head = new THREE.Mesh(headGeo, headMaterial);

  let bodyGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.7, 32);
  let bodyMaterial = new THREE.MeshBasicMaterial({ color: "yellow" });
  let body = new THREE.Mesh(bodyGeo, bodyMaterial);

  body.position.set(0, 0, 0);
  body.rotation.x = Math.PI / 2;
  head.position.set(0, 0, -0.6);
  head.rotation.x = -Math.PI / 2;

  let bullet = new THREE.Group();
  bullet.add(head);
  bullet.add(body);

  return bullet;
};

const createPlane = (width, height) => {
  let plane = new THREE.PlaneGeometry(width, height);
  let material = new THREE.MeshStandardMaterial({
    color: "gray",
    side: THREE.DoubleSide,
  });
  let mesh = new THREE.Mesh(plane, material);
  mesh.receiveShadow = true;
  mesh.receiveShadow = true;
  return mesh;
};

const createPointLight = () => {
  const light = new THREE.PointLight("white", 1, 500, 2, 10);
  let lightHelper = new THREE.PointLightHelper(light, 1, "white");
  light.castShadow = true;
  scene.add(lightHelper);
  return light;
};

const createSpotLight = () => {
  let light = new THREE.SpotLight("white", 4, 500, Math.PI / 10, 1, 20);
  let lightHelper = new THREE.SpotLightHelper(light);
  return light;
};

const init = () => {
  const fontLoader = new FontLoader();
  fontLoader.load(
    "./threejs/threejs/examples/fonts/helvetiker_bold.typeface.json",
    (font) => {
      const geometry = new TextGeometry(
        "      You Died" + "\n\n" + "Press E to Revive",
        {
          font: font,
          size: 20,
          height: 3,
        }
      );
      const material = new THREE.MeshBasicMaterial({ color: "white" });
      gameOverText = new THREE.Mesh(geometry, material);
      gameOverText.position.set(30, 80, 150);
      gameOverText.rotation.y = Math.PI / 3.7;
      gameOverText.visible = false;

      scene.add(gameOverText);
    }
  );

  fontLoader.load(
    "./threejs/threejs/examples/fonts/helvetiker_bold.typeface.json",
    (font) => {
      const geometry = new TextGeometry(
        "Arcane Combat",
        {
          font: font,
          size: 2,
          height: 0.12,
          bold: true,

        }
      );
      const material = new THREE.MeshBasicMaterial({ color: "white" });
      title = new THREE.Mesh(geometry, material);
      title.position.set(202.5, 4.5, 205);
      title.rotation.y = Math.PI / 1.33;

      scene.add(title);
    }
  );
  raycaster = new THREE.Raycaster();
  raycaster2 = new THREE.Raycaster();
  scene = new THREE.Scene();
  scene.background = new THREE.Color("green");

  camera1 = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera1.position.set(203, 5, 208);

  camera2 = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1500
  );
  camera2.position.set(230, 40, 230);

  camera3 = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1500
  );
  camera3.position.set(202, 3, 195);
  camera3.rotation.y = Math.PI / 1.4 ;

  currentCamera = camera3;

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera2, renderer.domElement);
  controls.enablePan = true;
  controls.enableZoom = true;
  controls.enableRotate = true;

  player = new Player();
  boss = new Boss();
  createEnemy("normal");

  lev.innerHTML = "Level: " + level;
  ammoDiv.innerHTML = ammo + " / " + totalAmmo;

  new GLTFLoader().load("assets/model/env.glb", (gltf) => {
    let model = gltf.scene;
    let animation = gltf.animations;

    mixerEnvironment = new THREE.AnimationMixer(model);
    let action = mixerEnvironment.clipAction(animation[0]);
    action.play();

    model.traverse((object) => {
      if (object.isMesh) {
        object.fog = false;
        object.receiveShadow = true;
      }
    });
    model.scale.set(1.3, 0.5, 1.3);
    model.position.set(110, 2, 70);
    scene.add(model);
  });

  let skyBox = new THREE.BoxGeometry(1000, 1000, 1000);
  let skyBoxLoader = new THREE.TextureLoader();
  let skyMaterial = [
    new THREE.MeshBasicMaterial({
      map: skyBoxLoader.load("./assets/texture/green_sky/Back.png"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: skyBoxLoader.load("./assets/texture/green_sky/Front.png"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: skyBoxLoader.load("./assets/texture/green_sky/Top.png"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: skyBoxLoader.load("./assets/texture/green_sky/Bottom.png"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: skyBoxLoader.load("./assets/texture/green_sky/Right.png"),
      side: THREE.BackSide,
    }),
    new THREE.MeshBasicMaterial({
      map: skyBoxLoader.load("./assets/texture/green_sky/Left.png"),
      side: THREE.BackSide,
    }),
  ];
  let sky = new THREE.Mesh(skyBox, skyMaterial);
  scene.add(sky);

  let platform = createPlane(200, 200);
  platform.rotation.x = Math.PI / 2;
  platform.receiveShadow = true;
  platform.position.set(100, 0, 100);
  scene.add(platform);

  let pointLight = createPointLight();
  pointLight.position.set(100, 300, 100);
  pointLight.castShadow = true;
  pointLight.shadow.bias = -0.0001;
  pointLight.shadow.mapSize.width = 2048; 
  pointLight.shadow.mapSize.height = 2048;
  scene.add(pointLight);

  spotLight = createSpotLight();
  spotLight.position.set(200, 5, 200);
  spotLight.castShadow = true;
  scene.add(spotLight);

  let startLight = createPointLight();
  startLight.position.set(200, 10, 200);
  startLight.castShadow = true;
  scene.add(startLight);

  let areaSupply = createPlane(10, 10);
  areaSupply.position.set(195, 1, 195);
  areaSupply.rotation.x = Math.PI / 2;
  areaSupply.material.color.set("#fafa05");

  bulletSupply = createBullet();
  bulletSupply.position.set(195, 2, 195);
  bulletSupply.scale.set(4, 4, 4);

  let objects = [bulletSupply, areaSupply];

  objects.forEach((obj) => {
    scene.add(obj);
  });
};

// Render loop
const render = () => {
  const deltaTime = clock.getDelta();
  bulletSupply.rotation.y += 0.01;
  seconds += 1;
  player.update(deltaTime);
  if (mixerFps) {
    mixerFps.update(deltaTime);
  }
  if (mixerEnvironment) {
    mixerEnvironment.update(deltaTime);
  }
  if (boss.mixer && level % 3 == 0) {
    boss.animate(deltaTime);
    if(boss.isAlive === true && bossDeadFlag === false){
      boss.control();
    }

    console.log(boss.action.time);
    console.log(boss.currentAction);
  }
  // console.log(enemies.length);
  if (enemies.length === 0 && gameOver === false && boss.isAlive === false) {
    levelUp();
  }
  if (seconds % 10 === 0) {
    enemies.forEach((enemy) => {
      enemy.moveEnemy();
      enemy.update();
      enemy.object.material.color.set("red");

      if (player.model) {
        if (player.model.position.distanceTo(enemy.object.position) < 10) {
          enemy.object.material.color.set("purple");
        }
        if (player.model.position.distanceTo(enemy.object.position) < 5) {
          player.reduceHealth();
        }
      }
    });
  }

  if (player.fps && firstMove == false) {
    player.fps.visible = false;
  } else if (player.fps && firstMove === true && currentCamera === camera1) {
    player.fps.visible = true;
  }

  animate();
  renderer.render(scene, currentCamera);
  requestAnimationFrame(render);
};

const reload = () => {
  actionReload.play();
  isReload = true;
  checkReload();
};

const checkReload = () => {
  const duration = actionReload.getClip().duration;
  const curr = actionReload.time;

  if (curr >= 2.3) {
    actionReload.stop();
    isReload = false;
    if(ammo > 0){
      totalAmmo -= 30 - ammo;
      ammo = 30;
    }else if (totalAmmo >= 30) {
      ammo = 30;
      totalAmmo -= ammo;
    }else{
      ammo = totalAmmo;
      totalAmmo = 0;
    }
    ammoDiv.innerHTML = ammo + " / " + totalAmmo;
  }
};

//animation
const animate = () => {
  if (ammo === 0 && isReload === false && totalAmmo > 0) {
    reload();
  }
  if (isReload) {
    checkReload();
  }
  if (boss.model) {
    projectiles.forEach((b, index) => {
      const direction = new THREE.Vector3(0, 0, 1);
      direction.applyQuaternion(boss.model.quaternion);
      direction.normalize();

      const speed = 2;
      b.position.addScaledVector(direction, speed);

      if (
        b.position.z < 5 ||
        b.position.z > 205 ||
        b.position.x < 5 ||
        b.position.x > 205 ||
        gameOver === true
      ) {
        scene.remove(b);
        projectiles.splice(index, 1);
      }
      if (player.model.position.distanceTo(b.position) < 3) {
        player.reduceHealth();
      }
    });
    projectilesAll.forEach((b, index) => {
      const randomDirection = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      );
      randomDirection.normalize();

      const speed = 0.08;
      b.position.addScaledVector(randomDirection, speed);

      if (
        b.position.z < -5 ||
        b.position.z > 205 ||
        b.position.x < 5 ||
        b.position.x > 205 ||
        b.position.y < -2 ||
        b.position.y > 4 ||
        gameOver === true
      ) {
        scene.remove(b);
        projectilesAll.splice(index, 1);
      }
      if (player.model.position.distanceTo(b.position) < 3) {
        player.reduceHealth();
      }
    });
    shotProjectiles.forEach((b, index) => {
      const randomDirection = new THREE.Vector3(0, 0, 1);
      randomDirection.applyQuaternion(boss.model.quaternion);
      randomDirection.normalize();

      const speed = 0.08;
      randomDirection.y = 0;
      b.position.addScaledVector(randomDirection, speed);
      if (
        b.position.z < 5 ||
        b.position.z > 205 ||
        b.position.x < 0 ||
        b.position.x > 205 ||
        b.position.y < -2 ||
        b.position.y > 4 ||
        gameOver === true
      ) {
        scene.remove(b);
        shotProjectiles.splice(index, 1);
      }
      b.rotation.y = Math.atan2(-randomDirection.x, -randomDirection.z);
      if (player.model.position.distanceTo(b.position) < 3) {
        player.reduceHealth();
      }
    });
  }
  bullet.forEach((b, index) => {
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera1.quaternion);
    direction.normalize();

    const speed = 2;
    b.position.addScaledVector(direction, speed);

    if (
      b.position.z < 0 ||
      b.position.z > 200 ||
      b.position.x < 0 ||
      b.position.x > 200
    ) {
      scene.remove(b);
      bullet.splice(index, 1);
    }
    b.position.y = 3;
    b.rotation.y = Math.atan2(-direction.x, -direction.z);
    raycaster.set(b.position, direction);
    const intersects = raycaster.intersectObjects(enemies.map((e) => e.object));

    if (intersects.length > 0) {
      scene.remove(b);
      bullet.splice(index, 1);
      enemies
        .find((enemy) => enemy.object === intersects[0].object)
        .changeColor();
      enemies
        .find((enemy) => enemy.object === intersects[0].object)
        .reduceHealth();
    }

    if(b.position.distanceTo(boss.model.position) < 10){
      scene.remove(b);
      bullet.splice(index, 1);
      boss.reduceHealth();
    }
  });
};

window.onload = () => {
  init();
  render();
};

const gameOverFunc = (type) => {
  if (type === "die") {
    enemies.forEach((enemy) => {
      scene.remove(enemy.object);
      scene.remove(enemy.healthBar);
    });
    enemies.length = 0;
    scene.remove(boss.model);
    boss.isAlive = false;
    bossBarMain.style.display = "none";

    gameOver = true;
    currentCamera = camera2;
    gameOverText.visible = true;
  } else if (type === "revive") {
    player.currentHealth = 100;
    playerHealthBar.style.width = "100%";
    gameOver = false;
    currentCamera = camera1;
    gameOverText.visible = false;
    player.model.position.set(200, 0, 200);
    camera1.position.set(203, 5, 208);
    level = 1;
    lev.innerHTML = "Level: " + level;
    createEnemy("normal");
  }
};

const createEnemy = (type) => {
  if (type === "boss") {
    for (let i = 0; i < 5; i++) {
      let enemy = new Enemy(createCube());
      enemies.push(enemy);
      scene.add(enemy.object);
    }
  } else {
    for (let i = 0; i < level * 3; i++) {
      let enemy = new Enemy(createCylinder());
      enemies.push(enemy);
      scene.add(enemy.object);
    }
  }
};

const levelUp = () => {
  level += 1;
  lev.innerHTML = "Level " + level;
  levPopUp.innerHTML = "Level " + level;
  showLevelUpPopup();

  if (level % 3 == 0) {
    boss.isAlive = true;
    scene.add(boss.model);
    boss.health = 5000 * level / 3;
    boss.currentHealth = boss.health;
    bossBarMain.style.display = "flex";
  } else {
    createEnemy("normal");
  }
};

function showLevelUpPopup() {
  levPopUp.style.display = "block";
  levPopUp.style.opacity = 1;

  setTimeout(() => {
    levPopUp.style.opacity = 0; 
    setTimeout(() => {
      levPopUp.style.display = "none"; 
    }, 500);
  }, 2000); 
}

window.addEventListener("resize", () => {
  camera1.aspect = window.innerWidth / window.innerHeight;
  camera1.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener("keypress", (e) => {
  if (e.key.charCodeAt(0) === 32) {
    if(currentCamera === camera3){
      currentCamera = camera1;
      let healthBar = document.querySelector("#playerHealthBarFrame");
      let intro = document.querySelector("#intro");
      let crossHair = document.querySelector("#crossHair);
      crossHair.style.display = "flex";
      intro.style.display = "none";
      title.visible = false; 
      healthBar.style.display = "flex";
      lev.style.display = "flex";
      ammoDiv.style.display = "flex";
    }
    else if (currentCamera === camera1) {
      currentCamera = camera2;
      firstMove = false;
    } else {
      renderer.domElement.requestPointerLock();
      currentCamera = camera1;
      firstMove = true;
    }
  }
});

window.addEventListener("mousemove", (e) => {
  if (
    document.pointerLockElement === renderer.domElement &&
    currentCamera == camera1
  ) {
    player.model.rotation.y -= e.movementX * 0.002;
    camera1.rotation.y -= e.movementX * 0.002;
    if (player.fps) {
      player.fps.rotation.y -= e.movementX * 0.002;
    }
    camera1.updateProjectionMatrix();
  }
});

window.addEventListener("mouseup", (e) => {
  if (currentCamera === camera1) {
    player.shoot();
  }
});
