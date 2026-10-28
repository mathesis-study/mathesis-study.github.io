(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  var JXG = window.JXG;
  var RAD = Math.PI / 180;

  function cos(g) { return Math.cos(g * RAD); }
  function sin(g) { return Math.sin(g * RAD); }

  // De hoek van P, vanaf 0° of (met negatief) vanaf −180°.
  function graden(P, negatief) {
    var g = Math.atan2(P.Y(), P.X()) / RAD;
    return g < 0 && !negatief ? g + 360 : g;
  }

  function g(x, d) {
    return String(G.getal(Math.abs(x) < 1e-12 ? 0 : x, d === undefined ? 3 : d))
      .replace(/-/g, "−");
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

  function opschrift(ctx, bord, fx, fy, tekst, rol) {
    return ctx.stijl(bord.create("text", [fx, fy, tekst], {
      fixed: true, highlight: false, anchorX: "middle", anchorY: "middle",
      useMathJax: false
    }), rol || "tekst");
  }

  function sleeppunt(ctx, bord, rond, hoek, naam) {
    return ctx.stijl(bord.create("glider", [cos(hoek), sin(hoek), rond], {
      name: naam, size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 }, label: { offset: [8, 10] }
    }), "punt");
  }

  function vastpunt(ctx, bord, fx, fy, naam, rol, verschuiving) {
    return ctx.stijl(bord.create("point", [fx, fy], {
      name: naam, size: 3, fixed: true, showInfobox: false,
      label: { offset: verschuiving || [8, 8] }
    }), rol);
  }

  function simpson(BEGIN, beginVerschil, negatief) {
    return function (ctx) {
      var bord = ctx.maakBord({
        begrenzing: [-2.3, 2.1, 2.3, -2.1], schaalstap: 1, gelijkeschaal: true
      });
      var rond = ctx.stijl(bord.create("circle", [[0, 0], 1], {
        fixed: true, highlight: false, strokeWidth: 1.5
      }), "hulp");
      var P = sleeppunt(ctx, bord, rond, BEGIN[0], "P");
      var Q = sleeppunt(ctx, bord, rond, BEGIN[1], "Q");

      var stap = 15;
      var verschil = false;
      function klikVast(punt) {
        var h = Math.round(graden(punt, negatief) / stap) * stap;
        punt.setPosition(JXG.COORDS_BY_USER, [cos(h), sin(h)]);
      }
      P.on("drag", function () { klikVast(P); });
      Q.on("drag", function () { klikVast(Q); });

      function p() { return graden(P, negatief); }
      function q() { return graden(Q, negatief); }
      function halveSom() { return (p() + q()) / 2; }
      function halfVerschil() { return (p() - q()) / 2; }
      // De vierde hoek: S = P + Q of D = P − Q.
      function rx() { return P.X() + (verschil ? -1 : 1) * Q.X(); }
      function ry() { return P.Y() + (verschil ? -1 : 1) * Q.Y(); }

      lijnstuk(ctx, bord, [0, 0], P, "punt", { strokeWidth: 1.5 });
      lijnstuk(ctx, bord, [0, 0], Q, "punt", { strokeWidth: 1.5 });
      lijnstuk(ctx, bord, P, Q, "hulp", { strokeWidth: 1, dash: 2 });

      // De rechte OM, met de hoek (p + q)/2 vanaf de x-as.
      vastpunt(ctx, bord,
        function () { return (P.X() + Q.X()) / 2; },
        function () { return (P.Y() + Q.Y()) / 2; }, "M", "kromme", [8, -12]);
      ctx.stijl(bord.create("line", [
        [0, 0], plaats(bord, function () { return cos(halveSom()); },
          function () { return sin(halveSom()); })
      ], { fixed: true, highlight: false, strokeWidth: 1, dash: 1 }), "zwak");
      ctx.stijl(bord.create("curve", [
        function (t) { return 0.3 * cos(t * halveSom()); },
        function (t) { return 0.3 * sin(t * halveSom()); }, 0, 1
      ], { fixed: true, highlight: false, strokeWidth: 1.5 }), "kromme");
      opschrift(ctx, bord,
        function () { return 0.55 * cos(halveSom() / 2); },
        function () { return 0.55 * sin(halveSom() / 2); }, "(p+q)/2", "kromme");

      // Het parallellogram en de vector naar R = S of D.
      var R = plaats(bord, rx, ry);
      lijnstuk(ctx, bord, P, R, "hulp", { strokeWidth: 1, dash: 2 });
      lijnstuk(ctx, bord, plaats(bord,
        function () { return verschil ? -Q.X() : Q.X(); },
        function () { return verschil ? -Q.Y() : Q.Y(); }), R, "hulp", { strokeWidth: 1, dash: 2 });
      var tegenQ = lijnstuk(ctx, bord, [0, 0], plaats(bord,
        function () { return -Q.X(); }, function () { return -Q.Y(); }),
        "hulp", { strokeWidth: 1, dash: 2 });
      ctx.stijl(bord.create("arrow", [[0, 0], R], {
        fixed: true, highlight: false, strokeWidth: 3
      }), "raaklijn");
      var naamR = vastpunt(ctx, bord, rx, ry, "S", "raaklijn");

      // De coördinaten van R: cos p ± cos q en sin p ± sin q.
      var X = plaats(bord, rx, 0);
      var Y = plaats(bord, 0, ry);
      lijnstuk(ctx, bord, R, X, "hulp", { strokeWidth: 1, dash: 2 });
      lijnstuk(ctx, bord, R, Y, "hulp", { strokeWidth: 1, dash: 2 });
      lijnstuk(ctx, bord, [0, 0], X, "secante", { strokeWidth: 4 });
      lijnstuk(ctx, bord, [0, 0], Y, "afgeleide", { strokeWidth: 4 });
      var tekstX = opschrift(ctx, bord, function () { return rx() / 2; },
        function () { return ry() >= 0 ? -0.16 : 0.16; }, "cos p + cos q", "secante");
      // Naast de y-as botst dit opschrift met de vector of de boog; boven de
      // stippellijn van R naar de y-as blijft het vrij.
      var tekstY = opschrift(ctx, bord, function () { return rx() / 2; },
        function () { return ry() + (ry() >= 0 ? 0.15 : -0.15); }, "sin p + sin q", "afgeleide");

      ctx.stijl(bord.create("point", [0, 0], {
        name: "O", size: 2, fixed: true, showInfobox: false,
        label: { offset: [-14, -10] }
      }), "tekst");

      function werkBij() {
        var hs = halveSom(), hv = halfVerschil();
        var tekst = "p = " + g(p(), 1) + "°, q = " + g(q(), 1) + "°, (p + q)/2 = " +
          g(hs, 1) + "°, (p − q)/2 = " + g(hv, 1) + "°. ";
        if (!verschil) {
          tekst += "OS = 2 OM, met OM = cos((p − q)/2) = " + g(cos(hv)) + ". " +
            "cos p + cos q = " + g(rx()) + " = 2 cos " + g(hs, 1) + "° cos " + g(hv, 1) + "°; " +
            "sin p + sin q = " + g(ry()) + " = 2 sin " + g(hs, 1) + "° cos " + g(hv, 1) + "°.";
        } else {
          tekst += "OD ⊥ OM, met |OD| = |2 sin((p − q)/2)| = " + g(Math.abs(2 * sin(hv))) + ". " +
            "cos p − cos q = " + g(rx()) + " = −2 sin " + g(hs, 1) + "° sin " + g(hv, 1) + "°; " +
            "sin p − sin q = " + g(ry()) + " = 2 cos " + g(hs, 1) + "° sin " + g(hv, 1) + "°.";
        }
        ctx.toon(tekst);
      }
      bord.on("update", werkBij);

      var knoppen = [];
      function zetModus(v) {
        verschil = v;
        var teken = verschil ? " − " : " + ";
        tekstX.setText("cos p" + teken + "cos q");
        tekstY.setText("sin p" + teken + "sin q");
        naamR.setName(verschil ? "D" : "S");
        tegenQ.setAttribute({ visible: verschil });
        knoppen[0].setAttribute("aria-pressed", String(!verschil));
        knoppen[1].setAttribute("aria-pressed", String(verschil));
        bord.update();
      }
      function zet(pp, qq, v) {
        P.setPosition(JXG.COORDS_BY_USER, [cos(pp), sin(pp)]);
        Q.setPosition(JXG.COORDS_BY_USER, [cos(qq), sin(qq)]);
        zetModus(v);
      }
      knoppen.push(ctx.knop("Som", function () { zetModus(false); }));
      knoppen.push(ctx.knop("Verschil", function () { zetModus(true); }));
      var klikknop = ctx.knop("Vastklikken op 15°", function (knop) {
        stap = stap === 15 ? 1 : 15;
        knop.setAttribute("aria-pressed", String(stap === 15));
        knop.blur();
        klikVast(P);
        klikVast(Q);
        bord.update();
      });
      klikknop.setAttribute("aria-pressed", "true");
      zetModus(beginVerschil);
      werkBij();

      return {
        reset: function () {
          stap = 15;
          klikknop.setAttribute("aria-pressed", "true");
          zet(BEGIN[0], BEGIN[1], beginVerschil);
        },
        vernietig: function () { JXG.JSXGraph.freeBoard(bord); }
      };
    };
  }

  G.registreer("r5-simpson-10-a", simpson([75, 15], false));
  G.registreer("r5-simpson-10-b", simpson([105, 15], true));
  G.registreer("r5-simpson-10-c", simpson([195, 105], true));
  G.registreer("r5-simpson-10-d", simpson([75, 15], false));
  G.registreer("r5-simpson-10-e", simpson([-15, 105], true, true));
  G.registreer("r5-simpson-10-f", simpson([285, 15], false));
}());
