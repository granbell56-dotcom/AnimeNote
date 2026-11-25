(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const safeUrl = (u) => { u = String(u || "").trim(); return /^https?:\/\//i.test(u) ? u : ""; };
  const fmt = (n) => n.toFixed(1).replace(".", ",");
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cfg = typeof SITE !== "undefined" ? SITE : {};

  /* ----- Données nettoyées (une erreur dans une fiche ne casse pas le site) ----- */
  const brut = typeof ANIMES !== "undefined" && Array.isArray(ANIMES) ? ANIMES : [];
  const list = brut.filter((a) => a && a.titre).map((a, i) => ({
    id: i,
    titre: String(a.titre),
    lien: safeUrl(a.lien),
    image: String(a.image || "").trim(),
    note: Math.max(0, Math.min(5, Number(a.note) || 0)),
    genres: Array.isArray(a.genres) ? a.genres.map(String) : [],
    description: String(a.description || ""),
    audio: a.audio || "",
    sous_titres: a.sous_titres || "",
    avertissement: a.avertissement || "",
    source: a.source || "",
    source_adn: a.source_adn || "",
    source_netflix: a.source_netflix || "",
    source_prime: a.source_prime || "",
    message: a.message || "",
    vedette: !!a.vedette,
  }));

  const state = { cat: "Tout", q: "", sort: "note" };

  /* ----- Apparition au défilement ----- */
  const io = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
        });
      }, { rootMargin: "0px 0px -40px 0px" })
    : null;
  const reveal = (nodes) => nodes.forEach((n, i) => {
    n.style.transitionDelay = Math.min(i * 40, 320) + "ms";
    if (io) io.observe(n); else n.classList.add("in");
  });

  /* ----- Briques d'affichage ----- */
  function poster(a) {
    const p = el("div", "poster");
    let h = 0;
    for (const c of a.titre) h = (h * 31 + c.charCodeAt(0)) % 50;
    p.style.setProperty("--h", 285 + h);
    const mots = a.titre.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const ini = mots.slice(0, 2).map((m) => m[0].toUpperCase()).join("") || "★";
    const ph = el("div", "ph");
    ph.append(el("b", null, ini), el("span", null, a.titre));
    p.append(ph);
    if (a.image) {
      const img = new Image();
      img.alt = "Affiche de " + a.titre;
      img.loading = "lazy";
      img.onerror = () => img.remove();   // image introuvable -> affiche de remplacement
      img.src = a.image;
      p.append(img);
    }
    return p;
  }
  function stars(n) {
    const s = el("span", "stars");
    s.style.setProperty("--p", (n / 5) * 100 + "%");
    s.setAttribute("role", "img");
    s.setAttribute("aria-label", fmt(n) + " sur 5");
    return s;
  }
  function watchBtn(a) {
  if (!a.lien) return el("span", "btn primary off", "Lien bientôt disponible");
  const plateforme = a.source_prime || a.source_netflix || a.source_adn || a.source || "Crunchyroll";
  const b = el("a", "btn primary", "▶ Regarder sur " + plateforme);
  b.href = a.lien;
  b.target = "_blank";
  b.rel = "noopener noreferrer";
  return b;
}
  function card(a, rank) {
    const b = el("button", "card reveal");
    b.type = "button";
    const p = poster(a);
    p.append(el("span", "badge", "★ " + fmt(a.note)));
    if (rank) p.append(el("span", "rank", rank));
    const meta = el("div", "meta");
    meta.append(stars(a.note), el("span", null, a.genres[0] || ""));
    b.append(p, el("h3", null, a.titre), meta);
    b.addEventListener("click", () => openModal(a, b));
    return b;
  }

  /* ----- Catégories ----- */
  const cats = $("#cats");
  function renderCats() {
    const counts = new Map();
    list.forEach((a) => a.genres.forEach((g) => counts.set(g, (counts.get(g) || 0) + 1)));
    const all = [["Tout", list.length], ...counts];
    cats.replaceChildren(...all.map(([nom, nb]) => {
      const b = el("button", "cat" + (nom === state.cat ? " on" : ""), nom);
      b.type = "button";
      b.append(el("small", null, nb));
      b.addEventListener("click", () => {
        state.cat = nom;
        renderCats();
        renderGrid();
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
      return b;
    }));
  }

  /* ----- Grille (catégorie + recherche + tri) ----- */
  function renderGrid() {
    const q = norm(state.q);
    let res = list.filter((a) =>
      (state.cat === "Tout" || a.genres.includes(state.cat)) &&
      (!q || norm(a.titre + " " + a.genres.join(" ")).includes(q))
    );
    if (state.sort === "note") res.sort((a, b) => b.note - a.note || a.titre.localeCompare(b.titre, "fr"));
    else if (state.sort === "az") res.sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
    else res.sort((a, b) => b.id - a.id);   // derniers ajoutés = en bas de animes.js

    const filtre = state.cat !== "Tout" || !!q;
    $("#hero").hidden = filtre || !heroList.length;
    $("#topBlock").hidden = filtre || !list.length;

    $("#gridTitle").textContent = q
      ? "Résultats pour « " + state.q + " »"
      : state.cat === "Tout" ? "Tous les animés" : state.cat;
    $("#count").textContent = res.length + (res.length > 1 ? " animés" : " animé");
    $("#empty").hidden = res.length > 0;

    const cards = res.map((a) => card(a));
    $("#grid").replaceChildren(...cards);
    reveal(cards);
  }

  /* ----- Rangée « Les mieux notés » ----- */
  const topRow = $("#topRow");
  function renderTop() {
    const top = [...list].sort((a, b) => b.note - a.note).slice(0, 10);
    const cards = top.map((a, i) => card(a, i + 1));
    topRow.replaceChildren(...cards);
    reveal(cards);
  }
  const glisse = (sens) => topRow.scrollBy({ left: sens * topRow.clientWidth * 0.8, behavior: "smooth" });
  $("#prev").addEventListener("click", () => glisse(-1));
  $("#next").addEventListener("click", () => glisse(1));

  /* ----- Bannière ----- */
  const vedettes = list.filter((a) => a.vedette);
  const heroList = vedettes.length
    ? vedettes
    : [...list].sort((a, b) => b.note - a.note).slice(0, 3);
  let heroI = 0;
  let heroTimer = null;

  function drawHero() {
    const a = heroList[heroI];
    if (!a) return;
    const txt = el("div", "hero-txt");
    const meta = el("div", "hero-meta");
    const note = el("b", null, fmt(a.note) + "/5");
    meta.append(stars(a.note), note, el("span", null, a.genres.join(" · ")));
    const actions = el("div", "actions");
    const det = el("button", "btn", "Détails");
    det.type = "button";
    det.addEventListener("click", () => openModal(a, det));
    actions.append(watchBtn(a), det);
    txt.append(
      el("span", "tag", "★ Coup de cœur"),
      el("h1", null, a.titre),
      meta,
      el("p", "hero-desc", a.description),
      actions
    );
    const p = poster(a);
    p.classList.add("hero-poster");
    $("#heroIn").replaceChildren(txt, p);
    $("#heroBg").style.backgroundImage = a.image ? "url(" + JSON.stringify(a.image) + ")" : "";
    [...$("#dots").children].forEach((d, i) => d.classList.toggle("on", i === heroI));
  }
  function showHero(i) {
    heroI = (i + heroList.length) % heroList.length;
    const hero = $("#hero");
    hero.classList.add("out");
    setTimeout(() => { drawHero(); hero.classList.remove("out"); }, 300);
  }
  function startHero() {
    clearInterval(heroTimer);
    if (heroList.length < 2) return;
    heroTimer = setInterval(() => {
      if (document.hidden || !$("#modal").hidden || $("#hero").hidden) return;
      showHero(heroI + 1);
    }, 7000);
  }
  function initHero() {
    if (!heroList.length) return;
    const dots = $("#dots");
    dots.replaceChildren(...heroList.map((a, i) => {
      const d = el("button");
      d.type = "button";
      d.setAttribute("aria-label", "Afficher " + a.titre);
      d.addEventListener("click", () => { showHero(i); startHero(); });
      return d;
    }));
    dots.hidden = heroList.length < 2;
    drawHero();
    startHero();
  }

  /* ----- Fenêtre de détails ----- */
  const modal = $("#modal");
  const modalBox = $("#modalBox");
  let lastFocus = null;
  let closeTimer = null;

  function openModal(a, from) {
    clearTimeout(closeTimer);
    lastFocus = from || null;

    const x = el("button", "close", "✕");
    x.type = "button";
    x.setAttribute("aria-label", "Fermer");
    x.addEventListener("click", closeModal);

    const body = el("div", "modal-body");

    const chips = el("div", "chips");
    a.genres.forEach((g) => chips.append(el("span", "tag", g)));

    const note = el("div", "modal-note");
    note.append(stars(a.note), el("b", null, fmt(a.note)), el("span", "mut", "/ 5"));

    // Infos : Audio, Sous-titres, Avertissement (affichées seulement si remplies)
    const infos = el("div", "infos");
    const ligne = (icone, nom, valeur, cls) => {
      if (!valeur) return;
      const p = el("p", "info" + (cls ? " " + cls : ""));
      
      p.append(
        el("strong", null, icone + " " + nom + " : "),
        el("span", "val", valeur)
      );
      
      infos.append(p);
    };
    ligne("","Audio", a.audio);
    ligne("","Sous-titres", a.sous_titres);
    ligne("", "Source", a.source, "source")
    ligne("", "Source", a.source_adn, "source_adn")
    ligne("", "Source", a.source_netflix, "source_netflix")
    ligne("", "Source", a.source_prime, "source_prime")
    ligne("", "Information", a.message, "message")
    ligne("","Avertissement", a.avertissement, "warn");

    const actions = el("div", "actions");
    const fermer = el("button", "btn", "Fermer");
    fermer.type = "button";
    fermer.addEventListener("click", closeModal);
    actions.append(watchBtn(a), fermer);

    body.append(chips, el("h2", null, a.titre), note, el("p", "modal-desc", a.description), infos, actions);

    modalBox.replaceChildren(x, poster(a), body);
    modalBox.scrollTop = 0;
    modal.hidden = false;
    document.body.classList.add("lock");
    requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("open")));
    x.focus();
  }
  function closeModal() {
    if (modal.hidden) return;
    modal.classList.remove("open");
    document.body.classList.remove("lock");
    closeTimer = setTimeout(() => { modal.hidden = true; }, 250);
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  /* ----- Recherche et tri ----- */
  $("#q").addEventListener("input", (e) => {
    state.q = e.target.value.trim();
    if (location.hash === "#aide") location.hash = "";
    renderGrid();
  });
  $("#sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderGrid();
  });

  /* ----- Pages : Accueil / Aide ----- */
  function route() {
    const aide = location.hash === "#aide";
    $("#home").hidden = aide;
    $("#aide").hidden = !aide;
    cats.hidden = aide;
    document.querySelectorAll("nav a").forEach((a) =>
      a.classList.toggle("on", (a.dataset.nav === "aide") === aide));
    closeModal();
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);

  /* ----- Formulaire d'avis ----- */
  const form = $("#avis");
  const msg = $("#avisMsg");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    if (data.get("_gotcha")) return;   // robot
    const pseudo = String(data.get("pseudo") || "").trim() || "Anonyme";
    const type = String(data.get("type") || "");
    const texte = String(data.get("message") || "").trim();
    if (texte.length < 5) { msg.textContent = "Ton message est trop court."; return; }

    const url = safeUrl(cfg.formspree);
    if (url) {
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      msg.textContent = "Envoi en cours…";
      try {
        const r = await fetch(url, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!r.ok) throw new Error("HTTP " + r.status);
        form.reset();
        msg.textContent = "Merci, ton avis a bien été envoyé ! 💜";
      } catch (err) {
        msg.textContent = "L'envoi a échoué. Réessaie dans un instant.";
      }
      btn.disabled = false;
    } else if (cfg.email) {
      const sujet = "[AnimeNote] " + type + " — " + pseudo;
      location.href = "mailto:" + encodeURIComponent(cfg.email) +
        "?subject=" + encodeURIComponent(sujet) + "&body=" + encodeURIComponent(texte);
      msg.textContent = "Ton application mail s'est ouverte : il reste à appuyer sur Envoyer.";
    } else {
      msg.textContent = "Le formulaire n'est pas encore configuré (voir SITE dans animes.js).";
    }
  });

  /* ----- Démarrage ----- */
  renderCats();
  initHero();
  renderTop();
  renderGrid();
  route();
})();
