import * as THREE from 'three'

import { MapColorToDiscrete, BeginingPrime, Integration, ComputeTransformMatrix } from './utils'
import { ImageManger } from './imageman'



export const Samplers = {
    'linear': (v)=>v,
    'ease in square': (v)=>v*v,
    'ease in cubic': (v)=>v*v*v,
    'ease in sine': (v)=> 1+Math.sin((v-1) * Math.PI / 2),
    'ease out sine': (v)=> Math.sin(v * Math.PI / 2),
    'ease in out sine': (v)=> (Math.sin((v-0.5)*Math.PI) + 1)/2
}

export class SplineLine {
    need_update = false
    spline = null
    newCurve = null
    timeGoes = 0
    animateTime = 20
    curveUpdateDone = null // callback when update is done
    themeColor = null
    curveTau = 0.5
    newCurveTau = 0.5
    param = []
    splineMatrial = new THREE.LineBasicMaterial( { color: 0xcccccc, linewidth: 2.2 } );
    scene = null
    param_cache = []
    param_is_displaying = false
    paramDotsGroup = new THREE.Group()

    constructor(scene, themeColor) {
        this.scene = scene
        this.themeColor = themeColor
    }

    Destroy(){
        if(this.spline !== null){
            this.scene.remove(this.spline)
            this.PurgeParam()
        }
    }

    clone() {
        let last_spline = this.spline
        let c = new SplineLine(this.scene, this.themeColor)
        let splineMat = new THREE.LineBasicMaterial( { color: last_spline.material.color.clone(), linewidth: 2.7 } );
        let splineGeo = new THREE.Geometry();
        splineGeo.vertices = last_spline.geometry.vertices.map(v => v.clone())
        c.spline = new THREE.Line(splineGeo, splineMat)
        c.curveTau = this.curveTau
        c.param = this.param.map((v)=>v.clone())
        c.curveUpdateDone = this.curveUpdateDone
        return c
    }

    KickUpdateCurve() {
        this.param_need_update = true
        this.curveTau = this.newCurveTau
        this.timeGoes = 0
    }
    
    UpdateCurve() {
        if(this.newCurve === null || this.spline === null) {
            return
        }

        ++this.timeGoes;
        
        let theme = this.themeColor[MapColorToDiscrete(this.curveTau)]
        if(this.timeGoes >= this.animateTime) {
            this.spline.geometry.vertices = this.newCurve
            this.newCurve = null
            this.spline.material.color.set(theme)
            if(this.curveUpdateDone !== null) {
                this.curveUpdateDone()
                this.param_need_update = true
            }
        }
        else {
            let scale = 1 / (this.animateTime - this.timeGoes)
            this.spline.material.color.lerp(new THREE.Color(theme), scale)
            
            for(let i = 0; i < this.newCurve.length; ++i) {
                let inter = this.newCurve[i].clone().sub( this.spline.geometry.vertices[i])
                this.spline.geometry.vertices[i].add(inter.multiplyScalar(scale))
            }
        }
        this.spline.geometry.verticesNeedUpdate = true
    }


    Sample(a, tau, gran) {
        let res = []
        this.param = []
        this.newCurveTau = tau

        function at(id) {
            return a[id].position
        }

        if(a.length <= 1) {
            for(let d of a) {
                res.push(d.position)
            }
            this.newCurve = res
            return this
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
            this.newCurve = res
            return this
        }

        let InsertOne = (p1, p2, p3, p4) => {
            let mat3 = ComputeTransformMatrix(p1, p2, p3, p4)
            this.param.push(mat3)
            return mat3
        }

        function Compute(u, mat) {
            let u2 = u*u
            let u3 =u2*u
            let vec = new THREE.Vector4(u3, u2, u, 1)
            vec.applyMatrix4(mat)
            res.push(new THREE.Vector3(vec.x, vec.y, vec.z))
        }

        let comb = BeginingPrime(tau, at(0), at(1), at(2))
        let step = 1.0 / gran
        let u = step
        res.push(at(0).clone())
        let mat = InsertOne(at(0), at(1), comb[0], comb[1])
        for(let j = 1; j < gran-1; ++j) {
            Compute(u, mat)
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
                Compute(u, mat)
                u += step
            }
        }

