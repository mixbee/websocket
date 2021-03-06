'use strict';

var WS = require('ws');

/**
 * Creates something similar to a WebApi MessageEvent
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent
 *
 * @param {Object} target
 * @param {String|Blob|ArrayBuffer} data
 */
var MessageEvent = function (target, data) {
  this.bubbles = false;
  this.cancelable = false;
  this.cancelBubble = false;
  this.currentTarget = this;
  this.data = data;
  this.eventPhase = 0;
  this.srcElement = this;
  this.target = this;
  this.timeStamp = Date.now();
  this.type = 'message';
};

/**
 * Creates something similar to a HTML5 WebSocket
 *
 * @param {String} url
 */
var WebSocket = function (url, protocols) {

  if (!(this instanceof WebSocket)) {
    throw new TypeError("Constructor WebSocket requires 'new'.");
  }

  this.url = url;
  this.protocol = protocols;
  this.readyState = this.CONNECTING;
  this.bufferedAmount = 0;

  // DOM Level 0
  this.onopen = null;
  this.onclose = null;
  this.onerror = null;
  this.onmessage = null;

  var ws = new WS(url, protocols);

  // DOM Level 2
  var eventListeners = {
    open: [],
    close: [],
    message: [],
    error: [],
  };

  /**
   * @param  {String} type
   * @param  {Function} listener
   */
  this.addEventListener = (type, listener) => {
    var listeners = eventListeners[type];
    if (Array.isArray(listeners)) {
      if (!listeners.some(fn => fn === listener)) {
        listeners.push(listener);
      }
    }
  };

  /**
   * @param  {String} type
   * @param  {Function} listener
   */
  this.removeEventListener = (type, listener) => {
    var listeners = eventListeners[type];
    if (Array.isArray(listeners)) {
      eventListeners[type] = listeners.filter(fn => fn !== listener);
    }
  };

  this.send = (data) => {
    ws.send(data, error => {
      if (error) {
        eventListeners.error.forEach(fn => fn(error));
        this.onerror(error);
      }
    });
  };

  this.close = () => {
    ws.close();
    if (this.readyState === this.CONNECTING) {
      // Browser's WebSocket emits a `close` event when
      // transitioning from CONNECTING to CLOSING
      process.nextTick(() => {
        ws.emit('close');
      });
    }
    this.readyState = this.CLOSING;
  };

  ws.addEventListener('open', () => {
    this.readyState = this.OPEN;
    eventListeners.open.forEach(fn => fn());
    this.onopen && this.onopen();
  });

  ws.addEventListener('close', event => {
    this.readyState = this.CLOSED;
    eventListeners.close.forEach(fn => fn(event));
    this.onclose && this.onclose();
  });

  ws.addEventListener('message', event => {
    // https://developer.mozilla.org/en-US/docs/Web/Events/message
    const messageEvent = new MessageEvent(this, event.data);
    eventListeners.message.forEach(fn => fn(messageEvent));
    this.onmessage && this.onmessage(messageEvent);
  });

  ws.addEventListener('error', error => {
    this.close(); // maybe this should check the error type
    eventListeners.error.forEach(fn => fn(error));
    this.onerror && this.onerror(error);
  });
};

WebSocket.prototype.CONNECTING = 0;
WebSocket.prototype.OPEN = 1;
WebSocket.prototype.CLOSING = 2;
WebSocket.prototype.CLOSED = 3;

WebSocket.CONNECTING = 0;
WebSocket.OPEN = 1;
WebSocket.CLOSING = 2;
WebSocket.CLOSED = 3;

module.exports = WebSocket;
