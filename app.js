/*
 * ============================================================================
 * ANIMENOTE — JavaScript de l'interface
 * ============================================================================
 * === CONFIG : modifie ici ===
 * PLATFORMES déclare le nom de chaque champ de plateforme dans animes.js.
 *   • « champ » : propriété utilisée dans une fiche d'animé (ne pas la renommer).
 *   • « nom »   : texte affiché dans le filtre et sur les étiquettes.
 *   • « cle »   : classe CSS associée aux couleurs définies dans style.css.
 * Pour ajouter une plateforme, ajoute une ligne ici ET sa couleur dans style.css.
 * Ajoute ensuite ce champ à tes fiches d'animés (ex. source_adn: "ADN").
 *
 * Format d'une fiche dans animes.js :
 * { titre, lien, image, note, genres: ["Magie"], source: "Crunchyroll",
 *   source_netflix: "Netflix", source_adn: "ADN", source_prime: "Prime Video",
 *   description, audio, sous_titres, avertissement, message, vedette }
 * Un champ source rempli signifie que la fiche est disponible sur cette plateforme.
 * Plusieurs champs peuvent être remplis en même temps.
 * Pour ajouter un animé : copie un objet dans ANIMES, renseigne titre et genres;
 * tout nouveau genre se proposera automatiquement dans le menu « Genre ».
 */
