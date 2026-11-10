/* ==========================================================================
   "Max" — Maxbond's demo chat assistant
   --------------------------------------------------------------------------
   Pure front-end, keyword-matching demo. No data leaves the browser.

   Want a real AI later? Never put an API key in this file — anyone can read
   it. Instead, create a small backend (e.g. Cloudflare Worker / Vercel
   function) that holds the key, then plug it in:

     window.MaxbondChat.setResolver(async function (message, history) {
       const res = await fetch('https://your-api.example.com/chat', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ message, history })
       });
       const data = await res.json();
       return data.reply;            // plain text (will be escaped)
     });
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = window.MAXBOND_CONFIG || {};
  var rootMeta = document.querySelector('meta[name="site-root"]');
  // Absolute site root, so links saved in the chat history keep working on every page.
  var ROOT = new URL((rootMeta && rootMeta.getAttribute('content')) || './', document.baseURI).href;
  var EMAIL = CONFIG.email || 'hello@maxbondtech.com';
  var PHONE = CONFIG.phone || '+852 0000 0000';
  var PHONE_HREF = CONFIG.phoneHref || PHONE.replace(/\s+/g, '');
  var STORE_KEY = 'maxbond-chat-v2';

  var link = function (path, text) {
    return '<a href="' + ROOT + path + '">' + text + '</a>';
  };
  var CONTACT = link('contact.html', 'contact form');

  /* Knowledge base ------------------------------------------------------ */
  // Each intent: keywords (ASCII matched on word boundaries, CJK matched as
  // substrings), a reply (trusted HTML) and suggested follow-up chips.
  var INTENTS = [
    {
      id: 'greet',
      keys: ['hi', 'hello', 'hey', 'yo', 'morning', 'afternoon', 'evening', 'hiya', '你好', '哈囉', '早晨', '喂'],
      reply:
        '<p>Hey there! 👋 I can tell you about our services, pricing, timelines — or connect you with the team. What are you working on?</p>',
      chips: ['What do you offer?', 'How much does it cost?', 'Talk to a human'],
    },
    {
      id: 'services',
      keys: ['service', 'services', 'offer', 'what do you do', 'what can you do', 'help me', 'capabilities', 'solutions', '服務'],
      reply:
        '<p>Maxbond is a Hong Kong IT studio. We do four things really well:</p>' +
        '<ul>' +
        '<li>' + link('services/website-development.html', 'Website Development') + '</li>' +
        '<li>' + link('services/mobile-development.html', 'Mobile Development') + ' (iOS & Android)</li>' +
        '<li>' + link('services/ai-chatbot.html', 'AI Chatbots') + ' — like a smarter version of me</li>' +
        '<li>' + link('services/customized-solution.html', 'Customized Solutions') + ' — ERP, CRM, integrations</li>' +
        '</ul><p>Which one sounds closest to what you need?</p>',
      chips: ['Websites', 'Mobile apps', 'AI chatbots', 'Custom systems'],
    },
    {
      id: 'website',
      keys: ['website', 'websites', 'web site', 'web design', 'webpage', 'landing page', 'wordpress', 'ecommerce', 'e-commerce', 'online store', 'online shop', 'shopify', 'seo', 'cms', 'redesign', '網站', '网站', '網頁'],
      reply:
        '<p>We design and build fast, mobile-first websites — from 5-page company sites to full e-commerce stores with local payments.</p>' +
        '<p>Every site comes with SEO basics, analytics and an easy CMS so your team can update content. ' +
        link('services/website-development.html', 'See Website Development →') + '</p>',
      chips: ['How much does it cost?', 'How long does it take?', 'Talk to a human'],
    },
    {
      id: 'mobile',
      keys: ['app', 'apps', 'mobile', 'ios', 'android', 'iphone', 'ipad', 'flutter', 'react native', 'app store', 'play store', 'google play', 'application', '手機', '应用', 'apps'],
      reply:
        '<p>We build iOS and Android apps from one codebase, so you launch on both stores faster and maintain less code.</p>' +
        '<p>Logins, payments, push notifications, admin dashboards — and we handle App Store / Google Play submission too. ' +
        link('services/mobile-development.html', 'See Mobile Development →') + '</p>',
      chips: ['How long does it take?', 'How much does it cost?', 'Talk to a human'],
    },
    {
      id: 'chatbot',
      keys: ['chatbot', 'chat bot', 'chatbots', 'ai', 'gpt', 'chatgpt', 'llm', 'claude', 'bot', 'whatsapp bot', 'virtual assistant', 'customer service', 'automation', '機械人', '机器人', '人工智能'],
      reply:
        '<p>Our AI chatbots are trained on <em>your</em> content — website, FAQs, price lists, documents — and answer customers 24/7 on your website, WhatsApp, Facebook or Instagram.</p>' +
        '<p>They can reply in English, Cantonese and Mandarin, capture leads, and hand tricky chats to your staff. ' +
        link('services/ai-chatbot.html', 'See AI Chatbots →') + '</p>',
      chips: ['Are you a real AI?', 'Can it speak Cantonese?', 'How much does it cost?'],
    },
    {
      id: 'custom',
      keys: ['custom', 'customized', 'customised', 'bespoke', 'erp', 'crm', 'system', 'systems', 'inventory', 'booking', 'integration', 'integrate', 'api', 'dashboard', 'internal', 'legacy', 'backend', 'portal', 'payment gateway', 'fps', 'octopus', 'stripe', 'workflow', '系統', '系统'],
      reply:
        '<p>For businesses that have outgrown spreadsheets, we build custom internal systems — ERP, CRM, inventory, booking, staff portals — and connect them with the tools you already use.</p>' +
        '<p>We also do API & system integration: payment gateways (FPS, Stripe, AlipayHK…), logistics, accounting and legacy systems. ' +
        link('services/customized-solution.html', 'See Customized Solutions →') + '</p>',
      chips: ['How long does it take?', 'Do I own the code?', 'Talk to a human'],
    },
    {
      id: 'price',
      keys: ['price', 'prices', 'pricing', 'cost', 'costs', 'how much', 'budget', 'quote', 'quotation', 'fee', 'fees', 'rate', 'rates', 'expensive', 'cheap', 'affordable', 'package', 'packages', '幾錢', '几钱', '價錢', '价钱', '報價', '报价', '費用'],
      reply:
        '<p>Every project is quoted on its scope, so you only pay for what you need. We have three typical packages: <strong>Launch</strong> (small business sites), <strong>Grow</strong> (custom sites, apps & chatbots) and <strong>Enterprise</strong> (systems & integrations).</p>' +
        '<p>Tell us a bit about your project via the ' + CONTACT + ' and we\'ll send a clear, fixed-price proposal — the first consultation is free.</p>',
      chips: ['How long does it take?', 'Talk to a human'],
    },
    {
      id: 'time',
      keys: ['how long', 'timeline', 'timeframe', 'time frame', 'duration', 'weeks', 'months', 'deadline', 'urgent', 'asap', 'quickly', 'launch date', 'when can', '幾耐', '多久', '時間'],
      reply:
        '<p>Rough guide:</p><ul><li>Company website: 4–8 weeks</li><li>AI chatbot: 2–4 weeks</li><li>Mobile app: 2–4 months</li><li>Custom system: 2–6 months</li></ul>' +
        '<p>Got a hard deadline? Mention it on the ' + CONTACT + ' and we\'ll plan around it.</p>',
      chips: ['How much does it cost?', 'How do you work?'],
    },
    {
      id: 'process',
      keys: ['process', 'how do you work', 'how does it work', 'steps', 'workflow', 'methodology', 'agile', 'next step', 'start'],
      reply:
        '<p>Five simple steps: <strong>Discover</strong> (free consultation) → <strong>Design</strong> (clickable prototypes) → <strong>Build</strong> (weekly demos) → <strong>Launch</strong> → <strong>Support</strong>.</p>' +
        '<p>You always know what\'s happening and what it costs. ' + link('index.html#process', 'See our process →') + '</p>',
      chips: ['How much does it cost?', 'Talk to a human'],
    },
    {
      id: 'contact',
      keys: ['contact', 'email', 'phone', 'call', 'talk', 'human', 'person', 'staff', 'someone', 'meeting', 'meet', 'appointment', 'consultation', 'consult', 'reach', 'speak', 'sales', '聯絡', '联系', '電話', '电话'],
      reply:
        '<p>Happy to connect you with the team!</p>' +
        '<ul><li>Email: <a href="mailto:' + EMAIL + '">' + EMAIL + '</a></li>' +
        '<li>Phone: <a href="tel:' + PHONE_HREF + '">' + PHONE + '</a></li>' +
        '<li>Or use our ' + CONTACT + ' — we reply within one business day.</li></ul>',
      chips: ['Where are you based?', 'What do you offer?'],
    },
    {
      id: 'location',
      keys: ['where', 'location', 'located', 'office', 'address', 'hong kong', 'hk', 'based', 'overseas', 'abroad', 'remote', '香港', '地址'],
      reply:
        '<p>We\'re based in Hong Kong and work with clients across Asia and beyond — most meetings happen on Zoom or Teams, but we\'re happy to meet in person in HK.</p>',
      chips: ['Talk to a human', 'What do you offer?'],
    },
    {
      id: 'support',
      keys: ['support', 'maintenance', 'maintain', 'after launch', 'hosting', 'host', 'update', 'updates', 'bug', 'bugs', 'fix', 'warranty', 'sla', '維護', '维护'],
      reply:
        '<p>Every project includes a free support period after launch. After that, we offer monthly maintenance plans covering hosting, security updates, backups and small improvements.</p>',
      chips: ['Do I own the code?', 'How much does it cost?'],
    },
    {
      id: 'own',
      keys: ['own', 'ownership', 'source code', 'code', 'copyright', 'ip', 'intellectual property', 'handover'],
      reply:
        '<p>Yes — once the project is paid in full, the source code, designs and content are yours. No lock-in.</p>',
      chips: ['Do you offer support?', 'Talk to a human'],
    },
    {
      id: 'language',
      keys: ['cantonese', 'chinese', 'mandarin', 'putonghua', 'language', 'languages', 'english', 'traditional', 'simplified', 'bilingual', '中文', '廣東話', '广东话', '粵語', '普通話', '普通话', '繁體', '簡體'],
      reply:
        '<p>The AI chatbots we build for clients can chat in English, Cantonese (written in a natural Hong Kong tone) and Mandarin, in both Traditional and Simplified Chinese. 😊</p>' +
        '<p>I\'m just a simple demo, so I mostly speak English.</p>',
      chips: ['AI chatbots', 'How much does it cost?'],
    },
    {
      id: 'demo',
      keys: ['real ai', 'are you ai', 'are you a bot', 'are you human', 'are you real', 'who are you', 'what are you', 'your name', 'demo', 'robot', 'max'],
      reply:
        '<p>I\'m Max, a scripted demo running entirely in your browser — I match keywords rather than truly understanding you.</p>' +
        '<p>The chatbots we build for clients run on real AI models, trained on your business content, so they handle open-ended questions far better than me. ' +
        link('services/ai-chatbot.html', 'Learn more →') + '</p>',
      chips: ['AI chatbots', 'Talk to a human'],
    },
    {
      id: 'thanks',
      keys: ['thanks', 'thank you', 'thx', 'ty', 'cheers', 'great', 'awesome', 'cool', 'nice', 'perfect', 'ok', 'okay', '多謝', '唔該', '谢谢', '謝謝'],
      reply: '<p>Anytime! Anything else I can help with?</p>',
      chips: ['What do you offer?', 'Talk to a human'],
    },
    {
      id: 'bye',
      keys: ['bye', 'goodbye', 'see you', 'see ya', 'later', 'cya', '拜拜'],
      reply: '<p>Bye for now! 👋 When you\'re ready, the team is one message away: ' + CONTACT + '.</p>',
      chips: [],
    },
  ];

  var CHIP_MAP = {
    Websites: 'website',
    'Mobile apps': 'mobile',
    'AI chatbots': 'chatbot',
    'Custom systems': 'custom',
  };

  var FALLBACK = {
    reply:
      '<p>Hmm, I\'m only a demo bot so I didn\'t quite catch that. 🙈 I can help with:</p>' +
      '<ul><li>Our services & what\'s included</li><li>Pricing and timelines</li><li>Getting in touch with the team</li></ul>',
    chips: ['What do you offer?', 'How much does it cost?', 'Talk to a human'],
  };

  var GREETING = {
    reply:
      '<p>Hi, I\'m <strong>Max</strong> 👋 Maxbond\'s demo assistant.</p>' +
      '<p>Ask me about websites, mobile apps, AI chatbots or custom systems — or how to reach the team.</p>',
    chips: ['What do you offer?', 'How much does it cost?', 'How long does it take?', 'Talk to a human'],
  };

  var isCJK = function (s) {
    return /[　-鿿＀-￯]/.test(s);
  };
  var escapeRe = function (s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  function match(text) {
    var msg = ' ' + text.toLowerCase().replace(/[’']/g, "'") + ' ';
    var best = null;
    var bestScore = 0;
    INTENTS.forEach(function (intent) {
      var score = 0;
      intent.keys.forEach(function (k) {
        var hit = isCJK(k) ? msg.indexOf(k) !== -1 : new RegExp('(^|[^a-z0-9])' + escapeRe(k) + '($|[^a-z0-9])').test(msg);
        if (hit) score += k.length + (k.indexOf(' ') !== -1 ? 4 : 0);
      });
      // Small talk shouldn't beat a real question.
      if (intent.id === 'greet' || intent.id === 'thanks') score *= 0.6;
      if (score > bestScore) {
        bestScore = score;
        best = intent;
      }
    });
    return best || FALLBACK;
  }

  var resolver = function (message) {
    var chipIntent = CHIP_MAP[message];
    if (chipIntent) {
      for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].id === chipIntent) return INTENTS[i];
    }
    return match(message);
  };

  /* Persistence (per tab session, optional) ----------------------------- */
  var history = [];
  var load = function () {
    try {
      var raw = sessionStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  };
  var save = function () {
    try {
      sessionStorage.setItem(STORE_KEY, JSON.stringify({ history: history.slice(-40) }));
    } catch (e) {
      /* storage unavailable — fine */
    }
  };

  /* UI ------------------------------------------------------------------ */
  var botIcon = ROOT + 'assets/img/max.svg';
  var wrap = document.createElement('div');
  wrap.className = 'cb';
  wrap.innerHTML =
    '<div class="cb-teaser" role="status">' +
    '<p>Hi! I\'m Max 👋 Got a question about your project?</p>' +
    '<button type="button" aria-label="Dismiss">✕</button>' +
    '</div>' +
    '<section class="cb-panel" role="dialog" aria-modal="false" aria-label="Chat with Max, Maxbond demo assistant" id="cb-panel">' +
    '<header class="cb-head">' +
    '<span class="avatar"><img src="' + botIcon + '" alt="" width="30" height="30"></span>' +
    '<div class="who"><strong>Max <em>DEMO</em></strong><small>Maxbond assistant · replies instantly</small></div>' +
    '<button type="button" class="cb-icon-btn" data-cb-reset aria-label="Restart conversation" title="Restart">' +
    '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2.5 8a5.5 5.5 0 1 0 1.7-4"/><path d="M2.5 2.5v3h3"/></svg></button>' +
    '<button type="button" class="cb-icon-btn" data-cb-close aria-label="Close chat">✕</button>' +
    '</header>' +
    '<div class="cb-log" role="log" aria-live="polite"></div>' +
    '<div class="cb-chips"></div>' +
    '<form class="cb-form" autocomplete="off">' +
    '<label class="sr-only" for="cb-input">Your message</label>' +
    '<input id="cb-input" type="text" placeholder="Ask about websites, apps, pricing…" maxlength="300">' +
    '<button type="submit" aria-label="Send"><svg viewBox="0 0 16 16" fill="none" stroke="#0a0a0a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8h11M9 4l4 4-4 4"/></svg></button>' +
    '</form>' +
    '<p class="cb-foot">Scripted demo · no data leaves your browser</p>' +
    '</section>' +
    '<button type="button" class="cb-launcher" aria-controls="cb-panel" aria-expanded="false" aria-label="Chat with Max">' +
    '<img src="' + botIcon + '" alt="" width="40" height="40"><span class="cb-x" aria-hidden="true">✕</span>' +
    '</button>';
  document.body.appendChild(wrap);

  var panel = wrap.querySelector('.cb-panel');
  var log = wrap.querySelector('.cb-log');
  var chipsEl = wrap.querySelector('.cb-chips');
  var form = wrap.querySelector('.cb-form');
  var input = wrap.querySelector('#cb-input');
  var launcher = wrap.querySelector('.cb-launcher');
  var teaser = wrap.querySelector('.cb-teaser');
  var busy = false;

  function scrollDown() {
    log.scrollTop = log.scrollHeight;
  }

  function addBubble(role, content, isHtml) {
    var b = document.createElement('div');
    b.className = 'bubble ' + role;
    if (isHtml) b.innerHTML = content;
    else b.textContent = content;
    log.appendChild(b);
    scrollDown();
    return b;
  }

  function setChips(list) {
    chipsEl.innerHTML = '';
    (list || []).forEach(function (label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      btn.addEventListener('click', function () {
        send(label);
      });
      chipsEl.appendChild(btn);
    });
  }

  function botSay(reply, chips, record) {
    addBubble('bot', reply, true);
    setChips(chips);
    if (record !== false) {
      history.push({ role: 'bot', html: reply, chips: chips || [] });
      save();
    }
  }

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true;
    addBubble('user', text, false);
    history.push({ role: 'user', text: text });
    save();
    setChips([]);
    var typing = addBubble('bot typing', '<i></i><i></i><i></i>', true);
    typing.setAttribute('aria-label', 'Max is typing');

    Promise.resolve(resolver(text, history.slice()))
      .then(function (result) {
        var reply;
        var chips;
        if (typeof result === 'string') {
          // Plain text from a custom resolver → escape it.
          var tmp = document.createElement('p');
          tmp.textContent = result;
          reply = tmp.outerHTML;
          chips = [];
        } else {
          reply = result.reply;
          chips = result.chips;
        }
        var delay = Math.min(1400, 450 + reply.length * 2);
        setTimeout(function () {
          typing.remove();
          botSay(reply, chips);
          busy = false;
        }, delay);
      })
      .catch(function () {
        typing.remove();
        botSay('<p>Sorry, I hit a snag. Please try again, or use our ' + CONTACT + '.</p>', ['Talk to a human']);
        busy = false;
      });
  }

  function start(fresh) {
    log.innerHTML = '';
    var note = document.createElement('p');
    note.className = 'cb-note';
    note.textContent = 'Max is a scripted demo of the AI chatbots we build.';
    log.appendChild(note);

    var saved = fresh ? null : load();
    if (saved && saved.history && saved.history.length) {
      history = saved.history;
      history.forEach(function (m) {
        if (m.role === 'user') addBubble('user', m.text, false);
        else addBubble('bot', m.html, true);
      });
      var lastBot = history.filter(function (m) {
        return m.role === 'bot';
      }).pop();
      setChips(lastBot ? lastBot.chips : GREETING.chips);
    } else {
      history = [];
      botSay(GREETING.reply, GREETING.chips);
    }
  }

  var started = false;
  function open(prefill) {
    if (!started) {
      start(false);
      started = true;
    }
    document.body.classList.add('cb-open');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.setAttribute('aria-label', 'Close chat');
    hideTeaser(true);
    if (prefill) send(prefill);
    setTimeout(function () {
      if (window.innerWidth > 520) input.focus();
      scrollDown();
    }, 60);
  }

  function close() {
    document.body.classList.remove('cb-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.setAttribute('aria-label', 'Chat with Max');
  }

  function hideTeaser(remember) {
    teaser.classList.remove('is-visible');
    if (remember) {
      try {
        sessionStorage.setItem(STORE_KEY + '-teaser', '1');
      } catch (e) {
        /* ignore */
      }
    }
  }

  launcher.addEventListener('click', function () {
    if (document.body.classList.contains('cb-open')) close();
    else open();
  });
  wrap.querySelector('[data-cb-close]').addEventListener('click', function () {
    close();
    launcher.focus();
  });
  wrap.querySelector('[data-cb-reset]').addEventListener('click', function () {
    try {
      sessionStorage.removeItem(STORE_KEY);
    } catch (e) {
      /* ignore */
    }
    start(true);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var text = input.value;
    input.value = '';
    send(text);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('cb-open')) {
      close();
      launcher.focus();
    }
  });
  teaser.querySelector('button').addEventListener('click', function () {
    hideTeaser(true);
  });
  teaser.querySelector('p').addEventListener('click', function () {
    open();
  });

  // Friendly teaser once per session, after a short delay.
  var teaserSeen = false;
  try {
    teaserSeen = !!sessionStorage.getItem(STORE_KEY + '-teaser');
  } catch (e) {
    /* ignore */
  }
  if (!teaserSeen) {
    setTimeout(function () {
      if (!document.body.classList.contains('cb-open')) teaser.classList.add('is-visible');
      setTimeout(function () {
        hideTeaser(false);
      }, 9000);
    }, 6000);
  }

  // Public API
  window.MaxbondChat = {
    open: open,
    close: close,
    send: function (text) {
      open();
      send(text);
    },
    setResolver: function (fn) {
      if (typeof fn === 'function') resolver = fn;
    },
  };
})();
