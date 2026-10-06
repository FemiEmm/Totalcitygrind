// Opt-in filming tools. Never enabled in production or online account play.
export const LOCAL_STUDIO = Boolean(import.meta.env?.DEV) && typeof location !== 'undefined' &&
  ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) &&
  new URLSearchParams(location.search).get('studio') === '1';

export function installLocalStudio(ctx) {
  if (!LOCAL_STUDIO || ctx.online()) return () => {};
  const assertOffline = () => {
    if (ctx.online()) throw new Error('Studio controls require offline play.');
  };
  let unlimited = true;
  const refill = () => {
    if (!unlimited || ctx.online()) return;
    ctx.economy.money = 1_000_000_000;
    ctx.economy.gameOver = false;
    ctx.status.energy = 100;
    ctx.status.health = 100;
    ctx.hud.fuel = 100;
    ctx.hud.damage = 0;
  };
  const api = {
    locations: () => ctx.locations(),
    teleport(id) {
      assertOffline();
      const zone = ctx.locations().find(zone => zone.id === id);
      if (!zone) throw new Error('Unknown studio location: ' + id);
      ctx.close();
      ctx.stop();
      const x = zone.x + zone.width / 2, y = zone.y + zone.height / 2;
      Object.assign(ctx.player, { x, y, previousX: x, previousY: y,
        lastSafeX: x, lastSafeY: y, rotation: zone.rotation ?? Math.PI / 2,
        previousRotation: zone.rotation ?? Math.PI / 2,
        lastSafeRotation: zone.rotation ?? Math.PI / 2, speed: 0, isParked: true });
      ctx.centre();
      return api.state();
    },
    time(hour) {
      assertOffline();
      if (!Number.isFinite(hour)) throw new Error('Hour must be a number.');
      ctx.clock.minuteOfDay = ((hour * 60) % 1440 + 1440) % 1440;
    },
    unlimited(value = true) { assertOffline(); unlimited = Boolean(value); refill(); },
    job(id) {
      assertOffline();
      if (!['danfo', 'brt', 'moto-eazi'].includes(id)) throw new Error('Unknown driving job.');
      ctx.licence.rating = 'A';
      ctx.job(id);
    },
    route(id) { assertOffline(); ctx.route(id); },
    routes: () => ctx.routes(),
    async celebrate() {
      assertOffline();
      api.teleport('club');
      api.time(22);
      refill();
      await ctx.celebrate();
      return api.state();
    },
    openDealership() { assertOffline(); api.teleport('dealership'); ctx.dealership(); },
    driveOwned(id) { assertOffline(); ctx.vehicle(id); },
    ignition() { assertOffline(); ctx.ignition(); },
    input(key, down) { assertOffline(); ctx.input(key, down); },
    panel(show) { panel.hidden = !show; },
    state: () => ({ x: ctx.player.x, y: ctx.player.y, speed: ctx.player.speed,
      money: ctx.economy.money, minute: ctx.clock.minuteOfDay,
      vehicle: ctx.vehicleId(), owned: [...ctx.economy.ownedVehicleIds],
      celebrationEvents: ctx.events(), paused: ctx.paused() }),
  };
  const panel = document.createElement('aside');
  panel.id = 'tcg-local-studio';
  panel.style.cssText = 'position:fixed;right:12px;top:60px;z-index:2147483647;width:230px;padding:12px;background:#111e;color:#fff;border:1px solid #fc3;border-radius:8px;font:13px Arial;display:flex;flex-direction:column;gap:7px';
  const title = document.createElement('strong');
  title.textContent = 'LOCAL FILMING ADMIN · F8';
  panel.append(title);
  const button = (name, action) => {
    const el = document.createElement('button');
    el.textContent = name;
    el.style.cssText = 'padding:7px;background:#ffd43b;color:#17213a;border:0;border-radius:4px;cursor:pointer';
    el.onclick = () => Promise.resolve().then(action).catch(error => { notice.textContent = error.message; });
    panel.append(el);
  };
  button('Club celebration + night lights', () => api.celebrate());
  button('Danfo driving', () => { api.job('danfo'); api.time(10); api.teleport('driving-road'); });
  button('BRT driving', () => { api.job('brt'); api.time(10); api.teleport('brt-road'); });
  button('Car dealership', () => { api.time(10); api.openDealership(); });
  button('Unlimited money / restore condition', () => api.unlimited());
  button('Hide admin for recording (F8)', () => api.panel(false));
  const notice = document.createElement('small');
  notice.textContent = 'Offline filming save. Funds and condition refill automatically.';
  panel.append(notice);
  // Native hidden must win over this panel's inline display style.
  const style = document.createElement('style');
  style.textContent = '#tcg-local-studio[hidden]{display:none!important}';
  document.head.append(style);
  document.body.append(panel);
  const key = event => { if (event.key === 'F8') { event.preventDefault(); panel.hidden = !panel.hidden; } };
  window.addEventListener('keydown', key);
  refill();
  const timer = setInterval(refill, 500);
  window.tcgStudio = api;
  return () => { clearInterval(timer); panel.remove(); style.remove(); window.removeEventListener('keydown', key); if (window.tcgStudio === api) delete window.tcgStudio; };
}