(() => {
  "use strict";

  const PLATFORMES = [
    { champ: "source", nom: "Crunchyroll", cle: "crunchyroll" },
    { champ: "source_netflix", nom: "Netflix", cle: "netflix" },
    { champ: "source_adn", nom: "ADN", cle: "adn" },
    { champ: "source_prime", nom: "Prime Video", cle: "prime" },
  ];
  const TOUS = "Tout";
  const $ = (selecteur) => document.querySelector(selecteur);
  const el = (tag, classes, texte) => {
    const node = document.createElement(tag);
    if (classes) node.className = classes;
    if (texte !== undefined && texte !== null) node.textContent = texte;
    return node;
  };
  const safeUrl = (url) => {
    const valeur = String(url || "").trim();
    return /^https?:\/\//i.test(valeur) ? valeur : "";
  };
  const fmt = (note) => note.toFixed(1).replace(".", ",");
  const norm = (texte) => String(texte || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const cfg = typeof SITE !== "undefined" && SITE ? SITE : {};
  const brut = typeof ANIMES !== "undefined" && Array.isArray(ANIMES) ? ANIMES : [];

  /*
   * On copie uniquement les champs attendus et on met des valeurs de repli :
   * une fiche mal renseignée ne doit pas interrompre le chargement du catalogue.
   * Les noms de champs source_* correspondent au format déjà utilisé par le site.
   */
  const list = brut.filter((anime) => anime && anime.titre).map((anime, id) => {
    const propre = {
      id,
      titre: String(anime.titre),
      lien: safeUrl(anime.lien),
      image: String(anime.image || "").trim(),
      note: Math.max(0, Math.min(5, Number(anime.note) || 0)),
      genres: Array.isArray(anime.genres) ? anime.genres.map(String).filter(Boolean) : [],
      description: String(anime.description || ""),
      audio: anime.audio || "",
      sous_titres: anime.sous_titres || "",
      avertissement: anime.avertissement || "",
      message: anime.message || "",
      vedette: Boolean(anime.vedette),
    };
    PLATFORMES.forEach(({ champ }) => { propre[champ] = anime[champ] || ""; });
    return propre;
  });

  /* Les deux filtres sont indépendants : une fiche peut passer à la fois les deux. */
  const state = { plateforme: TOUS, genre: TOUS, q: "", sort: "note" };
  const champs = {
    home: $("#home"), aide: $("#aide"), filtres: $("#filterZone"), note: $("#note"),
    hero: $("#hero"), heroBg: $("#heroBg"), heroIn: $("#heroIn"), dots: $("#dots"),
    topBlock: $("#topBlock"), topRow: $("#topRow"), grid: $("#grid"),
    titreGrille: $("#gridTitle"), compteur: $("#count"), vide: $("#empty"),
    modal: $("#modal"), modalBox: $("#modalBox"),
  };

  /* ===== Apparition douce des cartes pendant le défilement ===== */
  const observateur = "IntersectionObserver" in window
    ? new IntersectionObserver((entrees, observer) => {
        entrees.forEach((entree) => {
          if (entree.isIntersecting) {
            entree.target.classList.add("in");
            observer.unobserve(entree.target);
          }
        });
      }, { rootMargin: "0px 0px -36px 0px" })
    : null;
  function animerApparition(noeuds) {
    noeuds.forEach((node, index) => {
      node.style.transitionDelay = Math.min(index * 35, 280) + "ms";
      if (observateur) observateur.observe(node);
      else node.classList.add("in");
    });
  }

  /* ===== Affiches, notes et badges des plateformes ===== */
  function plateformesDe(anime) {
    return PLATFORMES.filter(({ champ }) => Boolean(anime[champ]));
  }
  function ajouterBadgesPlateformes(conteneur, anime, limite) {
    const disponibles = plateformesDe(anime);
    (limite ? disponibles.slice(0, limite) : disponibles).forEach((plateforme) => {
      // Le champ peut contenir le nom de la plateforme; le libellé reste le nom configuré.
      conteneur.append(el("span", "source-badge platform-" + plateforme.cle, plateforme.nom));
    });
  }
  function affiche(anime) {
    const cadre = el("div", "poster");
    let teinte = 0;
    for (const caractere of anime.titre) teinte = (teinte * 31 + caractere.charCodeAt(0)) % 52;
    cadre.style.setProperty("--h", 286 + teinte);
    const mots = anime.titre.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
    const initiales = mots.slice(0, 2).map((mot) => mot[0].toUpperCase()).join("") || "★";
    const remplacement = el("div", "ph");
    remplacement.append(el("b", "", initiales), el("span", "", anime.titre));
    cadre.append(remplacement);
    if (anime.image) {
      const image = new Image();
      image.alt = "Affiche de " + anime.titre;
      image.loading = "lazy";
      image.onerror = () => image.remove(); // Si le fichier manque, on garde l'affiche de secours.
      image.src = anime.image;
      cadre.append(image);
    }
    return cadre;
  }
  function etoiles(note) {
    const node = el("span", "stars");
    node.style.setProperty("--p", (note / 5) * 100 + "%");
    node.setAttribute("role", "img");
    node.setAttribute("aria-label", fmt(note) + " sur 5");
    return node;
  }
  function boutonRegarder(anime) {
    if (!anime.lien) return el("span", "btn primary off", "Lien bientôt disponible");
    // Le lien unique peut pointer vers la plateforme principale : on conserve
    // la priorité historique (Prime Video, Netflix, ADN, puis Crunchyroll).
    const priorite = ["source_prime", "source_netflix", "source_adn", "source"];
    const champPrincipal = priorite.find((champ) => Boolean(anime[champ]));
    const source = PLATFORMES.find((plateforme) => plateforme.champ === champPrincipal);
    const nom = source ? source.nom : "la plateforme";
    const lien = el("a", "btn primary", "▶ Regarder sur " + nom);
    lien.href = anime.lien;
    lien.target = "_blank";
    lien.rel = "noopener noreferrer";
    return lien;
  }
  function carte(anime, rang) {
    const bouton = el("button", "card reveal");
    bouton.type = "button";
    bouton.setAttribute("aria-label", anime.titre + " — détails");
    const poster = affiche(anime);
    poster.append(el("span", "badge", "★ " + fmt(anime.note)));
    if (rang) poster.append(el("span", "rank", String(rang)));
    const meta = el("div", "meta");
    meta.append(etoiles(anime.note), el("span", "genre-preview", anime.genres[0] || ""));
    const badges = el("div", "card-platforms");
    ajouterBadgesPlateformes(badges, anime, 3);
    bouton.append(poster, el("h3", "", anime.titre), meta, badges);
    bouton.addEventListener("click", () => ouvrirDetails(anime, bouton));
    return bouton;
  }

  /* ===== Construction des filtres depuis les données ===== */
  const platformesZone = $("#platforms");
  const genreSelect = $("#genreSelect");
  function construireFiltres() {
    const boutonTout = el("button", "platform-button is-active", "Tout");
    boutonTout.type = "button";
    boutonTout.dataset.platform = TOUS;
    boutonTout.setAttribute("aria-pressed", "true");
    boutonTout.addEventListener("click", () => choisirPlateforme(TOUS));
    const boutons = [boutonTout];
    PLATFORMES.forEach((plateforme) => {
      const bouton = el("button", "platform-button platform-" + plateforme.cle, plateforme.nom);
      bouton.type = "button";
      bouton.dataset.platform = plateforme.champ;
      bouton.setAttribute("aria-pressed", "false");
      bouton.addEventListener("click", () => choisirPlateforme(plateforme.champ));
      boutons.push(bouton);
    });
    platformesZone.replaceChildren(...boutons);

    const genres = [...new Set(list.flatMap((anime) => anime.genres))]
      .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
    genreSelect.replaceChildren(new Option("Tous les genres", TOUS));
    genres.forEach((genre) => genreSelect.add(new Option(genre, genre)));
  }
  function choisirPlateforme(champ) {
    state.plateforme = champ;
    platformesZone.querySelectorAll(".platform-button").forEach((bouton) => {
      const actif = bouton.dataset.platform === champ;
      bouton.classList.toggle("is-active", actif);
      bouton.setAttribute("aria-pressed", String(actif));
    });
    rendreGrille();
  }

  /* ===== Sélection, recherche et tri du catalogue ===== */
  function passerFiltres(anime) {
    const bonnePlateforme = state.plateforme === TOUS || Boolean(anime[state.plateforme]);
    const bonGenre = state.genre === TOUS || anime.genres.includes(state.genre);
    const recherche = norm(state.q);
    const mots = [anime.titre, anime.description, anime.genres.join(" "), anime.audio,
      anime.sous_titres, ...plateformesDe(anime).map((p) => p.nom)].join(" ");
    return bonnePlateforme && bonGenre && (!recherche || norm(mots).includes(recherche));
  }
  function estFiltre() {
    return state.plateforme !== TOUS || state.genre !== TOUS || Boolean(state.q);
  }
  function rendreGrille() {
    let resultat = list.filter(passerFiltres);
    if (state.sort === "note") resultat.sort((a, b) => b.note - a.note || a.titre.localeCompare(b.titre, "fr"));
    else if (state.sort === "az") resultat.sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
    else resultat.sort((a, b) => b.id - a.id); // Les dernières fiches de ANIMES arrivent en premier.

    const filtrage = estFiltre();
    champs.hero.hidden = filtrage || !heroList.length;
    champs.topBlock.hidden = filtrage || list.length === 0;
    const nomPlateforme = PLATFORMES.find((p) => p.champ === state.plateforme)?.nom;
    const contexte = [nomPlateforme, state.genre !== TOUS ? state.genre : ""].filter(Boolean).join(" · ");
    champs.titreGrille.textContent = state.q
      ? "Résultats pour « " + state.q + " »"
      : contexte || "Tous les animés";
    champs.compteur.textContent = resultat.length + (resultat.length > 1 ? " animés" : " animé");
    champs.vide.hidden = resultat.length > 0;
    const cartes = resultat.map((anime) => carte(anime));
    champs.grid.replaceChildren(...cartes);
    animerApparition(cartes);
  }
  genreSelect.addEventListener("change", () => {
    state.genre = genreSelect.value;
    rendreGrille();
  });

  /* ===== Rangée horizontale « Les mieux notés » ===== */
  function rendreMieuxNotes() {
    const top = [...list].sort((a, b) => b.note - a.note || a.titre.localeCompare(b.titre, "fr")).slice(0, 10);
    const cartes = top.map((anime, index) => carte(anime, index + 1));
    champs.topRow.replaceChildren(...cartes);
    animerApparition(cartes);
  }
  const glisser = (sens) => champs.topRow.scrollBy({ left: sens * champs.topRow.clientWidth * 0.8, behavior: "smooth" });
  $("#prev").addEventListener("click", () => glisser(-1));
  $("#next").addEventListener("click", () => glisser(1));

  /* ===== Bannière tournante des vedettes ===== */
  const vedettes = list.filter((anime) => anime.vedette);
  const heroList = vedettes.length ? vedettes : [...list].sort((a, b) => b.note - a.note).slice(0, 3);
  let indexHero = 0;
  let minuterieHero = null;
  let transitionHero = null;
  function dessinerHero() {
    const anime = heroList[indexHero];
    if (!anime) return;
    const texte = el("div", "hero-txt");
    const meta = el("div", "hero-meta");
    meta.append(etoiles(anime.note), el("b", "", fmt(anime.note) + "/5"), el("span", "", anime.genres.join(" · ")));
    const sources = el("div", "hero-platforms");
    ajouterBadgesPlateformes(sources, anime);
    const actions = el("div", "actions");
    const details = el("button", "btn", "Détails");
    details.type = "button";
    details.addEventListener("click", () => ouvrirDetails(anime, details));
    actions.append(boutonRegarder(anime), details);
    texte.append(el("span", "tag", "★ Coup de cœur"), el("h1", "", anime.titre), meta, sources,
      el("p", "hero-desc", anime.description), actions);
    const poster = affiche(anime);
    poster.classList.add("hero-poster");
    champs.heroIn.replaceChildren(texte, poster);
    champs.heroBg.style.backgroundImage = anime.image ? "url(" + JSON.stringify(anime.image) + ")" : "";
    [...champs.dots.children].forEach((dot, index) => dot.classList.toggle("on", index === indexHero));
  }
  function afficherHero(index) {
    if (!heroList.length) return;
    indexHero = (index + heroList.length) % heroList.length;
    clearTimeout(transitionHero);
    champs.hero.classList.add("out");
    transitionHero = setTimeout(() => {
      dessinerHero();
      champs.hero.classList.remove("out");
    }, 260);
  }
  function lancerMinuterieHero() {
    clearInterval(minuterieHero);
    if (heroList.length < 2) return;
    minuterieHero = setInterval(() => {
      if (!document.hidden && champs.modal.hidden && !champs.hero.hidden) afficherHero(indexHero + 1);
    }, 7000);
  }
  function initialiserHero() {
    if (!heroList.length) return;
    champs.dots.replaceChildren(...heroList.map((anime, index) => {
      const dot = el("button", "", "");
      dot.type = "button";
      dot.setAttribute("aria-label", "Afficher " + anime.titre);
      dot.addEventListener("click", () => { afficherHero(index); lancerMinuterieHero(); });
      return dot;
    }));
    champs.dots.hidden = heroList.length < 2;
    dessinerHero();
    lancerMinuterieHero();
  }

  /* ===== Fenêtre de détails d'une fiche ===== */
  let dernierFocus = null;
  let minuterieFermeture = null;
  function ajouterInfo(liste, titre, valeur, plateforme) {
    if (valeur === undefined || valeur === null || valeur === "") return;
    const ligne = el("p", "info-row" + (plateforme ? " platform-" + plateforme.cle : ""));
    ligne.append(el("strong", "", titre + " : "), el("span", "", String(valeur)));
    liste.append(ligne);
  }
  function ouvrirDetails(anime, declencheur) {
    clearTimeout(minuterieFermeture);
    dernierFocus = declencheur || null;
    const fermerX = el("button", "close", "✕");
    fermerX.type = "button";
    fermerX.setAttribute("aria-label", "Fermer les détails");
    fermerX.addEventListener("click", fermerDetails);
    const corps = el("div", "modal-body");
    const genres = el("div", "chips");
    anime.genres.forEach((genre) => genres.append(el("span", "tag", genre)));
    const note = el("div", "modal-note");
    note.append(etoiles(anime.note), el("b", "", fmt(anime.note)), el("span", "mut", "/ 5"));
    const infos = el("div", "infos");
    ajouterInfo(infos, "Audio", anime.audio);
    ajouterInfo(infos, "Sous-titres", anime.sous_titres);
    PLATFORMES.forEach((plateforme) => ajouterInfo(infos, "Source", anime[plateforme.champ], plateforme));
    ajouterInfo(infos, "Information", anime.message);
    ajouterInfo(infos, "Avertissement", anime.avertissement);
    const actions = el("div", "actions");
    const fermerBouton = el("button", "btn", "Fermer");
    fermerBouton.type = "button";
    fermerBouton.addEventListener("click", fermerDetails);
    actions.append(boutonRegarder(anime), fermerBouton);
    corps.append(genres, el("h2", "", anime.titre), note, el("p", "modal-desc", anime.description), infos, actions);
    champs.modalBox.replaceChildren(fermerX, affiche(anime), corps);
    champs.modalBox.scrollTop = 0;
    champs.modal.hidden = false;
    document.body.classList.add("lock");
    requestAnimationFrame(() => requestAnimationFrame(() => champs.modal.classList.add("open")));
    fermerX.focus();
  }
  function fermerDetails() {
    if (champs.modal.hidden) return;
    champs.modal.classList.remove("open");
    document.body.classList.remove("lock");
    minuterieFermeture = setTimeout(() => { champs.modal.hidden = true; }, 260);
    if (dernierFocus && document.contains(dernierFocus)) dernierFocus.focus();
  }
  champs.modal.addEventListener("click", (event) => { if (event.target === champs.modal) fermerDetails(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") fermerDetails(); });

  /* ===== Recherche et tri ===== */
  
  $("#q").addEventListener("input", (event) => {
    state.q = event.target.value.trim();
    if (location.hash === "#aide") location.hash = "#accueil";
    rendreGrille();
  });

  $("#sort").addEventListener("change", (event) => { state.sort = event.target.value; rendreGrille(); });

  /* ===== Navigation entre Accueil, Aide et Note ===== */
  
  function router() {
   const page = location.hash === "#aide" ? "aide"
      : location.hash === "#note" ? "note"
      : "home";

    champs.home.hidden = page !== "home";
    champs.aide.hidden = page !== "aide";
   champs.note.hidden = page !== "note";
    champs.filtres.hidden = page !== "home";

    document.querySelectorAll(".main-nav a").forEach((lien) => {
      const actif = lien.dataset.nav === page;
      lien.classList.toggle("on", actif);
      if (actif) lien.setAttribute("aria-current", "page");
      else lien.removeAttribute("aria-current");
    });

    fermerDetails();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.addEventListener("hashchange", router);

  /* ===== Envoi d'avis : Formspree ou courriel, configuré dans SITE ===== */
  const form = $("#avis");
  const avisMsg = $("#avisMsg");
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    if (data.get("_gotcha")) return; // Champ-piège invisible pour les robots.
    const bouton = form.querySelector('button[type="submit"]');
    const url = safeUrl(cfg.formspree);
    if (url) {
      bouton.disabled = true;
      avisMsg.textContent = "Envoi en cours…";
      try {
        const reponse = await fetch(url, { method: "POST", body: data, headers: { Accept: "application/json" } });
        if (!reponse.ok) throw new Error("L'envoi a échoué.");
        avisMsg.textContent = "Merci, ton message a bien été envoyé !";
        form.reset();
      } catch (erreur) {
        avisMsg.textContent = "L'envoi n'a pas fonctionné. Réessaie plus tard.";
      } finally {
        bouton.disabled = false;
      }
    } else if (cfg.email) {
      const sujet = encodeURIComponent("AnimeNote — " + String(data.get("type") || "Message"));
      const corps = encodeURIComponent("Pseudo : " + String(data.get("pseudo") || "Non renseigné") + "\n\n" + String(data.get("message") || ""));
      window.location.href = "mailto:" + encodeURIComponent(cfg.email) + "?subject=" + sujet + "&body=" + corps;
      avisMsg.textContent = "Ton application de courriel va s'ouvrir pour envoyer le message.";
    } else {
      avisMsg.textContent = "Le formulaire n'est pas encore configuré (voir SITE dans animes.js).";
    }
  });

  /* ===== MENUS GENRE ET TRI FAITS MAISON ===== */
  ["genreSelect", "sort"].forEach(function (id) {
    const select = document.getElementById(id);
    if (!select) return;

    // On crée le bouton et la liste
    const box = document.createElement("div");
    box.className = "dd";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dd-btn";
    const list = document.createElement("ul");
    list.className = "dd-list";
    box.append(btn, list);
    select.after(box);
    select.style.display = "none"; // le vrai select est caché mais reste utilisé

    function build() {
      list.innerHTML = "";
      const choisi = select.options[select.selectedIndex];
      btn.textContent = choisi ? choisi.text : (select.options[0]?.text || "");
      for (const opt of select.options) {
        const li = document.createElement("li");
        li.textContent = opt.text;
        if (opt.value === select.value) li.classList.add("on");
        li.onclick = () => {
          select.value = opt.value;
          select.dispatchEvent(new Event("change")); // le gestionnaire existant se déclenche
          box.classList.remove("open");
          build();
        };
        list.append(li);
      }
    }

    btn.onclick = () => {
      build(); // on recopie la liste à jour juste avant d'ouvrir
      const ouvrir = !box.classList.contains("open");
      document.querySelectorAll(".dd.open").forEach((autre) => autre.classList.remove("open"));
      if (ouvrir) box.classList.add("open");
    };
    select.addEventListener("change", build);
    new MutationObserver(build).observe(select, { childList: true });
    document.addEventListener("click", (e) => {
      if (!box.contains(e.target)) box.classList.remove("open"); // clic ailleurs = fermer
    });
    build();
  });
  /* ===== Démarrage ===== */
  construireFiltres();
  initialiserHero();
  rendreMieuxNotes();
  rendreGrille();
  router();
})();
