window.addEventListener("DOMContentLoaded", function () {
  var canvas = document.getElementById("renderCanvas");
  var engine = new BABYLON.Engine(canvas, true);

  // --- CONFIGURACIÓN ---
  var ALTURA_MAPA = -272;
  var TIEMPO_MAXIMO = 10;

  // Variables Globales
  var juegoIniciado = false;
  var playerMesh = null;
  var playerAnim = null;
  var itemEnMano = null;
  var itemsEnCaja = 0;
  var juegoTerminado = false;

  var inputMap = {};
  var itemsSueltos = [];
  var cajasDestino = [];

  // UI Vars
  var textPuntaje = null;
  var barraTiempo = null;
  var textFinal = null;
  var textInicio = null;
  var tiempoRestante = TIEMPO_MAXIMO;
  var iconoInventario = null;
  var textoInventario = null;

  var createScene = function () {
    var scene = new BABYLON.Scene(engine);
    scene.collisionsEnabled = true;

    // 1. AMBIENTE
    scene.clearColor = new BABYLON.Color3(0.4, 0.7, 0.9);
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

    // 3. SUELO INVISIBLE
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
    camera.angularSensibilityX = 500;
    camera.angularSensibilityY = 500;
    camera.wheelPrecision = 10;

    // ==========================================
    // INTERFAZ GRÁFICA (GUI)
    // ==========================================
    var advancedTexture =
      BABYLON.GUI.AdvancedDynamicTexture.CreateFullscreenUI("UI");

    // PANTALLA DE INICIO
    textInicio = new BABYLON.GUI.TextBlock();
    textInicio.text = "PRESIONA ESPACIO\nPARA INICIAR";
    textInicio.color = "white";
    textInicio.fontSize = 60;
    textInicio.outlineWidth = 4;
    textInicio.outlineColor = "black";
    textInicio.fontWeight = "bold";
    advancedTexture.addControl(textInicio);

    // HUD DE JUEGO (Contenedor principal)
    var hudContainer = new BABYLON.GUI.Container();
    hudContainer.isVisible = false;
    advancedTexture.addControl(hudContainer);

    // Botón Contextual
    var btnAccion = BABYLON.GUI.Button.CreateSimpleButton(
      "btnAccion",
      "ENTREGAR (E)"
    );
    btnAccion.width = "200px";
    btnAccion.height = "60px";
    btnAccion.color = "white";
    btnAccion.background = "green";
    btnAccion.cornerRadius = 10;
    btnAccion.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    btnAccion.top = "-50px";
    btnAccion.isVisible = false;
    hudContainer.addControl(btnAccion);

    // Inventario
    var panelInv = new BABYLON.GUI.StackPanel();
    panelInv.width = "200px";
    panelInv.height = "100px";
    panelInv.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    hudContainer.addControl(panelInv);

    var slot = new BABYLON.GUI.Rectangle();
    slot.width = "80px";
    slot.height = "80px";
    slot.thickness = 4;
    slot.color = "#3d3d3d";
    slot.background = "#8b8b8b";
    panelInv.addControl(slot);

    iconoInventario = new BABYLON.GUI.Image(
      "icon",
      "./assets/models/pumpkin/pumpkin_tex.png"
    );
    iconoInventario.width = "60px";
    iconoInventario.height = "60px";
    iconoInventario.isVisible = false;
    slot.addControl(iconoInventario);

    // Puntaje
    textPuntaje = new BABYLON.GUI.TextBlock();
    textPuntaje.text = "0 / 10";
    textPuntaje.color = "#FF9900";
    textPuntaje.fontSize = 30;
    textPuntaje.top = "20px";
    textPuntaje.left = "-20px";
    textPuntaje.textHorizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_RIGHT;
    textPuntaje.textVerticalAlignment =
      BABYLON.GUI.Control.VERTICAL_ALIGNMENT_TOP;
    hudContainer.addControl(textPuntaje);

    // Barra de Tiempo
    var contBarra = new BABYLON.GUI.Rectangle();
    contBarra.horizontalAlignment =
      BABYLON.GUI.Control.HORIZONTAL_ALIGNMENT_LEFT;
    contBarra.verticalAlignment = BABYLON.GUI.Control.VERTICAL_ALIGNMENT_CENTER;
    contBarra.left = "20px";
    contBarra.width = "30px";
    contBarra.height = "400px";
    contBarra.color = "white";
    contBarra.background = "rgba(0,0,0,0.5)";
    hudContainer.addControl(contBarra);

    barraTiempo = new BABYLON.GUI.Rectangle();
    barraTiempo.width = "20px";
    barraTiempo.height = "100%";
    barraTiempo.background = "#00FF00";
    barraTiempo.verticalAlignment =
      BABYLON.GUI.Control.VERTICAL_ALIGNMENT_BOTTOM;
    contBarra.addControl(barraTiempo);

    // --- PANTALLA FINAL ---
    var screenFinal = new BABYLON.GUI.Rectangle();
    screenFinal.width = "100%";
    screenFinal.height = "100%";
    screenFinal.thickness = 0;
    screenFinal.isVisible = false;
    advancedTexture.addControl(screenFinal);

    var bgFinal = new BABYLON.GUI.Image("bg", "./assets/models/cargando.png");
    bgFinal.stretch = BABYLON.GUI.Image.STRETCH_FILL;
    screenFinal.addControl(bgFinal);

    var panelFin = new BABYLON.GUI.StackPanel();
    screenFinal.addControl(panelFin);

    textFinal = new BABYLON.GUI.TextBlock();
    textFinal.text = "FIN DEL JUEGO";
    textFinal.color = "white";
    textFinal.fontSize = 80;
    textFinal.height = "150px";
    textFinal.outlineWidth = 5;
    textFinal.outlineColor = "black";
    panelFin.addControl(textFinal);

    var btnRetry = BABYLON.GUI.Button.CreateSimpleButton(
      "btnRetry",
      "REINTENTAR"
    );
    btnRetry.width = "300px";
    btnRetry.height = "80px";
    btnRetry.color = "white";
    btnRetry.background = "#FF9900";
    btnRetry.cornerRadius = 20;
    btnRetry.fontSize = 30;
    btnRetry.onPointerUpObservable.add(() => location.reload());
    panelFin.addControl(btnRetry);

    // --- FUNCIÓN VIDEO ---
    var reproducirCine = function (nombreVideo, mensaje, colorMensaje) {
      juegoTerminado = true;
      hudContainer.isVisible = false;

      // Fondo negro para cine
      var fondoNegro = document.createElement("div");
      fondoNegro.style.position = "absolute";
      fondoNegro.style.top = "0";
      fondoNegro.style.left = "0";
      fondoNegro.style.width = "100%";
      fondoNegro.style.height = "100%";
      fondoNegro.style.backgroundColor = "black";
      fondoNegro.style.zIndex = "99";
      document.body.appendChild(fondoNegro);

      var vid = document.createElement("video");
      vid.src = "./assets/models/" + nombreVideo;
      vid.style.position = "absolute";
      vid.style.top = "0";
      vid.style.left = "0";
      vid.style.width = "100%";
      vid.style.height = "100%";
      vid.style.objectFit = "contain";

      vid.style.zIndex = "100";
      vid.autoplay = true;
      vid.controls = false;
      document.body.appendChild(vid);

      vid.onended = function () {
        vid.remove();
        fondoNegro.remove();
        screenFinal.isVisible = true;
        textFinal.text = mensaje;
        textFinal.color = colorMensaje;
      };
    };

    // ==========================================
    // CARGA DE ASSETS
    // ==========================================

    BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "./assets/models/low_poly_farm/",
      "scene.gltf",
      scene
    ).then((result) => {
      var mapRoot = result.meshes[0];
      mapRoot.scaling = new BABYLON.Vector3(10, 10, 10);
      mapRoot.position = new BABYLON.Vector3(0, ALTURA_MAPA, 0);
    });

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

      if (result.animationGroups.length > 0) {
        playerAnim = result.animationGroups[0];
        playerAnim.play(true);
        playerAnim.speedRatio = 0;
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

    BABYLON.SceneLoader.ImportMeshAsync(
      "",
      "./assets/models/crate/",
      "scene.gltf",
      scene
    )
      .then((result) => {
        var caja = result.meshes[0];
        caja.scaling = new BABYLON.Vector3(25, 25, 25);
        caja.position = new BABYLON.Vector3(55, 25, 5);

        var cajaHitbox = BABYLON.MeshBuilder.CreateBox(
          "cajaHitbox",
          { size: 1 },
          scene
        );
        cajaHitbox.scaling = new BABYLON.Vector3(35, 25, 35);
        cajaHitbox.position = caja.position.clone();
        cajaHitbox.position.y += 12.5;
        cajaHitbox.isVisible = false;
        cajaHitbox.checkCollisions = true;

        cajasDestino.push(caja);
      })
      .catch(() => {
        var cajaFake = BABYLON.MeshBuilder.CreateBox(
          "cajaFake",
          { size: 25 },
          scene
        );
        cajaFake.position = new BABYLON.Vector3(55, 12.5, 5);
        cajaFake.checkCollisions = true;
        cajasDestino.push(cajaFake);
      });

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
        var clon = molde.clone("calabaza_" + i, null);
        clon.setEnabled(true);
        clon.scaling = new BABYLON.Vector3(10, 10, 10);

        var x = 0,
          z = 0;
        var esValida = false;
        var intentos = 0;

        while (!esValida && intentos < 100) {
          x = Math.random() * 1600 - 800;
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
        clon.position = new BABYLON.Vector3(x, 12, z);

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
        highlightLayer.addMesh(clon, BABYLON.Color3.Yellow());
      }
    });

    // ==========================================
    // GAME LOOP
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

    scene.onBeforeRenderObservable.add(() => {
      if (!juegoIniciado) {
        if (inputMap[" "]) {
          juegoIniciado = true;
          textInicio.isVisible = false;
          hudContainer.isVisible = true;
          inputMap[" "] = false;
        }
        return;
      }

      if (juegoTerminado) return;
      if (!playerMesh) return;

      // --- 1. TIEMPO ---
      var delta = engine.getDeltaTime() / 1000;
      tiempoRestante -= delta;

      if (tiempoRestante <= 0) {
        tiempoRestante = 0;
        if (!juegoTerminado) {
          reproducirCine(
            "Mercado_Fin_Del_Juego_Incompleto.mp4",
            "¡TIEMPO FUERA!",
            "red"
          );
        }
        if (playerAnim) playerAnim.speedRatio = 0;
      }

      barraTiempo.height = tiempoRestante / TIEMPO_MAXIMO;
      if (tiempoRestante < 10) barraTiempo.background = "red";

      // --- 2. UI ---
      var mostrarBoton = false;
      var textoBoton = "";

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

      if (mostrarBoton) {
        btnAccion.isVisible = true;
        btnAccion.children[0].text = textoBoton;
      } else {
        btnAccion.isVisible = false;
      }

      // --- 3. MOVIMIENTO ---
      var isSprinting = inputMap["shift"] || inputMap["Shift"];
      var baseSpeed = isSprinting ? 3.4 : 1.7;
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

      if (playerAnim) {
        if (isMoving) playerAnim.speedRatio = isSprinting ? 1.5 : 1.0;
        else playerAnim.speedRatio = 0;
      }

      // --- 4. INTERACCIÓN ---
      if (inputMap["e"] || inputMap["E"]) {
        inputMap["e"] = false;
        inputMap["E"] = false;

        if (!itemEnMano && itemCercanoUI) {
          highlightLayer.removeMesh(itemCercanoUI);

          itemCercanoUI.setParent(playerMesh);
          itemCercanoUI.position = new BABYLON.Vector3(50, 805, -605);
          itemCercanoUI.rotation = new BABYLON.Vector3(0, 0, 0);
          itemCercanoUI
            .getChildMeshes()
            .forEach((m) => (m.checkCollisions = false));

          itemEnMano = itemCercanoUI;
          iconoInventario.isVisible = true;
        } else if (itemEnMano && cajaCercanaUI) {
          itemEnMano.setParent(null);
          itemEnMano.position = cajaCercanaUI.position.clone();
          itemEnMano.position.y = 1.5 + itemsEnCaja * 1.2;
          itemEnMano
            .getChildMeshes()
            .forEach((m) => (m.checkCollisions = true));

          itemEnMano = null;
          itemsEnCaja++;

          textPuntaje.text = "Calabazas: " + itemsEnCaja + " / 10";
          iconoInventario.isVisible = false;

          if (itemsEnCaja >= 10) {
            if (!juegoTerminado) {
              reproducirCine(
                "Mercado_Fin_Del_Juego.mp4",
                "¡GANASTE!",
                "#00FF00"
              );
            }
          }
        }
      }
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
