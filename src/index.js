import App from './app';
(function (window) {
  // const widgetBrokerName = process.env.JEEVES_CHAT_WIDGET_BROKER_NAME
  // let app = null

  // console.debug('JeevesChatWidget starting')
  // const globalObject = window[window[widgetBrokerName]]
  // globalObject.q && processQueue(globalObject.q)

  // window[window[widgetBrokerName]] = apiHandler

  // function processQueue(queue) {
  //   for (var i = 0; i < queue.length; i++) {
  //     const params = queue[i][1]
  //     if (queue[i][0].toLowerCase() == 'init') {
  //       app = new App(params)
  //       app.load()
  //       console.debug('JeevesChatWidget started')
  //     } else apiHandler(queue[i][0], params)
  //   }
  // }

  // function apiHandler(api, params) {
  //   if (!api) throw Error('API method required')
  //   api = api.toLowerCase()

  //   console.debug(`Handling API call ${api}`, params)

  //   const func = app[api]
  //   if (func) {
  //     return func(params)
  //   } else throw Error(`Method ${api} is not supported`)
  // }

  // const scriptEle = document.querySelector(
  //   'script[data-chat-app-id="filebot"]'
  // );
  // const app_key = scriptEle.getAttribute('data-app-key');
  const app = new App({});
  app.load();
  console.log('new app started');
})(window);
