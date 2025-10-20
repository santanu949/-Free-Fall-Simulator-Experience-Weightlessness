let scene, camera, renderer, controls, earth, clouds, satellite, astronaut1, astronaut2, orbitLine;
let missionState = 0;
let damagedSolarPanel, repairedPanelMaterial;
let cameraLocked = false;
let astronaut1Floating = false;
let astronaut1Velocity = new THREE.Vector3();
let astronaut1AngularVelocity = new THREE.Vector3();

let astronaut2Floating = true;
let astronaut2Velocity = new THREE.Vector3(0.005, 0.005, -0.008);
let astronaut2AngularVelocity = new THREE.Vector3(0.03, 0.02, 0.04);

const clock = new THREE.Clock(); // For timer
let evaTime = 0; // For EVA timer

function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(-12, 6, 15);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvasContainer').appendChild(renderer.domElement);
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.AmbientLight(0x404040, 1.5));
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(20, 10, 15);
    scene.add(sunLight);

    createEarth();
    createStars();
    satellite = createSatellite();
    scene.add(satellite);
    createOrbitLine();
    createAstronauts();
    setupEventListeners();

    setTimeout(() => advanceMission(), 4000);
    animate();
}

function createEarth() {
    const textureLoader = new THREE.TextureLoader();
    
    // Create Earth using the reference textures and normal map
    const earthGeometry = new THREE.SphereGeometry(5, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg'),
        normalMap: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_normal_2048.jpg'),
        shininess: 10 // Add a little shine to water
    });
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earth);

    // Create clouds using the reference texture
    const cloudGeometry = new THREE.SphereGeometry(5.05, 64, 64); // Slightly larger
    const cloudMaterial = new THREE.MeshPhongMaterial({
        map: textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_clouds_1024.png'),
        transparent: true,
        opacity: 0.4,
    });
    clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(clouds);
}

function createStars() {
    const vertices = [];
    for (let i = 0; i < 20000; i++) vertices.push(THREE.MathUtils.randFloatSpread(1000));
    const geom = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const stars = new THREE.Points(geom, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 }));
    scene.add(stars);
}

function createSatellite() {
    const sat = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeaeaea, metalness: 0.9, roughness: 0.3 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 5, 32), bodyMat);
    body.rotation.z = Math.PI / 2;
    sat.add(body);
    const panelMat = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(createPanelCanvas(false)), metalness: 0.9, roughness: 0.1 });
    repairedPanelMaterial = panelMat;
    const damagedPanelMat = new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(createPanelCanvas(true)), metalness: 0.9, roughness: 0.1 });
    const panelGeom = new THREE.BoxGeometry(10, 0.1, 4);
    const panel1 = new THREE.Mesh(panelGeom, panelMat);
    panel1.position.y = 2.5; sat.add(panel1);
    damagedSolarPanel = new THREE.Mesh(panelGeom, damagedPanelMat);
    damagedSolarPanel.originalMaterial = damagedPanelMat;
    damagedSolarPanel.position.y = -2.5; sat.add(damagedSolarPanel);
    sat.scale.set(0.12, 0.12, 0.12);
    return sat;
}

function createPanelCanvas(isDamaged = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 64; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = isDamaged ? '#110000' : '#002244';
    ctx.fillRect(0, 0, 64, 256);
    ctx.strokeStyle = isDamaged ? '#ff4500' : '#00aaff';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) { ctx.strokeRect(4, i * 32 + 4, 56, 24); }
    if (isDamaged) {
        ctx.fillStyle = 'rgba(255,0,0,0.7)';
        ctx.fillRect(20, 80, 25, 40);
    }
    return canvas;
}

function createOrbitLine() {
    const points = [];
    for (let i = 0; i <= 64; i++) {
        points.push(new THREE.Vector3(Math.cos((i / 64) * Math.PI * 2) * 9, 0, Math.sin((i / 64) * Math.PI * 2) * 9));
    }
    orbitLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x4287f5, transparent: true, opacity: 0.5 }));
    scene.add(orbitLine);
}

function createAstronautFigure() {
    const astronaut = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
    astronaut.add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.7, 8), bodyMat));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), bodyMat);
    head.position.y = 0.4;
    astronaut.add(head);
    astronaut.scale.set(0.5, 0.5, 0.5);
    return astronaut;
}

function createAstronauts() {
    astronaut1 = createAstronautFigure();
    astronaut1.visible = false;
    scene.add(astronaut1);
    astronaut2 = createAstronautFigure();
    astronaut2.position.set(10, 3, -5);
    scene.add(astronaut2);
}

function setupEventListeners() {
    document.getElementById('beginEvaBtn').addEventListener('click', () => advanceMission());
    document.getElementById('repairBtn').addEventListener('click', () => advanceMission());
    document.getElementById('resetSimBtn').addEventListener('click', () => resetSimulation());
}

