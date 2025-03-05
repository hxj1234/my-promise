const PENDING = 'pending'
const FULFILLED = 'fulfill'
const REJECTED = 'rejected'
function runAsyncTask(fn){
  if(typeof queueMicrotask === 'function'){
    queueMicrotask(fn)
  }else if(typeof MutationObserver === 'function'){
    const obs = new MutationObserver(fn)
    const divNode = document.createElement('div')
    obs.observe(divNode,{childList: true})
    divNode.innerText = 'temp'
  }else{
    setTimeout(fn,0)
  }
}

class MyPromise{
  constructor(cb){
    this.status = PENDING;
    this.result = null;
    this.successCallBacks = []
    this.errorCallBacks = []
    const resolve = (data) => {
      if(this.status !== PENDING){
        return
      }
      this.status = FULFILLED
      this.result = data
      if(this.successCallBacks.length){
        this.successCallBacks.forEach(cb => {
          cb(this.result)
        })
      }
    }
    const reject = (data) =>{
      if(this.status !== PENDING){
        return
      }
      this.status = REJECTED
      this.result = data
      if(this.errorCallBacks.length){
        this.errorCallBacks.forEach(cb => {
          cb()
        })
      }
    }
    try{
      cb(resolve,reject)
    }catch(err){
      reject(err)
    }
  }
  then(successCallBack,errorCallBack){
    // Warning 这里是重点
    successCallBack = typeof successCallBack === 'function' ? successCallBack : (res) => res
    errorCallBack = typeof errorCallBack === 'function' ? errorCallBack : (error) => {throw error}
    
    const p2 = new MyPromise((resolve,reject)=>{
      if(this.status === PENDING){
        this.successCallBacks.push(()=>runAsyncTask(() => {
          try{
            const res = successCallBack(this.result)
            if(res === p2){
              throw new TypeError('Chaining cycle detected for promise #<Promise>')
            }
            if(res instanceof MyPromise){
              res.then((data)=>{
                resolve(data)
              },err => {
                reject(err)
              })
            }else{
              resolve(res)
            }
          }catch(err){
            reject(err)
          }
        }))
        this.errorCallBacks.push(()=>runAsyncTask(() => {
          try{
            const res = errorCallBack(this.result)
            if(res === p2){
              throw new TypeError('Chaining cycle detected for promise #<Promise>')
            }
            if(res instanceof MyPromise){
              res.then(data => resolve(data), err => reject(err))
            }else{
              resolve(res)
            }
          }catch(err){
            reject(err)
          }
        }))
      }else if(this.status === FULFILLED){
        runAsyncTask(()=>{
          try{
            const res = successCallBack(this.result)
            if(res === p2){
              throw new TypeError('Chaining cycle detected for promise #<Promise>')
            }
            if(res instanceof MyPromise){
              res.then( data => resolve(data),err => reject(err))
            }else{
              resolve(res)
            }
          }catch(err){
            reject(err)
          }
        })
      }else{
        runAsyncTask(()=>{
          try{
            const res = errorCallBack(this.result)
            if(res === p2){
              throw new TypeError('Chaining cycle detected for promise #<Promise>')
            }
            if(res instanceof MyPromise){
              res.then(data => resolve(data), err => reject(err))
            }else{
              resolve(res)
            }
          }catch(err){
            reject(err)
          }
        })
      }
    }) 

    return p2
  }
  catch(cb){
    // 内部调用then方法
    return this.then(undefined,cb)
  }
  finally(cb){
    return this.then(cb,cb)
  }
  static resolve(arg){
    if(arg instanceof MyPromise){
      return arg
    }else{
      return new MyPromise( resolve => resolve(arg))
    }
  }
  static reject(error){
    return new MyPromise((undefined, reject) =>  reject(error)) 
  }
  static race(promiseArr){
    return new MyPromise((resolve,reject)=>{
      if(!Array.isArray(promiseArr) || promiseArr.length === 0){
        reject(new TypeError('Argument is not iterable'))
      }
      for(let i = 0;i< promiseArr.length;i++){
        MyPromise.resolve(promiseArr[i]).then(res => {
          resolve(res)
        }).catch(err =>{
          reject(err)
        })
      }
    })
  }

  static all(promiseArr){
    return new MyPromise((resolve,reject)=>{
      let data = []
      let count = 0;
      if(!Array.isArray(promiseArr)){
        reject(new TypeError('Argument is not iterable'))
      }
      if(promiseArr.length === 0){
        resolve([])
      }
      promiseArr.forEach((p,index) => {
        MyPromise.resolve(p).then(res=>{
          data[index] = res
          count++
          if(count === promiseArr.length){
            resolve(data)
          }
        }).catch(err=>{
          reject(err)
        })
      })
    })
  }

  static allSettled(promiseArr){
    return new MyPromise((resolve,reject)=>{
      let data = []
      let count = 0;
      if(!Array.isArray(promiseArr)){
        reject(new TypeError('Argument is not iterable'))
      }
      if(promiseArr.length === 0){
        resolve([])
      }
      promiseArr.forEach((p,index) => {
        MyPromise.resolve(p).then(res=>{
          data[index] = {
            status: FULFILLED,
            value: res
          }
        }).catch(err => {
          data[index] = {
            status: REJECTED,
            reason: err
          }
        }).finally(()=>{
          count++
          if(count === promiseArr.length){
            resolve(data)
          }
        })
      })

    })
  }

  static any(promiseArr){
    return new MyPromise((resolve,reject)=>{
      let data = []
      let count = 0;
      if(!Array.isArray(promiseArr)){
        reject(new TypeError('Argument is not iterable'))
      }
      if(promiseArr.length === 0){
        reject(new TypeError('AggregateError: All promises were rejected'))
      }

      promiseArr.forEach((p,index) => {
        MyPromise.resolve(p).then(res=>{
          resolve(res)
        }).catch(err => {
          data[index] = {
            status: REJECTED,
            reason: err
          }
          count++
          if(count === promiseArr.length){
            reject({
              errors: data,
              message: 'AggregateError: All promises were rejected'
            })
          }
        })
      })
    })
  }
}
