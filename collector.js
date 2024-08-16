function getWebRTCIPs() {
  return new Promise(resolve => {
    const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
    pc.createDataChannel('');
    pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => {});
    const ipSet = new Set();
    pc.onicecandidate = event => {
      if (event.candidate) {
        const ipv4Regex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
        const ipv6Regex = /(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}/i;
        const ipv4Match = ipv4Regex.exec(event.candidate.candidate);
        const ipv6Match = ipv6Regex.exec(event.candidate.candidate);
        if (ipv4Match && ipv4Match[1]) {
          ipSet.add(ipv4Match[1]);
        }
        if (ipv6Match) {
          ipSet.add(ipv6Match[0]);
        }
      } else {
        resolve(Array.from(ipSet));
        pc.onicecandidate = null;
      }
    };
  });
}


// Function to generate browser data and send it to the server
function sendBrowserDataToServer(ip, webrtcIps, uuid) {
  var browserData = {
    ip: ip,
    webrtc_ip: webrtcIps.length > 0 ? webrtcIps[0] : null, // Take the first WebRTC IP address
    user_agent: navigator.userAgent,
    timezone_js: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screen_resolution: screen.width + 'x' + screen.height,
    platform: navigator.platform,
    webgl_hash: getWebglHash(),
    canvas_hash: getCanvasHash(),
    audio_hash: getAudioHash(),
    languages_js: navigator.languages ? navigator.languages.join(',') : (navigator.language || navigator.userLanguage),
    fonts_hash: getFontsHash(),
    uuid: uuid
  };
  var headers = new Headers();
  headers.append('Content-Type', 'application/json');
  headers.append('X-Api-Token', 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiI1NWMxNjgwYi0wYzAzLTRiMmUtOTQ2OS0yZGNjYmZlODRkZGQiLCJpc3N1ZWRfZm9yIjoiYWRtaW4ifQ.GSe4z6PjRplCLdZV7-lln4YohYkLQYuMx-qwHAxn_Kg');

  // Send data to the server
  fetch('http://localhost:8080/api/score/v1/assessment/check', {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(browserData)
  })
    .then(response => response.json())
    .then(result => {
      console.log('Server response:', result);
    })
    .catch(error => {
      console.error('Error:', error);
    });
}

// Get IP and WebRTC IP addresses
Promise.all([getIP(), getWebRTCIPs()]).then(([ip, webrtcIp]) => {
  // Get UUID from the URL
  const uuid = getUUIDFromURL();

  // Call the function to send browser data to the server
  sendBrowserDataToServer(ip, webrtcIp, uuid);
});

// Function to generate a random hash
function generateRandomHash() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Function to calculate WebGL fingerprint hash
function getWebglHash() {
  var canvas = document.createElement('canvas');
  var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  var extension = gl.getExtension('WEBGL_debug_renderer_info');
  var renderer = gl.getParameter(extension.UNMASKED_RENDERER_WEBGL);
  return renderer ? sha1(renderer) : null;
}

// Function to calculate Canvas fingerprint hash
function getCanvasHash() {
  var canvas = document.createElement('canvas');
  var context = canvas.getContext('2d');
  var text = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  context.textBaseline = "top";
  context.font = "14px 'Arial'";
  context.textBaseline = "alphabetic";
  context.fillStyle = "#f60";
  context.fillRect(125,1,62,20);
  context.fillStyle = "#069";
  context.fillText(text, 2, 15);
  context.fillStyle = "rgba(102, 204, 0, 0.7)";
  context.fillText(text, 4, 17);
  var dataURL = canvas.toDataURL();
  return sha1(dataURL);
}

// Function to calculate audio fingerprint hash
function getAudioHash() {
  var audioContext = window.AudioContext || window.webkitAudioContext;
  var audioCtx = new audioContext();
  var oscillator = audioCtx.createOscillator();
  var analyser = audioCtx.createAnalyser();
  var dataArray = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteTimeDomainData(dataArray);
  return sha1(dataArray);
}

// Function to calculate fonts fingerprint hash
function getFontsHash() {
  var fonts = [];
  var testString = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
  var baseFonts = ['monospace', 'sans-serif', 'serif'];
  var testSize = '72px';
  var testElements = document.createElement('div');
  testElements.style.visibility = 'hidden';
  testElements.style.position = 'absolute';
  testElements.style.top = '-9999px';
  document.body.appendChild(testElements);

  for (var index in baseFonts) {
    var baseFont = baseFonts[index];
    var span = document.createElement('span');
    span.style.fontSize = testSize;
    span.innerHTML = testString;
    span.style.fontFamily = baseFont;
    testElements.appendChild(span);
    fonts.push({
      baseFont: baseFont,
      width: span.offsetWidth,
      height: span.offsetHeight
    });
  }

  var extendedFonts = [
    'Arial', 'Arial Black', 'Arial Narrow', 'Arial Rounded MT Bold',
    'Bookman Old Style', 'Bradley Hand ITC', 'Calibri', 'Cambria', 'Candara',
    'Century Gothic', 'Comic Sans MS', 'Consolas', 'Courier', 'Courier New',
    'Garamond', 'Georgia', 'Helvetica', 'Impact', 'Lucida Console', 'Lucida Grande',
    'Lucida Sans Unicode', 'Microsoft Sans Serif', 'Monaco', 'Palatino Linotype',
    'Segoe UI', 'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS', 'Verdana'
  ];

  for (var i in extendedFonts) {
    var fontName = extendedFonts[i];
    var matched = false;
    for (var j in baseFonts) {
      if (fonts[j].baseFont === fontName) {
        matched = true;
        break;
      }
    }
    if (!matched) {
      var span = document.createElement('span');
      span.style.fontSize = testSize;
      span.innerHTML = testString;
      span.style.fontFamily = fontName;
      testElements.appendChild(span);
      fonts.push({
        baseFont: fontName,
        width: span.offsetWidth,
        height: span.offsetHeight
      });
    }
  }

  document.body.removeChild(testElements);

  return sha1(JSON.stringify(fonts));
}

// Function to get the IP address using a third-party service
async function getIP() {
  const response = await fetch('https://api.ipify.org?format=json');
  const data = await response.json();
  return data.ip;
}

// Function to extract UUID from the URL
function getUUIDFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('token'); // Assuming the token is the UUID
}

function sha1(str) {
  return CryptoJS.SHA1(str).toString(CryptoJS.enc.Hex);
}
