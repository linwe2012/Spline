import React from 'react';
import * as THREE from 'three'
import image from './image.png';

export default class Render extends React.Component {
    componentDidMount() {
        this.handle = RunAll(this.props.colorGroup, this.props.elId)
    }
    render() {
        if(this.handle !== undefined) {
            this.handle.HandleTau(this.props.tau)
            this.handle.HandleGran(this.props.gran)
            this.handle.HandleImg(this.props.theimg)
            this.handle.HandleImgSpeed(this.props.imgSpeed)
            this.handle.EnableBifrost(this.props.bifrost)
            this.handle.ShowLinearSample(this.props.enable_param)
            
            if(this.props.cleanup === true) {
                this.handle.HandleCleanLines()
                this.props.oncleanupDone()
            }
        }
        return (
            <div>
            </div>
        );
    }
}

function RunAll(themeColor, el_id){
var scene = new THREE.Scene();
const el_frame = document.getElementById(el_id)
var canvas_size = {
    w: el_frame.clientWidth, 
    h: el_frame.clientHeight
}

var camera = new THREE.PerspectiveCamera(75, canvas_size.w/canvas_size.h, 0.1, 1000);

var renderer = new THREE.WebGLRenderer({antialias : true, powerPreference:'high-performance'});
const canvas = renderer.domElement;
el_frame.appendChild(canvas)

renderer.setSize(canvas_size.w, canvas_size.h);
renderer.setClearColor(0x000000, 1.0);
renderer.setPixelRatio(window.devicePixelRatio);

camera.position.z = 5;

let newCurve = null
let curveTau = 0.5
let timeGoes = 0
let numInterp = 20
let animateTime = 20

let dotsGroup = new THREE.Group();
scene.add(dotsGroup)
let run_image = false
let first_run = true
let current_pos = 0
let last_spline = null
let img_speed = 1.0
let curveUpdateDone = null

function MapColorToDiscrete(val /* [0, 1] */) { // -> [100, 200, ..., 900]
    const k = [0,  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 2]
    const v = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 900]
    for(let i = 0; i < k.length; ++i) {
        if(val < k[i+1]) {
            return v[i]
        }
    }
}

