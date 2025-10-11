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

    // Удаляем старый меш если есть
    if (this.mesh) {
      this.scene.remove(this.mesh);
    }

    // Создаем пустую геометрию
    const geometry = new THREE.BufferGeometry();

    // Массивы для вершин, нормалей, цветов и UV-координат
    const vertices = [];
    const normals = [];
    const colors = [];
    const uvs = [];
    const indices = [];

    // Параметры масштабирования
    const scaleX = 10 / width; // Ширина меша = 10 единиц
    const scaleZ = 10 / width; // Глубина меша = 10 единиц (квадратный)
    const scaleY = 0.5; // Максимальная высота

    let vertexCount = 0;

    // Проходим по каждому пикселю изображения
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Получаем яркость пикселя
        const pixelIndex = (y * width + x) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        const brightness = (r + g + b) / 3;

        // Преобразуем в высоту
        const heightValue = (brightness / 255) * scaleY;

        // Вычисляем позицию вершины
        const posX = x * scaleX - 0; // Центрируем по X (-5 до +5)
        const posZ = y * scaleZ - 0; // Центрируем по Z (-5 до +5)
        const posY = heightValue;

        // Добавляем вершину
        vertices.push(posX, posY, posZ);

        // Добавляем нормаль (временно вертикальную, вычислим позже)
        normals.push(0, 1, 0);

        // Добавляем цвет на основе высоты
        const color = new THREE.Color();
        color.setRGB(heightValue / scaleY, 0.3, 0.8);
        /**if (heightValue < scaleY * 0.3) {
          color.setRGB(0, 0.3, 0.8); // Синий - низкие участки
        } else if (heightValue < scaleY * 0.6) {
          color.setRGB(0.2, 0.7, 0.2); // Зеленый - средние высоты
        } else {
          color.setRGB(0.5, 0.3, 0.1); // Коричневый - высокие участки
        }*/
        colors.push(color.r, color.g, color.b);

        // Добавляем UV-координаты
        uvs.push(x / width, 1 - y / height); // Переворачиваем Y для UV

        vertexCount++;
      }
    }

    console.log("Created", vertexCount, "vertices");

    // Создаем индексы для треугольников (два треугольника на каждый квад из 4 вершин)
    for (let y = 0; y < height - 1; y++) {
      for (let x = 0; x < width - 1; x++) {
        // Индексы четырех вершин текущего квада
        const topLeft = y * width + x;
        const topRight = y * width + (x + 1);
        const bottomLeft = (y + 1) * width + x;
        const bottomRight = (y + 1) * width + (x + 1);

        // Первый треугольник: topLeft -> topRight -> bottomLeft
        indices.push(topLeft, topRight, bottomLeft);

        // Второй треугольник: topRight -> bottomRight -> bottomLeft
        indices.push(topRight, bottomRight, bottomLeft);
      }
    }

    console.log("Created", indices.length / 3, "triangles");

    // Преобразуем массивы в типизированные массивы
    const positionArray = new Float32Array(vertices);
    const normalArray = new Float32Array(normals);
    const colorArray = new Float32Array(colors);
    const uvArray = new Float32Array(uvs);
    const indexArray = new Uint32Array(indices);

    // Устанавливаем атрибуты геометрии
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positionArray, 3)
    );
    geometry.setAttribute("normal", new THREE.BufferAttribute(normalArray, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));
    geometry.setAttribute("uv", new THREE.BufferAttribute(uvArray, 2));
    geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));

    // Вычисляем нормали (это перезапишет наши временные нормали)
    geometry.computeVertexNormals();

    // Создаем материал
    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe: false,
      side: THREE.DoubleSide,
    });

    // Создаем меш
    this.mesh = new THREE.Mesh(geometry, material);

    // Поворачиваем для вида сверху (если нужно)
    this.mesh.position.x = -(width * scaleX) / 2;
    this.mesh.position.z = -(height * scaleZ) / 2;

    // Добавляем в сцену
    this.scene.add(this.mesh);

    console.log("Mesh created successfully with manual geometry");
  }

  // Метод для добавления цветов на основе высоты
  addVertexColors(geometry) {
    const colors = [];
    const positions = geometry.attributes.position.array;

    for (let i = 0; i < positions.length; i += 3) {
      const height = positions[i + 1] / 2; // нормализованная высота (0-1)

      const color = new THREE.Color();

      color.setRGB(1.0, 0.3, 0.8);
      /** 
      // Градиент в зависимости от высоты
      if (height < 0.3) {
        color.setRGB(0, 0.3, 0.8); // синий - низкие участки
      } else if (height < 0.6) {
        color.setRGB(0.2, 0.7, 0.2); // зеленый - средние высоты
      } else {
        color.setRGB(0.5, 0.3, 0.1); // коричневый - высокие участки
      }*/

      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
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
