(function () {
  "use strict";

  var G = window.InteractieveGrafieken;
  if (!G) return;

  var JXG = window.JXG;
  var RAD = Math.PI / 180;

  function cos(g) { return Math.cos(g * RAD); }
  function sin(g) { return Math.sin(g * RAD); }

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

  /* --- rechthoek-32 ------------------------------------------------------ */

  G.registreer("r4-rechthoek-32", function (ctx) {
    var BEGIN = 30;
    var bord = ctx.maakBord({
      begrenzing: [-1.3, 1.2, 1.3, -0.3], gelijkeschaal: true, assen: false
    });

    var rond = bord.create("circle", [[0, 0], 1], { visible: false, fixed: true });
    ctx.stijl(bord.create("curve", [
      function (t) { return Math.cos(t); }, function (t) { return Math.sin(t); }, 0, Math.PI
    ], { fixed: true, highlight: false, strokeWidth: 1.5 }), "hulp");
    lijnstuk(ctx, bord, [-1, 0], [1, 0], "hulp", { strokeWidth: 1.5 });

    var C = ctx.stijl(bord.create("glider", [cos(BEGIN), sin(BEGIN), rond], {
      name: "C", size: 5, showInfobox: false,
      precision: { touch: 30, mouse: 6 }, label: { offset: [8, 10] }
    }), "punt");
    function a() {
      var h = Math.round(Math.atan2(C.Y(), C.X()) / RAD);
      return Math.min(89, Math.max(1, h));
    }
    C.on("drag", function () {
      C.setPosition(JXG.COORDS_BY_USER, [cos(a()), sin(a())]);
    });

    var A = plaats(bord, function () { return -cos(a()); }, 0);
    var B = plaats(bord, function () { return -cos(a()); }, function () { return sin(a()); });
    var D = plaats(bord, function () { return cos(a()); }, 0);
    lijnstuk(ctx, bord, A, B, "secante");
    lijnstuk(ctx, bord, B, C, "secante");
    lijnstuk(ctx, bord, C, D, "secante");
    lijnstuk(ctx, bord, D, A, "secante");
    lijnstuk(ctx, bord, [0, 0], C, "zwak", { strokeWidth: 1, dash: 2 });
    ctx.stijl(bord.create("curve", [
      function (t) { return 0.22 * Math.cos(t); }, function (t) { return 0.22 * Math.sin(t); },
      0, function () { return a() * RAD; }
    ], { fixed: true, highlight: false, strokeWidth: 1.5 }), "punt");
    opschrift(ctx, bord,
      function () { return 0.33 * cos(a() / 2); },
      function () { return 0.33 * sin(a() / 2); }, "α", "punt");
    opschrift(ctx, bord, function () { return -cos(a()); }, -0.12, "A");
    opschrift(ctx, bord, function () { return -cos(a()) - 0.08; },
      function () { return sin(a()) + 0.08; }, "B");
    opschrift(ctx, bord, function () { return cos(a()); }, -0.12, "D");
    opschrift(ctx, bord, 0, -0.12, "O");

    function werkBij() {
      var h = a();
      ctx.toon("α = " + h + "°: |AD| = 2 cos α = " + g(2 * cos(h)) +
        ", |CD| = sin α = " + g(sin(h)) +
        ", oppervlakte sin 2α = " + g(sin(2 * h)) + ".");
    }
    bord.on("update", werkBij);

    function zet(hoek) {
      C.setPosition(JXG.COORDS_BY_USER, [cos(hoek), sin(hoek)]);
      bord.update();
    }
    ctx.knop("α = 30°", function () { zet(30); });
    ctx.knop("α = 45°", function () { zet(45); });
    ctx.knop("α = 60°", function () { zet(60); });
    werkBij();

    return {
      reset: function () { zet(BEGIN); },
      vernietig: function () { JXG.JSXGraph.freeBoard(bord); }
    };
  });
}());
