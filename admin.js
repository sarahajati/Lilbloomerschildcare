(function () {
  var SESSION_KEY = "lilbloomers_admin_ok";
  var SESSION_SAVE_TOKEN = "lilbloomers_save_token";
  var booted = false;

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : String(s);
    return div.innerHTML;
  }

  function getPin() {
    var raw = window.LILBLOOMERS_ADMIN_PIN;
    var s = raw != null ? String(raw).trim() : "";
    if (!s) {
      s = "changeme";
    }
    return s;
  }

  function loadJsonFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          resolve(JSON.parse(reader.result));
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsText(file, "UTF-8");
    });
  }

  function normalizeData(raw) {
    var staffGroups = Array.isArray(raw.staffGroups) ? raw.staffGroups : [];
    var gallery = Array.isArray(raw.gallery) ? raw.gallery : [];
    return { staffGroups: staffGroups, gallery: gallery };
  }

  function sitePayloadEqual(a, b) {
    return JSON.stringify(normalizeData(a)) === JSON.stringify(normalizeData(b));
  }

  var modalBackdropHandler = null;
  var modalKeyHandler = null;

  function showAdminModal(opts) {
    var root = $("#admin-modal-root");
    var titleEl = $("#admin-modal-title");
    var bodyEl = $("#admin-modal-body");
    var okBtn = $("#admin-modal-ok");
    var card = root ? root.querySelector(".admin-modal") : null;
    if (!root || !titleEl || !bodyEl || !okBtn || !card) return;

    if (modalKeyHandler) {
      document.removeEventListener("keydown", modalKeyHandler);
      modalKeyHandler = null;
    }
    if (modalBackdropHandler) {
      root.removeEventListener("click", modalBackdropHandler);
      modalBackdropHandler = null;
    }

    titleEl.textContent = opts.title || "Notice";
    bodyEl.textContent = opts.message || "";
    card.classList.toggle("admin-modal--error", opts.variant === "error");
    root.hidden = false;

    function close() {
      root.hidden = true;
      card.classList.remove("admin-modal--error");
      okBtn.removeEventListener("click", close);
      if (modalBackdropHandler) {
        root.removeEventListener("click", modalBackdropHandler);
        modalBackdropHandler = null;
      }
      if (modalKeyHandler) {
        document.removeEventListener("keydown", modalKeyHandler);
        modalKeyHandler = null;
      }
    }

    modalBackdropHandler = function (e) {
      if (e.target === root) close();
    };
    modalKeyHandler = function (e) {
      if (e.key === "Escape") close();
    };

    okBtn.addEventListener("click", close);
    root.addEventListener("click", modalBackdropHandler);
    document.addEventListener("keydown", modalKeyHandler);
    okBtn.focus();
  }

  function fetchSite() {
    return fetch("/api/site?_=" + Date.now(), { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("api");
        return r.json();
      })
      .then(normalizeData)
      .catch(function () {
        return fetch("data/site.json", { cache: "no-store" })
          .then(function (r2) {
            if (!r2.ok) throw new Error("file");
            return r2.json();
          })
          .then(normalizeData);
      });
  }

  function getSaveToken() {
    var fromSession = sessionStorage.getItem(SESSION_SAVE_TOKEN);
    if (fromSession && String(fromSession).trim()) return String(fromSession).trim();
    var fromWindow = window.LILBLOOMERS_SAVE_TOKEN;
    if (fromWindow != null && String(fromWindow).trim()) return String(fromWindow).trim();
    return "";
  }

  function ensureSaveToken() {
    var t = getSaveToken();
    if (t) return Promise.resolve(t);
    var msg =
      "Enter the site SAVE TOKEN (same value the owner set as the SAVE_TOKEN secret in Cloudflare).\n\n" +
      "This lets you publish changes without GitHub. Cancel to use “Download site.json” only.";
    var entered = window.prompt(msg, "");
    if (!entered || !String(entered).trim()) {
      return Promise.reject(new Error("cancel"));
    }
    entered = String(entered).trim();
    try {
      sessionStorage.setItem(SESSION_SAVE_TOKEN, entered);
    } catch (e) {
      return Promise.reject(new Error("storage"));
    }
    return Promise.resolve(entered);
  }

  function downloadJson(filename, obj) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function resizeImageFile(file, maxW, maxBytes, quality) {
    return new Promise(function (resolve, reject) {
      if (!file.type || file.type.indexOf("image/") !== 0) {
        reject(new Error("Not an image"));
        return;
      }
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        if (!w || !h) {
          reject(new Error("Bad image"));
          return;
        }
        var scale = Math.min(1, maxW / w);
        var cw = Math.round(w * scale);
        var ch = Math.round(h * scale);
        var canvas = document.createElement("canvas");
        canvas.width = cw;
        canvas.height = ch;
        var ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, cw, ch);
        var tryQ = quality;
        function attempt() {
          var dataUrl = canvas.toDataURL("image/jpeg", tryQ);
          if (dataUrl.length > maxBytes && tryQ > 0.45) {
            tryQ -= 0.1;
            attempt();
          } else if (dataUrl.length > maxBytes) {
            reject(new Error("Image still too large after compression. Use an image URL instead."));
          } else {
            resolve(dataUrl);
          }
        }
        attempt();
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Load failed"));
      };
      img.src = url;
    });
  }

  var state = { staffGroups: [], gallery: [] };

  function renderStaffEditor() {
    var root = $("#staff-editor");
    if (!root) return;
    root.innerHTML = (state.staffGroups || [])
      .map(function (g, gi) {
        var members = g.members || [];
        var memberRows = members
          .map(function (m, mi) {
            return (
              '<div class="admin-row" data-group="' +
              gi +
              '" data-member="' +
              mi +
              '">' +
              '<label>Name <input type="text" class="m-name" value="' +
              escapeHtml(m.name) +
              '" /></label>' +
              '<label>Role <input type="text" class="m-role" value="' +
              escapeHtml(m.role) +
              '" /></label>' +
              '<label>Photo URL <input type="text" class="m-photo-url" placeholder="https://… or /media/staff/name.jpg" value="' +
              escapeHtml(m.photo) +
              '" /></label>' +
              '<label class="admin-file-label">Or small photo file (JPEG/PNG, optional)' +
              '<input type="file" class="m-photo-file" accept="image/*" /></label>' +
              '<button type="button" class="btn btn-small btn-danger-outline remove-member">Remove person</button>' +
              "</div>"
            );
          })
          .join("");
        return (
          '<fieldset class="admin-fieldset" data-group-index="' +
          gi +
          '">' +
          "<legend>" +
          escapeHtml(g.title || "Group") +
          "</legend>" +
          memberRows +
          '<button type="button" class="btn btn-small secondary add-member" data-group="' +
          gi +
          '">Add person to this group</button>' +
          "</fieldset>"
        );
      })
      .join("");

    root.querySelectorAll(".add-member").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var gi = parseInt(btn.getAttribute("data-group"), 10);
        if (!state.staffGroups[gi]) return;
        state.staffGroups[gi].members.push({ name: "", role: "", photo: "" });
        renderStaffEditor();
        renderGalleryEditor();
      });
    });

    root.querySelectorAll(".remove-member").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = btn.closest(".admin-row");
        if (!row) return;
        var gi = parseInt(row.getAttribute("data-group"), 10);
        var mi = parseInt(row.getAttribute("data-member"), 10);
        if (state.staffGroups[gi] && state.staffGroups[gi].members[mi] != null) {
          state.staffGroups[gi].members.splice(mi, 1);
        }
        renderStaffEditor();
      });
    });

    root.querySelectorAll(".m-photo-file").forEach(function (input) {
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var row = input.closest(".admin-row");
        if (!row) return;
        resizeImageFile(file, 720, 140000, 0.82)
          .then(function (dataUrl) {
            var urlInput = row.querySelector(".m-photo-url");
            if (urlInput) urlInput.value = dataUrl;
            input.value = "";
            $("#admin-toast").textContent = "Photo compressed and pasted into Photo URL.";
          })
          .catch(function (e) {
            $("#admin-toast").textContent = e.message || "Could not use that image.";
          });
      });
    });
  }

  function readStaffFromDom() {
    var se = $("#staff-editor");
    if (!se) return;
    se.querySelectorAll(".admin-fieldset")
      .forEach(function (fs, gi) {
        var members = [];
        fs.querySelectorAll(".admin-row").forEach(function (row) {
          members.push({
            name: (row.querySelector(".m-name") && row.querySelector(".m-name").value) || "",
            role: (row.querySelector(".m-role") && row.querySelector(".m-role").value) || "",
            photo:
              (row.querySelector(".m-photo-url") && row.querySelector(".m-photo-url").value.trim()) ||
              "",
          });
        });
        if (state.staffGroups[gi]) {
          state.staffGroups[gi].members = members;
        }
      });
  }

  function renderGalleryEditor() {
    var root = $("#gallery-editor");
    if (!root) return;
    var items = state.gallery || [];
    root.innerHTML =
      items
        .map(function (it, i) {
          return (
            '<div class="admin-row gallery-row" data-gallery-index="' +
            i +
            '">' +
            '<label>Image URL <input type="text" class="g-src" value="' +
            escapeHtml(it.src) +
            '" placeholder="https://… or /media/gallery/photo.jpg" /></label>' +
            '<label>Caption <input type="text" class="g-alt" value="' +
            escapeHtml(it.alt) +
            '" /></label>' +
            '<label class="admin-file-label">Or small image file' +
            '<input type="file" class="g-file" accept="image/*" /></label>' +
            '<button type="button" class="btn btn-small btn-danger-outline remove-gallery">Remove photo</button>' +
            "</div>"
          );
        })
        .join("") +
      '<button type="button" class="btn btn-small secondary" id="add-gallery-row">Add daycare photo</button>';

    root.querySelectorAll(".g-file").forEach(function (input) {
      input.addEventListener("change", function () {
        var file = input.files && input.files[0];
        if (!file) return;
        var row = input.closest(".gallery-row");
        resizeImageFile(file, 1200, 220000, 0.82)
          .then(function (dataUrl) {
            var srcInput = row.querySelector(".g-src");
            if (srcInput) srcInput.value = dataUrl;
            input.value = "";
            $("#admin-toast").textContent = "Image embedded (large galleries: prefer URLs + files in /media/).";
          })
          .catch(function (e) {
            $("#admin-toast").textContent = e.message || "Could not use that image.";
          });
      });
    });

    root.querySelectorAll(".remove-gallery").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = btn.closest(".gallery-row");
        if (!row) return;
        var i = parseInt(row.getAttribute("data-gallery-index"), 10);
        state.gallery.splice(i, 1);
        renderGalleryEditor();
      });
    });

    var addG = $("#add-gallery-row");
    if (addG) {
      addG.addEventListener("click", function () {
        readStaffFromDom();
        readGalleryFromDom();
        state.gallery.push({ src: "", alt: "" });
        renderGalleryEditor();
      });
    }
  }

  function readGalleryFromDom() {
    var root = $("#gallery-editor");
    if (!root) return;
    var next = [];
    root.querySelectorAll(".gallery-row").forEach(function (row) {
      next.push({
        src: (row.querySelector(".g-src") && row.querySelector(".g-src").value.trim()) || "",
        alt: (row.querySelector(".g-alt") && row.querySelector(".g-alt").value.trim()) || "",
      });
    });
    state.gallery = next;
  }

  function buildExportObject() {
    readStaffFromDom();
    readGalleryFromDom();
    return {
      staffGroups: state.staffGroups.map(function (g) {
        return {
          id: g.id,
          title: g.title,
          members: (g.members || []).map(function (m) {
            return {
              name: m.name.trim(),
              role: m.role.trim(),
              photo: (m.photo || "").trim(),
            };
          }),
        };
      }),
      gallery: (state.gallery || [])
        .map(function (it) {
          return { src: (it.src || "").trim(), alt: (it.alt || "").trim() };
        })
        .filter(function (it) {
          return it.src;
        }),
    };
  }

  function tryUnlock() {
    var gateEl = $("#admin-gate");
    var appEl = $("#admin-app");
    var errEl = $("#gate-error");
    var pinInput = $("#gate-pin");
    if (!gateEl || !appEl) {
      if (errEl) errEl.textContent = "Page error: missing layout. Refresh the page.";
      return;
    }
    if (errEl) errEl.textContent = "";
    var pin = (pinInput && pinInput.value) ? String(pinInput.value).trim() : "";
    var expected = getPin();
    if (!pin) {
      if (errEl) errEl.textContent = "Enter your PIN.";
      if (pinInput) pinInput.focus();
      return;
    }
    if (pin !== expected) {
      if (errEl) {
        errEl.textContent =
          "Incorrect PIN. It is set in admin-config.js (default is changeme until you change it).";
      }
      return;
    }
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch (ignore) {
      if (errEl) {
        errEl.textContent =
          "This browser blocked saving your session. Allow storage for this site or try another browser.";
      }
      return;
    }
    gateEl.hidden = true;
    appEl.hidden = false;
    bootApp();
  }

  function gate() {
    var gateEl = $("#admin-gate");
    var appEl = $("#admin-app");
    if (!gateEl || !appEl) {
      var err = $("#gate-error");
      if (err) err.textContent = "Could not start admin (missing #admin-gate or #admin-app).";
      return;
    }
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      gateEl.hidden = true;
      appEl.hidden = false;
      bootApp();
      return;
    }
    gateEl.hidden = false;
    appEl.hidden = true;

    var form = $("#gate-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        tryUnlock();
      });
    }

    var unlockBtn = $("#gate-unlock");
    if (unlockBtn) {
      unlockBtn.addEventListener("click", tryUnlock);
    }

    var pinInput = $("#gate-pin");
    if (pinInput) {
      pinInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          e.preventDefault();
          tryUnlock();
        }
      });
    }
  }

  function bootApp() {
    if (booted) return;
    booted = true;
    fetchSite()
      .then(function (data) {
        state = data;
        renderStaffEditor();
        renderGalleryEditor();
      })
      .catch(function () {
        $("#admin-toast").textContent =
          "Could not load site data (/api/site or data/site.json). Using an empty template.";
        state = { staffGroups: [], gallery: [] };
        renderStaffEditor();
        renderGalleryEditor();
      });

    var btnSaveLive = $("#btn-save-live");
    if (btnSaveLive) {
      btnSaveLive.addEventListener("click", function () {
        var toast = $("#admin-toast");
        ensureSaveToken()
          .then(function (token) {
            var obj = buildExportObject();
            return fetch("/api/site", {
              method: "POST",
              headers: {
                Authorization: "Bearer " + token,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(obj),
            }).then(function (r) {
              return r.text().then(function (txt) {
                var body = {};
                try {
                  body = txt ? JSON.parse(txt) : {};
                } catch (ignore) {}
                return { r: r, body: body, sent: obj };
              });
            });
          })
          .then(function (out) {
            if (out.r.status === 401) {
              try {
                sessionStorage.removeItem(SESSION_SAVE_TOKEN);
              } catch (ignore) {}
              throw new Error("Wrong save token. Try again or ask the owner for the current token.");
            }
            if (out.r.status === 503) {
              throw new Error(
                (out.body && out.body.error) ||
                  "Cloud save is not set up yet (KV + SAVE_TOKEN in Cloudflare). See README."
              );
            }
            if (!out.r.ok) {
              throw new Error((out.body && out.body.error) || "Save failed (" + out.r.status + ").");
            }
            return fetch("/api/site?_=" + Date.now(), { cache: "no-store" })
              .then(function (r2) {
                if (!r2.ok) {
                  if (toast) toast.textContent = "";
                  showAdminModal({
                    variant: "error",
                    title: "Saved, but read-back failed",
                    message:
                      "The server accepted the update, but reloading /api/site returned HTTP " +
                      r2.status +
                      ". Open the homepage and try a hard refresh (Ctrl+Shift+R). If it still fails, check Worker routes in Cloudflare.",
                  });
                  return;
                }
                return r2.json().then(function (remote) {
                  if (!sitePayloadEqual(out.sent, remote)) {
                    if (toast) toast.textContent = "";
                    showAdminModal({
                      variant: "error",
                      title: "Data mismatch after save",
                      message:
                        "The save reported success, but /api/site did not return the same data. Often this is CDN or browser cache serving an old JSON file. Redeploy the Worker (wrangler deploy), then hard-refresh the homepage.",
                    });
                    return;
                  }
                  if (toast) toast.textContent = "";
                  showAdminModal({
                    variant: "success",
                    title: "Saved",
                    message:
                      "Your changes are in cloud storage. Open the homepage and hard-refresh (Ctrl+Shift+R on Windows, Cmd+Shift+R on Mac) so the browser does not reuse an old copy.",
                  });
                });
              })
              .catch(function (e) {
                if (toast) toast.textContent = "";
                showAdminModal({
                  variant: "error",
                  title: "Could not verify save",
                  message:
                    (e && e.message) ||
                    "Network error while reading /api/site. The write may still have succeeded—try the homepage with a hard refresh.",
                });
              });
          })
          .catch(function (e) {
            if (e && e.message === "cancel") {
              if (toast) toast.textContent = "Save cancelled. You can still use Download site.json.";
              return;
            }
            if (e && e.message === "storage") {
              showAdminModal({
                variant: "error",
                title: "Storage blocked",
                message: "This browser would not store the save token. Allow site data for this domain or try another browser.",
              });
              return;
            }
            if (toast) toast.textContent = "";
            showAdminModal({
              variant: "error",
              title: "Could not save",
              message: e.message || "Could not save.",
            });
          });
      });
    }

    var btnClearToken = $("#btn-clear-save-token");
    if (btnClearToken) {
      btnClearToken.addEventListener("click", function () {
        try {
          sessionStorage.removeItem(SESSION_SAVE_TOKEN);
        } catch (ignore) {}
        var toast = $("#admin-toast");
        if (toast) toast.textContent = "Save token cleared for this browser. Next save will ask again.";
      });
    }

    var btnExport = $("#btn-export");
    if (btnExport) btnExport.addEventListener("click", function () {
      var obj = buildExportObject();
      downloadJson("site.json", obj);
      $("#admin-toast").textContent =
        "Downloaded site.json — optional: replace data/site.json in GitHub, or use Save to website if cloud save is enabled.";
    });

    var btnImport = $("#btn-import");
    if (btnImport) btnImport.addEventListener("change", function (e) {
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      loadJsonFile(f)
        .then(normalizeData)
        .then(function (data) {
          state = data;
          renderStaffEditor();
          renderGalleryEditor();
          $("#admin-toast").textContent = "Imported JSON into the editor.";
        })
        .catch(function () {
          $("#admin-toast").textContent = "Invalid JSON file.";
        });
      e.target.value = "";
    });

    var btnLogout = $("#btn-logout");
    if (btnLogout) btnLogout.addEventListener("click", function () {
      sessionStorage.removeItem(SESSION_KEY);
      location.reload();
    });
  }

  function init() {
    try {
      gate();
    } catch (e) {
      var err = $("#gate-error");
      if (err) {
        err.textContent =
          "A script error stopped the admin page. Hard-refresh (Ctrl+Shift+R) or check the browser console.";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
