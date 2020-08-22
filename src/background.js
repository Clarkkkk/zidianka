/* global chrome */
/* global sha256 */
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  const queryWord = message.selected;
  const options = message.options;

  fetch(getURL(queryWord, options))
    .then((body) => {
      if (body.ok) {
        return body.json();
      } else {
        throw new Error('Request failed: ' +
          body.status + ' ' + body.statusText);
      }
    })
    .then((data) => sendResponse(data))
    .catch((e) => {
      console.log(e);
      sendResponse(e);
    });

  // generate a request URL
  function getURL(queryWord, options) {
    // parameters
    let requestURL = 'https://openapi.youdao.com/api';
    const appID = options.appID;
    const appKey = options.appKey;
    const salt = (new Date).getTime();
    const curTime = Math.round(new Date().getTime() / 1000);
    const signStr = appID + truncate(queryWord) + salt + curTime + appKey;
    const sign = sha256(signStr);

    // concatenate URL
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

    // auxiliary functions
    function truncate(q) {
      const len = q.length;
      if (len<=20) return q;
      return q.substring(0, 10) + len + q.substring(len-10, len);
    }
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
    return requestURL;
  }

  // indicate to send a response asynchronously
  return true;
});
