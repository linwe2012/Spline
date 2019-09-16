var scene = new THREE.Scene();
const el_frame = document.getElementById('canvas-frame')

var canvas_size = {
    w: el_frame.clientWidth, 
    h: el_frame.clientHeight
}

var camera = new THREE.PerspectiveCamera(75, canvas_size.w/canvas_size.h, 0.1, 1000);

var renderer = new THREE.WebGLRenderer({antialias : true});
const canvas = renderer.domElement;
el_frame.appendChild(canvas)

renderer.setSize(canvas_size.w, canvas_size.h);
renderer.setClearColor(0x000000, 1.0);

camera.position.z = 5;

let newCurve = null
let curveTau = null
let timeGoes = 0
let animateTime = 20
let colorFinal = {
    h: 206.0/360.0,
    s: .89,
    l: .54,
    r: 33 / 255.0,
    g: 150 / 255.0,
    b: 242 / 255.0
}
let dotsGroup = new THREE.Group();
scene.add(dotsGroup)

function render() {
    requestAnimationFrame(render);
    UpdateCurve();
    renderer.render(scene, camera);
}
render();

const pickPosition = {x: 0, y: 0};
function getCanvasRelativePosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
}

function setPickPosition(event) {
    const pos = getCanvasRelativePosition(event);
    pickPosition.x = (pos.x / canvas_size.w) *  2 - 1;
    pickPosition.y = (pos.y / canvas_size.h) * -2 + 1;  // note we flip Y
}

function clearPickPosition() {
    pickPosition.x = -100000;
    pickPosition.y = -100000;
}

var planegeo = new THREE.PlaneGeometry( 1000, 1000, 10, 10 );
var planeMesh = new THREE.Mesh(planegeo, new THREE.MeshBasicMaterial());
var click_raycaster = new THREE.Raycaster();

el_frame.mouseout = clearPickPosition;
let dot_hovered = null
let mouse_down = false
let spline_ctrl_needs_update = false
const hover_raycaster = new THREE.Raycaster();
function HandleDrag() {
    let dotOnPlane = GetMouseOnPlane()
    dot_hovered.position.set(dotOnPlane.x, dotOnPlane.y, dotOnPlane.z)
    let id = dot_hovered.userData.id * 3
    
    let arr = str8line.geometry.attributes.position.array 
    arr[id] = dotOnPlane.x
    arr[id+1]= dotOnPlane.y
    arr[id+2]=dotOnPlane.z
    str8line.geometry.attributes.position.needsUpdate = true
    spline_ctrl_needs_update = true
}

function mouseHoverOrDrag(event) {
    setPickPosition(event)
    if(dot_hovered && mouse_down) {
        HandleDrag()
        return
    }

    hover_raycaster.setFromCamera(pickPosition, camera);
    const intersectedObjects = hover_raycaster.intersectObjects(dotsGroup.children);
    if(dot_hovered !== null) {
        dot_hovered.material.color.setHex( 0xffffff );
        dot_hovered = null
    }
    if (intersectedObjects.length) {
        const obj = intersectedObjects[0].object
        obj.material.color.setHex( 0xFFF176 );
        dot_hovered = obj
    }
    
}

el_frame.onmousemove = mouseHoverOrDrag
el_frame.onmousedown = ()=>{mouse_down = true}
el_frame.onmouseup = ()=>{mouse_down = false; UpdateSplineOnDotMoved()}

const lastPick = null;

const lineGeo = new THREE.BufferGeometry();
let str8positions = new Float32Array( 100 * 3 );
lineGeo.addAttribute( 'position', new THREE.BufferAttribute( str8positions, 3 ) );
var str8material = new THREE.LineBasicMaterial( { color: 0xcccccc, linewidth: 2.2 } );
var splineMatrial = new THREE.LineBasicMaterial( { color: 0xcccccc, linewidth: 2.2 } );
var drawCount = 0
lineGeo.setDrawRange(0, drawCount)
const str8line = new THREE.Line( lineGeo,  str8material );
scene.add(str8line)


function UpdateCurve() {
    if(newCurve === null || last_spline == null) {
        return
    }
    ++timeGoes;
    
    if(timeGoes >= animateTime) {
        last_spline.geometry.vertices = newCurve
        newCurve = null
        last_spline.material.color.setRGB(colorFinal.r, colorFinal.g, colorFinal.b)
    }
    else {
        
        let scale = 1 / (animateTime - timeGoes)
        last_spline.material.color.lerp(colorFinal, timeGoes / animateTime)
        
        for(let i = 0; i < newCurve.length; ++i) {
            let inter = newCurve[i].clone().sub( last_spline.geometry.vertices[i])
            last_spline.geometry.vertices[i].add(inter.multiplyScalar(scale))
        }
    }
    last_spline.geometry.verticesNeedUpdate = true
}

function LinearAdd(p1, p2, p3, p4, i1, i2, i3, i4) {
    let p = new THREE.Vector3();
    p.x = i1 * p1.x + i2 * p2.x + i3 * p3.x + i4 * p4.x;
    p.y = i1 * p1.y + i2 * p2.y + i3 * p3.y + i4 * p4.y;
    p.z = 0//i1 * p1.z + i2 * p2.z + i3 * p3.z + i4 * p4.z;
    return p;
}

function SampleAt(tau, u, p1, p2, p3, p4) {
    let u2 = u * u
    let u3 = u * u2
    let i1 = tau * (-u3 + 2*u2 - u) 
    let i2 = tau * (2*u3/(tau-1)-3*u2/(tau+1))+1
    let i3 = tau * (-2*u3/(tau+1)+3*u2/(tau-2)+u)
    let i4 = tau * (u3-u2)

    return LinearAdd(p1, p2, p3, p4, i1, i2, i3, i4)
}