        res.push(at(len).clone())
        comb = BeginingPrime(tau, at(len-1), at(len), at(len+1))
        u = step
        comb[0].negate()
        mat = InsertOne(at(len), at(len+1), comb[1], comb[0])
        for(let j = 1; j < gran-1; ++j) {
            Compute(u, mat)
            u += step
        }
        res.push(at(len+1).clone())
        this.newCurve = res
        return this
    }

    Append(dots, numInterp, pointOnPlane) {
        let scene = this.scene
        let splineGeo = new THREE.Geometry();

        this.Sample(dots, this.curveTau, numInterp);
        let splineArr = this.newCurve

        if(this.spline !== null) {
            if(this.newCurve.length > numInterp) {
                splineGeo.vertices = this.spline.geometry.vertices
                let last_vertex = this.spline.geometry.vertices[this.spline.geometry.vertices.length - 1]
                let step = pointOnPlane.clone().sub(last_vertex).multiplyScalar(1.0/numInterp)
                let cur = last_vertex.clone().add(step)
                for(let i = 1; i < numInterp; ++i) {
                    splineGeo.vertices.push(cur.add(step).clone())
                }
                this.KickUpdateCurve()
            }
            else {
                splineGeo.vertices = this.newCurve
            }
            scene.remove(this.spline)
        }
        else {
            splineGeo.vertices = splineArr
        }
        
        let spline = new THREE.Line( splineGeo, this.splineMatrial );
        this.spline = spline
        scene.add(spline)
    }

    DisplayNewCurve() {
        let splineGeo = new THREE.Geometry();
        splineGeo.vertices = this.newCurve
        let spline = new THREE.Line( splineGeo, this.splineMatrial );
        this.scene.remove(this.spline)
        this.spline = spline
        this.scene.add(spline)
    }
    
    UpdateParam() {
        if(this.param_is_displaying) {
            // this.ShowParam(this.last_sample, )
        }
        
    }

    last_sample = null
    Paramterize(sample, begin, last, gran) {
        let param_cache = this.param_cache
        this.last_sample = sample

        if(this.spline === null || this.spline.geometry.vertices.length < gran) {
            return
        }
    
        let num = begin
        let all = 0
        while(num !== last-1) {
            param_cache[num] = Integration(this.param[num], 0, 1, 0.01)
            all += param_cache[num]
            ++num
        }
        param_cache = param_cache.map((h)=>h/all) // normalize
    
        let sum = 0
        let len = (last - begin - 1) * gran
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
                let s0 = Integration(this.param[num-1], ua, (ua+ub)/2, 0.001) / all
                if(s0 === 0) {
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
            vec.applyMatrix4(this.param[num-1])
            res.push(new THREE.Vector3(vec.x, vec.y, vec.z))
            cur += step
        }
        return res
    }

    last_sample_name = 'linear'
    param_vectors = []
    PurgeParam() {
        this.paramDotsGroup.children = []
        this.param_need_update = true
        this.scene.remove(this.paramDotsGroup)
    }


    ShowParam(sample_name, begin, last, gran) {
        if(last - begin < 2) {
            return
        }

        // hot reload sampler function, bypass testing
        if(sample_name !== this.last_sample_name) {
            this.param_is_displaying = false
            this.param_need_update = true
        }

        // already shown
        if(this.param_is_displaying === true) {
            return
        }

        // re-show param line when data hasn't been updated
        if(this.param_need_update === false) {
            this.scene.add(this.paramDotsGroup)
            return
        }

        this.PurgeParam(); 
        this.param_is_displaying = true
        this.scene.add(this.paramDotsGroup)

        this.param_need_update = false

        let arr = this.Paramterize(Samplers[sample_name], begin, last, gran)
        this.param_vectors = arr
        for(let i of arr) {
            let pointGeo = new THREE.CircleGeometry( 0.04, 8 );
            let dotMaterial = new THREE.MeshBasicMaterial( { color: 0xeeeeee } );
            let dot = new THREE.Mesh( pointGeo, dotMaterial );

            dot.position.set(i.x, i.y, i.z)
            this.paramDotsGroup.add(dot)
        }
        
    }

    HideParam() {
        
        this.scene.remove(this.paramDotsGroup)
        this.param_is_displaying = false
    }
}



export class SplineGroup {
    splines = []
    canvas = null
    camera = null
    planeMesh = null

    mouse_down = false

    geometry = new THREE.BufferGeometry();
    material = new THREE.LineBasicMaterial( { color: 0xcccccc, linewidth: 2.7 } );
    positions = new Float32Array( 100 * 3 );
    drawCount = 0
    dot_hovered = null
    line = null
    click_raycaster = new THREE.Raycaster();
    hover_raycaster = new THREE.Raycaster();
    mouse_down = false
    camera = null
    canvas = null
    spline_ctrl_needs_update = false
    global_tau = 0.5
    global_gran = 20
    dotsGroup = new THREE.Group()
    scene
    themeColor
    show_param = false
    param_sampler_fn = Samplers.linear
    param_sampler_name = 'linear'

