// Clear disposable app caches only. Save slots, inventory and preferences are untouched.
export async function clearGameCaches(environment = globalThis) {
  if (environment.caches) {
    const names = await environment.caches.keys();
    for (const name of names) {
      if (/^(lagos-experience|total-city-grind|tcg)([-:]|$)/i.test(name)) {
        await environment.caches.delete(name);
      }
    }
  }
  // Desktop can also clear its HTTP cache; browsers manage their own HTTP cache.
  await environment.window?.totalCityGrindCache?.clear?.();
}
