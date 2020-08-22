/* global chrome */
// get user's options at first, and then initialize
getOptions().then((options) => initialize(options));

function getOptions() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(null, (options) => resolve(options));
  });
}

function initialize(options) {
  // shadow root host
  let host;
  // query
  document.documentElement.addEventListener('mouseup', mouseupHandler);
  // remove all the cards when click outside them
  document.documentElement.addEventListener('mousedown', mousedownHandler);

  function mouseupHandler(event) {
    const selectedObj = window.getSelection();
    const selected = selectedObj.toString();

    // requirements to activate querying
    const requirements =
    options.withCtrl &&
    event.ctrlKey &&
    selected.length > 0 &&
    selected.length < options.wordLimit &&
    event.target !== host;

    // create or return a shadow root
    // then fetch the data
    // then construct the card
    if (requirements) {
      // if the host doesn't exist, initialize it
      if (!host) {
        host = document.createElement('div');
        document.documentElement.appendChild(host);
        const root = host.attachShadow({ mode: 'open' });
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = chrome.extension.getURL('src/card.css');
        link.type = 'text/css';
        root.appendChild(link);
      }
      // fetch the aata and create the card
      getData(options)
        .then((response) => createCard(response))
        .catch((e) => console.log(e));
    }

    function getData(options) {
      return new Promise((resolve) => {
        const message = { selected: selected, options: options };
        chrome.runtime.sendMessage(message, (response) => resolve(response));
      });
    }

    function createCard(data) {
      const card = new Card(data);
      host.shadowRoot.appendChild(card.container);
      card.locate(selectedObj.getRangeAt(0).getClientRects());
    }
  }

  function mousedownHandler(event) {
    if (host && event.target !== host) {
      const cards = host.shadowRoot.querySelectorAll('div.container');
      for (const item of cards) {
        item.style.opacity = '0';
        setTimeout(() => item.remove(), 200);
      }
    }
  }
}

// prefix "-" means that the property or method should only
// be used inside the class
class Card {
  constructor(obj) {
    this._errorCode = obj.errorCode;
    this._isWord = obj.isWord;
    this._returnPhrase = obj.returnPhrase;
    this._translation = obj.translation;
    this._basic = obj.basic;
    this._query = obj.query;
    this.container;
    this._container();
    if (this._basic) {
      this._phonetic();
      for (const entry of this._basic['explains']) {
        this._createElem('span', 'explains', entry);
      }
    } else {
      this._createElem('span', 'explains', this._translation);
    }
  }

  _container() {
    this.container = document.createElement('div');
    this.container.classList.add('dictionary-card', 'container');
    this.container.style.opacity = '0';
    const titleText = this._isWord ? this._returnPhrase : this._query;
    this._createElem('span', 'title', titleText);
  }

  _phonetic() {
    const USPhonetic = this._basic['us-phonetic'];
    const UKPhonetic = this._basic['uk-phonetic'];
    const USVoice = this._basic['us-speech'];
    const UKVoice = this._basic['uk-speech'];

    const phoneticLine = this._createElem('div', 'phonetic-line');
    const createPhoElem = (area, phonetic, url) => {
      if (phonetic) {
        const figure = document.createElement('figure');
        phoneticLine.appendChild(figure);
        // create phonetic element
        this._createElem('span', 'area', area, figure);
        this._createElem('span', 'phonetic', phonetic, figure);
        // create voice speaker element
        const voiceElem = this._createElem('img', 'voice', '', figure);
        const iconURL = chrome.runtime.getURL('src/speaker.png');
        const playingIconURL = chrome.runtime.getURL('src/speaking.gif');
        voiceElem.src = iconURL;
        voiceElem.alt = 'speaker';

        // create the pronounciation voice source
        const audio = document.createElement('audio');
        audio.src = url;
        this.container.appendChild(audio);

        // display an animation while playing
        audio.addEventListener('play', () => {
          voiceElem.src = playingIconURL;
        });
        // end the animation when the playback ends
        audio.addEventListener('ended', () => {
          voiceElem.src = iconURL;
        });

        // click the speaker to start playing
        voiceElem.addEventListener('click', (event) => {
          audio.play();
        });
      }
    };

    createPhoElem('US', USPhonetic, USVoice);
    createPhoElem('UK', UKPhonetic, UKVoice);
  }

  _createElem(type, className, text, parent = this.container) {
    const element = document.createElement(type);
    if (text) {
      const textNode = document.createTextNode(text);
      element.appendChild(textNode);
    }
    element.classList.add('dictionary-card', className);
    parent.appendChild(element);
    return element;
  }

  locate(selectedRects) {
    const card = this.container;
    const cardWidth = card.clientWidth;
    const cardHeight = card.clientHeight;
    let cardTop;
    let cardLeft;
    let maxHeight;
    let maxWidth;
    let top;
    let currentTop;
    let maxLeft;
    let maxRight;

    if (selectedRects.length == 1) {
      // the simplest situation
      top = selectedRects[0].top;
      currentTop = top;
      maxLeft = selectedRects[0].left;
      maxHeight = selectedRects[0].height;
      maxWidth = selectedRects[0].width;
    } else {
      // for multiple rects in a line and multiple lines with multiple rects
      for (const item of selectedRects) {
        if (!top) {
          // initialize everything
          // top: the very top of all rects
          // currentTop: top of the current item
          // max-parameter: the outmost extent in every dimension
          top = item.top;
          currentTop = top;
          maxLeft = item.left;
          maxHeight = item.height;
          maxWidth = item.width;
          maxRight = item.left + item.width;
        } else if (item.top == currentTop) {
          // rects in the same line extend the right border
          maxRight += item.width;
        } else if (item.top > currentTop) {
          // a rect in another line
          // increase height
          // calculate the potential max-left and max-right increase
          // update the current-top
          maxHeight += item.height;
          maxLeft = maxLeft < item.left ? maxLeft : item.left;
          maxRight = maxRight > (item.left + item.width) ?
            maxRight : (item.left + item.width);
          currentTop = item.top;
        } else {
          // should never occur
          console.log('Exception!');
          // console.log(maxLeft);
          // console.log(top);
          // console.log(item);
        }
      }
      // calculate the max-width
      maxWidth = maxRight - maxLeft;
    }

    // determine top and left according to the dimensions of the selected text
    cardTop = top + maxHeight + window.scrollY + 5;
    cardLeft = maxLeft + maxWidth / 2 - cardWidth / 2 + window.scrollX;
    // adjust the position if there is not enough room for the card
    const cardBottom = cardTop + cardHeight - window.scrollY;
    const cardRight = cardLeft + cardWidth - window.scrollX;
    // if not enough room bebeath, move it above the selected text
    if (cardBottom > document.documentElement.clientHeight) {
      cardTop = top - cardHeight - 5 + window.scrollY;
    }
    // if the card reachh outside the viewport, drag it back
    if (cardRight > document.documentElement.clientWidth) {
      cardLeft = document.documentElement.clientWidth -
        cardWidth - 5 + window.scrollX;
    }
    if (cardLeft < window.scrollX + 5) {
      cardLeft = window.scrollX + 5;
    }
    card.style.top = cardTop + 'px';
    card.style.left = cardLeft + 'px';
    card.style.opacity = '1';
  }
}
