(function () {
	"use strict";

	const canvas = document.getElementById("bannerNodesCanvas");
	if (!canvas) return;

	const ctx = canvas.getContext("2d");

	let W = 0, H = 0;
	let dpr = Math.min(2, window.devicePixelRatio || 1);

	const CFG = {
		count: 30,
		radiusMin: 5,
		radiusMax: 10,

		drift: 0.18,
		speedCap: 1.4,

		repelRadius: 110,
		repelStrength: 1.0,

		linkCount: 38,
		linkMaxDist: 220,
		linkAlpha: 0.22,

		nodeFill: "rgba(0,0,0,0.88)",
		lineWidth: 1.2,

		damping: 0.92,
		edgePadding: 10
	};

	const state = {
		nodes: [],
		links: [],
		mouse: { x: -9999, y: -9999, active: false },
		lastT: performance.now()
	};

	function rand(a, b) { return a + Math.random() * (b - a); }
	function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

	function resize() {
		const r = canvas.getBoundingClientRect();
		W = Math.max(1, Math.floor(r.width));
		H = Math.max(1, Math.floor(r.height));

		dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.width = Math.floor(W * dpr);
		canvas.height = Math.floor(H * dpr);
		ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

		init();
	}

	function init() {
		state.nodes = Array.from({ length: CFG.count }, () => ({
			x: rand(CFG.edgePadding, W - CFG.edgePadding),
			y: rand(CFG.edgePadding, H - CFG.edgePadding),
			vx: rand(-0.6, 0.6),
			vy: rand(-0.6, 0.6),
			r: rand(CFG.radiusMin, CFG.radiusMax)
		}));

		const links = new Set();
		function key(a, b) { return a < b ? `${a}-${b}` : `${b}-${a}`; }

		while (links.size < CFG.linkCount) {
			const a = Math.floor(Math.random() * CFG.count);
			const b = Math.floor(Math.random() * CFG.count);
			if (a === b) continue;
			links.add(key(a, b));
		}

		state.links = Array.from(links).map(s => s.split("-").map(n => parseInt(n, 10)));
	}

	function onMove(e) {
		const r = canvas.getBoundingClientRect();
		state.mouse.x = e.clientX - r.left;
		state.mouse.y = e.clientY - r.top;
		state.mouse.active = true;
	}

	function onLeave() {
		state.mouse.x = -9999;
		state.mouse.y = -9999;
		state.mouse.active = false;
	}

	function step(dt) {
		const mx = state.mouse.x;
		const my = state.mouse.y;

		for (const n of state.nodes) {
			n.vx += rand(-CFG.drift, CFG.drift) * 0.04;
			n.vy += rand(-CFG.drift, CFG.drift) * 0.04;

			if (state.mouse.active) {
				const dx = n.x - mx;
				const dy = n.y - my;
				const d = Math.sqrt(dx * dx + dy * dy);

				if (d < CFG.repelRadius) {
					const t = 1 - d / CFG.repelRadius;
					const f = t * t * CFG.repelStrength;
					const nx = dx / (d || 1);
					const ny = dy / (d || 1);
					n.vx += nx * f * 2.6;
					n.vy += ny * f * 2.6;
				}
			}

			n.vx *= CFG.damping;
			n.vy *= CFG.damping;
			n.vx = clamp(n.vx, -CFG.speedCap, CFG.speedCap);
			n.vy = clamp(n.vy, -CFG.speedCap, CFG.speedCap);

			n.x += n.vx * (dt * 60);
			n.y += n.vy * (dt * 60);

			if (n.x < CFG.edgePadding) { n.x = CFG.edgePadding; n.vx *= -0.9; }
			if (n.x > W - CFG.edgePadding) { n.x = W - CFG.edgePadding; n.vx *= -0.9; }
			if (n.y < CFG.edgePadding) { n.y = CFG.edgePadding; n.vy *= -0.9; }
			if (n.y > H - CFG.edgePadding) { n.y = H - CFG.edgePadding; n.vy *= -0.9; }
		}
	}

	function draw() {
		ctx.clearRect(0, 0, W, H);

		ctx.lineWidth = CFG.lineWidth;

		for (const [ai, bi] of state.links) {
			const a = state.nodes[ai];
			const b = state.nodes[bi];
			if (!a || !b) continue;

			const dx = a.x - b.x;
			const dy = a.y - b.y;
			const d = Math.sqrt(dx * dx + dy * dy);

			if (d <= CFG.linkMaxDist) {
				const alpha = CFG.linkAlpha * (1 - d / CFG.linkMaxDist);
				ctx.strokeStyle = `rgba(0,0,0,${alpha.toFixed(3)})`;
				ctx.beginPath();
				ctx.moveTo(a.x, a.y);
				ctx.lineTo(b.x, b.y);
				ctx.stroke();
			}
		}

		ctx.fillStyle = CFG.nodeFill;
		for (const n of state.nodes) {
			ctx.beginPath();
			ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	function loop(t) {
		const dt = Math.min(0.033, (t - state.lastT) / 1000);
		state.lastT = t;
		step(dt);
		draw();
		requestAnimationFrame(loop);
	}

	window.addEventListener("resize", resize);
	document.addEventListener("mousemove", onMove, { passive: true });
	document.addEventListener("mouseleave", onLeave, { passive: true });

	resize();
	requestAnimationFrame(loop);
})();
