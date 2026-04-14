(function () {
  var DEFAULT_SITE = {
    staffGroups: [
      {
        id: "leadership",
        title: "Leadership & administration",
        members: [
          { name: "Ali", role: "Director & Co-owner", photo: "" },
          { name: "Sue", role: "Manager (IT, ECE)", photo: "" },
        ],
      },
      {
        id: "educators",
        title: "Educators",
        members: [
          { name: "Olivia", role: "ECE (Infant & Toddler)", photo: "" },
          { name: "Sepideh", role: "ECE", photo: "" },
          { name: "Pari", role: "ECEA", photo: "" },
          { name: "Elli", role: "ECEA", photo: "" },
          { name: "Kulvir", role: "ECEA", photo: "" },
          { name: "Sevin", role: "ECEA", photo: "" },
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

  function loadSiteData() {
    var bust = "_=" + Date.now();
    return fetch("/api/site?" + bust, { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("api");
        return r.json();
      })
      .then(normalizeLoaded)
      .catch(function () {
        return fetch("data/site.json", { cache: "no-store" })
          .then(function (r2) {
            if (!r2.ok) throw new Error("file");
            return r2.json();
          })
          .then(normalizeLoaded)
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
    var html =
      '<div class="team-showcase">' +
      groups
        .map(function (g) {
          var members = g.members || [];
          var cards = members
            .map(function (m) {
              var photo = (m.photo || "").trim();
              var hasPhoto =
                photo.indexOf("http") === 0 ||
                photo.indexOf("data:") === 0 ||
                photo.charAt(0) === "/";
              var avatar = hasPhoto
                  ? '<img class="staff-photo" src="' +
                    escapeHtml(photo) +
                    '" alt="' +
                    escapeHtml(m.name) +
                    '" loading="lazy" width="160" height="160" />'
                  : '<div class="staff-initials" aria-hidden="true">' +
                    escapeHtml(initials(m.name)) +
                    "</div>";
              return (
                '<article class="staff-card">' +
                '<div class="staff-avatar-wrap">' +
                avatar +
                "</div>" +
                '<div class="staff-body">' +
                "<h4>" +
                escapeHtml(m.name) +
                "</h4>" +
                "<p>" +
                escapeHtml(m.role) +
                "</p>" +
                "</div></article>"
              );
            })
            .join("");
          return (
            '<div class="staff-group">' +
            "<h3>" +
            escapeHtml(g.title) +
            "</h3>" +
            '<div class="staff-grid">' +
            cards +
            "</div></div>"
          );
        })
        .join("") +
      "</div>";
    container.innerHTML = html;
    container.setAttribute("aria-busy", "false");
  }

  function renderGallery(section, site) {
    var items = site.gallery || [];
    var mount = section.querySelector("[data-gallery-mount]");
    var empty = section.querySelector("[data-gallery-empty]");
    if (!mount) return;
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
    mount.innerHTML =
      '<ul class="gallery-grid">' +
      slides
        .map(function (it, i) {
          var src = it.src;
          var alt = it.alt;
          return (
            '<li><button type="button" class="gallery-tile" data-gallery-index="' +
            i +
            '" aria-label="View larger: ' +
            escapeHtml(alt) +
            '">' +
            '<img src="' +
            escapeHtml(src) +
            '" alt="' +
            escapeHtml(alt) +
            '" loading="lazy" /></button></li>'
          );
        })
        .join("") +
      "</ul>";

    var lightbox = section.querySelector("[data-lightbox]");
    var lightboxImg = section.querySelector("[data-lightbox-img]");
    var lightboxCap = section.querySelector("[data-lightbox-caption]");
    var closeBtn = section.querySelector("[data-lightbox-close]");

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

    if (closeBtn) closeBtn.addEventListener("click", closeLb);
    if (lightbox) {
      lightbox.addEventListener("click", function (e) {
        if (e.target === lightbox) closeLb();
      });
    }
    document.addEventListener("keydown", function galleryEsc(e) {
      if (e.key === "Escape" && lightbox && !lightbox.hidden) closeLb();
    });
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

  var teamMount = document.getElementById("team-mount");
  var gallerySection = document.getElementById("gallery");
  function applySiteDataToPage(site) {
    if (teamMount) renderTeam(teamMount, site);
    if (gallerySection) renderGallery(gallerySection, site);
  }
  if (teamMount || gallerySection) {
    loadSiteData().then(applySiteDataToPage);
    window.addEventListener("pageshow", function (ev) {
      if (ev.persisted) {
        loadSiteData().then(applySiteDataToPage);
      }
    });
  }
})();
