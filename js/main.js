// ==========================================================================
// Clara AI — Main Interaction Script (Near.com Architecture)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileDrawer();
  initCapabilitiesAccordion();
  initMetricCounters();
  initDemoForm();
  initKeyboardListeners();
});

/* --------------------------------------------------------------------------
   1. Sticky Glassmorphic Header (73px) & Secondary CTA Reveal
   -------------------------------------------------------------------------- */
function initHeaderScroll() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll(); // Initial check

  // Brand logo return-to-top handler
  const logoLink = document.querySelector('header a[href="#hero"]');
  if (logoLink) {
    logoLink.addEventListener('click', (e) => {
      e.preventDefault();
      window.scrollTo(0, 0);
      handleScroll();
      if (history.replaceState) {
        history.replaceState(null, '', window.location.pathname);
      }
    });
  }
}

/* --------------------------------------------------------------------------
   2. Mobile Responsive Drawer Navigation (<1024px)
   -------------------------------------------------------------------------- */
function initMobileDrawer() {
  const toggleBtn = document.getElementById('nav-toggle');
  const closeBtn = document.getElementById('nav-close');
  const scrim = document.getElementById('mobile-drawer-scrim');
  const drawer = document.getElementById('mobile-drawer');
  const drawerLinks = document.querySelectorAll('#mobile-nav-links a');

  if (!toggleBtn || !drawer || !scrim) return;

  function openDrawer() {
    drawer.classList.add('open');
    scrim.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('nav-drawer-open');
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    scrim.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('nav-drawer-open');
  }

  toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  scrim.addEventListener('click', closeDrawer);

  drawerLinks.forEach(link => {
    link.addEventListener('click', closeDrawer);
  });

  // Automatically close if screen expands past desktop threshold
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024 && drawer.classList.contains('open')) {
      closeDrawer();
    }
  }, { passive: true });
}

/* --------------------------------------------------------------------------
   3. 2-Column Capabilities Accordion & Live Preview Canvas
   -------------------------------------------------------------------------- */
const capabilityData = [
  {
    status: 'IN CALL • 02:47',
    caller: 'Sarah Jenkins — VP Revenue Operations',
    company: 'Enterprise Scale (120 Reps) • Austin, TX',
    metric1Label: 'Detected Intent',
    metric1Val: 'Pricing & Inbound Qualification',
    metric2Label: 'Conversational Latency',
    metric2Val: '340ms (Sub-human response)',
    metric3Label: 'Objection Confidence',
    metric3Val: '94% Match Probability',
    transcript: '"We provide SOC-2 Type II certification with immediate bi-directional CRM integration. I have Tuesday at 2 PM open for an engineering deep-dive."',
    actionTag: 'Autonomous Execution Active'
  },
  {
    status: 'IN CALL • 04:12',
    caller: 'David Vance — Head of Inside Sales',
    company: 'Fintech Growth (45 Reps) • New York, NY',
    metric1Label: 'Sentiment Trajectory',
    metric1Val: 'Positive (+0.84 Delta)',
    metric2Label: 'Purchase Readiness',
    metric2Val: 'High (Budget Confirmed)',
    metric3Label: 'Objection Neutralized',
    metric3Val: 'Competitor Comparison Won',
    transcript: '"Compared to traditional IVRs, our neural edge models listen while speaking, allowing seamless interruption handling without latency spikes."',
    actionTag: 'Dynamic Pitch Modulation'
  },
  {
    status: 'SYNCED • 00:01',
    caller: 'Elena Rostova — VP Strategic Accounts',
    company: 'SaaS Cloud (250 Reps) • San Francisco, CA',
    metric1Label: 'CRM Target',
    metric1Val: 'HubSpot Enterprise + Salesforce',
    metric2Label: 'Sync Latency',
    metric2Val: '42ms (Immediate Webhook)',
    metric3Label: 'Meeting Booked',
    metric3Val: 'Tomorrow at 2:00 PM EST',
    transcript: '"Meeting invite sent to elena@saascloud.com and logged to HubSpot deal #9481 with call audio and transcription attached."',
    actionTag: 'Automated Bi-Directional Sync'
  },
  {
    status: 'MULTIMODAL ACTIVE',
    caller: 'Marcus Brody — Managing Director',
    company: 'Commercial Real Estate • London, UK',
    metric1Label: 'SMS Payload Sent',
    metric1Val: 'VIP Brochure & Scheduling Link',
    metric2Label: 'Carrier Route',
    metric2Val: 'Twilio Global (0.9s Delivery)',
    metric3Label: 'Prospect Action',
    metric3Val: 'Link Opened On-Call',
    transcript: '"I have just sent the executive summary brochure directly to your phone via SMS so you can review the cap rate while we discuss."',
    actionTag: 'Voice + SMS Parallel Handoff'
  }
];

function initCapabilitiesAccordion() {
  selectCapability(0);
}

