/* global chrome */
/* global sha256 */
function getURL(queryWord, appID, appKey) {
  // parameters
  let requestURL = 'https://openapi.youdao.com/api';
  const salt = (new Date).getTime();
  const curTime = Math.round(new Date().getTime() / 1000);
  const signStr = appID + truncate(queryWord) + salt + curTime + appKey;
  const sign = sha256(signStr);
  function truncate(q) {
    const len = q.length;
    if (len<=20) return q;
    return q.substring(0, 10) + len + q.substring(len-10, len);
  }

  // XML HTTP Request
  function addURLParam(url, nameValuePair) {
    for (const name in nameValuePair) {
      if (nameValuePair.hasOwnProperty(name)) {
        url += (url.indexOf('?') == -1 ? '?' : '&');
        url += encodeURIComponent(name) + '=' +
          encodeURIComponent(nameValuePair[name]);
      }
    }
    return url;
  }

  requestURL = addURLParam(requestURL, {
    'q': queryWord,
    'from': 'en',
    'to': 'zh-CHS',
    'appKey': appID,
    'salt': salt,
    'sign': sign,
    'signType': 'v3',
    'curtime': curTime,
  });
  return requestURL;
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  const queryWord = message.selected;
  const appID = message.appID;
  const appKey = message.appKey;
  const requestURL = getURL(queryWord, appID, appKey);
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState == 4) {
      if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304) {
        const result = xhr.responseText;
        // console.log(result);
        sendResponse(result);
      } else {
        console.log('Request was unsuccessful: ' + xhr.status);
      }
    }
  };

  xhr.open('get', requestURL, false);
  xhr.send();
});