    constructor(scene, canvas, camera, planeMesh, themeColor) {
        this.scene = scene
        this.canvas = canvas
        this.camera = camera
        this.planeMesh = planeMesh
        this.themeColor = themeColor
        this.geometry.addAttribute( 'position', new THREE.BufferAttribute( this.positions, 3 ) );
        this.line = new THREE.Line( this.geometry,  this.material );
        this.splines.push(new SplineLine(scene, themeColor))

        scene.add(this.line)
        scene.add(this.dotsGroup)
        canvas.onmousemove = (e)=>{this.MouseHoverOrDrag(e)}
        canvas.onmousedown = ()=> {this.mouse_down = true }
        canvas.onmouseup = ()=>{this.mouse_down = false; this.UpdateSplineOnDotMoved(); }
        canvas.onclick = (e)=>{this.HandleClick(e)}
    }
    
    MouseHoverOrDrag(event) {
        this.canvas.setPickPosition(event)
        let pickPosition = this.canvas.pickPosition

        if(this.dot_hovered && this.mouse_down) {
            this.HandleDrag()
            return
        }
    
        this.hover_raycaster.setFromCamera(pickPosition, this.camera);
        const intersectedObjects = this.hover_raycaster.intersectObjects(this.dotsGroup.children);
        if(this.dot_hovered !== null) {
            this.dot_hovered.material.color.setHex( 0xffffff );
            this.dot_hovered = null
        }
        if (intersectedObjects.length) {
            const obj = intersectedObjects[0].object
            obj.material.color.setHex( 0xFFF176 );
            this.dot_hovered = obj
        }
        
    }

    HandleDrag() {
        let dotOnPlane = this.GetMouseOnPlane()
        this.dot_hovered.position.set(dotOnPlane.x, dotOnPlane.y, dotOnPlane.z)
        let id = this.dot_hovered.userData.id * 3
        
        let arr = this.line.geometry.attributes.position.array 
        arr[id]  = dotOnPlane.x
        arr[id+1]= dotOnPlane.y
        arr[id+2]= dotOnPlane.z
        this.line.geometry.attributes.position.needsUpdate = true
        this.spline_ctrl_needs_update = true
    }

    GetMouseOnPlane() {
        let pickPosition = this.canvas.pickPosition
        let click_raycaster = this.click_raycaster
        let point = new THREE.Vector3(pickPosition.x, pickPosition.y, 5);
        click_raycaster.setFromCamera(point, this.camera);
        let hits = click_raycaster.intersectObject(this.planeMesh,true);
        return hits[0].point;
    }

    UpdateSplineOnDotMoved() {
        if(!this.spline_ctrl_needs_update) {
            return
        }
        for(let spline of this.splines) {
            spline.Sample(this.dotsGroup.children, this.global_tau, this.global_gran).KickUpdateCurve()
        }
        this.spline_ctrl_needs_update = false
    }

    HandleClick(event) {
        if(this.dot_hovered !== null) {
            return
        }
        
        this.canvas.setPickPosition(event)
        let pointOnPlane = this.GetMouseOnPlane()

        let dotsGroup = this.dotsGroup
        let pointGeo = new THREE.CircleGeometry( 0.06, 12 );
        let dotMaterial = new THREE.MeshBasicMaterial( { color: 0xffffff } );
        let dot = new THREE.Mesh( pointGeo, dotMaterial );
        dot.position.set(pointOnPlane.x, pointOnPlane.y, pointOnPlane.z)
        dot.userData = { id: dotsGroup.children.length }
        dotsGroup.add( dot );
        
        for(let s of this.splines) {
            s.Append(this.dotsGroup.children, this.global_gran, pointOnPlane)
        }

        let positions = this.line.geometry.attributes.position.array;
        positions[3 * this.drawCount] = pointOnPlane.x
        positions[3 * this.drawCount + 1] = pointOnPlane.y
        positions[3 * this.drawCount + 2] = pointOnPlane.z
        ++this.drawCount;
        this.line.geometry.setDrawRange(0, this.drawCount)
        this.line.geometry.attributes.position.needsUpdate = true
        this.MouseHoverOrDrag(event)
    }

    set gran(newGran) {
        if(this.global_gran === newGran) {
            return
        }
    
        this.global_gran = newGran
        for(let s of this.splines) {
            s.Sample(this.dotsGroup.children, this.global_tau, this.global_gran).DisplayNewCurve()
        }
    }

    set tau(newTau) {
        if(this.global_tau === newTau) {
            return
        }

        this.global_tau = newTau
        for(let s of this.splines) {
            s.Sample(this.dotsGroup.children, this.global_tau, this.global_gran).KickUpdateCurve()
        }
    }

    TestValidSplines() {
        for(let s of this.splines) {
            if(s.spline != null) {
                return true
            }
        }
        return false
    }

    bifrost_save = {
        splines: null,
        global_tau: 0.5
    }

