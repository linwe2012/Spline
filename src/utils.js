import * as THREE from 'three'
export function MapColorToDiscrete(val /* [0, 1] */) { // -> [100, 200, ..., 900]
    const k = [0,  0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 2]
    const v = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 900]
    for(let i = 0; i < k.length; ++i) {
        if(val < k[i+1]) {
            return v[i]
        }
    }
}

// estimate curvature
export function BeginingPrime(tau, p0, p1, p2) {
    let p0_prime = new THREE.Vector3();
    let p1_prime = new THREE.Vector3();

    p0_prime.x = tau * (2*p1.x-p2.x-p0.x)
    p0_prime.y = tau * (2*p1.y-p2.y-p0.y)
    p0_prime.z = 0 // tau * (2*p1.z-p2.z-p0.z)

    p1_prime.addVectors(p0.clone().negate(), p2).multiplyScalar(tau)
    return [p0_prime, p1_prime]
}


export function Integration(mat, ua, ub, delta_x) {
    let p1 = mat.elements
    
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


export function ComputeTransformMatrix(p1, p2, p3, p4) {
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
    return mat3
}