function StdSampleAt(u, p1, p2, p3 /*p1 prime*/, p4 /*p2 prime*/) {
    let u2 = u * u
    let u3 = u * u2
    let i1 = 2*u3-3*u2+1
    let i2 = -2*u3+3*u2
    let i3 = u3-2*u2+u
    let i4 = u3-u2
    return LinearAdd(p1, p2, p3, p4, i1, i2, i3, i4)
}

function BeginingPrime(tau, p0, p1, p2) {
    let p0_prime = new THREE.Vector3();
    let p1_prime = new THREE.Vector3();

    p0_prime.x = tau * (2*p1.x-p2.x-p0.x)
    p0_prime.y = tau * (2*p1.y-p2.y-p0.y)
    p0_prime.z = 0 // tau * (2*p1.z-p2.z-p0.z)

    p1_prime.addVectors(p0.clone().negate(), p2).multiplyScalar(tau)
    return [p0_prime, p1_prime]
}

function Spline(tau, gran) {
    let a = dotsGroup.children
    let res = []
    function at(id) {
        return a[id].position
    }

    if(a.length <= 1) {
        for(let d of a) {
            res.push(d.position)
        }
        return res
    }
    else if(a.length == 2) {
        let step = 1.0 / gran
        res.push(at(0))
        let first = at(0)
        let vstep = at(1).clone().sub(first).multiplyScalar(step)
        let base =  first.clone().add(vstep)
        for(let j = 1; j < gran-1; ++j) {
            res.push(base.add(vstep).clone())
        }
        res.push(at(1))
        return res
    }

    let comb = BeginingPrime(tau, at(0), at(1), at(2))
    let step = 1.0 / gran
    let u = step
    res.push(at(0).clone())
    for(let j = 1; j < gran-1; ++j) {
        res.push(StdSampleAt(u, at(0), at(1), comb[0], comb[1]))
        u += step
    }

    let len = a.length - 2
    for(let i=1; i < len; ++i) {
        u = step
        res.push(at(i).clone())
        for(let j = 1; j < gran-1; ++j) {
            let p1 = at(i)
            let p2 = at(i+1)
            let p3 = at(i-1).clone().negate().add(p2).multiplyScalar(tau)
            let p4 = p1.clone().negate().add(at(i+2)).multiplyScalar(tau)
            res.push(StdSampleAt(u, p1,p2,p3,p4))
            u += step
        }
    }

    res.push(at(len).clone())
    comb = BeginingPrime(tau, at(len-1), at(len), at(len+1))
    u = step
    comb[0].negate()
    for(let j = 1; j < gran-1; ++j) {
        res.push(StdSampleAt(u, at(len), at(len+1), comb[1], comb[0]))
        u += step
    }
    res.push(at(len+1).clone())
    return res
}

let last_spline = null

function GetMouseOnPlane() {
    let point = new THREE.Vector3(pickPosition.x, pickPosition.y, 5);
    click_raycaster.setFromCamera(point, camera);
    let hits = click_raycaster.intersectObject(planeMesh,true);
    return hits[0].point;
}

function UpdateSplineOnDotMoved() {
    if(!spline_ctrl_needs_update) {
        return
    }
    newCurve = Spline(0.5, 20);
    timeGoes = 0
    console.log(newCurve[newCurve.length - 1])
    console.log(last_spline.geometry.vertices[last_spline.geometry.vertices.length-1])
    spline_ctrl_needs_update = false
}

el_frame.onclick = function(event) {
    if(dot_hovered !== null) {
        return
    }
    setPickPosition(event);

    let pointOnPlane = GetMouseOnPlane()
    
    let pointGeo = new THREE.CircleGeometry( 0.05, 12 );
    let dotMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff } );
    let dot = new THREE.Mesh( pointGeo, dotMaterial );
    dot.position.set(pointOnPlane.x, pointOnPlane.y, pointOnPlane.z)
    dot.userData = { id: dotsGroup.children.length }
    dotsGroup.add( dot );
    let splineGeo = new THREE.Geometry();

    let splineArr = Spline(0.5, 20);
    curveTau = 0.5
    if(last_spline !== null) {
        if(splineArr.length > 20) {
            splineGeo.vertices = last_spline.geometry.vertices
            let last_vertex = last_spline.geometry.vertices[last_spline.geometry.vertices.length - 1]
            let step = pointOnPlane.clone().sub(last_vertex).multiplyScalar(1/20.0)
            let cur = last_vertex.clone().add(step)
            for(let i = 1; i < 20; ++i) {
                splineGeo.vertices.push(cur.add(step).clone())
            }
            
            newCurve = splineArr
            timeGoes = 0
        }
        else {
            splineGeo.vertices = splineArr
        }
        scene.remove(last_spline)
    }
    else {
        splineGeo.vertices = splineArr
    }
    
    let spline = new THREE.Line( splineGeo, splineMatrial );
    last_spline = spline
    scene.add(spline)

    positions = str8line.geometry.attributes.position.array;
    positions[3 * drawCount] = pointOnPlane.x
    positions[3 * drawCount + 1] = pointOnPlane.y
    positions[3 * drawCount + 2] = pointOnPlane.z
    ++drawCount;
    str8line.geometry.setDrawRange(0, drawCount)
    
    str8line.geometry.attributes.position.needsUpdate = true
    mouseHoverOrDrag(event)
}


