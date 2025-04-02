// game.js

// Expose startGame as the entry point for the game.
function startGame() {
  let scene, camera, renderer;
  let world; // Cannon.js physics world
  let playerMesh, playerBody;
  let lastTime;
  const keys = {};

  // Variables for mouse-controlled camera rotation
  let yaw = Math.PI;  // Starting yaw so the camera starts behind the player
  let pitch = 0.1;    // Slight upward pitch initially
  const sensitivity = 0.002;
  const cameraDistance = 10;
  const verticalOffset = 3; // Raise the target a bit so the camera orbits above the player's center

  init();
  animate();

  function init() {
    // -----------------------------
    // THREE.JS SETUP
    // -----------------------------
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // light blue sky

    // Set up camera with a perspective view. Its position will be updated each frame.
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Renderer: use the existing canvas element.
    renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("gameCanvas"),
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Add simple lights
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    // -----------------------------
    // CANNON.JS SETUP
    // -----------------------------
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    // Create ground (Three.js)
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    scene.add(groundMesh);

    // Create ground body (Cannon.js)
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // -----------------------------
    // PLAYER SETUP
    // -----------------------------
    // Create the player (red cube) as a THREE.js mesh.
    const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
    const playerMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    scene.add(playerMesh);

    // Create the player body (Cannon.js)
    const boxShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    playerBody = new CANNON.Body({ mass: 1 });
    playerBody.addShape(boxShape);
    playerBody.position.set(0, 2, 0);
    // Disable rotation for easier control
    playerBody.fixedRotation = true;
    playerBody.angularDamping = 1;
    world.addBody(playerBody);

    // -----------------------------
    // INPUT HANDLING
    // -----------------------------
    // Keyboard input
    window.addEventListener("keydown", (e) => {
      keys[e.code] = true;
    });
    window.addEventListener("keyup", (e) => {
      keys[e.code] = false;
    });
    window.addEventListener("resize", onWindowResize);

    // Pointer lock: click on the canvas to lock the mouse pointer.
    const canvas = document.getElementById("gameCanvas");
    canvas.addEventListener("click", function () {
      canvas.requestPointerLock();
    });

    // Listen for mouse movements to control the camera.
    document.addEventListener("mousemove", onMouseMove, false);
  }

  // Adjust camera and renderer on window resize.
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Update yaw and pitch based on mouse movement if pointer is locked.
  function onMouseMove(e) {
    const canvas = document.getElementById("gameCanvas");
    if (document.pointerLockElement === canvas) {
      // Update yaw normally
      yaw -= e.movementX * sensitivity;
      // Invert the Y controls: add instead of subtracting.
      pitch += e.movementY * sensitivity;

      // Clamp pitch to prevent flipping too far (keeping within nearly vertical limits)
      const maxPitch = Math.PI / 2 - 0.1;
      const minPitch = -Math.PI / 2 + 0.1;
      if (pitch > maxPitch) pitch = maxPitch;
      if (pitch < minPitch) pitch = minPitch;
    }
  }

  // Main loop: physics step, player movement, camera update, and rendering.
  function animate(time) {
    requestAnimationFrame(animate);

    // Calculate time elapsed since the last frame.
    const delta = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;

    // -----------------------------
    // PHYSICS STEP
    // -----------------------------
    const fixedTimeStep = 1.0 / 60.0; // seconds
    world.step(fixedTimeStep, delta, 10);

    // -----------------------------
    // PLAYER MOVEMENT CONTROL (relative to camera yaw only)
    // -----------------------------
    const moveForce = 10;
    const jumpVelocity = 5;

    // Create a movement direction vector (we'll build it relative to camera yaw).
    let moveDir = new CANNON.Vec3(0, 0, 0);
    // Calculate the forward direction (ignoring pitch) — based on the current yaw.
    let forwardDir = new CANNON.Vec3(Math.sin(yaw), 0, Math.cos(yaw));
    // Calculate the right direction (perpendicular to forward).
    let rightDir = new CANNON.Vec3(Math.cos(yaw), 0, -Math.sin(yaw));

    // Add directional input.
    if (keys["KeyW"] || keys["ArrowUp"]) {
      moveDir.x += forwardDir.x;
      moveDir.z += forwardDir.z;
    }
    if (keys["KeyS"] || keys["ArrowDown"]) {
      moveDir.x -= forwardDir.x;
      moveDir.z -= forwardDir.z;
    }
    if (keys["KeyD"] || keys["ArrowRight"]) {
      moveDir.x += rightDir.x;
      moveDir.z += rightDir.z;
    }
    if (keys["KeyA"] || keys["ArrowLeft"]) {
      moveDir.x -= rightDir.x;
      moveDir.z -= rightDir.z;
    }

    if (moveDir.length() > 0) {
      moveDir.normalize();
    }

    // Set horizontal velocity based on the computed movement direction.
    playerBody.velocity.x = moveDir.x * moveForce;
    playerBody.velocity.z = moveDir.z * moveForce;

    // Allow jumping if the player is close to the ground.
    if ((keys["Space"] || keys["KeyJ"]) && Math.abs(playerBody.position.y - 0.5) < 0.1) {
      playerBody.velocity.y = jumpVelocity;
    }

    // -----------------------------
    // SYNCING PHYSICS WITH RENDERING
    // -----------------------------
    playerMesh.position.copy(playerBody.position);
    playerMesh.quaternion.copy(playerBody.quaternion);

    // -----------------------------
    // CAMERA ORBIT CALCULATION
    // -----------------------------
    // This positions the camera on a sphere behind/above the player using yaw and pitch.
    camera.position.x =
      playerMesh.position.x + cameraDistance * Math.cos(pitch) * Math.sin(yaw);
    camera.position.y =
      playerMesh.position.y + verticalOffset + cameraDistance * Math.sin(pitch);
    camera.position.z =
      playerMesh.position.z + cameraDistance * Math.cos(pitch) * Math.cos(yaw);

    // Make the camera look at a point above the player.
    camera.lookAt(
      playerMesh.position.x,
      playerMesh.position.y + verticalOffset,
      playerMesh.position.z
    );

    renderer.render(scene, camera);
  }
}