function selectCapability(index) {
  const items = document.querySelectorAll('#capabilities-accordion .capability-item');
  if (!items.length) return;

  items.forEach((item, idx) => {
    if (idx === index) {
      item.classList.add('active');
      item.setAttribute('aria-expanded', 'true');
    } else {
      item.classList.remove('active');
      item.setAttribute('aria-expanded', 'false');
    }
  });

  const data = capabilityData[index];
  if (!data) return;

  const previewCard = document.getElementById('capability-preview-card');
  if (!previewCard) return;

  // Gentle transition fade
  previewCard.style.opacity = '0.6';
  setTimeout(() => {
    const elStatus = document.getElementById('preview-status');
    const elCaller = document.getElementById('preview-caller');
    const elCompany = document.getElementById('preview-company');
    const elM1Label = document.getElementById('preview-metric-label-1');
    const elM1Val = document.getElementById('preview-metric-val-1');
    const elM2Label = document.getElementById('preview-metric-label-2');
    const elM2Val = document.getElementById('preview-metric-val-2');
    const elM3Label = document.getElementById('preview-metric-label-3');
    const elM3Val = document.getElementById('preview-metric-val-3');
    const elTranscript = document.getElementById('preview-transcript');
    const elActionTag = document.getElementById('preview-action-tag');

    if (elStatus) elStatus.textContent = data.status;
    if (elCaller) elCaller.textContent = data.caller;
    if (elCompany) elCompany.textContent = data.company;
    if (elM1Label) elM1Label.textContent = data.metric1Label;
    if (elM1Val) elM1Val.textContent = data.metric1Val;
    if (elM2Label) elM2Label.textContent = data.metric2Label;
    if (elM2Val) elM2Val.textContent = data.metric2Val;
    if (elM3Label) elM3Label.textContent = data.metric3Label;
    if (elM3Val) elM3Val.textContent = data.metric3Val;
    if (elTranscript) elTranscript.textContent = data.transcript;
    if (elActionTag) elActionTag.textContent = data.actionTag;

    previewCard.style.opacity = '1';
  }, 100);
}

/* --------------------------------------------------------------------------
   4. Split-Layout Interactive FAQ Accordion
   -------------------------------------------------------------------------- */
function toggleFaq(button) {
  const item = button.closest('.faq-item');
  if (!item) return;

  const isOpen = item.classList.contains('open');

  // Close other open FAQ items for clean accordion behavior
  document.querySelectorAll('.faq-item').forEach(otherItem => {
    if (otherItem !== item) {
      otherItem.classList.remove('open');
    }
  });

  if (isOpen) {
    item.classList.remove('open');
  } else {
    item.classList.add('open');
  }
}

/* --------------------------------------------------------------------------
   5. High-Impact Metric Counter Animations
   -------------------------------------------------------------------------- */
function initMetricCounters() {
  const counter1 = document.getElementById('counter-1');
  const counter2 = document.getElementById('counter-2');
  const counter3 = document.getElementById('counter-3');
  if (!counter1 || !counter2 || !counter3) return;

  let animated = false;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        animateNumber(counter1, 0, 10, 'M+');
        animateLatency(counter2);
        animateNumber(counter3, 90, 99.99, '%', 2);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  observer.observe(counter1.parentElement.parentElement);
}

function animateNumber(el, from, to, suffix = '', decimals = 0) {
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = (from + (to - from) * ease).toFixed(decimals);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function animateLatency(el) {
  const duration = 1200;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(800 - (800 - 450) * ease);
    el.textContent = '<' + current + 'ms';
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

/* --------------------------------------------------------------------------
   6. Modal Dialog Controls (Google Calendar & Lead Submission)
   -------------------------------------------------------------------------- */
function openBookingModal() {
  const modal = document.getElementById('booking-modal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('nav-drawer-open');
}

function closeBookingModal() {
  const modal = document.getElementById('booking-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('nav-drawer-open');
}

function handleModalBackdropClick(event) {
  if (event.target && event.target.id === 'booking-modal') {
    closeBookingModal();
  }
}

function initKeyboardListeners() {
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeBookingModal();
      const drawer = document.getElementById('mobile-drawer');
      const scrim = document.getElementById('mobile-drawer-scrim');
      if (drawer && drawer.classList.contains('open')) {
        drawer.classList.remove('open');
        if (scrim) scrim.classList.remove('open');
        document.body.classList.remove('nav-drawer-open');
      }
    }
  });
}

/* --------------------------------------------------------------------------
   7. Lead Request Form Submission (POST /tables/demo_requests)
   -------------------------------------------------------------------------- */
function initDemoForm() {
  const form = document.getElementById('demo-form');
  const status = document.getElementById('form-status');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (status) {
      status.textContent = '';
      status.className = 'text-xs';
    }

    const submitBtn = form.querySelector('.form-submit');
    const originalText = submitBtn ? submitBtn.innerHTML : 'Submit';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Scheduling...</span> <i class="fa-solid fa-spinner fa-spin ml-2"></i>';
    }

    const payload = {
      id: 'lead_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: form.name?.value?.trim() || 'Anonymous',
      email: form.email?.value?.trim() || '',
      company: form.company?.value?.trim() || '',
      phone: form.phone?.value?.trim() || '',
      team_size: form.team_size?.value || '51-200 reps',
      message: form.message?.value?.trim() || '',
      status: 'new'
    };

    try {
      const res = await fetch('/tables/demo_requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Request failed');

      if (status) {
        status.textContent = 'Demo scheduled! Our voice engineering team will reach out within 2 hours.';
        status.className = 'text-xs text-[#00EC97] font-medium';
      }
      form.reset();
      setTimeout(() => {
        closeBookingModal();
      }, 2500);
    } catch (err) {
      if (status) {
        status.textContent = 'Submission failed. Please email biz@thehubcode.com directly.';
        status.className = 'text-xs text-red-400 font-medium';
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
    }
  });
}
