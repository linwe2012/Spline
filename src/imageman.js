import * as THREE from 'three'
import a0 from './shino/a0.png'
import a1 from './shino/a1.png'
import a2 from './shino/a2.png'
import a3 from './shino/a3.png'

import b0 from './shino/b0.png'

import { BeginingPrime } from './utils'

class Image {

    constructor(arr, w, h, scale, skew_k, skew_b) {
        this.plane = arr.map((image)=>{
            let img = new THREE.MeshBasicMaterial({ //CHANGED to MeshBasicMaterial
                map:THREE.ImageUtils.loadTexture(image),
                transparent: true,
            });
            img.map.needsUpdate = true; //ADDED
            let shplane = new THREE.Mesh(new THREE.PlaneGeometry(w, h),img);
            shplane.overdraw = true;
            return shplane
        })

        this.scale = scale
        this.skew_k = skew_k
        this.skew_b = skew_b
    }
}

export class ImageManger {
    frame = 0
    run_image = false
    run_cnt = 0
    first_run = true
    speed = 1.0
    current_pos = 0

    images = [
        new Image([a0, a1, a2, a3], 0.75, 0.8, 0.30, 1.015, -0.06),
        new Image([b0],             0.6,  1.0, 0.44, 1.015, 0.02),
    ]
    GetImages() {
        return [
            {name: '小新 & 美伢', url: a0},
            {name: '小新', url: b0},
        ]
    }
    
    constructor() {
        this.target_image = this.images[0]
    }

    SelectImg(scene, id) {
        if(this.run_image && this.first_run === false) {
            scene.remove(this.target_image.plane[this.frame]);
        }
        this.target_image = this.images[id]
    }

    RunImage(scene, vec, numInterp, curveTau) {
        if(this.run_image === false || vec === null) {
            if(this.first_run === false) {
                scene.remove(this.target_image.plane[this.frame]);
                this.first_run = true
            }
            return
        }

        if(vec.length <= 1) {
            return
        }

        ++this.run_cnt
        const k = -14.0/80
        const b = 15-20*k
        let num = Math.floor((numInterp*k+b) / this.speed)
        if(num === 0) {
            num = 1
        }
        if(this.run_cnt % num === 0) {
            ++this.current_pos
            this.run_cnt = 0
            if(!this.first_run) {
                scene.remove(this.target_image.plane[this.frame])
            }
            ++this.frame
            this.frame = this.frame % this.target_image.plane.length
            scene.add(this.target_image.plane[this.frame])
        }
        else {
            return
        }
    
        if(this.first_run === true) {
            this.frame = 0
            this.current_pos = 0
            this.first_run = false
        }
        
        const plane = this.target_image.plane[this.frame]
        if(vec.length - 1 < this.current_pos) {
            plane.rotation.set(0, 0, 0)
            plane.updateMatrix();
            this.current_pos = 0
        }
        
        let current_pos = this.current_pos
        let pos = vec[current_pos]
        
        const zAix = new THREE.Vector3(0,0,1)
        let span;
        if(this.current_pos === 0) {
            span = BeginingPrime(curveTau, vec[0], vec[1], vec[2])[0]
        }
        else if(this.current_pos == vec.length-1) {
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
        let scale = this.target_image.scale
        let skew_k = this.target_image.skew_k
        let skew_b = this.target_image.skew_b
        this.target_image.plane[this.frame].setRotationFromAxisAngle(zAix, rad*skew_k-skew_b)
        span.applyAxisAngle(zAix, 3.1415926/2).normalize().multiplyScalar(scale)
        this.target_image.plane[this.frame].position.set(pos.x+span.x, pos.y+span.y, pos.z+span.z)
    }

}