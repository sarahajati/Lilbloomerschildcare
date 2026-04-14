(function () {
  var DEFAULT_SITE = {
    staffGroups: [
      {
        id: "leadership",
        title: "Leadership & administration",
        members: [
          {
            name: "Ali",
            role: "Director & Co-owner",
            photo: "",
            bio: "As a leader and co-owner, Ali is the cornerstone of our centre. With a visionary approach and a deep commitment to early childhood development, Ali ensures our facility operates with the highest standards of care, safety, and educational excellence—fostering a supportive and collaborative culture for both our team and the families we serve.",
          },
          {
            name: "Sue",
            role: "Manager (IT, ECE)",
            photo: "",
            bio: "Sue brings academic depth, practical experience, and heartfelt dedication to her role as Manager. She holds a Ph.D. in Child Behaviour and an Infant and Toddler certificate, with years of early childhood education experience in Canada and prior teaching abroad, plus a background in accounting for strong organizational leadership. As a parent herself, she understands how much families value a safe, inclusive, and developmentally rich environment—and she leads our team with professionalism, warmth, and integrity.",
          },
        ],
      },
      {
        id: "educators",
        title: "Educators",
        members: [
          {
            name: "Olivia",
            role: "ECE (Infant & Toddler)",
            photo: "",
            bio: "Inspired by her mother, a kindergarten teacher, Olivia discovered a love of early learning early on. She graduated in Korea before furthering her studies in Early Childhood Education in Canada. With over a decade of experience, she connects with children through reading and creative activities, supporting each child’s growth through meaningful play and exploration.",
          },
          {
            name: "Sepideh",
            role: "ECE",
            photo: "",
            bio: "Sepideh is a certified Early Childhood Educator who previously earned a nursing degree—bringing a uniquely caring and attentive approach to licensed childcare since 2019. She is passionate about safe, engaging, nurturing environments and finds joy in being part of each child’s early learning journey.",
          },
          {
            name: "Pari",
            role: "ECEA",
            photo: "",
            bio: "Pari holds a Bachelor’s degree in Psychology and over five years of experience with children, including those with additional needs. She has been a dedicated teacher assistant at our centre while completing her ECE studies. She loves creating a safe, fun space where children can grow, learn, and explore—with patience, creativity, and strong partnership with families.",
          },
          {
            name: "Elli",
            role: "ECEA",
            photo: "",
            bio: "Elli is an enthusiastic Early Childhood Education Assistant with experience across toddler through school-age groups. She believes every child brings a unique spark and feels privileged to support their growth, learning, and creativity—with reliability, kindness, patience, and teamwork at the heart of her practice.",
          },
          {
            name: "Kulvir",
            role: "ECEA",
            photo: "",
            bio: "With a background in human resources and ECEA certification, Kulvir creates a nurturing environment for young learners. She believes creative ideas transform learning, fosters curiosity in the classroom, and brings an artistic, thoughtful presence—guided by simple living and high thinking—to help each child blossom with confidence and compassion.",
          },
          {
            name: "Sevin",
            role: "ECEA",
            photo: "",
            bio: "Sevin supports our classrooms as an Early Childhood Educator Assistant—helping with routines, play-based learning, and the little moments that make each child feel seen and cared for alongside our ECE team.",
          },
        ],
      },
    ],
    gallery: [],
  };

  function getConfig() {
    return window.LILBLOOMERS_CONFIG || {};
  }

  function initials(name) {
    var parts = String(name || "")
      .trim()
      .split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    var s = parts[0] || "?";
    return s.slice(0, 2).toUpperCase();
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function normalizeLoaded(data) {
    if (!data || !Array.isArray(data.staffGroups)) throw new Error("shape");
    return {
      staffGroups: data.staffGroups,
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
    };
  }

  function parseSiteJson(text, label) {
    try {
      return normalizeLoaded(JSON.parse(text));
    } catch (err) {
      console.warn("Lilbloomers: " + label + " JSON parse failed", err);
      throw err;
    }
  }

  function loadSiteData() {
    var bust = "_=" + Date.now();
    return fetch("/api/site?" + bust, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("api");
        return r.text();
      })
      .then(function (text) {
        return parseSiteJson(text, "/api/site");
      })
      .catch(function () {
        return fetch("data/site.json", { cache: "no-store" })
          .then(function (r2) {
            if (!r2.ok) throw new Error("file");
            return r2.text();
          })
          .then(function (text) {
            return parseSiteJson(text, "data/site.json");
          })
          .catch(function () {
            return {
              staffGroups: JSON.parse(JSON.stringify(DEFAULT_SITE.staffGroups)),
              gallery: [],
            };
          });
      });
  }

  function renderTeam(container, site) {
    if (!container) return;
    var groups = site.staffGroups || [];
    var wrap = document.createElement("div");
    wrap.className = "team-showcase";
    groups.forEach(function (g) {
      var grp = document.createElement("div");
      grp.className = "team-group";
      var h3 = document.createElement("h3");
      h3.textContent = g.title || "";
      grp.appendChild(h3);
      var grid = document.createElement("div");
      grid.className = "staff-grid";
      (g.members || []).forEach(function (m) {
        var article = document.createElement("article");
        article.className = "staff-card";
        var av = document.createElement("div");
        av.className = "staff-avatar-wrap";
        var photo = (m.photo || "").trim();
        var hasPhoto =
          photo.indexOf("http") === 0 ||
          photo.indexOf("data:") === 0 ||
          photo.charAt(0) === "/";
        if (hasPhoto) {
          var img = document.createElement("img");
          img.className = "staff-photo";
          img.src = photo;
          img.alt = m.name || "";
          img.loading = "lazy";
          img.width = 160;
          img.height = 160;
          av.appendChild(img);
        } else {
          var ini = document.createElement("div");
          ini.className = "staff-initials";
          ini.setAttribute("aria-hidden", "true");
          ini.textContent = initials(m.name);
          av.appendChild(ini);
        }
        article.appendChild(av);
        var body = document.createElement("div");
        body.className = "staff-body";
        var h4 = document.createElement("h4");
        h4.textContent = m.name || "";
        var p = document.createElement("p");
        p.textContent = m.role || "";
        body.appendChild(h4);
        body.appendChild(p);
        article.appendChild(body);
        wireStaffCardBio(article, m);
        grid.appendChild(article);
      });
      grp.appendChild(grid);
      wrap.appendChild(grp);
    });
    container.innerHTML = "";
    container.appendChild(wrap);
    container.setAttribute("aria-busy", "false");
  }

  function renderGallery(section, site) {
    var items = site.gallery || [];
    var mount = section.querySelector("[data-gallery-mount]");
    var empty = section.querySelector("[data-gallery-empty]");
    if (!mount) return;

    if (section._lilbloomersGalleryEsc) {
      document.removeEventListener("keydown", section._lilbloomersGalleryEsc);
      section._lilbloomersGalleryEsc = null;
    }
    var lightbox = section.querySelector("[data-lightbox]");
    var closeBtn = section.querySelector("[data-lightbox-close]");
    if (section._lilbloomersLbBackdrop && lightbox) {
      lightbox.removeEventListener("click", section._lilbloomersLbBackdrop);
      section._lilbloomersLbBackdrop = null;
    }
    if (section._lilbloomersLbClose && closeBtn) {
      closeBtn.removeEventListener("click", section._lilbloomersLbClose);
      section._lilbloomersLbClose = null;
    }

    var slides = items
      .map(function (it, i) {
        return {
          src: (it.src || "").trim(),
          alt: it.alt != null ? String(it.alt) : "Centre photo " + (i + 1),
        };
      })
      .filter(function (it) {
        return !!it.src;
      });
    if (!slides.length) {
      mount.innerHTML = "";
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    mount.innerHTML = "";
    var ul = document.createElement("ul");
    ul.className = "gallery-grid";
    slides.forEach(function (it, i) {
      var li = document.createElement("li");
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-tile";
      btn.setAttribute("data-gallery-index", String(i));
      btn.setAttribute("aria-label", "View larger: " + (it.alt || ""));
      var img = document.createElement("img");
      img.src = it.src;
      img.alt = it.alt || "";
      img.loading = "lazy";
      btn.appendChild(img);
      li.appendChild(btn);
      ul.appendChild(li);
    });
    mount.appendChild(ul);

    var lightboxImg = section.querySelector("[data-lightbox-img]");
    var lightboxCap = section.querySelector("[data-lightbox-caption]");

    function openAt(idx) {
      var n = parseInt(idx, 10);
      if (!slides[n] || !lightbox || !lightboxImg) return;
      lightboxImg.src = slides[n].src;
      lightboxImg.alt = slides[n].alt || "";
      if (lightboxCap) lightboxCap.textContent = slides[n].alt || "";
      lightbox.hidden = false;
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
    }

    function closeLb() {
      if (!lightbox) return;
      lightbox.hidden = true;
      lightbox.setAttribute("aria-hidden", "true");
      if (lightboxImg) lightboxImg.removeAttribute("src");
      document.body.style.overflow = "";
    }

    mount.querySelectorAll(".gallery-tile").forEach(function (btn) {
      btn.addEventListener("click", function () {
        openAt(btn.getAttribute("data-gallery-index"));
      });
    });

    if (closeBtn) {
      section._lilbloomersLbClose = closeLb;
      closeBtn.addEventListener("click", section._lilbloomersLbClose);
    }
    if (lightbox) {
      section._lilbloomersLbBackdrop = function (e) {
        if (e.target === lightbox) closeLb();
      };
      lightbox.addEventListener("click", section._lilbloomersLbBackdrop);
    }
    section._lilbloomersGalleryEsc = function (e) {
      if (e.key === "Escape" && lightbox && !lightbox.hidden) closeLb();
    };
    document.addEventListener("keydown", section._lilbloomersGalleryEsc);
  }

  function initStaffBioModal() {
    var modal = document.getElementById("staff-bio-modal");
    if (!modal || modal.dataset.wired === "1") return;
    modal.dataset.wired = "1";
    var titleEl = modal.querySelector(".staff-bio-modal__title");
    var roleEl = modal.querySelector(".staff-bio-modal__role");
    var bodyEl = modal.querySelector(".staff-bio-modal__body");
    function closeStaffBio() {
      modal.hidden = true;
      document.body.style.overflow = "";
    }
    function openStaffBio(name, roleText, bioText) {
      if (titleEl) titleEl.textContent = name || "";
      if (roleEl) roleEl.textContent = roleText || "";
      if (bodyEl) bodyEl.textContent = bioText || "";
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      var x = modal.querySelector(".staff-bio-modal__x");
      if (x) x.focus();
    }
    modal._openStaffBio = openStaffBio;
    modal._closeStaffBio = closeStaffBio;
    modal.querySelectorAll("[data-staff-bio-close]").forEach(function (el) {
      el.addEventListener("click", closeStaffBio);
    });
    document.addEventListener("keydown", function staffBioGlobalEsc(e) {
      if (!modal.hidden && e.key === "Escape") closeStaffBio();
    });
  }

  function wireStaffCardBio(article, m) {
    var bio = (m.bio || "").trim();
    if (!bio) return;
    article.classList.add("staff-card--has-bio");
    article.setAttribute("role", "button");
    article.setAttribute("tabindex", "0");
    article.setAttribute(
      "aria-label",
      "Read introduction for " + (m.name || "team member")
    );
    article.addEventListener("click", function () {
      var modal = document.getElementById("staff-bio-modal");
      if (modal && modal._openStaffBio) modal._openStaffBio(m.name, m.role, bio);
    });
    article.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        var modal = document.getElementById("staff-bio-modal");
        if (modal && modal._openStaffBio) modal._openStaffBio(m.name, m.role, bio);
      }
    });
  }

  function renderAmbientSlideshow(section, site) {
    if (!section) return;
    if (section._ambientTimer) {
      clearInterval(section._ambientTimer);
      section._ambientTimer = null;
    }
    var mount = section.querySelector("[data-ambient-slides]");
    if (!mount) return;
    var items = (site && site.gallery) || [];
    var slides = items
      .map(function (it, i) {
        return {
          src: (it.src || "").trim(),
          alt: it.alt != null ? String(it.alt) : "Centre photo " + (i + 1),
        };
      })
      .filter(function (it) {
        return !!it.src;
      });
    mount.innerHTML = "";
    if (!slides.length) {
      section.hidden = true;
      return;
    }
    section.hidden = false;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    slides.forEach(function (it, i) {
      var wrap = document.createElement("div");
      wrap.className = "gallery-ambient__slide" + (i === 0 ? " is-active" : "");
      wrap.setAttribute("aria-hidden", i === 0 ? "false" : "true");
      var img = document.createElement("img");
      img.src = it.src;
      img.alt = it.alt || "";
      img.loading = i === 0 ? "eager" : "lazy";
      img.decoding = "async";
      wrap.appendChild(img);
      mount.appendChild(wrap);
    });
    if (reduced || slides.length < 2) return;
    var cur = 0;
    var els = mount.querySelectorAll(".gallery-ambient__slide");
    section._ambientTimer = setInterval(function () {
      els[cur].classList.remove("is-active");
      els[cur].setAttribute("aria-hidden", "true");
      cur = (cur + 1) % els.length;
      els[cur].classList.add("is-active");
      els[cur].setAttribute("aria-hidden", "false");
    }, 6500);
  }

  function initContactForm() {
    var form = document.getElementById("contact-form");
    if (!form) return;
    var status = document.getElementById("contact-form-status");
    var cfg = getConfig();
    var key = (cfg.web3formsAccessKey || "").trim();

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!key) {
        if (status) {
          status.textContent =
            "Contact form is not configured yet. Add your Web3Forms access key in config.js (see README).";
          status.className = "form-status form-status--error";
          status.hidden = false;
        }
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.disabled = true;
        btn.setAttribute("aria-busy", "true");
      }
      if (status) {
        status.textContent = "Sending…";
        status.className = "form-status";
        status.hidden = false;
      }

      var fd = new FormData(form);
      fd.set("access_key", key);
      fd.set("subject", cfg.contactSubject || "Website contact");

      fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: fd,
      })
        .then(function (r) {
          return r.json();
        })
        .then(function (data) {
          if (data && data.success) {
            if (status) {
              status.textContent = "Thank you — your message was sent. We will get back to you soon.";
              status.className = "form-status form-status--ok";
            }
            form.reset();
          } else {
            throw new Error((data && data.message) || "Send failed");
          }
        })
        .catch(function () {
          if (status) {
            status.textContent =
              "Something went wrong sending your message. Please try again or email us directly.";
            status.className = "form-status form-status--error";
          }
        })
        .finally(function () {
          if (btn) {
            btn.disabled = false;
            btn.removeAttribute("aria-busy");
          }
        });
    });
  }

  function initNav() {
    var nav = document.getElementById("site-nav");
    var toggle = document.querySelector(".nav-toggle");
    var year = document.getElementById("year");

    if (year) {
      year.textContent = String(new Date().getFullYear());
    }

    if (toggle && nav) {
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      });

      nav.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", function () {
          if (window.matchMedia("(max-width: 900px)").matches) {
            nav.classList.remove("is-open");
            toggle.setAttribute("aria-expanded", "false");
          }
        });
      });
    }
  }

  initNav();
  initContactForm();
  initStaffBioModal();

  var teamMount = document.getElementById("team-mount");
  var gallerySection = document.getElementById("gallery");
  var ambientSection = document.getElementById("gallery-ambient");
  function applySiteDataToPage(site) {
    if (teamMount) renderTeam(teamMount, site);
    if (gallerySection) renderGallery(gallerySection, site);
    if (ambientSection) renderAmbientSlideshow(ambientSection, site);
  }
  if (teamMount || gallerySection || ambientSection) {
    loadSiteData().then(applySiteDataToPage);
    window.addEventListener("pageshow", function (ev) {
      if (ev.persisted) {
        loadSiteData().then(applySiteDataToPage);
      }
    });
  }
})();
