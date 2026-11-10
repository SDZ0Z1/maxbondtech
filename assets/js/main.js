/* Maxbond Technology — site interactions (no dependencies) */
(function () {
  'use strict';

  var doc = document.documentElement;
  var CONFIG = window.MAXBOND_CONFIG || {};
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Header: border on scroll ------------------------------------------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Mobile menu --------------------------------------------------------- */
  var toggle = document.querySelector('.menu-toggle');
  var mobileMenu = document.querySelector('.mobile-menu');
  if (toggle && mobileMenu) {
    var setMenu = function (open) {
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    };
    toggle.addEventListener('click', function () {
      setMenu(!document.body.classList.contains('menu-open'));
    });
    mobileMenu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('menu-open')) {
        setMenu(false);
        toggle.focus();
      }
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth > 960) setMenu(false);
    });
  }

  /* Services dropdown (click / keyboard; hover handled in CSS) ---------- */
  document.querySelectorAll('.nav-drop').forEach(function (drop) {
    var btn = drop.querySelector('button');
    var close = function () {
      drop.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    };
    btn.addEventListener('click', function () {
      var open = !drop.classList.contains('is-open');
      drop.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', function (e) {
      if (!drop.contains(e.target)) close();
    });
    drop.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        close();
        btn.focus();
      }
    });
    drop.addEventListener('focusout', function (e) {
      if (!drop.contains(e.relatedTarget)) close();
    });
  });

  /* Tabs (WAI-ARIA tabs pattern) ---------------------------------------- */
  document.querySelectorAll('[role="tablist"]').forEach(function (list) {
    var tabs = Array.prototype.slice.call(list.querySelectorAll('[role="tab"]'));
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      tab.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () {
        select(tab);
      });
      tab.addEventListener('keydown', function (e) {
        var next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') next = tabs[0];
        if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) {
          e.preventDefault();
          select(next, true);
        }
      });
    });
  });

  /* Reveal on scroll ---------------------------------------------------- */
  var reveals = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) || reduceMotion) {
    reveals.forEach(function (el) {
      el.classList.add('is-in');
    });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  }

  /* Animated chat mock (plays once when visible) ------------------------ */
  document.querySelectorAll('[data-chat-mock]').forEach(function (mock) {
    var bubbles = Array.prototype.slice.call(mock.querySelectorAll('.bubble'));
    if (reduceMotion || !('IntersectionObserver' in window)) {
      mock.classList.add('no-anim');
      bubbles.forEach(function (b) {
        if (b.classList.contains('typing')) b.remove();
      });
      return;
    }
    var play = function () {
      var t = 200;
      bubbles.forEach(function (b) {
        var isTyping = b.classList.contains('typing');
        setTimeout(function () {
          b.classList.add('is-shown');
        }, t);
        if (isTyping) {
          t += 1300;
          setTimeout(function () {
            b.remove();
          }, t - 80);
        } else {
          t += b.classList.contains('user') ? 900 : 1100;
        }
      });
    };
    var mo = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) {
          play();
          mo.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    mo.observe(mock);
  });

  /* Logo marquee: repeat items until one row is wider than the screen ---- */
  document.querySelectorAll('.logo-track').forEach(function (track) {
    var rows = track.querySelectorAll('.logo-row');
    if (rows.length < 2) return;
    var originals = Array.prototype.slice.call(rows[0].children);
    var fill = function () {
      var need = track.parentElement.clientWidth + 60;
      var guard = 0;
      while (rows[0].scrollWidth < need && guard++ < 8) {
        originals.forEach(function (li) {
          var copy = li.cloneNode(true);
          copy.setAttribute('aria-hidden', 'true');
          rows[0].appendChild(copy);
        });
      }
      rows[1].innerHTML = rows[0].innerHTML;
      track.style.setProperty('--dur', Math.max(20, Math.round(rows[0].scrollWidth / 42)) + 's');
    };
    fill();
    window.addEventListener('resize', fill);
  });

  /* Footer year --------------------------------------------------------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = String(new Date().getFullYear());
  });

  /* Contact form -------------------------------------------------------- */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var status = form.querySelector('.form-status');
    var submitBtn = form.querySelector('[type="submit"]');
    var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    // Pre-select a service from ?service=website etc.
    try {
      var wanted = new URLSearchParams(window.location.search).get('service');
      if (wanted) {
        var box = form.querySelector('input[name="services"][value="' + wanted.replace(/[^a-z-]/gi, '') + '"]');
        if (box) box.checked = true;
      }
    } catch (err) {
      /* URLSearchParams not supported — ignore */
    }

    var showStatus = function (type, html) {
      status.className = 'form-status is-visible is-' + type;
      status.innerHTML = html;
    };

    var validate = function () {
      var ok = true;
      form.querySelectorAll('[data-required]').forEach(function (input) {
        var field = input.closest('.field');
        var value = input.value.trim();
        var bad = !value || (input.type === 'email' && !EMAIL_RE.test(value));
        field.classList.toggle('has-error', bad);
        input.setAttribute('aria-invalid', String(bad));
        if (bad && ok) {
          input.focus();
          ok = false;
        }
      });
      return ok;
    };

    form.querySelectorAll('[data-required]').forEach(function (input) {
      input.addEventListener('input', function () {
        var field = input.closest('.field');
        if (field.classList.contains('has-error')) {
          var value = input.value.trim();
          var bad = !value || (input.type === 'email' && !EMAIL_RE.test(value));
          field.classList.toggle('has-error', bad);
          input.setAttribute('aria-invalid', String(bad));
        }
      });
    });

    var collect = function () {
      var data = new FormData(form);
      var services = data.getAll('services');
      return {
        formData: data,
        name: (data.get('name') || '').toString().trim(),
        email: (data.get('email') || '').toString().trim(),
        phone: (data.get('phone') || '').toString().trim(),
        company: (data.get('company') || '').toString().trim(),
        services: services.join(', '),
        budget: (data.get('budget') || '').toString(),
        timeline: (data.get('timeline') || '').toString(),
        message: (data.get('message') || '').toString().trim(),
      };
    };

    var mailtoFallback = function (d) {
      var to = CONFIG.email || 'hello@maxbondtech.com';
      var subject = 'Project enquiry — ' + (d.company || d.name);
      var body = [
        'Name: ' + d.name,
        'Email: ' + d.email,
        d.phone ? 'Phone: ' + d.phone : '',
        d.company ? 'Company: ' + d.company : '',
        d.services ? 'Interested in: ' + d.services : '',
        d.budget ? 'Budget: ' + d.budget : '',
        d.timeline ? 'Timeline: ' + d.timeline : '',
        '',
        d.message,
      ]
        .filter(function (line, i, arr) {
          return line !== '' || arr[i - 1] !== '';
        })
        .join('\n');
      return 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    };

    var success = function () {
      var card = form.closest('.form-card');
      var root = document.querySelector('meta[name="site-root"]');
      var base = root ? root.getAttribute('content') : '';
      card.innerHTML =
        '<div class="form-success" role="status">' +
        '<img src="' + base + 'assets/img/icons/heart.svg" alt="" width="72" height="72">' +
        '<h2>Thanks — message received!</h2>' +
        '<p>We’ll get back to you within one business day.<br>In the meantime, feel free to say hi to Max, our demo assistant.</p>' +
        '</div>';
      card.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    };

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate()) {
        showStatus('error', 'Please fill in the highlighted fields.');
        return;
      }
      if (form.querySelector('[name="botcheck"]').checked) return; // spam bot

      var d = collect();
      var cfg = CONFIG.form || {};

      if (!cfg.endpoint) {
        // No form service yet → open the visitor's email app.
        window.location.href = mailtoFallback(d);
        showStatus(
          'success',
          'Your email app should open with your message ready to send. ' +
            'If nothing happens, email us at <a href="mailto:' + (CONFIG.email || 'hello@maxbondtech.com') + '">' +
            (CONFIG.email || 'hello@maxbondtech.com') + '</a>.'
        );
        return;
      }

      var payload = d.formData;
      payload.set('services', d.services);
      payload.delete('botcheck');
      if (cfg.subject) payload.set('subject', cfg.subject);
      Object.keys(cfg.extraFields || {}).forEach(function (k) {
        payload.set(k, cfg.extraFields[k]);
      });

      submitBtn.disabled = true;
      var label = submitBtn.innerHTML;
      submitBtn.innerHTML = 'Sending…';

      fetch(cfg.endpoint, { method: 'POST', body: payload, headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          success();
        })
        .catch(function () {
          submitBtn.disabled = false;
          submitBtn.innerHTML = label;
          showStatus(
            'error',
            'Sorry, something went wrong sending your message. Please <a href="' + mailtoFallback(d) + '">email us directly</a> instead.'
          );
        });
    });
  }

  /* Buttons that open the chat widget ----------------------------------- */
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest('[data-open-chat]');
    if (!trigger) return;
    e.preventDefault();
    if (window.MaxbondChat) window.MaxbondChat.open(trigger.getAttribute('data-open-chat') || '');
  });

  doc.classList.add('js-ready');
})();
