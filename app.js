import MeshLoader from "./mesh-loader.js";
import Scene3d from "./scene3d.js";

class Game {
  constructor() {
    this.scene3d = null;
    this.meshLoader = null;
    this.params = {};

    this.keys = {};
    this.isRunning = false;

    // Сферические координаты камеры
    this.cameraRadius = 200; // расстояние до цели
    this.cameraTheta = Math.PI / 4; // вертикальный угол (0 - сверху, π/2 - сбоку)
    this.cameraPhi = Math.PI / 2; // горизонтальный угол

    // Ограничения углов
    this.minTheta = 0.1; // минимальный вертикальный угол
    this.maxTheta = Math.PI - 0.1; // максимальный вертикальный угол

    this.autoRotate = false;

    this.targetPosition = new THREE.Vector3(0, 0, 0);

    // Переменные для управления мышью
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.mouseSensitivity = 0.005;
    this.keySensitivity = 0.3;

    this.globalScale = 0.03;
    this.amplitude = 100;

    this.cellSizeElement = null;
    this.cellSize = 1000;

    this.init();
  }

  init() {
    /** 
    this.globalScaleElement = document.getElementById("globalScale");
    this.globalScale = parseFloat(this.globalScaleElement.value);
    this.globalScaleElement.addEventListener("input", () => {
      this.fullUpdate();
    });

    this.amplitudeElement = document.getElementById("amplitude");
    this.amplitude = parseFloat(this.amplitudeElement.value);
    this.amplitudeElement.addEventListener("input", () => {
      this.amplitude = parseFloat(this.amplitudeElement.value);
      this.meshLoader.centeredMesh(this.globalScale, this.amplitude);
    });*/

    this.cellSizeElement = document.getElementById("cellSize");
    this.cellSize = parseInt(this.cellSizeElement.value);
    document.getElementById("cellSize").addEventListener("change", (e) => {
      this.gridUpdate();
    });

    // Инициализируем менеджер сцены
    this.scene3d = new Scene3d();
    this.meshLoader = new MeshLoader(this.scene3d.getScene());

    setTimeout(() => {
      this.fullUpdate();
      if (this.params.Scale) {
        this.cameraRadius *= Math.sqrt(this.params.Scale);
        this.updateCamera();
      }
    }, 500);

    //this.meshLoader.centeredMesh(this.globalScale, this.amplitude);

    // Настраиваем управление
    this.setupControls();

    this.addControlsInfo();

    // Обновляем камеру с начальными параметрами
    this.updateCamera();

    // Запускаем игровой цикл
    this.start();
  }

  gridUpdate() {
    this.cellSize = parseInt(this.cellSizeElement.value);
    const s = this.meshLoader.getSize();
    const f = this.cellSize * 0.001;
    let p = 10;

    if (s.height && s.width) {
      p = Math.ceil(Math.max(s.width, s.height) * this.globalScale);
    }

    const w = p / f;
    this.scene3d.createGrid(w * f, w);
  }

  fullUpdate() {
    const p = this.loadParams();
    this.params = p;
    console.log(p);

    this.amplitude = p.max - p.min;
    this.globalScale = p.Scale;
    this.cellSize = parseInt(this.cellSizeElement.value);
    this.meshLoader.centeredMesh(this.globalScale, this.amplitude);
    this.gridUpdate();
  }

  loadParams(key = "saved_params_wavejs") {
    console.log("Загрузка метаданных из локального хранилища");

    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  }

  setupControls() {
    // Обработка нажатий клавиш
    window.addEventListener("keydown", (e) => {
      this.keys[e.code] = true;
    });

    window.addEventListener("keyup", (e) => {
      this.keys[e.code] = false;
    });

    // Обработка мыши
    const canvas = this.scene3d.getRenderer().domElement;

    // Нажатие левой кнопки мыши
    canvas.addEventListener("mousedown", (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        canvas.style.cursor = "grabbing";
      }
    });

    // Отпускание кнопки мыши
    canvas.addEventListener("mouseup", (e) => {
      if (e.button === 0) {
        this.isMouseDown = false;
        canvas.style.cursor = "grab";
      }
    });

    // Выход курсора за пределы canvas
    canvas.addEventListener("mouseleave", () => {
      this.isMouseDown = false;
      canvas.style.cursor = "default";
    });

    // Движение мыши
    canvas.addEventListener("mousemove", (e) => {
      if (!this.isMouseDown) return;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;

      // Горизонтальное вращение
      this.cameraPhi += deltaX * this.mouseSensitivity;

      // Вертикальное вращение с ограничениями
      this.cameraTheta -= deltaY * this.mouseSensitivity;
      this.cameraTheta = Math.max(
        this.minTheta,
        Math.min(this.maxTheta, this.cameraTheta)
      );

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      this.updateCamera();
    });

