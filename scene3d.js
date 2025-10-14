import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js";

export default class Scene3d {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.ground = null;
    this.grid = null;

    this.init();
  }

  init() {
    // Создаем сцену
    this.scene = new THREE.Scene();

    // В вашей основной сцене
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 15);
    this.scene.add(directionalLight);

    // Создаем канвас для градиента
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");

    // Рисуем вертикальный градиент
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0.15, "#87CEEB"); // Голубой вверху
    gradient.addColorStop(0.85, "#ee90ecff"); // Зеленый внизу

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Устанавливаем как фон сцены
    this.scene.background = new THREE.CanvasTexture(canvas);

    // Создаем камеру
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 5, -10);
    this.camera.lookAt(0, 0, 0);

    // Создаем рендерер
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Создаем землю
    //this.createGround();

    // Создаем сетку
    this.createGrid();

    // Обработчик изменения размера окна
    window.addEventListener("resize", () => this.onWindowResize());
  }

  getRenderer() {
    return this.renderer;
  }

  createGround() {
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshBasicMaterial({
      color: 0x90ee90, // светло-зеленый
      side: THREE.DoubleSide,
    });

    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = Math.PI / 2;
    this.ground.position.y = 0;
    this.scene.add(this.ground);
  }

  createGrid(size = 10, divisions = 10) {
    if (this.grid) {
      this.scene.remove(this.grid);
    }

    this.grid = new THREE.GridHelper(size, divisions, 0x000000, 0x000000);

    this.grid.material.opacity = 0.2;
    this.grid.material.transparent = true;
    //this.grid.position.y = 0;

    this.scene.add(this.grid);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  getScene() {
    return this.scene;
  }

  getCamera() {
    return this.camera;
  }

  updateCamera(data) {
    const [position, lookAt] = data;

    this.camera.position.set(position.x, position.y, position.z);
    this.camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
  }
}
