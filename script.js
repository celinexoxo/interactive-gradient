const colorButtons = document.querySelectorAll(".color-btn");
colorButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const scheme = parseInt(btn.dataset.scheme);
    app.setColorScheme(scheme);

    colorButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    updateColorPickersFromScheme();
  });
});
