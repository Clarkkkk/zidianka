/* global chrome */
const appID = document.getElementById('appID');
const appKey = document.getElementById('appKey');
const withCtrl = document.getElementById('with-ctrl');
const wordLimit = document.getElementById('word-limit');
const limitConvert = {
  '1': [20, '20'],
  '2': [50, '50'],
  '3': [100, '100'],
  '4': [200, '200'],
  '5': [500, '500'],
  '6': [10e10, '不限']
};

// load the latest setting from storage, if any
window.onload = function() {
  chrome.storage.sync.get(null, (result) => {
    if (result.appID) {
      appID.value = result.appID;
      appKey.value = result.appKey;
      withCtrl.checked = result.withCtrl;
      console.log(result.withCtrl);
      for (const index in limitConvert) {
        if (limitConvert[index][0] === result.wordLimit) {
          wordLimit.value = parseInt(index);
        }
      }
    }
  });
};

function saveOptions() {
  const limitNum = limitConvert[wordLimit.value][0];
  chrome.storage.sync.set(
    {
      appID: appID.value,
      appKey: appKey.value,
      withCtrl: withCtrl.checked,
      wordLimit: limitNum
    }, successPopUp);
}

// click or use keyboard to save options
const save = document.getElementById('save');
save.addEventListener('click', saveOptions);
save.addEventListener('keydown', (event) => {
  if (event.key === 'enter' || event.key === 'space') {
    saveOptions();
  }
});

// blur when mouse up, in order to clear the focus style
save.addEventListener('mouseup', (event) => {
  event.target.blur();
});

// show the indicator when hovering
wordLimit.addEventListener('mouseenter', (event) => {
  const indicator = document.createElement('div');
  indicator.id = 'indicator';
  indicator.style.opacity = '0';
  document.documentElement.appendChild(indicator);
  getPosition(event.target, indicator);
  indicator.style.opacity = '1';
});

// hide the indicator when mouse leaves
wordLimit.addEventListener('mouseleave', () => {
  if (document.getElementById('indicator')) {
    document.getElementById('indicator').remove();
  }
});

// show the latest value when change the word limit
wordLimit.addEventListener('input', (event) => {
  const indicator = document.getElementById('indicator');
  getPosition(event.target, indicator);
});

function getPosition(slider, indicator) {
  indicator.textContent = limitConvert[slider.value][1];

  const positionOffset = (parseInt(slider.value) - 1) * 0.2 *
    (slider.clientWidth - 10);
  const top = slider.scrollTop + slider.offsetTop + 20;
  const left = slider.scrollLeft + slider.offsetLeft + 5 +
    positionOffset - indicator.clientWidth / 2;
  indicator.style.top = top + 'px';
  indicator.style.left = left + 'px';
}

function successPopUp() {
  const popup = document.createElement('div');
  popup.id = 'popup';
  popup.textContent = '保存成功';
  popup.style.opacity = '0';
  const popupWidth = 100;
  popup.style.width = popupWidth + 'px';
  popup.style.height = '15px';
  const left = document.documentElement.clientWidth / 2 - popupWidth / 2;
  popup.style.left = left + 'px';
  document.documentElement.appendChild(popup);
  popup.style.opacity = '1';
}
