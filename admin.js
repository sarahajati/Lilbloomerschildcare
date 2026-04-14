(function () {
  var SESSION_KEY = "lilbloomers_admin_ok";
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
    return String((window.LILBLOOMERS_ADMIN_PIN || "").trim());
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

  function fetchSite() {
    return fetch("data/site.json", { cache: "no-store" })
      .then(function (r) {
        if (!r.ok) throw new Error("fetch");
        return r.json();
      })
      .then(normalizeData);
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
          '<button type="button" class="btn btn-small add-member" data-group="' +
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
    $("#staff-editor")
      .querySelectorAll(".admin-fieldset")
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
      '<button type="button" class="btn btn-small" id="add-gallery-row">Add daycare photo</button>';

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

  function gate() {
    var gateEl = $("#admin-gate");
    var appEl = $("#admin-app");
    if (sessionStorage.getItem(SESSION_KEY) === "1") {
      gateEl.hidden = true;
      appEl.hidden = false;
      bootApp();
      return;
    }
    gateEl.hidden = false;
    appEl.hidden = true;
    var form = $("#gate-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var pin = ($("#gate-pin") && $("#gate-pin").value) || "";
      if (pin === getPin() && getPin()) {
        sessionStorage.setItem(SESSION_KEY, "1");
        gateEl.hidden = true;
        appEl.hidden = false;
        bootApp();
      } else {
        $("#gate-error").textContent = "Incorrect PIN. Change it in admin-config.js on the server.";
      }
    });
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
        $("#admin-toast").textContent = "Could not load data/site.json. Using empty template.";
        state = { staffGroups: [], gallery: [] };
        renderStaffEditor();
        renderGalleryEditor();
      });

    var btnExport = $("#btn-export");
    if (btnExport) btnExport.addEventListener("click", function () {
      var obj = buildExportObject();
      downloadJson("site.json", obj);
      $("#admin-toast").textContent =
        "Downloaded site.json — replace the file in your repo at data/site.json, commit, and push to update the live site.";
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
    gate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
