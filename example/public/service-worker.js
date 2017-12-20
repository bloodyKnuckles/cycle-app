const run = require('@cycle/run').run
const xs = require('xstream').default
const makeServiceWorkerEventDriver = require('cycle-service-worker').makeServiceWorkerEventDriver

function main (sources) {

  const nav$ = sources.SWE.events('fetch')
    .map(evt => {
      //switch ( evt.request.url ) {
        //case 'http://localhost:9966/example/public/index.html':
        //case 'http://localhost:9966/example/public/test.html':
      if ( evt.request.url.endsWith('.html') ) {
          evt.respondWith(
            caches.open('cycle-app').then(function (cache) {
              return cache.match(evt.request).then(function (res) {
                return res || fetch(evt.request).then(function (res) {
                  if ( res.ok ) { return res }
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
