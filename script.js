(function () {
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
})();
