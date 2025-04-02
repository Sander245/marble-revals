// game.js

// Expose startGame as the entry point for the game.
function startGame() {
  let scene, camera, renderer;
  let world; // Cannon.js physics world
  let playerMesh, playerBody;
  let lastTime;
  const keys = {};

  init();
  animate();

  function init() {
    // -----------------------------
    // THREE.JS SETUP
    // -----------------------------
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // light-blue sky

    // Set up camera with a perspective view
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Renderer: use the existing canvas element
    renderer = new THREE.WebGLRenderer({
      canvas: document.getElementById("gameCanvas"),
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Add lighting (directional and ambient)
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

    // Create a ground plane (Three.js)
    let groundMaterial = new THREE.MeshPhongMaterial({ color: 0x228B22 });
    let groundGeometry = new THREE.PlaneGeometry(50, 50);
    let groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
    groundMesh.rotation.x = -Math.PI / 2;
    scene.add(groundMesh);

    // Create a ground body (Cannon.js)
    let groundShape = new CANNON.Plane();
    let groundBody = new CANNON.Body({ mass: 0 });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    // Create a player (red cube) - THREE.js mesh
    let playerGeometry = new THREE.BoxGeometry(1, 1, 1);
    let playerMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    playerMesh = new THREE.Mesh(playerGeometry, playerMaterial);
    scene.add(playerMesh);

    // Create a player body (Cannon.js body)
    let boxShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
    playerBody = new CANNON.Body({ mass: 1 });
    playerBody.addShape(boxShape);
    playerBody.position.set(0, 2, 0);
    // Disable rotation for more straightforward controls
    playerBody.fixedRotation = true;
    playerBody.angularDamping = 1;
    world.addBody(playerBody);

    // -----------------------------
    // INPUT HANDLING
    // -----------------------------
    window.addEventListener("keydown", function(e) {
      keys[e.code] = true;
    });
    window.addEventListener("keyup", function(e) {
      keys[e.code] = false;
    });

    // Resize Handler
    window.addEventListener("resize", onWindowResize);
  }

  // Adjust camera and renderer on window resize
  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Main animation loop
  function animate(time) {
    requestAnimationFrame(animate);

    // Calculate time elapsed since the last frame
    const delta = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;

    // Step the physics world
    const fixedTimeStep = 1.0 / 60.0; // seconds
    world.step(fixedTimeStep, delta, 10);

    // -----------------------------
    // PLAYER MOVEMENT CONTROL
    // -----------------------------
    const moveForce = 10;
    const jumpVelocity = 5;
    let moveDirection = new CANNON.Vec3(0, 0, 0);

    if (keys["KeyW"] || keys["ArrowUp"]) {
      moveDirection.z -= 1;
    }
    if (keys["KeyS"] || keys["ArrowDown"]) {
      moveDirection.z += 1;
    }
    if (keys["KeyA"] || keys["ArrowLeft"]) {
      moveDirection.x -= 1;
    }
    if (keys["KeyD"] || keys["ArrowRight"]) {
      moveDirection.x += 1;
    }
    // Normalize the movement vector so diagonal speed isn't faster
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
    }
    // For a simple arcade feel, directly set the horizontal velocity
    playerBody.velocity.x = moveDirection.x * moveForce;
    playerBody.velocity.z = moveDirection.z * moveForce;

    // Jumping: allow jump if the player is near the ground.
    // Since the player is a 1-unit-high cube, the bottom should be near y = 0.5.
    if ((keys["Space"] || keys["KeyJ"]) && Math.abs(playerBody.position.y - 0.5) < 0.1) {
      playerBody.velocity.y = jumpVelocity;
    }

    // -----------------------------
    // SYNCING CANON WITH THREE.JS
    // -----------------------------
    playerMesh.position.copy(playerBody.position);
    playerMesh.quaternion.copy(playerBody.quaternion);

    // Make the camera follow the player
    camera.position.x = playerMesh.position.x;
    camera.position.z = playerMesh.position.z + 10;
    camera.position.y = playerMesh.position.y + 5;
    camera.lookAt(playerMesh.position);

    renderer.render(scene, camera);
  }
}