function advanceMission() {
    missionState++;
    switch (missionState) {
        case 1: setPanelVisibility('anomaly-panel', true); setTimeout(() => advanceMission(), 3000); break;
        case 2: setPanelVisibility('anomaly-panel', false); setPanelVisibility('alert-panel', true); break;
        case 3: setPanelVisibility('alert-panel', false); zoomToSatellite(); setTimeout(() => advanceMission(), 4000); break;
        case 4: moveAstronautToPanel(); break;
        case 5: setPanelVisibility('objective-panel', true); break;
        case 6: setPanelVisibility('objective-panel', false); repairSolarPanel(); setTimeout(() => advanceMission(), 1500); break;
        case 7:
            setPanelVisibility('tether-warning-panel', true);
            triggerMalfunction();
            evaTime = 0; // Reset timer on malfunction
            setTimeout(() => advanceMission(), 4000);
            break;
        case 8: setPanelVisibility('tether-warning-panel', false); setPanelVisibility('comms-lost-panel', true); document.getElementById('last-velocity').textContent = `${astronaut1Velocity.length().toFixed(3)} m/s`; break;
    }
}

function setPanelVisibility(panelId, show) { document.getElementById(panelId).classList.toggle('show', show); }

function zoomToSatellite() {
    cameraLocked = true;
    controls.enabled = false;
}

function moveAstronautToPanel() {
    astronaut1.visible = true;
    const startPosition = satellite.position.clone().add(new THREE.Vector3(0.1, -0.1, 0));
    const endPosition = satellite.position.clone().add(new THREE.Vector3(0, -0.6, 0.4));
    astronaut1.position.copy(startPosition);
    new TWEEN.Tween(astronaut1.position).to(endPosition, 4000).easing(TWEEN.Easing.Quadratic.InOut).onComplete(() => advanceMission()).start();
}

function repairSolarPanel() { damagedSolarPanel.material = repairedPanelMaterial; }

function triggerMalfunction() {
    astronaut1Floating = true;
    const pushDirection = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    astronaut1Velocity.add(pushDirection.multiplyScalar(0.04));
    astronaut1AngularVelocity.set((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.05);
}

function resetSimulation() {
    ['anomaly-panel', 'alert-panel', 'objective-panel', 'tether-warning-panel', 'comms-lost-panel'].forEach(id => setPanelVisibility(id, false));
    astronaut1Floating = false;
    astronaut1.visible = false;
    astronaut1Velocity.set(0,0,0);
    astronaut1AngularVelocity.set(0,0,0);
    astronaut2.position.set(10, 3, -5);
    astronaut2Velocity.set(0.005, 0.005, -0.008);
    astronaut2AngularVelocity.set(0.03, 0.02, 0.04);
    damagedSolarPanel.material = damagedSolarPanel.originalMaterial;
    cameraLocked = false;
    controls.enabled = true;
    new TWEEN.Tween(camera.position).to({x: -12, y: 6, z: 15}, 1500).easing(TWEEN.Easing.Quadratic.InOut).start();
    new TWEEN.Tween(controls.target).to(new THREE.Vector3(0, 0, 0), 1500).easing(TWEEN.Easing.Quadratic.InOut).start();
    missionState = 0;
    evaTime = 0; // Reset timer display
    document.getElementById('evaTime').textContent = `0.00s`;
    setTimeout(() => advanceMission(), 4000);
}

function updateUIData(time) {
    document.getElementById('altitude').textContent = `${(420.5 + Math.sin(time * 0.5)).toFixed(2)} km`;
    document.getElementById('velocity').textContent = `${(27600.8 + Math.cos(time * 0.8)).toFixed(2)} km/h`;
    document.getElementById('inclination').textContent = "51.64°";
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    const orbitalSpeed = -Date.now() * 0.0001;
    
    earth.rotation.y += 0.0005;
    clouds.rotation.y += 0.0006; 

    satellite.position.x = Math.cos(orbitalSpeed) * 9;
    satellite.position.z = Math.sin(orbitalSpeed) * 9;

    if (!cameraLocked) {
        satellite.lookAt(earth.position);
        satellite.rotation.y += Math.PI / 2;
    }

    if (astronaut1Floating) {
        evaTime += clock.getDelta(); // Update timer
        document.getElementById('evaTime').textContent = `${evaTime.toFixed(2)}s`;
        astronaut1.position.add(astronaut1Velocity);
        astronaut1.rotation.x += astronaut1AngularVelocity.x;
        astronaut1.rotation.y += astronaut1AngularVelocity.y;
        astronaut1.rotation.z += astronaut1AngularVelocity.z;
        astronaut1Velocity.multiplyScalar(0.999);
        astronaut1AngularVelocity.multiplyScalar(0.998);
    }

    if (astronaut2Floating) {
        astronaut2.position.add(astronaut2Velocity);
        astronaut2.rotation.x += astronaut2AngularVelocity.x;
        astronaut2.rotation.y += astronaut2AngularVelocity.y;
        astronaut2.rotation.z += astronaut2AngularVelocity.z;
        astronaut2Velocity.multiplyScalar(0.9995);
        astronaut2AngularVelocity.multiplyScalar(0.999);
    }

    if (cameraLocked) {
        if (astronaut1Floating) {
            const targetCamPos = astronaut1.position.clone().add(new THREE.Vector3(-1.5, 0.5, 1.5));
            camera.position.lerp(targetCamPos, 0.05);
            controls.target.lerp(astronaut1.position, 0.05);
        } else {
            const targetCamPos = satellite.position.clone().add(new THREE.Vector3(-2, 1, 2));
            camera.position.lerp(targetCamPos, 0.05);
            controls.target.lerp(satellite.position, 0.05);
        }
         camera.lookAt(controls.target);
    } else {
         controls.update();
    }

    renderer.render(scene, camera);
    updateUIData(orbitalSpeed);
}

init();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});