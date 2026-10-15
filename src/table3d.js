// Pişti Card Game - 3D Table & Center Pile Renderer for PocketVibe
import * as THREE from 'three';
import { createCardAtlas, getCardUVs } from './cards.js';

const TABLE_GREEN = 0x18562e; // Deep felt green
const WOOD_BROWN = 0x4a2c16;  // Warm mahogany table rim

export class Table3D {
  constructor(hh) {
    this.hh = hh;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x07140a, 14, 32);

    // Optimized Camera angle focused directly on the center table pile
    this.camera = new THREE.PerspectiveCamera(46, hh.width / hh.height, 0.1, 40);
    this.camera.position.set(0, 7.6, 5.0);
    this.camera.lookAt(0, 0.1, -0.2);
    hh.fitCamera(this.camera);

    // Lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 1.35);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfff6ea, 1.3);
    this.sunLight.position.set(3, 11, 5);
    this.scene.add(this.sunLight);

    // Texture Atlas
    const { texture, cols, rows } = createCardAtlas();
    this.atlasTexture = texture;
    this.cols = cols;
    this.rows = rows;

    this.cardFrontMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      side: THREE.FrontSide,
    });
    this.cardBackMaterial = new THREE.MeshLambertMaterial({
      map: this.atlasTexture,
      side: THREE.FrontSide,
    });

    this.createTable();

    // Card Mesh Pool
    this.cardPool = [];
    this.activeCardMeshes = new Map(); // card.id -> mesh
    this.centerPileMeshes = [];        // array of meshes in center pile
    this.activeAnimations = [];        // moving animations

    this.setupCardPool(56);

    hh.renderer.initTexture(this.atlasTexture);
    hh.renderer.compile(this.scene, this.camera);
  }

  createTable() {
    // 1. Felt Table
    const feltGeom = new THREE.CylinderGeometry(6.8, 6.8, 0.3, 32);
    const feltMat = new THREE.MeshLambertMaterial({ color: TABLE_GREEN });
    this.tableFelt = new THREE.Mesh(feltGeom, feltMat);
    this.tableFelt.position.set(0, -0.15, -0.2);
    this.scene.add(this.tableFelt);

    // 2. Wood Rim
    const rimGeom = new THREE.CylinderGeometry(7.2, 7.2, 0.4, 32);
    const rimMat = new THREE.MeshLambertMaterial({ color: WOOD_BROWN });
    this.tableRim = new THREE.Mesh(rimGeom, rimMat);
    this.tableRim.position.set(0, -0.25, -0.2);
    this.scene.add(this.tableRim);

    // Center Felt Playmat
    const centerMatGeom = new THREE.CircleGeometry(2.3, 32);
    const centerMatMat = new THREE.MeshLambertMaterial({
      color: 0x206637,
      side: THREE.DoubleSide,
    });
    const centerMat = new THREE.Mesh(centerMatGeom, centerMatMat);
    centerMat.rotation.x = -Math.PI / 2;
    centerMat.position.set(0, 0.005, -0.2);
    this.scene.add(centerMat);
  }

  setupCardPool(count = 56) {
    const cardW = 1.15;
    const cardH = 1.62;

    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();

      const geomFront = new THREE.PlaneGeometry(cardW, cardH);
      const meshFront = new THREE.Mesh(geomFront, this.cardFrontMaterial);
      meshFront.rotation.x = -Math.PI / 2;
      group.add(meshFront);

      const geomBack = new THREE.PlaneGeometry(cardW, cardH);
      const meshBack = new THREE.Mesh(geomBack, this.cardBackMaterial);
      meshBack.rotation.x = Math.PI / 2;
      group.add(meshBack);

      this.applyCardUV(meshBack, null, null);

      group.visible = false;
      this.scene.add(group);
      this.cardPool.push({
        group,
        meshFront,
        meshBack,
        inUse: false,
        cardData: null,
      });
    }
  }

  applyCardUV(mesh, suit, rank) {
    const uvs = getCardUVs(suit, rank, this.cols, this.rows);
    const uvAttr = mesh.geometry.attributes.uv;
    uvAttr.setXY(0, uvs[0], uvs[1]);
    uvAttr.setXY(1, uvs[2], uvs[3]);
    uvAttr.setXY(2, uvs[4], uvs[5]);
    uvAttr.setXY(3, uvs[6], uvs[7]);
    uvAttr.needsUpdate = true;
  }

  acquireCardMesh(card, faceUp = true) {
    let poolItem = this.cardPool.find((p) => !p.inUse);
    if (!poolItem) {
      this.setupCardPool(8);
      poolItem = this.cardPool.find((p) => !p.inUse);
    }
    poolItem.inUse = true;
    poolItem.cardData = card;
    poolItem.group.visible = true;

    this.applyCardUV(poolItem.meshFront, card.suit, card.rank);
    poolItem.group.rotation.set(0, 0, faceUp ? 0 : Math.PI);

    this.activeCardMeshes.set(card.id, poolItem);
    return poolItem;
  }

  releaseCardMesh(cardId) {
    const item = this.activeCardMeshes.get(cardId);
    if (item) {
      item.inUse = false;
      item.group.visible = false;
      item.cardData = null;
      this.activeCardMeshes.delete(cardId);
    }
  }

  clearAllCards() {
    for (const item of this.cardPool) {
      item.inUse = false;
      item.group.visible = false;
      item.cardData = null;
    }
    this.activeCardMeshes.clear();
    this.centerPileMeshes = [];
    this.activeAnimations = [];
  }

  // Animate card thrown to center pile
  animateCardToCenter(card, fromPosition, pileIndex = 0, onComplete) {
    const item = this.acquireCardMesh(card, true);
    item.group.position.copy(fromPosition);

    // Natural slight rotation angle in pile
    const jitterAngle = (Math.sin(card.id * 12.3) * 0.16);
    const jitterX = (Math.cos(card.id * 7.7) * 0.06);
    const jitterZ = -0.2 + (Math.sin(card.id * 5.5) * 0.06);

    const targetPos = new THREE.Vector3(jitterX, 0.02 + pileIndex * 0.016, jitterZ);
    const targetRot = new THREE.Vector3(0, jitterAngle, 0);

    const anim = {
      item,
      startPos: fromPosition.clone(),
      targetPos,
      startRot: item.group.rotation.clone(),
      targetRot,
      progress: 0,
      duration: 0.28,
      onComplete: () => {
        this.centerPileMeshes.push(item);
        if (onComplete) onComplete();
      },
    };

    this.activeAnimations.push(anim);
  }

  // Animate initial 4 cards dealt to table (3 down, 1 up)
  dealInitialPile(cards, onComplete) {
    cards.forEach((card, idx) => {
      const isTop = idx === 3;
      const item = this.acquireCardMesh(card, isTop);

      item.group.position.set(0, 3.5, -0.2);
      if (!isTop) {
        item.group.rotation.z = Math.PI; // Face-down
      }

      const jitterAngle = (idx * 0.08);
      const targetPos = new THREE.Vector3(0, 0.02 + idx * 0.016, -0.2);

      this.activeAnimations.push({
        item,
        startPos: new THREE.Vector3(0, 2.5 + idx * 0.2, -0.2),
        targetPos,
        startRot: item.group.rotation.clone(),
        targetRot: new THREE.Vector3(0, jitterAngle, isTop ? 0 : Math.PI),
        progress: 0,
        duration: 0.25 + idx * 0.08,
        onComplete: () => {
          this.centerPileMeshes.push(item);
          if (idx === cards.length - 1 && onComplete) onComplete();
        },
      });
    });
  }

  // Animate entire center pile swept / collected to player's captured stash
  animateCollectPile(targetPosition, onComplete) {
    if (this.centerPileMeshes.length === 0) {
      if (onComplete) onComplete();
      return;
    }

    const meshesToCollect = [...this.centerPileMeshes];
    this.centerPileMeshes = [];

    let completed = 0;
    meshesToCollect.forEach((item, idx) => {
      this.activeAnimations.push({
        item,
        startPos: item.group.position.clone(),
        targetPos: targetPosition.clone().add(new THREE.Vector3(0, 0.1 + idx * 0.01, 0)),
        startRot: item.group.rotation.clone(),
        targetRot: new THREE.Vector3(0, 0, Math.PI),
        progress: 0,
        duration: 0.35,
        onComplete: () => {
          this.releaseCardMesh(item.cardData.id);
          completed++;
          if (completed === meshesToCollect.length && onComplete) {
            onComplete();
          }
        },
      });
    });
  }

  update(dt) {
    for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
      const anim = this.activeAnimations[i];
      anim.progress += dt / anim.duration;

      if (anim.progress >= 1) {
        anim.item.group.position.copy(anim.targetPos);
        anim.item.group.rotation.set(anim.targetRot.x, anim.targetRot.y, anim.targetRot.z);
        this.activeAnimations.splice(i, 1);
        if (anim.onComplete) anim.onComplete();
      } else {
        const ease = 1 - Math.pow(1 - anim.progress, 3);
        anim.item.group.position.lerpVectors(anim.startPos, anim.targetPos, ease);
        const arc = Math.sin(anim.progress * Math.PI) * 0.8;
        anim.item.group.position.y += arc;
      }
    }

    this.hh.renderer.render(this.scene, this.camera);
  }
}