    set bifrost(bool) {
        let bifrost = this.bifrost_save.splines
        let scene = this.scene
        if((bifrost !== null) === bool || this.TestValidSplines() === false || this.dotsGroup.children.length <= 2) {
            return
        }
    
        if(bool === false) {
            for(let i = 0; i < this.splines.length; ++i) {
                this.scene.remove(this.splines[i].spline)
            }
            this.global_tau = this.bifrost_save.global_tau
            this.splines = this.bifrost_save.splines
            for(let s of this.splines) {
                this.scene.add(s.spline)
            }
            this.bifrost_save.splines = null
            return 
        }

        this.bifrost_save.splines = this.splines
        this.bifrost_save.global_tau = this.global_tau
        let last_spline = this.splines[0]

        for(let s of this.splines) {
            scene.remove(s.spline)
        }
        this.splines = []

        const k = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1]
        
        let curBifrost = 0
        
        last_spline.curveUpdateDone = () => {
            if(curBifrost === k.length) {
                last_spline.curveUpdateDone = null
                return
            }

            let last_last_spline = last_spline
            last_spline = last_spline.clone()
            last_last_spline.curveUpdateDone = null

            this.scene.add(last_spline.spline)
            last_spline.Sample(this.dotsGroup.children, k[curBifrost], this.global_gran).KickUpdateCurve()
            this.splines.push(last_spline)
            ++curBifrost
        }
        last_spline.curveUpdateDone()
    }

    image_manager = new ImageManger()
    set run_img(bool) {
        this.image_manager.run_image = bool
    }

    set img_speed(val) {
        this.image_manager.speed = val
    }

    get imgs() {
        return this.image_manager.GetImages()
    }

    set selectImg(b){
        this.image_manager.SelectImg(this.scene, b)
    }

    set showParam(b) {
        if(this.show_param === b || b === undefined) {
            return
        }
        
        this.show_param = b
        if(this.show_param == true) {
            for(let s of this.splines) {
                s.ShowParam(this.param_sampler_name, 0, this.dotsGroup.children.length, this.global_gran)
            }
        }
        else {
            for(let s of this.splines) {
                s.HideParam()
            }
        }
    }

    set param_sampler(str) {
        if(str) {
            this.param_sampler_fn = Samplers[str]
            this.param_sampler_name = str
            if(this.show_param) {
                for(let s of this.splines) {
                    s.ShowParam(this.param_sampler_name, 0, this.dotsGroup.children.length, this.global_gran)
                }
            }
            
        }
    }

    Clear() {
        this.image_manager.run_image = false
        this.bifrost_save.splines = null
        for(let s of this.splines) {
            s.Destroy()
        }
        this.splines = [
            new SplineLine(this.scene, this.themeColor)
        ]
        
        let dotsGroup = this.dotsGroup
        while(dotsGroup.children.length) {
            dotsGroup.remove(dotsGroup.children[0])
        }

        
        this.drawCount = 0
        this.line.geometry.setDrawRange(0, this.drawCount)
        this.line.geometry.attributes.position.needsUpdate = true
    }

    Render() {
        for(let s of this.splines) {
            s.UpdateCurve()
        }
        let target = null
        if(this.splines.length && this.splines[0].spline){
            if(this.show_param === false) {
                target = this.splines[0].spline.geometry.vertices
            }
            else{
                target = this.splines[0].param_vectors
            }
        }
        
        this.image_manager.RunImage(this.scene, target, this.global_gran, this.splines[0].curveTau)
    }
}


export class CanvasManager {
    canvas = null
    w = 0
    h = 0
    pickPosition = {
        x: 0,
        y: 0
    }
    frame = null

    constructor(frame, canvas) {
        this.clearPickPosition()
        this.canvas = canvas
        this.w = frame.clientWidth
        this.h = frame.clientHeight
        frame.appendChild(canvas)
        frame.mouseout = ()=> this.clearPickPosition()
        this.frame = frame
    }
    
    set onmousemove(fn) {
        this.frame.onmousemove = fn
    }

    set onmousedown(fn) {
        this.frame.onmousedown = fn
    }

    set onmouseup(fn) {
        this.frame.onmouseup = fn
    }

    set onclick(fn) {
        this.frame.onclick = fn
    }

    Aspect() {
        return this.w / this.h
    }

    getCanvasRelativePosition(event) {
        const rect = this.canvas.getBoundingClientRect();
        return {
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
        };
    }

    setPickPosition(event) {
        let pickPosition = this.pickPosition
        const pos = this.getCanvasRelativePosition(event);
        pickPosition.x = (pos.x / this.w) *  2 - 1;
        pickPosition.y = (pos.y / this.h) * -2 + 1;  // note we flip Y
    }

    clearPickPosition() {
        let pickPosition = this.pickPosition
        pickPosition.x = -100000;
        pickPosition.y = -100000;
    }
}