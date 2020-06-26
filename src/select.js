/* global chrome */
document.documentElement.addEventListener('mouseup', getSelectedText);
function getSelectedText(event) {
  let selectedObj = window.getSelection();
  // if there is already a card
  // remove the card when click elsewhere again
  // and clear the Selection object immediately
  // else, create a new one
  if (!event.target.classList.contains('dict-card')) {
    if (document.getElementById('dict-card')) {
      document.getElementById('dict-card').style.opacity = '0';
      setTimeout(() => document.getElementById('dict-card').remove(), 200);
      selectedObj = null;
    } else {
      const selected = selectedObj.toString();
      if (selected.length > 0 && selected.length < 150) {
        chrome.runtime.sendMessage({selected: selected}, (response) => {
          const card = cardConstruct(response);
          positionFigure(event, card, selectedObj);
        });
      }
    }
  }
}

function cardConstruct(response) {
  // response text
  const responseObj = JSON.parse(response);
  const errorCode = responseObj.errorCode;
  const isWord = responseObj.isWord;
  const returnPhrase = responseObj.returnPhrase;
  const translation = responseObj.translation;
  const webDef = responseObj.web;
  const basicDef = responseObj.basic;
  const query = responseObj.query;

  // construct the display card
  // since where to put it is not clear yet
  // and cannot calculate its dimensions before append it to the DOM
  // let's make it invisible for the moment
  // and append it to the root element
  const container = document.createElement('div');
  container.id = 'dict-card';
  container.classList.add('dict-card');
  container.style.opacity = '0';
  document.documentElement.appendChild(container);

  // display explains
  if (errorCode == 0) {
    if (isWord) {
      appendNewElemWithText('span', returnPhrase, container, 'title');
      const basicUSPhonetic = basicDef['us-phonetic'];
      const basicUKPhonetic = basicDef['uk-phonetic'];
      const UKVoiceURL = basicDef['uk-speech'];
      const USVoiceURL = basicDef['us-speech'];
      const basicExplains = basicDef['explains'];
      const phoneticLine = document.createElement('span');
      phoneticLine.id = 'phoneticLine';
      phoneticLine.classList.add('dict-card');
      container.appendChild(phoneticLine);
      phoneticBuild(basicUSPhonetic, USVoiceURL, 'US', phoneticLine);
      phoneticBuild(basicUKPhonetic, UKVoiceURL, 'UK', phoneticLine);
      for (const entry of basicExplains) {
        appendNewElemWithText('span', entry, container, 'explains');
      }
    } else {
      const titleBox = document.createElement('span');
      titleBox.classList.add('titleBox');
      container.appendChild(titleBox);
      appendNewElemWithText('span', query, titleBox, 'title');
      if (responseObj['speakUrl']) {
        speakerBuild(responseObj['speakUrl'], titleBox);
      }
      appendNewElemWithText('span', translation, container, 'explains');
    }
  }
  return container;
}

// auxiliary function to create the phonetic line
function phoneticBuild(phonetic, voiceURL, area, container) {
  if (phonetic) {
    // display phonetic notations
    const phoneticBox = document.createElement('span');
    phoneticBox.classList.add('dict-card', 'phoneticBox');
    container.appendChild(phoneticBox);
    appendNewElemWithText('span', area, phoneticBox, 'area');
    appendNewElemWithText('span', phonetic, phoneticBox, 'phonetic');

    // create the speaker image
    speakerBuild(voiceURL, phoneticBox);
  }
}

function speakerBuild(url, container) {
  const speaker = document.createElement('img');
  const speakerURL = chrome.runtime.getURL('src/speaker.png');
  const speakerPlayingURL = chrome.runtime.getURL('src/speaking.gif');
  speaker.src = speakerURL;
  speaker.alt = 'speaker';
  speaker.classList.add('speaker');
  speaker.classList.add('dict-card');

  // create the pronounciation voice source
  const audio = document.createElement('audio');
  audio.src = url;
  document.documentElement.appendChild(audio);

  // display an animation while playing
  audio.addEventListener('play', () => {
    speaker.src = speakerPlayingURL;
  });
  // end the animation when the playback ends
  audio.addEventListener('ended', () => {
    speaker.src = speakerURL;
  });

  // click the speaker to start playing
  speaker.addEventListener('click', (event) => {
    audio.play();
  });

  container.appendChild(speaker);
  return speaker;
}

// auxiliary function to create a new element
// and append a text node, and append the new element to a parent node
function appendNewElemWithText(type, text, parent, className) {
  if (text) {
    const elementNode = document.createElement(type);
    if (className) {
      elementNode.classList.add(className);
    }
    elementNode.classList.add('dict-card');
    const textNode = document.createTextNode(text);
    elementNode.appendChild(textNode);
    parent.appendChild(elementNode);
    return elementNode;
  }
}

// determine the position of the card
function positionFigure(event, card, selected) {
  let cardTop;
  let cardLeft;
  const cardWidth = card.clientWidth;
  const cardHeight = card.clientHeight;
  const selectedRects = selected.getRangeAt(0).getClientRects();
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
        maxRight = maxRight > (item.left + item.width) ? maxRight : (item.left + item.width);
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
    cardLeft = document.documentElement.clientWidth - cardWidth - 5 + window.scrollX;
  }
  if (cardLeft < window.scrollX + 5) {
    cardLeft = window.scrollX + 5;
  }
  card.style.top = cardTop + 'px';
  card.style.left = cardLeft + 'px';
  card.style.opacity = '1';
}


// get mouse coordinate(for test)
/*
const ordinate = appendNewElemWithText('div', ' ', document.documentElement);
ordinate.style.position = 'absolute';
ordinate.style.zIndex = '1000';
ordinate.style.fontSize = '14px';
ordinate.style.border = '1px solid black';
ordinate.style.backgroundColor = 'white';

document.documentElement.addEventListener('mousedown', (event) => {
  let X = event.pageX + 2;
  let Y = event.pageY;
  let text = 'X: ' + X + ', ' + 'Y: ' + Y;
  ordinate.style.left = X + 'px';
  ordinate.style.top = Y + 'px';
  ordinate.textContent = text;
});
*/
