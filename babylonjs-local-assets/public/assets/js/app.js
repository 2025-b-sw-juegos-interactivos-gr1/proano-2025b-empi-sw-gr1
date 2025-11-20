window.addEventListener("DOMContentLoaded", function () {
  var canvas = document.getElementById("renderCanvas");
  var engine = new BABYLON.Engine(canvas, true);

  var createScene = function () {
    var scene = new BABYLON.Scene(engine);

    // --- 1. CÁMARA Y LUCES ---
    var camera = new BABYLON.FreeCamera(
      "camera1",
      new BABYLON.Vector3(0, 5, -15),
      scene
    );
    camera.setTarget(BABYLON.Vector3.Zero());
    camera.attachControl(canvas, true);

    var light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    light.intensity = 0.9;

    // --- 2. FIGURAS GEOMÉTRICAS (PRIMITIVAS) ---

    // Caja de Madera
    var woodMat = new BABYLON.StandardMaterial("woodMat", scene);
    woodMat.diffuseTexture = new BABYLON.Texture(
      "./assets/textures/madera.jpg",
      scene
    );
    var box = BABYLON.MeshBuilder.CreateBox("box", { size: 2 }, scene);
    box.position = new BABYLON.Vector3(-4, 1, 0);
    box.material = woodMat;

    // Esfera de Mármol
    var marbleMat = new BABYLON.StandardMaterial("marbleMat", scene);
    marbleMat.diffuseTexture = new BABYLON.Texture(
      "./assets/textures/marmol.jpg",
      scene
    );
    var sphere = BABYLON.MeshBuilder.CreateSphere(
      "sphere",
      { diameter: 2 },
      scene
    );
    sphere.position = new BABYLON.Vector3(-1.5, 1, 0);
    sphere.material = marbleMat;

    // Cilindro de Metal
    var metalMat = new BABYLON.StandardMaterial("metalMat", scene);
    metalMat.diffuseTexture = new BABYLON.Texture(
      "./assets/textures/metal.jpg",
      scene
    );
    var cylinder = BABYLON.MeshBuilder.CreateCylinder(
      "cylinder",
      { height: 2, diameter: 1.5 },
      scene
    );
    cylinder.position = new BABYLON.Vector3(1.5, 1, 0);
    cylinder.material = metalMat;

    // Torus de Ladrillo
    var brickMat = new BABYLON.StandardMaterial("brickMat", scene);
    brickMat.diffuseTexture = new BABYLON.Texture(
      "./assets/textures/ladrillo.jpg",
      scene
    );
    var torus = BABYLON.MeshBuilder.CreateTorus(
      "torus",
      { diameter: 2, thickness: 0.5 },
      scene
    );
    torus.position = new BABYLON.Vector3(4, 1, 0);
    torus.material = brickMat;

    // Suelo de Césped
    var groundMat = new BABYLON.StandardMaterial("groundMat", scene);
    groundMat.diffuseTexture = new BABYLON.Texture(
      "./assets/textures/cesped.jpg",
      scene
    );
    var ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 12, height: 12 },
      scene
    );
    ground.material = groundMat;

    // --- 3. YETI IMPORTADO (GRANDE Y ATRÁS) ---
    // Ajustes: Z = 8 (Atrás), Escala = 0.4 (Grande)

    BABYLON.SceneLoader.ImportMeshAsync(
      null,
      "./assets/models/",
      "Yeti.gltf",
      scene
    )
      .then((result) => {
        const meshes = result.meshes;
        if (meshes && meshes.length) {
          const yeti = meshes[0];

          // ESCALADO: Hacemos al Yeti más grande (0.4 en lugar de 0.1)
          yeti.scaling = new BABYLON.Vector3(0.4, 0.4, 0.4);

          // POSICIÓN: Lo movemos hacia atrás (z = 8) y aseguramos que esté en el suelo (y = 0)
          yeti.position = new BABYLON.Vector3(0, 0, 8);

          console.log("¡Yeti GIGANTE cargado atrás!");
        }
      })
      .catch((err) => {
        console.error("Error cargando el Yeti:", err);
      });

    return scene;
  };

  var scene = createScene();

  engine.runRenderLoop(function () {
    scene.render();
  });

  window.addEventListener("resize", function () {
    engine.resize();
  });
});
