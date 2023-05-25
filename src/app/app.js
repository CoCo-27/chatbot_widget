import './app.scss';
import html from './app.html';

export default (function (window, document) {
  const DEFAULT_OPTIONS = {
    app_key: null,
    companyName: null,
    autoOpen: false,
    timeToOpen: 10,
    hideBeforeLoaded: false, // chat app can be hidden before fully loaded for clean UX
    loadAfterWidgetOpen: false, // start loading chat frame after the widget opens fully for better UX
    delayBeforeLoad: 500, // Used only when loadAfterWidgetOpen is true for giving delay before start loading the chart frame
    useNotificationframe: false, // notification frame is used to show unread message count
    unloadWaitingHandler: null,
  };

  const DEFAULT_SETTINGS = {
    autoOpenEnabled: true,
  };

  const STYLE_NAMESPACE = 'jeeves-chat-widget';
  const WIDGET_ID = STYLE_NAMESPACE;

  const CHAT_APP_ORIGIN = new URL(process.env.JEEVES_CHAT_APP_URL).origin;

  const CHAT_APP_SIGNALS = {
    HANDSHAKE: 'handshake',
    CLOSE: 'close',
    FINISH: 'finish',
  };
  class App {
    constructor(options) {
      this.$widget = null;
      this.$chatCloser = null;
      this.$chatFrame = null;
      this.$notificationFrame = null;
      this.$notificationToggle = null;

      this.chatLoaded = false;

      this.settings = {};

      this.options = {};
      this.configure(options);

      this.autoOpenHandler = null;
    }
    configure(options) {
      this.options = { ...DEFAULT_OPTIONS, ...options };
    }
    load() {
      this.attachView();
      this.loadNotificationFrame();
      this.loadSettings();

      this.configureAutoOpen();
    }
    attachView() {
      let widget = document.getElementById(WIDGET_ID);
      if (!widget) {
        widget = document.createElement('div');
        widget.id = WIDGET_ID;
        widget.classList.add(STYLE_NAMESPACE);
        if (this.options.hideBeforeLoaded)
          widget.classList.add(`${STYLE_NAMESPACE}-hide-before-loaded`);
        if (this.options.useNotificationframe)
          widget.classList.add(`${STYLE_NAMESPACE}-use-notification-frame`);

        const body = document.getElementsByTagName('body')[0];
        body.appendChild(widget);
      }

      widget.innerHTML = html;
      this.$widget = widget;
      this.$chatCloser = widget.querySelector(
        `.${STYLE_NAMESPACE}-chat-container>.${STYLE_NAMESPACE}-chat-closer`
      );
      this.$chatFrame = widget.querySelector(
        `.${STYLE_NAMESPACE}-chat-container>iframe`
      );
      this.$notificationFrame = widget.querySelector(
        `.${STYLE_NAMESPACE}-notification-container>iframe`
      );
      this.$notificationToggle = widget.querySelector(
        `.${STYLE_NAMESPACE}-notification-container>.${STYLE_NAMESPACE}-notification-toggle`
      );

      widget = null;
    }
    getChatAppUrl(path = '') {
      // console.log(this.options.app_key)
      // const urlPath = path ? `/${path}` : ''
      return `${process.env.JEEVES_CHAT_APP_URL}`;
    }
    loadNotificationFrame() {
      this.$notificationToggle.addEventListener(
        'click',
        this.onNotificationToggleClicked.bind(this)
      );
      this.$chatCloser.addEventListener(
        'click',
        this.onNotificationToggleClicked.bind(this)
      );

      if (!this.options.useNotificationframe) return;

      // this.$notificationFrame.src = this.getChatAppUrl() + '/notifications'
      this.$notificationFrame.onload =
        this.onNotificationFrameLoaded.bind(this);
    }
    onNotificationFrameLoaded() {
      console.debug('notification frame loaded');
      this.$notificationFrame.parentNode.classList.add(
        `${STYLE_NAMESPACE}-notification-loaded`
      );
    }
    configureAutoOpen() {
      if (this.options.autoOpen !== true || !this.settings.autoOpenEnabled)
        return;

      const time =
        (isNaN(this.options.timeToOpen) ? 10 : this.options.timeToOpen) * 1000;
      this.autoOpenHandler = setTimeout(
        this.onNotificationToggleClicked.bind(this),
        time
      );
    }
    clearAutoOpenHandler() {
      if (!this.autoOpenHandler) return;

      clearTimeout(this.autoOpenHandler);
      this.autoOpenHandler = null;
    }
    loadSettings() {
      const settings = sessionStorage.getItem(WIDGET_ID);
      this.settings = settings
        ? { ...DEFAULT_SETTINGS, ...JSON.parse(settings) }
        : DEFAULT_SETTINGS;
    }
    saveSettings() {
      sessionStorage.setItem(WIDGET_ID, JSON.stringify(this.settings));
    }
    saveAutoOpenEnabledState(enabled) {
      this.settings.autoOpenEnabled = enabled;
      this.saveSettings();
    }
    onNotificationToggleClicked() {
      console.debug('notification toggle clicked');

      this.clearAutoOpenHandler();

      this.$chatFrame.parentNode.classList.toggle('open');

      const open = this.$chatFrame.parentNode.className
        .split(' ')
        .includes('open');

      this.saveAutoOpenEnabledState(open);

      if (open) {
        if (this.chatLoaded) {
          this.clearUnloadWaitingHandler();
          return;
        }

        if (this.options.loadAfterWidgetOpen)
          setTimeout(
            this.loadChatFrame.bind(this),
            this.options.delayBeforeLoad
          );
        else this.loadChatFrame();
      } else {
        if (this.chatLoaded) return;

        this.unloadChatFrame();
      }
    }
    loadChatFrame() {
      console.debug('loading chat frame...');
      this.$chatFrame.onload = this.onChatFrameLoaded.bind(this);
      this.$chatFrame.src = this.getChatAppUrl();
    }
    unloadChatFrame() {
      console.debug('unloading chat frame...');
      this.$chatFrame.onload = null;
      this.$chatFrame.removeAttribute('src');
      console.debug('chat frame unloaded.');
    }
    onChatFrameLoaded() {
      console.debug('chat frame loaded');
      this.$chatFrame.parentNode.classList.add(
        `${STYLE_NAMESPACE}-chat-loaded`
      );
      this.$chatFrame.onload = null;
      this.chatLoaded = true;

      this.setupChannelWithChatApp();
    }
    clearUnloadWaitingHandler() {
      if (!this.unloadWaitingHandler) return;

      clearTimeout(this.unloadWaitingHandler);
      this.unloadWaitingHandler = null;
      console.debug('unload waiting handler cleared.');
    }
    unloadChat() {
      this.unloadChatFrame();
      this.chatLoaded = false;
      this.unloadWaitingHandler = null;
      console.debug('chat finished.');
    }
    finishChat() {
      console.debug('finishing chat...');
      this.$chatFrame.parentNode.classList.remove('open');

      if (this.unloadWaitingHandler) return;

      this.unloadWaitingHandler = setTimeout(
        this.unloadChat.bind(this),
        this.options.delayBeforeLoad
      );
      console.debug('unload waiting handler created.');
    }
    setupChannelWithChatApp() {
      window.addEventListener(
        'message',
        this.onChatAppSignalReceived.bind(this),
        false
      );
      this.sendHandshakeSignalToChatApp();
    }
    sendHandshakeSignalToChatApp() {
      this.sendSignalToChatApp({
        signal: CHAT_APP_SIGNALS.HANDSHAKE,
        appKey: this.options.app_key,
        companyName: this.options.companyName,
      });
    }
    sendSignalToChatApp(signalObj) {
      if (!CHAT_APP_ORIGIN) return;
      this.$chatFrame.contentWindow.postMessage(signalObj, CHAT_APP_ORIGIN);
    }
    onChatAppSignalReceived(event) {
      if (event.origin !== CHAT_APP_ORIGIN) return;

      console.debug('got a signal from the chat app: ', event.data);

      let { signal } = event.data;
      switch (signal) {
        case CHAT_APP_SIGNALS.CLOSE:
          this.onNotificationToggleClicked();
          break;
        case CHAT_APP_SIGNALS.FINISH:
          this.finishChat();
          break;
        default:
      }
    }
  }

  return App;
})(window, document);
