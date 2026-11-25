if (window.location.pathname === "/perfumes") {
  document.documentElement.classList.add("perfume-route");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", "#030304");
}
