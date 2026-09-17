/* Interactieve figuur bij G03_GoniometrischeFormules.tex. */
(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  var RAD = Math.PI / 180;

  function cos(g) { return Math.cos(g * RAD); }
  function sin(g) { return Math.sin(g * RAD); }

  // Hoeken in ]-180°, 180°] houden de bogen compact wanneer een punt door
  // de negatieve x-as wordt gesleept.
  function graden(P) {
    return Math.atan2(P.Y(), P.X()) / RAD;
  }

  function kleinsteVerschil(a, b) {
    var d = a - b;
    while (d <= -180) d += 360;
    while (d > 180) d -= 360;
    return d;
  }

  function plaats(bord, fx, fy) {
    return bord.create("point", [fx, fy], {
      visible: false, fixed: true, name: "", showInfobox: false
    });
  }

  function lijnstuk(ctx, bord, van, naar, rol, opties) {
    var keuze = { fixed: true, highlight: false, strokeWidth: 2.5 };
    Object.keys(opties || {}).forEach(function (sleutel) {
      keuze[sleutel] = opties[sleutel];
    });
    return ctx.stijl(bord.create("segment", [van, naar], keuze), rol);
  }

  // De boog loopt van begin() naar einde() en draagt daar haar pijlpunt, ook
  // wanneer de hoek negatief is: net als op papier is de hoek een gerichte hoek.
  // De parameter loopt daarom altijd van 0 naar 1, want JSXGraph tekent een
  // kromme enkel over een stijgend bereik.
  function boog(ctx, bord, straal, begin, einde, rol, dikte) {
    function hoek(t) { return begin() + t * (einde() - begin()); }
    return ctx.stijl(bord.create("curve", [
      function (t) { return straal * cos(hoek(t)); },
      function (t) { return straal * sin(hoek(t)); },
      0, 1
    ], {
      fixed: true, highlight: false, strokeWidth: dikte || 2,
      lastArrow: { type: 2, size: 5 }
    }), rol);
  }

  function opschrift(ctx, bord, straal, hoek, tekst, rol) {
    return ctx.stijl(bord.create("text", [
      function () { return straal * cos(hoek()); },
      function () { return straal * sin(hoek()); },
      tekst
    ], {
      fixed: true, highlight: false,
      anchorX: "middle", anchorY: "middle"
    }), rol);
  }

  G.registreer("cosinus-verschil-inproduct", function (ctx) {
    var BEGIN_ALPHA = 130;
    var BEGIN_BETA = 20;

    var bord = ctx.maakBord({
      begrenzing: [-1.45, 1.35, 1.45, -1.35],
      assen: true,
      asgetallen: false,
      gelijkeschaal: true
    });

    var cirkel = ctx.stijl(bord.create("circle", [[0, 0], 1], {
      fixed: true, highlight: false, strokeWidth: 1.5
    }), "hulp");

    var P = ctx.stijl(bord.create("glider", [
      cos(BEGIN_ALPHA), sin(BEGIN_ALPHA), cirkel
    ], {
      name: "P", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [-14, 12] }
    }), "punt");

    var Q = ctx.stijl(bord.create("glider", [
      cos(BEGIN_BETA), sin(BEGIN_BETA), cirkel
    ], {
      name: "Q", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [12, 12] }
    }), "secante");

    function a() { return graden(P); }
    function b() { return graden(Q); }
    function d() { return kleinsteVerschil(a(), b()); }

    var straalP = lijnstuk(ctx, bord, [0, 0], P, "punt");
    var straalQ = lijnstuk(ctx, bord, [0, 0], Q, "secante");
    var vectorP = ctx.stijl(bord.create("arrow", [[0, 0], P], {
      fixed: true, highlight: false, strokeWidth: 3, visible: false
    }), "punt");
    var vectorQ = ctx.stijl(bord.create("arrow", [[0, 0], Q], {
      fixed: true, highlight: false, strokeWidth: 3, visible: false
    }), "secante");
    var vectornaamP = ctx.stijl(bord.create("text", [
      function () { return 0.55 * P.X() - 0.12 * P.Y(); },
      function () { return 0.55 * P.Y() + 0.12 * P.X(); },
      "<math><mover accent='true'><mrow><mi>O</mi><mi>P</mi></mrow>" +
        "<mo>→</mo></mover></math>"
    ], {
      fixed: true, highlight: false, visible: false,
      anchorX: "middle", anchorY: "middle"
    }), "punt");
    var vectornaamQ = ctx.stijl(bord.create("text", [
      function () { return 0.55 * Q.X() + 0.12 * Q.Y(); },
      function () { return 0.55 * Q.Y() - 0.12 * Q.X(); },
      "<math><mover accent='true'><mrow><mi>O</mi><mi>Q</mi></mrow>" +
        "<mo>→</mo></mover></math>"
    ], {
      fixed: true, highlight: false, visible: false,
      anchorX: "middle", anchorY: "middle"
    }), "secante");

    var componentenP = ctx.stijl(bord.create("text", [
      -1.35, -1.08,
      function () {
        return "OP = (cos α, sin α) = (" + ctx.getal(cos(a()), 2) +
          ", " + ctx.getal(sin(a()), 2) + ")";
      }
    ], {
      fixed: true, highlight: false, visible: false,
      anchorX: "left", anchorY: "middle"
    }), "punt");
    var componentenQ = ctx.stijl(bord.create("text", [
      -1.35, -1.25,
      function () {
        return "OQ = (cos β, sin β) = (" + ctx.getal(cos(b()), 2) +
          ", " + ctx.getal(sin(b()), 2) + ")";
      }
    ], {
      fixed: true, highlight: false, visible: false,
      anchorX: "left", anchorY: "middle"
    }), "secante");

    var meetkundigeWaarde = ctx.stijl(bord.create("text", [
      -1.35, -1.08,
      function () {
        return "Meetkundig: OP · OQ = ‖OP‖ ‖OQ‖ cos(α − β) = " +
          ctx.getal(cos(d()), 3);
      }
    ], {
      fixed: true, highlight: false, visible: false,
      anchorX: "left", anchorY: "middle"
    }), "punt");
    var analytischeWaarde = ctx.stijl(bord.create("text", [
      -1.35, -1.25,
      function () {
        var waarde = cos(a()) * cos(b()) + sin(a()) * sin(b());
        return "Analytisch: OP · OQ = cos α cos β + sin α sin β = " +
          ctx.getal(waarde, 3);
      }
    ], {
      fixed: true, highlight: false, visible: false,
      anchorX: "left", anchorY: "middle"
    }), "secante");

    // De dunne bogen meten alpha en beta vanaf de positieve x-as.
    var boogAlpha = boog(ctx, bord, 0.28,
      function () { return 0; }, a, "punt", 1.5);
    var boogBeta = boog(ctx, bord, 0.43,
      function () { return 0; }, b, "secante", 1.5);
    var tekstAlpha = opschrift(ctx, bord, 0.40,
      function () { return a() / 2; }, "α", "punt");
    var tekstBeta = opschrift(ctx, bord, 0.55,
      function () { return b() / 2; }, "β", "secante");

    // De dikke boog is de (gerichte) kleinste hoek van OQ naar OP.
    var verschilboog = boog(ctx, bord, 0.68,
      b, function () { return b() + d(); }, "raaklijn", 3);
    var verschiltekst = opschrift(ctx, bord, 0.86,
      function () { return b() + d() / 2; }, "α − β", "raaklijn");

    ctx.stijl(bord.create("point", [0, 0], {
      name: "O", size: 2, fixed: true, showInfobox: false,
      label: { offset: [-14, -12] }
    }), "tekst");

    var modus = "punten";
    var modusknoppen = ["punten", "vectoren", "inproduct"].map(function (naam) {
      return ctx.knop(naam.charAt(0).toUpperCase() + naam.slice(1), function () {
        zetModus(naam);
      });
    });

    // Vastklikken op veelvouden van 15° maakt de exacte waarden leesbaar:
    // met alpha = 75° en beta = 30° staat de optellingsformule voor
    // cos 45° letterlijk onder de figuur.
    var STAP = 15;
    var vastklikken = false;

    function klikVast(punt) {
      if (!vastklikken) return;
      var hoek = Math.round(graden(punt) / STAP) * STAP;
      punt.setPosition(window.JXG.COORDS_BY_USER, [cos(hoek), sin(hoek)]);
    }

    var klikknop = ctx.knop("Vastklikken op 15°", function (knop) {
      zetVastklikken(!vastklikken);
      knop.blur();
    });

    function zetVastklikken(aan) {
      vastklikken = aan;
      klikknop.setAttribute("aria-pressed", String(vastklikken));
      klikVast(P);
      klikVast(Q);
      bord.update();
      werkBij();
    }

    function zetModus(nieuweModus) {
      modus = nieuweModus;
      var punten = modus === "punten";
      var vectoren = modus === "vectoren";
      var inproduct = modus === "inproduct";

      straalP.setAttribute({ visible: punten });
      straalQ.setAttribute({ visible: punten });
      vectorP.setAttribute({ visible: vectoren || inproduct });
      vectorQ.setAttribute({ visible: vectoren || inproduct });
      vectornaamP.setAttribute({ visible: vectoren || inproduct });
      vectornaamQ.setAttribute({ visible: vectoren || inproduct });
      componentenP.setAttribute({ visible: vectoren });
      componentenQ.setAttribute({ visible: vectoren });
      meetkundigeWaarde.setAttribute({ visible: inproduct });
      analytischeWaarde.setAttribute({ visible: inproduct });
      boogAlpha.setAttribute({ visible: punten });
      boogBeta.setAttribute({ visible: punten });
      tekstAlpha.setAttribute({ visible: punten });
      tekstBeta.setAttribute({ visible: punten });
      verschilboog.setAttribute({ visible: inproduct });
      verschiltekst.setAttribute({ visible: inproduct });
      P.setAttribute({
        size: punten ? 5 : 0,
        strokeOpacity: punten ? 1 : 0,
        fillOpacity: punten ? 1 : 0
      });
      Q.setAttribute({
        size: punten ? 5 : 0,
        strokeOpacity: punten ? 1 : 0,
        fillOpacity: punten ? 1 : 0
      });
      P.label.setAttribute({ visible: punten });
      Q.label.setAttribute({ visible: punten });
      modusknoppen.forEach(function (knop, i) {
        knop.setAttribute("aria-pressed",
          String(["punten", "vectoren", "inproduct"][i] === modus));
      });
      bord.update();
      werkBij();
    }

    function werkBij() {
      var analytisch = cos(a()) * cos(b()) + sin(a()) * sin(b());
      var meetkundig = cos(d());
      ctx.toon(
        "α = " + ctx.getal(a(), 1) + "°, β = " + ctx.getal(b(), 1) +
        "°, α − β = " + ctx.getal(d(), 1) + "°. " +
        "Meetkundig: cos(α − β) = " + ctx.getal(meetkundig, 3) + ". " +
        "Analytisch: cos α cos β + sin α sin β = " +
        ctx.getal(analytisch, 3) + "."
      );
    }

    P.on("drag", function () { klikVast(P); });
    Q.on("drag", function () { klikVast(Q); });
    bord.on("update", werkBij);
    zetVastklikken(false);
    zetModus("punten");

    return {
      reset: function () {
        vastklikken = false;
        klikknop.setAttribute("aria-pressed", "false");
        P.setPosition(window.JXG.COORDS_BY_USER,
          [cos(BEGIN_ALPHA), sin(BEGIN_ALPHA)]);
        Q.setPosition(window.JXG.COORDS_BY_USER,
          [cos(BEGIN_BETA), sin(BEGIN_BETA)]);
        zetModus("punten");
        bord.update();
        werkBij();
      }
    };
  });

  G.registreer("inproduct-vectoren", function (ctx) {
    var BEGIN_U = [2.0, 2.3];
    var BEGIN_V = [4.4, 0.8];

    var bord = ctx.maakBord({
      begrenzing: [-0.75, 3.25, 5.75, -0.85],
      assen: true,
      asgetallen: false,
      gelijkeschaal: true
    });

    var O = ctx.stijl(bord.create("point", [0, 0], {
      name: "O", size: 2, fixed: true, showInfobox: false,
      label: { offset: [-16, -14] }
    }), "tekst");
    var U = ctx.stijl(bord.create("point", BEGIN_U, {
      name: "U", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [-6, 16] }
    }), "punt");
    var V = ctx.stijl(bord.create("point", BEGIN_V, {
      name: "V", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 },
      label: { offset: [12, 2] }
    }), "secante");

    var P = plaats(bord,
      function () { return V.X(); },
      function () { return U.Y(); });
    var Ux = plaats(bord, function () { return U.X(); }, function () { return 0; });
    var Uy = plaats(bord, function () { return 0; }, function () { return U.Y(); });
    var Vx = plaats(bord, function () { return V.X(); }, function () { return 0; });
    var Vy = plaats(bord, function () { return 0; }, function () { return V.Y(); });

    // De figuur heeft twee standen. Wat bij één stand hoort, verzamelen we
    // hier; de vectoren zelf, de hoek en de lengtes blijven in beide staan.
    var componentendeel = [];
    var projectiedeel = [];

    componentendeel.push(
      lijnstuk(ctx, bord, U, Ux, "raster", { strokeWidth: 1, dash: 2 }),
      lijnstuk(ctx, bord, U, Uy, "raster", { strokeWidth: 1, dash: 2 }),
      lijnstuk(ctx, bord, V, Vx, "raster", { strokeWidth: 1, dash: 2 }),
      lijnstuk(ctx, bord, V, Vy, "raster", { strokeWidth: 1, dash: 2 })
    );

    ctx.stijl(bord.create("arrow", [O, U], {
      fixed: true, highlight: false, strokeWidth: 3
    }), "punt");
    ctx.stijl(bord.create("arrow", [O, V], {
      fixed: true, highlight: false, strokeWidth: 3
    }), "secante");
    componentendeel.push(
      lijnstuk(ctx, bord, U, V, "tekst", { strokeWidth: 2, dash: 2 }),
      lijnstuk(ctx, bord, U, P, "hulp", { strokeWidth: 2 }),
      lijnstuk(ctx, bord, P, V, "hulp", { strokeWidth: 2 }),
      ctx.stijl(bord.create("nonreflexangle", [U, P, V], {
        radius: 0.16, name: "", fixed: true, highlight: false,
        orthoType: "square", fillOpacity: 0
      }), "hulp")
    );

    ctx.stijl(bord.create("nonreflexangle", [V, O, U], {
      radius: 0.65, name: "θ", fixed: true, highlight: false,
      fillOpacity: 0, label: { offset: [5, 5] }
    }), "raaklijn");

    function tekst(x, y, inhoud, rol, opties) {
      var keuze = {
        fixed: true, highlight: false,
        anchorX: "middle", anchorY: "middle"
      };
      Object.keys(opties || {}).forEach(function (sleutel) {
        keuze[sleutel] = opties[sleutel];
      });
      return ctx.stijl(bord.create("text", [x, y, inhoud], keuze), rol);
    }

    componentendeel.push(
      tekst(function () { return U.X(); }, -0.28, "u₁", "zwak"),
      tekst(function () { return V.X(); }, -0.28, "v₁", "zwak"),
      tekst(-0.28, function () { return U.Y(); }, "u₂", "zwak"),
      tekst(-0.28, function () { return V.Y(); }, "v₂", "zwak"),
      tekst(function () { return (U.X() + V.X()) / 2; },
        function () { return U.Y() + 0.18; }, "v₁ − u₁", "hulp"),
      tekst(function () { return V.X() + 0.33; },
        function () { return (U.Y() + V.Y()) / 2; }, "v₂ − u₂", "hulp"),
      tekst(function () { return (U.X() + V.X()) / 2 - 0.18; },
        function () { return (U.Y() + V.Y()) / 2 - 0.18; }, "‖v − u‖", "tekst")
    );
    tekst(function () { return U.X() / 2 - 0.18 * U.Y() / norm(U); },
      function () { return U.Y() / 2 + 0.18 * U.X() / norm(U); }, "‖u‖", "punt");
    tekst(function () { return V.X() / 2 + 0.18 * V.Y() / norm(V); },
      function () { return V.Y() / 2 - 0.18 * V.X() / norm(V); }, "‖v‖", "secante");

    function norm(A) {
      return Math.max(Math.hypot(A.X(), A.Y()), 0.001);
    }

    function inproduct() {
      return U.X() * V.X() + U.Y() * V.Y();
    }

    // De voet van de loodlijn uit V op de drager van u ligt op factor() maal u.
    function factor() {
      return inproduct() / (norm(U) * norm(U));
    }

    function hoek() {
      var noemer = norm(U) * norm(V);
      var c = inproduct() / noemer;
      return Math.acos(Math.max(-1, Math.min(1, c))) / RAD;
    }

    var F = plaats(bord,
      function () { return factor() * U.X(); },
      function () { return factor() * U.Y(); });

    projectiedeel.push(
      ctx.stijl(bord.create("line", [O, U], {
        straightFirst: false, straightLast: true, visible: false,
        fixed: true, highlight: false, strokeWidth: 1, dash: 2
      }), "hulp"),
      // De projectie krijgt een eigen kleur en ligt in een lagere laag: ze
      // valt anders samen met de vector u waar ze op ligt, en zo blijft die
      // vector er als blauwe lijn bovenop staan. Het opschrift staat verder
      // op de drager dan dat van u, zodat de twee elkaar niet raken.
      lijnstuk(ctx, bord, O, F, "afgeleide",
        { strokeWidth: 7, layer: 6, visible: false }),
      lijnstuk(ctx, bord, V, F, "hulp", { strokeWidth: 2, dash: 2, visible: false }),
      tekst(function () { return 0.72 * factor() * U.X() + 0.26 * U.Y() / norm(U); },
        function () { return 0.72 * factor() * U.Y() - 0.26 * U.X() / norm(U); },
        "‖v‖ cos θ", "afgeleide", { visible: false })
    );

    // Het haakje van de rechte hoek tekenen we zelf: een hoekobject in F
    // ontaardt zodra de voet van de loodlijn met U of met V samenvalt.
    var haakje = ctx.stijl(bord.create("curve", [[], []], {
      fixed: true, highlight: false, strokeWidth: 1.5, visible: false
    }), "hulp");
    haakje.updateDataArray = function () {
      var lengte = norm(U);
      var ex = U.X() / lengte;
      var ey = U.Y() / lengte;
      var vx = V.X() - factor() * U.X();
      var vy = V.Y() - factor() * U.Y();
      var afstand = Math.hypot(vx, vy);
      var zijde = 0.18;
      if (afstand < 2 * zijde || Math.abs(factor()) * lengte < 2 * zijde) {
        this.dataX = [];
        this.dataY = [];
        return;
      }
      var nx = vx / afstand;
      var ny = vy / afstand;
      // Het haakje ligt aan de kant van O, net als op papier.
      var teken = factor() >= 0 ? -1 : 1;
      var fx = factor() * U.X();
      var fy = factor() * U.Y();
      this.dataX = [fx + teken * zijde * ex,
        fx + teken * zijde * ex + zijde * nx, fx + zijde * nx];
      this.dataY = [fy + teken * zijde * ey,
        fy + teken * zijde * ey + zijde * ny, fy + zijde * ny];
    };
    projectiedeel.push(haakje);

    var modus = "componenten";
    var modusnamen = ["componenten", "projectie"];
    var modusknoppen = modusnamen.map(function (naam) {
      return ctx.knop(naam.charAt(0).toUpperCase() + naam.slice(1), function () {
        zetModus(naam);
      });
    });

    function zetModus(nieuweModus) {
      modus = nieuweModus;
      componentendeel.forEach(function (object) {
        object.setAttribute({ visible: modus === "componenten" });
      });
      projectiedeel.forEach(function (object) {
        object.setAttribute({ visible: modus === "projectie" });
      });
      modusknoppen.forEach(function (knop, i) {
        knop.setAttribute("aria-pressed", String(modusnamen[i] === modus));
      });
      bord.update();
      werkBij();
    }

    function begrens(A) {
      var x = Math.max(0.25, Math.min(5.2, A.X()));
      var y = Math.max(0.25, Math.min(2.9, A.Y()));
      if (x !== A.X() || y !== A.Y()) {
        A.setPosition(window.JXG.COORDS_BY_USER, [x, y]);
      }
    }

    function werkBij() {
      var analytisch = inproduct();
      var vectoren = "u = (" + ctx.getal(U.X(), 2) + ", " + ctx.getal(U.Y(), 2) +
        "), v = (" + ctx.getal(V.X(), 2) + ", " + ctx.getal(V.Y(), 2) + "). ";
      if (modus === "projectie") {
        var projectie = norm(V) * Math.cos(hoek() * RAD);
        ctx.toon(
          vectoren + "θ = " + ctx.getal(hoek(), 1) + "°. Projectie van v op u: " +
          "‖v‖ cos θ = " + ctx.getal(projectie, 2) + ". Dus u · v = " +
          "‖u‖ · ‖v‖ cos θ = " + ctx.getal(norm(U), 2) + " · " +
          ctx.getal(projectie, 2) + " = " + ctx.getal(analytisch, 3) + "."
        );
        return;
      }
      var meetkundig = norm(U) * norm(V) * Math.cos(hoek() * RAD);
      var dx = V.X() - U.X();
      var dy = V.Y() - U.Y();
      ctx.toon(
        vectoren + "Componenten van v − u: " + ctx.getal(dx, 2) + " en " +
        ctx.getal(dy, 2) + ". Analytisch: u · v = " +
        ctx.getal(analytisch, 3) + ". Meetkundig: ‖u‖ ‖v‖ cos(" +
        ctx.getal(hoek(), 1) + "°) = " + ctx.getal(meetkundig, 3) + "."
      );
    }

    U.on("drag", function () { begrens(U); });
    V.on("drag", function () { begrens(V); });
    bord.on("update", werkBij);
    zetModus("componenten");

    return {
      reset: function () {
        U.setPosition(window.JXG.COORDS_BY_USER, BEGIN_U);
        V.setPosition(window.JXG.COORDS_BY_USER, BEGIN_V);
        zetModus("componenten");
        bord.update();
        werkBij();
      }
    };
  });
}());
