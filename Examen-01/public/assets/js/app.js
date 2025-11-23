window.addEventListener("DOMContentLoaded", function () {
  var canvas = document.getElementById("renderCanvas");
  var engine = new BABYLON.Engine(canvas, true);

  // --- CONFIGURACIÓN DE AJUSTE (¡LA CLAVE!) ---
  // Si el pasto sigue muy alto, pon un número más negativo (ej: -20)
  // Si el pasto tapa al jugador, pon un número más cercano a 0 (ej: -2)
  var ALTURA_MAPA = -272;

  // Variables de Juego
  var playerMesh = null;
  var itemEnMano = null;
  var itemsEnCaja = 0;
  var playerAnim = null;
  var inputMap = {};
  var itemsSueltos = [];
  var cajasDestino = [];
  var inventario = 0;
  var textoInventario = null; // Referencia al texto en pantalla
  var iconoInventario = null; // Referencia a la imagen

  var createScene = function () {
    var scene = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;

    // 1. AMBIENTE
    scene.clearColor = new BABYLON.Color3(0.4, 0.7, 0.9); // Cielo azul
    var highlightLayer = new BABYLON.HighlightLayer("hl1", scene);

    // 2. LUCES
    var hemiLight = new BABYLON.HemisphericLight(
      "hemi",
      new BABYLON.Vector3(0, 1, 0),
      scene
    );
    hemiLight.intensity = 0.6;

    var dirLight = new BABYLON.DirectionalLight(
      "dir",
      new BABYLON.Vector3(-1, -2, -1),
      scene
    );
    dirLight.position = new BABYLON.Vector3(50, 50, 50);
    dirLight.intensity = 0.8;

    // 3. SUELO INVISIBLE (Seguridad)
    var ground = BABYLON.MeshBuilder.CreateGround(
      "ground",
      { width: 200, height: 200 },
      scene
    );
    ground.isVisible = false;

    // 4. CÁMARA
    var camera = new BABYLON.ArcRotateCamera(
      "cam",
      -Math.PI / 0.7,
      Math.PI / 3,
      80,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvas, true);

    // --- AJUSTES DE VELOCIDAD ---
    camera.angularSensibilityX = 500; // Menor número = Mouse más rápido (Default es 1000)
    camera.angularSensibilityY = 500;
    camera.wheelPrecision = 10; // Zoom más rápido (Default 50, menor es más rápido)

    // ==========================================
    // CARGA DE ASSETS
    // ==========================================

    // A. EL MAPA (Bajándolo para que no flote)
    BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "./assets/models/low_poly_farm/",
      "scene.gltf",
      scene
    ).then((result) => {
      var mapRoot = result.meshes[0];
      mapRoot.scaling = new BABYLON.Vector3(10, 10, 10); // Escala x10

      // ¡AQUÍ ESTÁ EL TRUCO! Bajamos el mapa
      mapRoot.position = new BABYLON.Vector3(0, ALTURA_MAPA, 0);

      console.log("Mapa cargado y ajustado a altura: " + ALTURA_MAPA);
    });

    // B. JUGADOR
    BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "./assets/models/farmer/",
      "scene.gltf",
      scene
    ).then((result) => {
      playerMesh = result.meshes[0];
      playerMesh.scaling = new BABYLON.Vector3(0.05, 0.05, 0.05);
      playerMesh.position = new BABYLON.Vector3(0, 0.1, 0);
      playerMesh.checkCollisions = true;

      // --- GUARDAR ANIMACIÓN ---
      if (result.animationGroups.length > 0) {
        playerAnim = result.animationGroups[0];
        playerAnim.play(true); // Iniciar
        playerAnim.speedRatio = 0; // Pero pausada (quieto)
      }

      var camTarget = BABYLON.MeshBuilder.CreateBox(
        "camTarget",
        { size: 0.1 },
        scene
      );
      camTarget.isVisible = false;
      camTarget.parent = playerMesh;
      camTarget.position.y = 1000;
      camera.lockedTarget = camTarget;
    });

    // C. CAJA (Con Hitbox Ancho)
    BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "./assets/models/crate/",
      "scene.gltf",
      scene
    )
      .then((result) => {
        var caja = result.meshes[0];
        caja.scaling = new BABYLON.Vector3(25, 25, 25); // Visual
        caja.position = new BABYLON.Vector3(55, 25, 5);

        // --- HITBOX INVISIBLE ---
        var cajaHitbox = BABYLON.MeshBuilder.CreateBox(
          "cajaHitbox",
          { size: 1 },
          scene
        );
        cajaHitbox.position = caja.position.clone();

        // AJUSTE DE CENTRO (Subir mitad de altura)
        cajaHitbox.position.y += 12.5;

        // --- AQUÍ LO HACEMOS MÁS ANCHO ---
        // X=35, Z=35 (Más ancho que la visual de 25)
        // Y=25 (Misma altura)
        cajaHitbox.scaling = new BABYLON.Vector3(35, 25, 35);

        cajaHitbox.isVisible = false;
        cajaHitbox.checkCollisions = true; // El jugador chocará antes de tocar la caja visual

        cajasDestino.push(caja);
      })
      .catch(() => {
        // Fallback (Caja Falsa)
        var cajaFake = BABYLON.MeshBuilder.CreateBox(
          "cajaFake",
          { size: 25 },
          scene
        );
        cajaFake.position = new BABYLON.Vector3(55, 12.5, 5);
        cajaFake.checkCollisions = true;
        cajasDestino.push(cajaFake);
      });

    // D. CALABAZAS (Ejes X/Z Aleatorios + Anti-Superposición + Brillo)
    BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "./assets/models/pumpkin/",
      "scene.gltf",
      scene
    ).then((result) => {
      var molde = result.meshes[0];
      molde.setEnabled(false);

      var posicionesOcupadas = [];

      for (var i = 0; i < 10; i++) {
        var x = 0,
          z = 0;
        var esValida = false;
        var intentos = 0;

        // --- ALGORITMO ANTI-SUPERPOSICIÓN ---
        while (!esValida && intentos < 100) {
          // EJE X (Izquierda/Derecha)
          x = Math.random() * 1600 - 800;

          // EJE Z (Adelante/Atrás) <--- AQUÍ ESTÁ EL CAMBIO QUE PEDISTE
          z = Math.random() * 1600 - 800;

          esValida = true;
          for (var k = 0; k < posicionesOcupadas.length; k++) {
            if (
              BABYLON.Vector3.Distance(
                new BABYLON.Vector3(x, 0, z),
                posicionesOcupadas[k]
              ) < 40
            ) {
              esValida = false;
              break;
            }
          }
          intentos++;
        }
        posicionesOcupadas.push(new BABYLON.Vector3(x, 0, z));

        // Crear Clon
        var clon = molde.clone("calabaza_" + i, null);
        clon.setEnabled(true);
        clon.scaling = new BABYLON.Vector3(10, 10, 10);
        clon.position = new BABYLON.Vector3(x, 12, z);

        // Hitbox Invisible
        var hitBox = BABYLON.MeshBuilder.CreateBox(
          "hit_" + i,
          { size: 1 },
          scene
        );
        hitBox.scaling = new BABYLON.Vector3(30, 10, 30);
        hitBox.position = clon.position.clone();
        hitBox.position.y += 5;
        hitBox.isVisible = false;
        hitBox.checkCollisions = true;
        hitBox.parent = clon;

        itemsSueltos.push(clon);

        // SOLO BRILLO (Sin haz de luz)
        highlightLayer.addMesh(clon, BABYLON.Color3.Yellow());
      }
    });

    // ==========================================
    // CONTROLES DE MOVIMIENTO (WASD)
    // ==========================================
    scene.actionManager = new BABYLON.ActionManager(scene);
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnKeyDownTrigger,
        (evt) => (inputMap[evt.sourceEvent.key.toLowerCase()] = true)
      )
    );
    scene.actionManager.registerAction(
      new BABYLON.ExecuteCodeAction(
        BABYLON.ActionManager.OnKeyUpTrigger,
        (evt) => (inputMap[evt.sourceEvent.key.toLowerCase()] = false)
      )
    );

    // ==========================================
    // GAME LOOP (Movimiento + Botón Inteligente)
    // ==========================================
    scene.onBeforeRenderObservable.add(() => {
      if (!playerMesh) return;

      // --- 1. LÓGICA DE BOTÓN (UI) ---
      var mostrarBoton = false;
      var textoBoton = "";

      // Buscar calabaza cercana (Radio aumentado a 35 para superar el hitbox)
      var itemCercanoUI = null;
      if (!itemEnMano) {
        itemCercanoUI = itemsSueltos.find(
          (item) =>
            item.isEnabled() &&
            !item.parent &&
            BABYLON.Vector3.Distance(playerMesh.position, item.position) < 35
        );
        if (itemCercanoUI) {
          mostrarBoton = true;
          textoBoton = "RECOGER (E)";
          btnAccion.background = "orange";
        }
      }

      // Buscar caja cercana (Radio 35)
      var cajaCercanaUI = null;
      if (itemEnMano) {
        cajaCercanaUI = cajasDestino.find(
          (caja) =>
            BABYLON.Vector3.Distance(playerMesh.position, caja.position) < 35
        );
        if (cajaCercanaUI) {
          mostrarBoton = true;
          textoBoton = "ENTREGAR (E)";
          btnAccion.background = "green";
        }
      }

      // Mostrar u ocultar botón
      if (mostrarBoton) {
        btnAccion.isVisible = true;
        btnAccion.children[0].text = textoBoton;
      } else {
        btnAccion.isVisible = false;
      }

      // 2. MOVIMIENTO + SPRINT (SHIFT)
      // Detectar Shift (Izquierdo o Derecho)
      var isSprinting = inputMap["shift"] || inputMap["Shift"];
      var baseSpeed = isSprinting ? 3.4 : 1.7; // Doble velocidad si Shift

      var moveVector = new BABYLON.Vector3(0, 0, 0);
      var forward = camera.getForwardRay().direction;
      forward.y = 0;
      forward = forward.normalize();
      var right = new BABYLON.Vector3(forward.z, 0, -forward.x);

      if (inputMap["w"]) moveVector.addInPlace(forward);
      if (inputMap["s"]) moveVector.subtractInPlace(forward);
      if (inputMap["d"]) moveVector.addInPlace(right);
      if (inputMap["a"]) moveVector.subtractInPlace(right);

      var isMoving = false;
      if (moveVector.length() > 0) {
        isMoving = true;
        moveVector = moveVector.normalize().scale(baseSpeed);
        playerMesh.position.addInPlace(moveVector);

        var targetRotation = Math.atan2(moveVector.x, moveVector.z);
        targetRotation += 0;

        if (!playerMesh.rotationQuaternion)
          playerMesh.rotationQuaternion =
            BABYLON.Quaternion.RotationYawPitchRoll(
              playerMesh.rotation.y,
              0,
              0
            );
        var targetQuaternion = BABYLON.Quaternion.RotationYawPitchRoll(
          targetRotation,
          0,
          0
        );
        playerMesh.rotationQuaternion = BABYLON.Quaternion.Slerp(
          playerMesh.rotationQuaternion,
          targetQuaternion,
          0.15
        );
      }

      // --- CONTROL DE ANIMACIÓN ---
      if (playerAnim) {
        if (isMoving) {
          // Si corre (Shift), animación rápida (1.5). Si camina, normal (1.0)
          playerAnim.speedRatio = isSprinting ? 1.5 : 1.0;
        } else {
          // Si no se mueve, congelar animación
          playerAnim.speedRatio = 0;
        }
      }

      // --- 3. INTERACCIÓN (TECLA E) ---
      if (inputMap["e"] || inputMap["E"]) {
        inputMap["e"] = false;
        inputMap["E"] = false;

        // RECOGER
        if (!itemEnMano && itemCercanoUI) {
          highlightLayer.removeMesh(itemCercanoUI);
          itemCercanoUI.setParent(playerMesh);
          // Ajuste de posición en mano (calibrado para tu escala)
          itemCercanoUI.position = new BABYLON.Vector3(50, 805, -605);
          itemCercanoUI.rotation = new BABYLON.Vector3(0, 0, 0);

          // ¡IMPORTANTE! Desactivar colisión del hitbox hijo para no atrapar al jugador
          itemCercanoUI
            .getChildMeshes()
            .forEach((m) => (m.checkCollisions = false));

          itemEnMano = itemCercanoUI;
          console.log("¡Calabaza cargada!");
        }
        // ENTREGAR
        else if (itemEnMano && cajaCercanaUI) {
          itemEnMano.setParent(null);
          itemEnMano.position = cajaCercanaUI.position.clone();
          itemEnMano.position.y = 1.5 + itemsEnCaja * 1.2;

          // Reactivar colisión al soltarla (opcional, para que haga bulto)
          itemEnMano
            .getChildMeshes()
            .forEach((m) => (m.checkCollisions = true));

          itemEnMano = null;
          itemsEnCaja++;
          console.log("¡Entregada!");
        }
      }
    });

    // ==========================================
    // PEGAR ESTO: INTERFAZ DE USUARIO (GUI)
    // ==========================================
    var advancedTexture =
      BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // Contenedor del inventario (Abajo al centro)
    var panelInventario = new BABYLON.GUI.StackPanel();
    panelInventario.width = "200px";
    panelInventario.height = "100px";
    panelInventario.verticalAlignment =
      BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    advancedTexture.addControl(panelInventario);

    // Fondo del slot (Cuadro gris estilo Minecraft)
    var slot = new BABYLON.GUI.Rectangle();
    slot.width = "80px";
    slot.height = "80px";
    slot.thickness = 4;
    slot.color = "#3d3d3d";
    slot.background = "#8b8b8b";
    panelInventario.addControl(slot);

    // Imagen de la calabaza (Usa tu textura existente como icono)
    // NOTA: Asegúrate que esta ruta coincida con la textura de tu calabaza
    iconoInventario = new BABYLON.GUI.Image(
      "icon",
      "./assets/models/pumpkin/pumpkin_tex.png"
    );
    iconoInventario.width = "60px";
    iconoInventario.height = "60px";
    iconoInventario.isVisible = false; // Invisible hasta que recojas una
    slot.addControl(iconoInventario);

    // Número contador
    textoInventario = new BABYLON.GUI.TextBlock();
    textoInventario.text = "0";
    textoInventario.color = "white";
    textoInventario.fontSize = 24;
    textoInventario.fontFamily = "monospace";
    textoInventario.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    textoInventario.textVerticalAlignment =
      BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    textoInventario.paddingRight = "5px";
    textoInventario.paddingBottom = "5px";
    textoInventario.isVisible = false;
    slot.addControl(textoInventario);
    // ==========================================
    // --- BOTÓN DEACCIÓN CONTEXTUAL ---
    var btnAccion = BABYLON.GUI.Button.CreateSimpleButton(
      "btnAccion",
      "ENTREGAR (E)"
    );
    btnAccion.width = "200px";
    btnAccion.height = "60px";
    btnAccion.color = "white";
    btnAccion.background = "green";
    btnAccion.cornerRadius = 10;
    btnAccion.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER; // Centro pantalla
    btnAccion.top = "-50px"; // Un poco arriba
    btnAccion.isVisible = false; // Oculto hasta acercarse
    advancedTexture.addControl(btnAccion);

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
