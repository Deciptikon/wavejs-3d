export default class MeshLoader {
  constructor(scene) {
    this.scene = scene;
    this.loadKey = "saved_epure_wavejs";
    this.mesh = null;

    // Создаем временный canvas для преобразования изображения
    this.tempCanvas = document.createElement("canvas");
    this.tempCtx = this.tempCanvas.getContext("2d");

    this.updateMesh();
  }

  loadData() {
    const imageData = localStorage.getItem(this.loadKey);
    return imageData ? imageData : null;
  }

  urlToImg(createMeshCallback, frameUrl) {
    const img = new Image();
    img.onload = () => {
      this.tempCanvas.width = img.width;
      this.tempCanvas.height = img.height;
      this.tempCtx.drawImage(img, 0, 0);
      const imageData = this.tempCtx.getImageData(0, 0, img.width, img.height);
      createMeshCallback.call(this, imageData); // Важно: сохраняем контекст this
    };
    img.onerror = (error) => {
      console.error("Failed to load image:", error);
    };
    img.src = frameUrl;
  }

  createMesh(imageData) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;

    console.log("Creating mesh from image:", width, "x", height);

    if (this.mesh) {
      this.scene.remove(this.mesh);
    }

    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    const colors = [];
    const uvs = [];
    const indices = [];

    const scaleX = 1;
    const scaleZ = 1;
    const scaleY = 1;

    // Карта для отслеживания индексов вершин (чтобы не добавлять дубликаты)
    const vertexMap = new Map();
    let currentVertexIndex = 0;

    // Функция для получения/создания индекса вершины
    const getVertexIndex = (x, y) => {
      const key = `${x},${y}`;
      if (vertexMap.has(key)) {
        return vertexMap.get(key);
      }

      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];

      // Пропускаем пустые пиксели
      if (r === 150 && g === 100 && b === 100) {
        vertexMap.set(key, -1); // Помечаем как пустую
        return -1;
      }

      // Добавляем вершину
      const brightness = (r + g + b) / 3;
      const heightValue = (brightness / 255) * scaleY;

      vertices.push(x * scaleX, heightValue, y * scaleZ);
      colors.push(heightValue / scaleY, 0.3, 0.8);
      uvs.push(x / width, 1 - y / height);

      vertexMap.set(key, currentVertexIndex);
      return currentVertexIndex++;
    };

    // Создаем вершины и индексы
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        const tl = getVertexIndex(x, y);
        const tr = getVertexIndex(x + 1, y);
        const bl = getVertexIndex(x, y + 1);
        const br = getVertexIndex(x + 1, y + 1);

        // Пропускаем если есть пустые вершины
        if (tl === -1 || tr === -1 || bl === -1 || br === -1) {
          continue;
        }

        // Добавляем два треугольника
        indices.push(tl, tr, bl);
        indices.push(tr, br, bl);
      }
    }

    // Устанавливаем атрибуты
    geometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(vertices, 3)
    );
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe: false,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.x = -(width * scaleX) / 2;
    this.mesh.position.z = -(height * scaleZ) / 2;

    const scale = 0.29;
    const maxH = 5; //1.08;
    const minH = 0; //-0.95;

    const h = maxH - minH;
    const sy = h / 255;
    this.mesh.scale.set(scale, 1, scale);

    this.scene.add(this.mesh);

    console.log(
      "Mesh created with",
      vertices.length / 3,
      "vertices and",
      indices.length / 3,
      "triangles"
    );
  }

  updateMesh() {
    const url = this.loadData();

    // Правильная проверка на null и undefined
    if (url) {
      console.log("Loading mesh from localStorage...");
      this.urlToImg(this.createMesh, url);
    } else {
      console.warn(
        "No image data found in localStorage with key:",
        this.loadKey
      );
    }
  }

  scaleMeshY(scaleY) {
    if (this.meshLoader && this.meshLoader.mesh) {
      this.meshLoader.mesh.scale.y = scaleY;
    }
  }

  // Метод для обновления меша (если данные изменились)
  refresh() {
    this.updateMesh();
  }

  // Метод для удаления меша из сцены
  remove() {
    if (this.mesh) {
      this.scene.remove(this.mesh);
      this.mesh = null;
    }
  }
}
