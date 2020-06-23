/* global chrome */
document.documentElement.addEventListener('mouseup', getSelectedText);
function getSelectedText(event) {
  const selectedObj = window.getSelection();
  // remove the card when click elsewhere again
  // and clear the Selection object immediately
  if (document.getElementById('dict-card') &&
    event.target != document.getElementById('dict-card') &&
    event.target.parentElement != document.getElementById('dict-card')) {
    document.getElementById('dict-card').remove();
    selectedObj = null;
  }
  const selected = selectedObj.toString();
  if (selected.length > 0) {
    if (selected.length < 400) {
      chrome.runtime.sendMessage({selected: selected}, (response) => {
        const card = cardConstruct(response);
        positionFigure(event, card, selectedObj);
      });
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

  // construct the display card
  // since where to put it is not clear yet
  // and cannot calculate its dimensions before append it to the DOM
  // let's make it invisible for the moment
  // and append it to the root element
  const container = document.createElement('div');
  container.id = 'dict-card';
  container.style.visibility = 'hidden';
  document.documentElement.appendChild(container);

  // display explains
  if (errorCode == 0) {
    if (isWord) {
      const basicUSPhonetic = basicDef['us-phonetic'];
      const basicUKPhonetic = basicDef['uk-phonetic'];
      const basicExplains = basicDef['explains'];
      appendNewElemWithText('span', returnPhrase, container, 'title');
      const phoneticBox = document.createElement('span');
      phoneticBox.id = 'phoneticBox';
      container.appendChild(phoneticBox);
      appendNewElemWithText('span', 'US /' + basicUSPhonetic + '/', phoneticBox, 'phonetic');
      appendNewElemWithText('span', 'UK /' + basicUKPhonetic + '/', phoneticBox, 'phonetic');
      for (const entry of basicExplains) {
        appendNewElemWithText('span', entry, container, 'explains');
      }
    }
  }

  return container;
}

// auxiliary function to create a new element
// and append a text node, and append the new element to a parent node
function appendNewElemWithText(type, text, parent, className) {
  if (text) {
    const elementNode = document.createElement(type);
    if (className) {
      elementNode.classList.add(className);
    }
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
  card.style.visibility = '';
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