function render() {
    requestAnimationFrame(render);
    UpdateCurve();
    RunImage()
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
    if(newCurve === null || last_spline === null) {
        return
    }
    ++timeGoes;
    
    if(timeGoes >= animateTime) {
        last_spline.geometry.vertices = newCurve
        newCurve = null
        last_spline.material.color.set(themeColor[MapColorToDiscrete(curveTau)])
        if(curveUpdateDone !== null) {
            curveUpdateDone()
        }
    }
    else {
        let scale = 1 / (animateTime - timeGoes)
        last_spline.material.color.lerp(new THREE.Color(themeColor[MapColorToDiscrete(curveTau)]), scale)
        
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

let param = []
function Spline(tau, gran) {
    let a = dotsGroup.children
    let res = []
    param = []
    function at(id) {
        return a[id].position
    }

    if(a.length <= 1) {
        for(let d of a) {
            res.push(d.position)
        }
        return res
    }
    else if(a.length === 2) {
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

    function InsertOne(p1, p2, p3, p4) {
        let mat1 = new THREE.Matrix4()
        mat1.set(
            2, -2, 1, 1,
            -3, 3, -2, -1,
            0, 0, 1, 0,
            1, 0, 0, 0
        )
        let mat2 = new THREE.Matrix4()
        mat2.set(
            p1.x, p1.y, p1.z, 0,
            p2.x, p2.y, p2.z, 0,
            p3.x, p3.y, p3.z, 0,
            p4.x, p4.y, p4.z, 0,
        )
        let mat3 = new THREE.Matrix4()
        mat3.multiplyMatrices(mat1, mat2)
        mat3.transpose()
        param.push(mat3)
        return mat3
    }

    let comb = BeginingPrime(tau, at(0), at(1), at(2))
    let step = 1.0 / gran
    let u = step
    res.push(at(0).clone())
    let mat = InsertOne(at(0), at(1), comb[0], comb[1])
    for(let j = 1; j < gran-1; ++j) {
        // res.push(StdSampleAt(u, at(0), at(1), comb[0], comb[1]))
        let u2 = u*u
        let u3 =u2*u
        let vec = new THREE.Vector4(u3, u2, u, 1)
        vec.applyMatrix4(mat)
        res.push(new THREE.Vector3(vec.x, vec.y, vec.z))
        u += step
    }
    
    let len = a.length - 2
    for(let i=1; i < len; ++i) {
        u = step
        res.push(at(i).clone())
        let p1 = at(i)
        let p2 = at(i+1)
        let p3 = at(i-1).clone().negate().add(p2).multiplyScalar(tau)
        let p4 = p1.clone().negate().add(at(i+2)).multiplyScalar(tau)
        let mat = InsertOne(p1, p2, p3, p4)
        for(let j = 1; j < gran-1; ++j) {
            // res.push(StdSampleAt(u, p1,p2,p3,p4))
            let u2 = u*u
            let u3 =u2*u
            let vec = new THREE.Vector4(u3, u2, u, 1)
            vec.applyMatrix4(mat)
            res.push(new THREE.Vector3(vec.x, vec.y, vec.z))
            u += step
        }
    }

    res.push(at(len).clone())
    comb = BeginingPrime(tau, at(len-1), at(len), at(len+1))
    u = step
    comb[0].negate()
    mat = InsertOne(at(len), at(len+1), comb[1], comb[0])
    for(let j = 1; j < gran-1; ++j) {
        // res.push(StdSampleAt(u, at(len), at(len+1), comb[1], comb[0]))
        let u2 = u*u
        let u3 =u2*u
        let vec = new THREE.Vector4(u3, u2, u, 1)
        vec.applyMatrix4(mat)
        res.push(new THREE.Vector3(vec.x, vec.y, vec.z))
        u += step
    }
    res.push(at(len+1).clone())
    return res
}



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
    newCurve = Spline(curveTau, numInterp);
    timeGoes = 0
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

    let splineArr = Spline(curveTau, numInterp);
    if(last_spline !== null) {
        if(splineArr.length > numInterp) {
            splineGeo.vertices = last_spline.geometry.vertices
            let last_vertex = last_spline.geometry.vertices[last_spline.geometry.vertices.length - 1]
            let step = pointOnPlane.clone().sub(last_vertex).multiplyScalar(1.0/numInterp)
            let cur = last_vertex.clone().add(step)
            for(let i = 1; i < numInterp; ++i) {
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

    let positions = str8line.geometry.attributes.position.array;
    positions[3 * drawCount] = pointOnPlane.x
    positions[3 * drawCount + 1] = pointOnPlane.y
    positions[3 * drawCount + 2] = pointOnPlane.z
    ++drawCount;
    str8line.geometry.setDrawRange(0, drawCount)
    
    str8line.geometry.attributes.position.needsUpdate = true
    mouseHoverOrDrag(event)
}

function HandleTau(newTau) {
    if(curveTau === newTau) {
        return
    }
    curveTau = newTau
    timeGoes = 0
    newCurve = Spline(curveTau, numInterp);
}

var img = new THREE.MeshBasicMaterial({ //CHANGED to MeshBasicMaterial
    map:THREE.ImageUtils.loadTexture(image),
    transparent: true,
});
img.map.needsUpdate = true; //ADDED

// plane
let shplane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1),img);
shplane.overdraw = true;

let run_cnt = 0

function RunImage() {
    if(run_image === false || last_spline === null) {
        if(first_run === false) {
            scene.remove(shplane);
            first_run = true
        }
        return
    }
    if(last_spline.geometry.vertices.length <= 1) {
        return
    }

    ++run_cnt
    let k = -14.0/80
    let b = 15-20*k
    let num = Math.floor((numInterp*k+b) / img_speed)
    if(num === 0) {
        num = 1
    }
    if(run_cnt % num === 0) {
        ++current_pos
        run_cnt = 0
    }
    else {
        return
    }

    if(first_run === true) {
        scene.add(shplane);
        current_pos = 0
        first_run = false
    }

    if(last_spline.geometry.vertices.length - 1 < current_pos) {
        last_spline.rotation.set(0, 0, 0)
        last_spline.updateMatrix();
        current_pos = 0
    }
    
    let vec = last_spline.geometry.vertices
    let pos = vec[current_pos]
    
    const zAix = new THREE.Vector3(0,0,1)
    let span;
    if(current_pos === 0) {
        span = BeginingPrime(curveTau, vec[0], vec[1], vec[2])[0]
    }
    else if(current_pos == vec.length-1) {
        span = BeginingPrime(curveTau, vec[current_pos-2], vec[current_pos-1], vec[current_pos])[1].negate()
    }
    else {
        span = vec[current_pos+1].clone().sub(vec[current_pos-1])
    }
    
    let rad ;
    if(span.x === 0) {
        rad = 3.1415926 / 2
        rad = span.y > 0? span.y : (-span.y)
    }
    else {
       rad = Math.atan(span.y/span.x)
    }
    shplane.setRotationFromAxisAngle(zAix, rad*1.015-0.02)
    span.applyAxisAngle(zAix, 3.1415926/2).normalize().multiplyScalar(0.44)
    shplane.position.set(pos.x+span.x, pos.y+span.y, pos.z+span.z)
}

function Integration(ua, ub, delta_x, l1) {
    let p1 = param[l1].elements
    
    //let ax = p1[0]
    //let bx = p1[1]
    //let cx = p1[2]
    //let ay = p1[4]
    //let by = p1[5]
    //let cy = p1[6]
    //let az = p1[8]
    //let bz = p1[9]
    //let cz = p1[10]

    let ax = p1[0]
    let ay = p1[1]
    let az = p1[2]
    let bx = p1[4]
    let by = p1[5]
    let bz = p1[6]
    let cx = p1[8]
    let cy = p1[9]
    let cz = p1[10]

    let A = 9*(ax*ax+ay*ay+az*az)
    let B = 12*(ax*bx+ay*by+az*bz)
    let C = 6*(ax*cx+ay*cy+az*cz)+4*(bx*bx+by*by+bz*bz)
    let D = 4*(bx*cx+by*cy+bz*cz)
    let E = cx*cx+cy*cy+cz*cz

    let nsplit = Math.floor((ub-ua)/delta_x)
    let res = 0
    if(nsplit < 3) {
        for(let u = ua; u <= ub; u += delta_x) {
            let u2 = u*u
            let u3 = u2*u
            let u4 = u2*u2
            
            let tmp = Math.sqrt(A*u4+B*u3+C*u2+D*u+E)
            res += tmp
        }
        return res * delta_x
    }
    let cnt = 0
    
    for(let u = ua; u <= ub; u += delta_x) {
        let u2 = u*u
        let u3 = u2*u
        let u4 = u2*u2
        let feed = A*u4+B*u3+C*u2+D*u+E
        if(feed < 0) {
            console.log('hi')
        }
        let tmp = Math.sqrt(feed)
        //let tmp = A*u4+B*u3+C*u2+D*u+E
        if(cnt === 0) {
            res += tmp * delta_x
        }
        else if(cnt === nsplit) {
            res += tmp * delta_x
        }
        else if(cnt % 2 === 1) {
            res += 4 * tmp * delta_x
        }
        else {
            res += 2 * tmp * delta_x
        }
        ++cnt
    }
    return res / 3
}

let param_cache = []
function Paramterize(sample, begin, last) {
    if(last_spline === null || last_spline.geometry.vertices.length < numInterp) {
        return
    }

    let num = begin
    let all = 0
    while(num != last-1) {
        param_cache[num] = Integration(0, 1, 0.01, num)
        all += param_cache[num]
        ++ num
    }
    param_cache = param_cache.map((h)=>h/all) // normalize

    let sum = 0
    let len = (last - begin - 1) * numInterp
    let step = 1 / len
    let cur = step
    num = begin
    let res = []
    while(cur < 1) {
        let sa = sample(cur)
        while(sum < sa) {
            sum += param_cache[num]
            ++num
        }
        
        let prox = sum - param_cache[num-1]
        let epsilon = Math.abs(sa - prox)
        let ua = 0
        let ub = 1
        while(epsilon > 0.001) {
            let s0 = Integration(ua, (ua+ub)/2, 0.001, num-1) / all
            if(s0 == 0) {
                break
            }
            if((prox + s0) > sa) {
                ub = (ua+ub)/2
            }
            else {
                prox += s0
                ua = (ua+ub)/2
            }
            epsilon = sa - prox
        }

        let ua2 = ua * ua
        let ua3 = ua * ua2
        let vec = new THREE.Vector4(
            ua3, ua2, ua, 1
        )
        vec.applyMatrix4(param[num-1])
        res.push(new THREE.Vector3(vec.x, vec.y, vec.z))
        cur += step
    }
    return res
}

function LinearSample(val) {
    return val
}

let param_line_show = false
let default_line_show = false
let paramDotsGroup = new THREE.Group();
function ShowLinearSample(bool) {
    if(bool === param_line_show) {
        return
    }
    
    param_line_show = bool
    let arr = Paramterize(LinearSample, 0, dotsGroup.children.length)
    
    for(let i of arr) {
        let pointGeo = new THREE.CircleGeometry( 0.04, 8 );
        let dotMaterial = new THREE.MeshBasicMaterial( { color: 0xeeeeee } );
        let dot = new THREE.Mesh( pointGeo, dotMaterial );

        dot.position.set(i.x, i.y, i.z)
        paramDotsGroup.add(dot)
    }
}

function ShowDefaultDots(bool) {
    if(bool === default_line_show) {
        return
    }
    default_line_show = bool
    if(default_line_show === false) {
        scene.remove(paramDotsGroup)
    }
    else {
        scene.add(paramDotsGroup)
    }
    paramDotsGroup.children = []

    for(let i in last_spline.geometry.vertices) {
        let pointGeo = new THREE.CircleGeometry( 0.04, 8 );
        let dotMaterial = new THREE.MeshBasicMaterial( { color: 0xeeeeee } );
        let dot = new THREE.Mesh( pointGeo, dotMaterial );
        dot.position.set(i.x, i.y, i.z)
        paramDotsGroup.add(dot)
    }
}

function AnimateDots() {

}

function HandleGran(newGran) {
    if(numInterp == newGran) {
        return
    }

    numInterp = newGran
    let splineGeo = new THREE.Geometry();
    splineGeo.vertices = Spline(curveTau, numInterp);
    let spline = new THREE.Line( splineGeo, splineMatrial );
    scene.remove(last_spline)
    last_spline = spline
    scene.add(spline)
}

function HandleImg(set) {
    run_image = set
}

function HandleImgSpeed(speed) {
    img_speed = speed
}

let bifrost = null
let curBifrost = 0
let lastTau = 0
function EnableBifrost(bool) {
    if((bifrost !== null) === bool || last_spline === null || dotsGroup.children.length <= 2) {
        return
    }

    if(bool === false) {
        let backup = bifrost[0]
        scene.remove(last_spline)
        for(let i = 1; i < bifrost.length; ++i) {
            scene.remove(bifrost[i])
        }
        curveTau = lastTau
        curveUpdateDone = null
        scene.add(backup)
        last_spline = backup
        curBifrost = 0
        bifrost = null
        return 
    }
    scene.remove(last_spline)
    bifrost = []
    lastTau = curveTau

    curveUpdateDone = function() {
        const k = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
        if(curBifrost === k.length) {
            return
        }
        bifrost.push(last_spline)
        var splineMat = new THREE.LineBasicMaterial( { color: last_spline.material.color.clone(), linewidth: 2.2 } );
        let splineGeo = new THREE.Geometry();
        splineGeo.vertices = last_spline.geometry.vertices.map(v => v.clone())
        last_spline = new THREE.Line(splineGeo, splineMat)
        scene.add(last_spline)
        curveTau = k[curBifrost]
        newCurve = Spline(k[curBifrost], numInterp)
        timeGoes = 0
        ++curBifrost
    }
    curveUpdateDone()
}

function SetColorGroup(colors) {
    themeColor = colors
}

function HandleCleanLines() {
    console.log('clean up')
    curveTau = null
    timeGoes = 0
    bifrost = null
    lastTau = 0
    
    dot_hovered = null
    mouse_down = false
    spline_ctrl_needs_update = false

    scene.remove(last_spline);
    while(dotsGroup.children.length) {
        dotsGroup.remove(dotsGroup.children[0])
    }
    last_spline = null
    HandleImg(false)
    drawCount = 0
    str8line.geometry.setDrawRange(0, drawCount)
    str8line.geometry.attributes.position.needsUpdate = true
}

return {
    HandleTau: HandleTau,
    HandleGran: HandleGran,
    HandleImg: HandleImg,
    HandleImgSpeed: HandleImgSpeed,
    EnableBifrost: EnableBifrost,
    HandleCleanLines: HandleCleanLines,
    ShowLinearSample: ShowLinearSample
}

}