    // Колесо мыши для изменения радиуса
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const zoomSpeed = 0.001;
        this.cameraRadius *= 1 + e.deltaY * zoomSpeed;
        this.cameraRadius = Math.max(3, Math.min(50, this.cameraRadius));
        this.updateCamera();
      },
      { passive: false }
    );

    // Устанавливаем начальный курсор
    canvas.style.cursor = "grab";
  }

  update() {
    let moved = false;

    // Изменение радиуса - приближение/отдаление (Q/E)
    if (this.keys["KeyQ"]) {
      this.cameraRadius *= 0.98;
      this.cameraRadius = Math.max(2, this.cameraRadius);
      moved = true;
    }
    if (this.keys["KeyE"]) {
      this.cameraRadius *= 1.02;
      this.cameraRadius = Math.min(1000, this.cameraRadius);
      moved = true;
    }

    // Горизонтальное вращение (A/D)
    if (this.keys["KeyA"]) {
      //this.cameraPhi += this.keySensitivity;
      this.targetPosition.x -= this.keySensitivity;
      moved = true;
    }
    if (this.keys["KeyD"]) {
      //this.cameraPhi -= this.keySensitivity;
      this.targetPosition.x += this.keySensitivity;
      moved = true;
    }

    // Вертикальное вращение (W/S)
    if (this.keys["KeyW"]) {
      //this.cameraTheta -= this.keySensitivity;
      //this.cameraTheta = Math.max(this.minTheta, this.cameraTheta);
      this.targetPosition.z -= this.keySensitivity;
      moved = true;
    }
    if (this.keys["KeyS"]) {
      //this.cameraTheta += this.keySensitivity;
      //this.cameraTheta = Math.min(this.maxTheta, this.cameraTheta);
      this.targetPosition.z += this.keySensitivity;
      moved = true;
    }

    if (this.autoRotate) {
      moved = true;
      this.cameraPhi += this.mouseSensitivity;
    }

    if (moved) {
      this.updateCamera();
    }
  }

  updateCamera() {
    // Преобразуем сферические координаты в декартовы
    const cameraX =
      this.targetPosition.x +
      this.cameraRadius * Math.sin(this.cameraTheta) * Math.cos(this.cameraPhi);
    const cameraY =
      this.targetPosition.y + this.cameraRadius * Math.cos(this.cameraTheta);
    const cameraZ =
      this.targetPosition.z +
      this.cameraRadius * Math.sin(this.cameraTheta) * Math.sin(this.cameraPhi);

    const cameraPosition = new THREE.Vector3(cameraX, cameraY, cameraZ);

    // Обновляем камеру в сцене
    this.scene3d.updateCamera([cameraPosition, this.targetPosition]);
  }

  animate() {
    if (!this.isRunning) return;

    requestAnimationFrame(() => this.animate());

    this.update();
    this.scene3d.render();
  }

  addControlsInfo() {
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "controls";
    controlsDiv.innerHTML = `
      <strong>Управление:</strong><br>
      Мышь - Вращение<br>
      Колесо - Зум<br>
      A/D - Влево/Вправо<br>
      W/S - Вперёд/Назад<br>
      Q/E - Зум<br>
      <br>
      <br>
      <strong>Экспорт:</strong><br>
      <button id="exportOBJ" class="button">Экспорт в  OBJ </button><br>
      <button id="exportGLTF" class="button">Экспорт в GLTF</button><br>
      <button id="exportSTL" class="button">Экспорт в  STL </button><br>
      <br>
      <button id="autoRotate" class="button">Автовращение</button><br>
      <br>
    `;
    document.body.appendChild(controlsDiv);

    // Добавляем обработчики для кнопок экспорта
    document.getElementById("exportOBJ").addEventListener("click", () => {
      this.exportMeshToOBJ();
    });

    document.getElementById("exportGLTF").addEventListener("click", () => {
      this.exportMeshToGLTF();
    });

    document.getElementById("exportSTL").addEventListener("click", () => {
      this.exportMeshToSTL();
    });

    document.getElementById("autoRotate").addEventListener("click", () => {
      this.switchAutorotate();
    });
  }

  // Экспорт в OBJ
  exportMeshToOBJ() {
    if (!this.meshLoader || !this.meshLoader.mesh) {
      console.warn("No mesh to export");
      return;
    }

    const exporter = new THREE.OBJExporter();
    const result = exporter.parse(this.meshLoader.mesh);
    this.downloadFile(result, "mesh.obj", "text/plain");
  }

  // Экспорт в GLTF
  exportMeshToGLTF() {
    if (!this.meshLoader || !this.meshLoader.mesh) {
      console.warn("No mesh to export");
      return;
    }

    const exporter = new THREE.GLTFExporter();
    exporter.parse(
      this.meshLoader.mesh,
      (gltf) => {
        this.downloadFile(
          JSON.stringify(gltf),
          "mesh.gltf",
          "application/json"
        );
      },
      { binary: false } //{ binary: true } для .glb
    );
  }

  // Экспорт в STL (для 3D печати)
  exportMeshToSTL() {
    if (!this.meshLoader || !this.meshLoader.mesh) {
      console.warn("No mesh to export");
      return;
    }

    const exporter = new THREE.STLExporter();
    const result = exporter.parse(this.meshLoader.mesh, { binary: false });
    this.downloadFile(result, "mesh.stl", "application/octet-stream");
  }

  // Утилита для скачивания файла
  downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  switchAutorotate() {
    this.autoRotate = !this.autoRotate;
    const autoRotateButton = document.getElementById("autoRotate");

    // Переключаем класс в зависимости от состояния
    if (this.autoRotate) {
      autoRotateButton.classList.add("active");
    } else {
      autoRotateButton.classList.remove("active");
    }
  }

  start() {
    this.isRunning = true;
    this.animate();
  }

  stop() {
    this.isRunning = false;
  }
}

// Запускаем игру когда страница загружена
window.addEventListener("DOMContentLoaded", () => {
  new Game();
});
