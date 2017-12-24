const run = require('@cycle/run').run
const xs = require('xstream').default
const makeServiceWorkerEventDriver = require('cycle-service-worker').makeServiceWorkerEventDriver

function main (sources) {

  const nav$ = sources.SWE.events('fetch')
    .map(evt => {
      if ( evt.request.url.includes('/api/') ) { // network first for api
        evt.respondWith(
          fetch(evt.request).then(function (res) {
            if ( res.ok ) {
              caches.open('cycle-app').then(function (cache) {
                cache.put(evt.request, res.clone())
              })
              return res
            }
            else { throw Error(res.statusText) }
          })
          .catch(function (err) { return caches.match(evt.request) })
        )
      }
      else { // cache first for non-api
          evt.respondWith(
            caches.open('cycle-app').then(function (cache) {
              return cache.match(evt.request).then(function (res) {
                return res || fetch(evt.request).then(function (res) {
                  if ( res.ok ) {
                    cache.put(evt.request, res.clone())
                    return res
                  }
                  else { throw Error(res.statusText) }
                })
                .catch(function (err) { return pageNotFound(evt.request, err) })
              })
            })
          )
      }
    })
  const message$ = xs.periodic(1000).take(3).map(inc => 'send message ' + inc)
  const incmsg$ = sources.SWE.events('message')
    .map(evt => 'message received from main: ' + evt.data)
 
  return {
    nav: nav$,
    SWE: message$,
    log: incmsg$
  }
}

function pageNotFound (requrl, err) {
  console.log(requrl, err)
  return new Response('Page not found! <a href="index.html">Back home</a>', {
    headers: {'Content-Type': 'text/html'}
  })
}

run(main, {
  nav: fetch$ => { fetch$.addListener({}) },
  SWE: makeServiceWorkerEventDriver(),
  log: msg$ => { msg$.addListener({next: msg => console.log(msg)}) }
})
