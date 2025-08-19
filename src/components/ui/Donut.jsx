/* src/components/ui/Donut.module.css */

.donutWrap {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
}

.donutRing {
  width: 180px;
  height: 180px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  backdrop-filter: blur(6px);
}

.donutHole {
  width: 130px;
  height: 130px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--border);
}

.donutBig {
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
}

.donutSub {
  font-size: .8rem;
  color: var(--muted);
  text-align: center;
  line-height: 1.1;
}

.donutLegend {
  display: grid;
  gap: 4px;
  font-size: .9rem;
  color: #e2e8f0;
  text-align: center;
}

.dotLeft, .dotUsed, .dotPend, .dotTotal {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}

.dotLeft { background: #22c55e; }
.dotUsed { background: #f97316; }
.dotPend { background: #eab308; }
.dotTotal { background: #60a5fa; }

@media (max-width: 420px) {
  .donutRing {
    width: 160px;
    height: 160px;
  }
  .donutHole {
    width: 116px;
    height: 116px;
  }
}
