document.addEventListener("DOMContentLoaded", function () {
  const screenStart = document.getElementById("screenStart");
  const screenGallery = document.getElementById("screenGallery");
  const screenEditor = document.getElementById("screenEditor");

  const openGalleryBtn = document.getElementById("openGalleryBtn");
  const backBtn = document.getElementById("backBtn");

  const templatesGrid = document.getElementById("templatesGrid");
  const nameInput = document.getElementById("nameInput");
  const downloadBtn = document.getElementById("downloadBtn");
  const previewBtn = document.getElementById("previewBtn");
  const previewModal = document.getElementById("previewModal");
  const modalImage = document.getElementById("modalImage");
  const modalClose = document.getElementById("modalClose");

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  const bottomBar = document.getElementById("bottomBar");
  const topbar = document.querySelector(".topbar");
  const editorRow = document.querySelector("#screenEditor .row");

  let currentTemplate = null;
  let baseImg = new Image();

  function show(screen) {
    screenStart.classList.add("hide");
    screenGallery.classList.add("hide");
    screenEditor.classList.add("hide");

    screen.classList.remove("hide");
    backBtn.classList.toggle("hide", screen === screenStart);

    // reset bottom bar
    if (bottomBar) {
      bottomBar.innerHTML = "";
      bottomBar.classList.add("hidden");
    }

    // Move buttons depending on screen
    if (screen === screenGallery) {
      // gallery: back button at bottom
      if (bottomBar) {
        bottomBar.appendChild(backBtn);
        backBtn.classList.remove("hide");
        bottomBar.classList.remove("hidden");
      }
    } else if (screen === screenEditor) {
      // editor: both back and download at bottom
      if (bottomBar) {
        bottomBar.appendChild(backBtn);
        if (previewBtn) bottomBar.appendChild(previewBtn);
        bottomBar.appendChild(downloadBtn);
        backBtn.classList.remove("hide");
        bottomBar.classList.remove("hidden");
      }
    } else {
      // start screen: restore backBtn to topbar and downloadBtn/previewBtn to editor row
      if (topbar && topbar.contains(backBtn) === false) topbar.appendChild(backBtn);
      if (editorRow && editorRow.contains(downloadBtn) === false) editorRow.appendChild(downloadBtn);
      if (editorRow && previewBtn && editorRow.contains(previewBtn) === false) editorRow.appendChild(previewBtn);
    }
  }

  function renderGallery() {
    templatesGrid.innerHTML = "";

    (window.TEMPLATES || []).forEach((t) => {
      const card = document.createElement("div");
      card.className = "card";

      const img = document.createElement("img");
      img.src = t.src;
      img.alt = t.title || t.id;

      const cap = document.createElement("div");
      cap.className = "cap";
      cap.textContent = t.title || t.id;

      card.appendChild(img);
      card.appendChild(cap);

      card.onclick = () => selectTemplate(t);
      templatesGrid.appendChild(card);
    });
  }

  function selectTemplate(t) {
    currentTemplate = t;
    nameInput.value = "";
    loadImage(t.src);
    show(screenEditor);
  }

  function loadImage(src) {
    baseImg = new Image();
    baseImg.onload = () => {
      canvas.width = baseImg.naturalWidth;
      canvas.height = baseImg.naturalHeight;
      draw();
    };
    baseImg.onerror = () => alert("الصورة ما انحملت. تأكد من مسارها داخل templates.js");
    baseImg.src = src;
  }

  // تصغير الخط تلقائياً حسب عرض المستطيل + padding + minFontSize
  function fitFontSizeToWidth(text, baseSize, maxWidth, fontFamily, minSize = 10) {
    let size = baseSize;

    while (size > minSize) {
      ctx.font = `${size}px "${fontFamily}", sans-serif`;
      if (ctx.measureText(text).width <= maxWidth) return size;
      size -= 1; // أدق من -2
    }

    return minSize;
  }

  function draw() {
    if (!baseImg.naturalWidth || !currentTemplate) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(baseImg, 0, 0);

    const text = nameInput.value.trim();
    if (!text) return;

    const t = currentTemplate;

    const paddingX = t.paddingX || 0;
    const usableWidth = (t.maxWidth || 300) - paddingX * 2;

    const size = fitFontSizeToWidth(
      text,
      t.fontSize || 40,
      usableWidth,
      t.fontFamily || "Cairo",
      t.minFontSize || 10
    );

    ctx.font = `${size}px "${t.fontFamily || "Cairo"}", sans-serif`;
    ctx.fillStyle = t.color || "#000";
    ctx.textAlign = t.align || "center";
    ctx.textBaseline = "middle";
    ctx.direction = "rtl";

    ctx.fillText(text, t.x || canvas.width / 2, t.y || canvas.height / 2);
  }

  // --- UI events ---
  openGalleryBtn.addEventListener("click", () => {
    renderGallery();
    show(screenGallery);
  });

  backBtn.addEventListener("click", () => {
    if (!screenEditor.classList.contains("hide")) show(screenGallery);
    else show(screenStart);
  });

  nameInput.addEventListener("input", draw);

  downloadBtn.addEventListener("click", () => {
    if (!currentTemplate || !baseImg.naturalWidth) return;

    const ok = confirm("هل تريد تنزيل الصورة؟");
    if (!ok) return;

    const a = document.createElement("a");
    a.download = `ramadan-${currentTemplate.id}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();

    try {
      incrementDownloadCount(currentTemplate.id);
    } catch (e) {
      console.error("incrementDownloadCount error", e);
    }
  });

  // --- localStorage download counters ---
  const DOWNLOADS_KEY = "ramadan_download_counts_v1";
  function loadCounts() {
    try {
      const s = localStorage.getItem(DOWNLOADS_KEY);
      return s ? JSON.parse(s) : {};
    } catch (e) {
      return {};
    }
  }
  function saveCounts(obj) {
    try {
      localStorage.setItem(DOWNLOADS_KEY, JSON.stringify(obj));
    } catch (e) {}
  }
  function incrementDownloadCount(id) {
    if (!id) return;
    const counts = loadCounts();
    counts[id] = (counts[id] || 0) + 1;
    saveCounts(counts);
  }

  // Admin shortcut: Ctrl/Cmd + Alt + D
  const ADMIN_PASS = "admin"; // غيّره إذا تبغى
  const adminModal = document.getElementById("adminModal");
  const adminList = document.getElementById("adminList");
  const adminClose = document.getElementById("adminClose");

  function showAdminModal(counts) {
    if (!adminModal || !adminList) return;

    let html = "";
    if (window.TEMPLATES && window.TEMPLATES.length) {
      window.TEMPLATES.forEach((t) => {
        html += `${t.title || t.id}: ${counts[t.id] || 0}\n`;
      });
    } else {
      for (const k in counts) html += `${k}: ${counts[k]}\n`;
    }

    adminList.textContent = html || "لا توجد بيانات";
    adminModal.classList.remove("hidden");
    adminModal.setAttribute("aria-hidden", "false");
  }

  document.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.altKey && (ev.key === "D" || ev.key === "d")) {
      ev.preventDefault();
      const pass = prompt("أدخل كلمة مرور المشرف لعرض إحصاءات التنزيل:");
      if (!pass) return;

      if (pass === ADMIN_PASS) {
        const counts = loadCounts();
        showAdminModal(counts);
      } else {
        alert("كلمة المرور خاطئة");
      }
    }
  });

  if (adminClose && adminModal) {
    adminClose.addEventListener("click", () => {
      adminModal.classList.add("hidden");
      adminModal.setAttribute("aria-hidden", "true");
    });

    adminModal.addEventListener("click", (ev) => {
      if (ev.target === adminModal) {
        adminModal.classList.add("hidden");
        adminModal.setAttribute("aria-hidden", "true");
      }
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !adminModal.classList.contains("hidden")) {
        adminModal.classList.add("hidden");
        adminModal.setAttribute("aria-hidden", "true");
      }
    });
  }

  // Preview modal
  if (previewBtn) {
    previewBtn.addEventListener("click", () => {
      if (!currentTemplate) {
        alert("الرجاء اختيار تصميم أولاً.");
        return;
      }
      if (!nameInput.value.trim()) {
        alert("الرجاء إدخال الاسم أولاً.");
        return;
      }

      draw();
      show(screenEditor);

      if (previewModal && modalImage) {
        try {
          const dataUrl = canvas.toDataURL("image/png");
          if (!dataUrl || dataUrl.length < 50) throw new Error("invalid dataUrl");
          modalImage.src = dataUrl;
          previewModal.classList.remove("hidden");
          previewModal.setAttribute("aria-hidden", "false");
        } catch (e) {
          console.error("preview error", e);
          alert("تعذر إنشاء معاينة الصورة. تأكد أن الصورة محمولة من نفس المصدر (CORS) وأنها قد حملت بالكامل.");
        }
      }
    });
  }

  if (previewModal && modalClose) {
    modalClose.addEventListener("click", () => {
      previewModal.classList.add("hidden");
      previewModal.setAttribute("aria-hidden", "true");
    });

    previewModal.addEventListener("click", (ev) => {
      if (ev.target === previewModal) {
        previewModal.classList.add("hidden");
        previewModal.setAttribute("aria-hidden", "true");
      }
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !previewModal.classList.contains("hidden")) {
        previewModal.classList.add("hidden");
        previewModal.setAttribute("aria-hidden", "true");
      }
    });
  }

  show(screenStart);
});
